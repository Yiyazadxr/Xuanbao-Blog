import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { notifyAdmins } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

// 验证链接 24 小时有效；过期后需要重新提交申请。
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function createVerificationToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// 验证页加载时只读取目标邮箱，不消耗令牌。
export async function getVerificationTarget(
  token: string
): Promise<{ email: string } | null> {
  if (!token || token.length > 200) return null;
  const request = await prisma.accountRequest.findUnique({
    where: { verificationTokenHash: hashToken(token) },
    select: { email: true, status: true, verificationExpiresAt: true },
  });
  if (
    !request ||
    request.status !== "UNVERIFIED" ||
    !request.verificationExpiresAt ||
    request.verificationExpiresAt.getTime() <= Date.now()
  ) {
    return null;
  }
  return { email: request.email };
}

// 验证邮箱时才设置密码；邀请码在这一步才消耗并预建待激活账号。
export async function verifyAccountRequest(
  token: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!token || token.length > 200) {
    return { ok: false, error: "链接无效或已过期" };
  }
  if (password.length < 8) return { ok: false, error: "密码至少 8 位" };
  if (password.length > 72) return { ok: false, error: "密码最长 72 位" };

  const tokenHash = hashToken(token);
  const request = await prisma.accountRequest.findUnique({
    where: { verificationTokenHash: tokenHash },
  });
  if (!request || request.status !== "UNVERIFIED") {
    return { ok: false, error: "链接无效或已过期" };
  }
  if (
    !request.verificationExpiresAt ||
    request.verificationExpiresAt.getTime() <= Date.now()
  ) {
    await prisma.accountRequest.updateMany({
      where: { id: request.id, status: "UNVERIFIED" },
      data: { verificationTokenHash: null, verificationExpiresAt: null },
    });
    return { ok: false, error: "链接已过期，请重新提交申请" };
  }

  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(password, 10);
  } catch (error) {
    console.error("设置登录密码失败：", error);
    return { ok: false, error: "验证失败，请稍后重试" };
  }

  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.accountRequest.updateMany({
        where: {
          id: request.id,
          status: "UNVERIFIED",
          verificationTokenHash: tokenHash,
        },
        data: {
          status: "PENDING",
          emailVerifiedAt: now,
          passwordHash,
          verificationTokenHash: null,
          verificationExpiresAt: null,
        },
      });
      if (claimed.count !== 1) throw new Error("VERIFICATION_TAKEN");

      const existing = await tx.user.findUnique({ where: { email: request.email } });
      if (existing?.role === ROLES.SUPER_ADMIN) throw new Error("EMAIL_RESERVED");
      if (existing && !existing.disabled) throw new Error("EMAIL_ALREADY_EXISTS");

      if (request.kind !== "INVITE") return;

      if (!request.inviteCodeId) throw new Error("INVITE_INVALID");
      const invite = await tx.inviteCode.findUnique({
        where: { id: request.inviteCodeId },
      });
      if (
        !invite ||
        (invite.expiresAt && invite.expiresAt < now) ||
        invite.usedCount >= invite.maxUses
      ) {
        throw new Error("INVITE_INVALID");
      }
      const used = await tx.inviteCode.updateMany({
        where: { id: invite.id, usedCount: { lt: invite.maxUses } },
        data: { usedCount: { increment: 1 } },
      });
      if (used.count !== 1) throw new Error("INVITE_INVALID");

      const name =
        request.message?.trim() || request.email.split("@")[0] || request.email;
      if (!existing) {
        await tx.user.create({
          data: {
            email: request.email,
            name,
            password: passwordHash,
            role: ROLES.MEMBER,
            activatedAt: null,
            inviteCodeId: invite.id,
          },
        });
      } else {
        await tx.user.update({
          where: { id: existing.id },
          data: {
            name,
            password: passwordHash,
            role: ROLES.MEMBER,
            activatedAt: null,
            disabled: false,
            lastLoginAt: null,
            inviteCodeId: invite.id,
            sessionVersion: { increment: 1 },
          },
        });
      }
      await tx.accountRequest.update({
        where: { id: request.id },
        data: { passwordHash: null },
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVITE_INVALID") {
        await prisma.accountRequest.updateMany({
          where: { id: request.id, status: "UNVERIFIED" },
          data: {
            status: "REJECTED",
            verificationTokenHash: null,
            verificationExpiresAt: null,
            passwordHash: null,
          },
        });
        return { ok: false, error: "邀请码无效或已失效，请重新申请" };
      }
      if (
        error.message === "EMAIL_ALREADY_EXISTS" ||
        error.message === "EMAIL_RESERVED"
      ) {
        await prisma.accountRequest.updateMany({
          where: { id: request.id, status: "UNVERIFIED" },
          data: {
            status: "REJECTED",
            verificationTokenHash: null,
            verificationExpiresAt: null,
            passwordHash: null,
          },
        });
        return { ok: false, error: "该邮箱已有可用账号，请直接登录" };
      }
      if (error.message === "VERIFICATION_TAKEN") {
        return { ok: false, error: "链接已使用，请勿重复验证" };
      }
    }
    console.error("邮箱验证失败：", error);
    return { ok: false, error: "验证失败，请稍后重试" };
  }

  try {
    await notifyAdmins({
      category: NOTIFICATION_CATEGORIES.SYSTEM,
      type: "account_request",
      title: `新账号申请：${request.email}`,
      link: "/admin/invites",
    });
  } catch (error) {
    // 申请已进入审核队列；通知失败不影响后续人工处理。
    console.error("账号申请通知发送失败：", error);
  }

  return { ok: true };
}
