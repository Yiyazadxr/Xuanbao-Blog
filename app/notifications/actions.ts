"use server";

import { getFreshUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserNotifications,
  getUnreadSummary,
} from "@/lib/notifications";
import {
  type NotificationCategory,
  type NotificationCursor,
  type NotificationItem,
  type NotificationUnreadSummary,
} from "@/lib/notification-types";
import { notificationCategorySchema, notificationsQuerySchema, parseId, parseInput } from "@/lib/validation";

export type NotificationActionState = { ok: boolean; error?: string };

export type NotificationsResult = {
  items: NotificationItem[];
  nextCursor: NotificationCursor | null;
  unread: NotificationUnreadSummary;
};

export async function getNotifications(
  category: NotificationCategory | "all" = "all",
  cursor?: NotificationCursor
): Promise<NotificationsResult> {
  const user = await getFreshUser();
  const empty: NotificationsResult = {
    items: [],
    nextCursor: null,
    unread: { total: 0, byCategory: { system: 0, like: 0, comment: 0 } },
  };
  if (!user) return empty;

  // 入参同样走 schema 校验。
  const parsed = parseInput(notificationsQuerySchema, { category, cursor });
  if (!parsed.data) return empty;

  const [{ items, nextCursor }, unread] = await Promise.all([
    getUserNotifications(user.id, parsed.data.category, parsed.data.cursor, 20),
    getUnreadSummary(user.id),
  ]);
  return { items, nextCursor, unread };
}

// 标记单条已读；失败返回受控错误，不抛出异常给客户端。
export async function markNotificationRead(id: string): Promise<NotificationActionState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };
  const parsed = parseId(id);
  if (!parsed.data) return { ok: false, error: "通知 ID 无效" };
  try {
    await prisma.notification.updateMany({
      where: { id: parsed.data, userId: user.id, read: false },
      data: { read: true },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "操作失败，请稍后重试" };
  }
}

export async function markAllNotificationsRead(): Promise<NotificationActionState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };
  try {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "操作失败，请稍后重试" };
  }
}

export async function markCategoryRead(category: NotificationCategory): Promise<NotificationActionState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };
  const parsed = parseInput(notificationCategorySchema, category);
  if (!parsed.data) return { ok: false, error: "通知分类无效" };
  try {
    await prisma.notification.updateMany({
      where: { userId: user.id, category: parsed.data, read: false },
      data: { read: true },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "操作失败，请稍后重试" };
  }
}

export async function clearReadNotifications(): Promise<NotificationActionState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };
  try {
    await prisma.notification.deleteMany({ where: { userId: user.id, read: true } });
    return { ok: true };
  } catch {
    return { ok: false, error: "操作失败，请稍后重试" };
  }
}

// 删除通知；失败返回受控错误，不向用户暴露数据库异常。
export async function deleteNotification(id: string): Promise<NotificationActionState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };
  const parsed = parseId(id);
  if (!parsed.data) return { ok: false, error: "通知 ID 无效" };
  try {
    await prisma.notification.deleteMany({ where: { id: parsed.data, userId: user.id } });
    return { ok: true };
  } catch {
    return { ok: false, error: "操作失败，请稍后重试" };
  }
}
