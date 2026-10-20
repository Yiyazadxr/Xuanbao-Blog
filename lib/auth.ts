// Auth.js v5：Credentials 登录与 JWT session。
import { cache } from "react";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { type Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions-server";
import { isRole, type Role } from "@/lib/roles";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

// JWT 展示字段定期回源，避免每次请求查库。
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const DUMMY_PASSWORD_HASH = "$2b$10$7EqJtq98hPqEX7fNZaFWoO7u0w8bJ0Vnq1o8gJr5l9hL0yKc6V8mK";
// 登录限流只统计失败尝试：既挡住撞库，也避免用错误密码把他人账号锁死，
// 成功登录不消耗共享出口 IP 的配额。
const LOGIN_IP_LIMIT = 40;
const LOGIN_EMAIL_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// 登录失败才计数：IP 维度挡住撞库，邮箱维度限制单账号尝试次数。
async function recordLoginFailure(ip: string, email: string): Promise<void> {
  await Promise.all([
    rateLimit.checkAndHit("login-ip", ip, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS),
    rateLimit.checkAndHit("login-email", email, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_MS),
  ]);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 生产默认不信任 Host 头；AUTH_TRUST_HOST=true 可显式开启。
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ip = await getClientIp();
        // 放在认证入口，页面 Action 与 Auth.js 回调均受限流约束。
        // 预检不计数，只有失败尝试才写入计数。
        const ipBlocked = await rateLimit.isBlocked("login-ip", ip, LOGIN_IP_LIMIT);
        if (ipBlocked.blocked) return null;
        const emailBlocked = await rateLimit.isBlocked("login-email", email, LOGIN_EMAIL_LIMIT);
        if (emailBlocked.blocked) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          await recordLoginFailure(ip, email);
          return null;
        }

        if (user.disabled) {
          await bcrypt.compare(password, user.password);
          await recordLoginFailure(ip, email);
          return null;
        }

        if (!user.activatedAt) {
          await bcrypt.compare(password, user.password);
          await recordLoginFailure(ip, email);
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          await recordLoginFailure(ip, email);
          return null;
        }

        // 只有凭据正确才能触发未首次登录账号的回收。
        const graceDays = user.inviteCodeId ? 14 : 7;
        if (
          !user.lastLoginAt &&
          Date.now() - user.activatedAt.getTime() > graceDays * 24 * 60 * 60 * 1000
        ) {
          await prisma.user.update({ where: { id: user.id }, data: { disabled: true } });
          return null;
        }

        await rateLimit.reset("login-email", email);

        // 首次登录时间用于后续回收判定。
        if (!user.lastLoginAt) {
          await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role as Role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        (token as { syncedAt?: number }).syncedAt = Date.now();
        return token;
      }
      // 每次校验会话版本；旧 token（无版本）也需要重新登录。
      if (!token.id || typeof token.sessionVersion !== "number") return null;
      const account = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { sessionVersion: true, disabled: true, activatedAt: true },
      });
      if (!account || account.disabled || !account.activatedAt || account.sessionVersion !== token.sessionVersion) return null;
      // 客户端 update() 仅同步展示字段，不能修改会话版本。
      if (trigger === "update") {
        const s = session as { name?: string; image?: string } | undefined;
        if (s?.name) token.name = s.name;
        if (s?.image) token.picture = s.image;
        return token;
      }
      // 展示字段最多延迟 SYNC_INTERVAL_MS；封禁和回收由 getFreshUser() 实时判定。
      // 自定义字段需显式断言：next-auth/jwt 的模块增强对 re-export 的 JWT 不一定生效
      const syncedAt = (token as { syncedAt?: number }).syncedAt ?? 0;
      if (Date.now() - syncedAt > SYNC_INTERVAL_MS && token.id) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, image: true, role: true },
          });
          if (fresh) {
            token.name = fresh.name;
            token.picture = fresh.image ?? null;
            token.role = fresh.role as Role;
          }
        } catch (e) {
          // 回源失败时沿用旧值，下次重试。
          console.error("同步用户信息失败：", e);
        }
        (token as { syncedAt?: number }).syncedAt = Date.now();
      }
      return token;
    },
    // session 仅透传 JWT；安全字段由 getFreshUser() 实时读取。
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.sessionVersion = token.sessionVersion as number;
      }
      return session;
    },
  },
});

// JWT 用户仅用于非敏感场景。
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

// 权限校验实时读取数据库；React cache 仅在单次请求内去重。
export const getFreshUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      disabled: true,
      activatedAt: true,
      sessionVersion: true,
    },
  });
  // 停用和回收不受 JWT 有效期影响。
  const role = user?.role;
  if (!user || user.disabled || !user.activatedAt || !isRole(role) ||
      user.sessionVersion !== session.user.sessionVersion) return null;
  return { ...user, role };
});

export async function requirePermission(permission: Permission) {
  const user = await getFreshUser();
  if (!user) return null;
  const ok = await hasPermission(user.role, permission);
  return ok ? user : null;
}
