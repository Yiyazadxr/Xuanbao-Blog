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

  // 分类和游标均按共享 schema 校验。
  const parsed = parseInput(notificationsQuerySchema, { category, cursor });
  if (!parsed.data) return empty;

  const [{ items, nextCursor }, unread] = await Promise.all([
    getUserNotifications(user.id, parsed.data.category, parsed.data.cursor, 20),
    getUnreadSummary(user.id),
  ]);
  return { items, nextCursor, unread };
}

// 仅可修改本人的通知。
export async function markNotificationRead(id: string) {
  const user = await getFreshUser();
  if (!user) throw new Error("NOTIFICATION_AUTH_REQUIRED");
  const parsed = parseId(id);
  if (!parsed.data) throw new Error("INVALID_NOTIFICATION_ID");
  await prisma.notification.updateMany({
    where: { id: parsed.data, userId: user.id, read: false },
    data: { read: true },
  });
}

export async function markAllNotificationsRead() {
  const user = await getFreshUser();
  if (!user) throw new Error("NOTIFICATION_AUTH_REQUIRED");
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
}

export async function markCategoryRead(category: NotificationCategory) {
  const user = await getFreshUser();
  if (!user) throw new Error("NOTIFICATION_AUTH_REQUIRED");
  const parsed = parseInput(notificationCategorySchema, category);
  if (!parsed.data) throw new Error("INVALID_NOTIFICATION_CATEGORY");
  await prisma.notification.updateMany({
    where: { userId: user.id, category: parsed.data, read: false },
    data: { read: true },
  });
}

export async function clearReadNotifications() {
  const user = await getFreshUser();
  if (!user) throw new Error("NOTIFICATION_AUTH_REQUIRED");
  await prisma.notification.deleteMany({ where: { userId: user.id, read: true } });
}

// 仅可删除本人的通知。
export async function deleteNotification(id: string) {
  const user = await getFreshUser();
  if (!user) throw new Error("NOTIFICATION_AUTH_REQUIRED");
  const parsed = parseId(id);
  if (!parsed.data) throw new Error("INVALID_NOTIFICATION_ID");
  await prisma.notification.deleteMany({ where: { id: parsed.data, userId: user.id } });
}
