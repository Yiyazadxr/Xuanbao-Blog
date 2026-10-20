"use server";

// 角色和删除操作要求 manage_users；禁言操作要求 mute_users。
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { formatDateTime } from "@/lib/utils";
import { muteSchema, parseInput, roleSchema } from "@/lib/validation";

export type UserActionState = { ok: boolean; error?: string; message?: string };

// 仅允许 MEMBER 与 ADMIN 互换；界面不能授予 SUPER_ADMIN。
export async function updateUserRole(
  userId: string,
  role: string
): Promise<UserActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_USERS);
  if (!admin) return { ok: false, error: "无权限" };
  if (admin.id === userId) return { ok: false, error: "不能修改自己的角色" };

  const parsed = parseInput(roleSchema, { userId, role });
  if (!parsed.data) return { ok: false, error: "无效的角色" };
  const { userId: uid, role: targetRole } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: uid } });
  if (!target) return { ok: false, error: "用户不存在" };
  if (target.role === ROLES.SUPER_ADMIN) return { ok: false, error: "不能修改超级管理员的角色" };

  // 角色变化会写进 JWT；递增会话版本让旧令牌立即失效，避免降权后仍显示旧角色。
  await prisma.user.update({
    where: { id: uid },
    data: { role: targetRole, sessionVersion: { increment: 1 } },
  });
  revalidatePath("/admin/users");
  return { ok: true, message: targetRole === "ADMIN" ? "已设为管理员" : "已设为成员" };
}

// 有文章的用户不可删除；评论和点赞级联删除，邀请码解除绑定。
export async function deleteUser(userId: string): Promise<UserActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_USERS);
  if (!admin) return { ok: false, error: "无权限" };
  if (admin.id === userId) return { ok: false, error: "不能删除自己" };

  const parsed = parseInput(roleSchema.pick({ userId: true }), { userId });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { userId: uid } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: uid },
    include: { _count: { select: { posts: true } } },
  });
  if (!target) return { ok: false, error: "用户不存在" };
  if (target.role === ROLES.SUPER_ADMIN) return { ok: false, error: "不能删除超级管理员" };
  if (target._count.posts > 0) {
    return { ok: false, error: "该用户有文章，请先处理其文章再删除" };
  }

  await prisma.user.delete({ where: { id: uid } });
  revalidatePath("/admin/users");
  return { ok: true, message: "已删除用户" };
}

// days=0 永久禁言，正数为定时禁言。
export async function muteUser(
  userId: string,
  days: number,
  reason: string
): Promise<UserActionState> {
  const admin = await requirePermission(PERMISSIONS.MUTE_USERS);
  if (!admin) return { ok: false, error: "无权限" };
  if (admin.id === userId) return { ok: false, error: "不能禁言自己" };

  const parsed = parseInput(muteSchema, { userId, days, reason });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { userId: uid, reason: reasonText } = parsed.data;
  const permanent = parsed.data.days === 0;
  const mutedDuring = permanent ? null : new Date(Date.now() + parsed.data.days * 24 * 60 * 60 * 1000);

  const target = await prisma.user.findUnique({ where: { id: uid } });
  if (!target) return { ok: false, error: "用户不存在" };
  if (target.role === ROLES.SUPER_ADMIN) return { ok: false, error: "不能禁言超级管理员" };

  await prisma.user.update({
    where: { id: uid },
    data: { mutedDuring, mutedPermanent: permanent, mutedReason: reasonText || null },
  });

  // SUPER_ADMIN 已在上面拦截，此处直接通知。
  const untilText = permanent
    ? "永久禁言"
    : `禁言至 ${formatDateTime(mutedDuring!)}`;
  await createNotification(uid, {
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    type: "muted",
    actorName: admin.name,
    title: `你已被${untilText}${reasonText ? `，原因：${reasonText}` : ""}`,
  });

  revalidatePath("/admin/users");
  return { ok: true, message: permanent ? "已永久禁言" : `已禁言 ${parsed.data.days} 天` };
}

export async function unmuteUser(userId: string): Promise<UserActionState> {
  const admin = await requirePermission(PERMISSIONS.MUTE_USERS);
  if (!admin) return { ok: false, error: "无权限" };

  const parsed = parseInput(roleSchema.pick({ userId: true }), { userId });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { userId: uid } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: uid } });
  if (!target) return { ok: false, error: "用户不存在" };
  if (target.role === ROLES.SUPER_ADMIN) return { ok: false, error: "不能操作超级管理员" };

  await prisma.user.update({
    where: { id: uid },
    data: { mutedDuring: null, mutedPermanent: false, mutedReason: null },
  });

  if (target.mutedPermanent || (target.mutedDuring && target.mutedDuring.getTime() > Date.now())) {
    await createNotification(uid, {
      category: NOTIFICATION_CATEGORIES.SYSTEM,
      type: "unmuted",
      actorName: admin.name,
      title: "你的禁言已解除",
    });
  }

  revalidatePath("/admin/users");
  return { ok: true, message: "已解除禁言" };
}
