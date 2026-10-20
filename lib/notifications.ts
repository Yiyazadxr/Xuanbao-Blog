import { runAfter } from "@/lib/deferred";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationCursor,
  type NotificationItem,
  type NotificationUnreadSummary,
} from "@/lib/notification-types";

export type NotificationData = {
  category: NotificationCategory;
  type: string;
  title: string;
  actorName?: string;
  link?: string;
  /**
   * 聚合键（如 `like:${postId}`、`comment:${postId}`）。
   * 同一接收者 + 同一聚合键的「未读且在聚合窗口内」通知会合并为一条，
   * 不传则每次都新建一条（适合「禁言/解禁」这类需要逐条留档的系统通知）。
   */
  aggregateKey?: string;
};

const MAX_NOTIFICATIONS = 200;
const RETENTION_DAYS = 7;
// 仅合并窗口内的未读通知。
const AGGREGATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ACTOR_NAMES = 20;
// 清理按概率惰性触发。
const CLEANUP_PROBABILITY = 0.05;

// 损坏的昵称 JSON 降级为空数组。
function parseActorNames(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((n): n is string => typeof n === "string")
      : [];
  } catch {
    return [];
  }
}

// 删除超过 7 天或 200 条上限之外的通知。
async function cleanupForUser(userId: string) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.notification.deleteMany({
    where: { userId, createdAt: { lt: cutoff } },
  });
  // 超出上限时按最旧顺序删除；用子查询直接删除，避免把全部 id 读进内存拼成超长 IN 列表。
  await prisma.$executeRaw`
    DELETE FROM "Notification"
    WHERE "userId" = ${userId}
      AND "id" IN (
        SELECT "id" FROM "Notification"
        WHERE "userId" = ${userId}
        ORDER BY "lastMergedAt" DESC, "id" DESC
        OFFSET ${MAX_NOTIFICATIONS}
      )
  `;
}

// 清理失败不影响主流程。
function maybeCleanup(userId: string) {
  if (Math.random() >= CLEANUP_PROBABILITY) return;
  runAfter(() => cleanupForUser(userId));
}

async function mergeIntoAggregate(
  userId: string,
  data: NotificationData,
  actor: string | null
) {
  const since = new Date(Date.now() - AGGREGATE_WINDOW_MS);
  const retentionCutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      aggregateKey: data.aggregateKey,
      read: false,
      createdAt: { gt: retentionCutoff },
      lastMergedAt: { gt: since },
    },
    orderBy: { lastMergedAt: "desc" },
    select: { id: true, actorNames: true },
  });
  if (!existing) return null;

  // 同一触发者只更新昵称顺序，不增加人数。
  const names = parseActorNames(existing.actorNames);
  const deduped = actor
    ? [actor, ...names.filter((n) => n !== actor)].slice(0, MAX_ACTOR_NAMES)
    : names;

  return prisma.notification.update({
    where: { id: existing.id },
    data: {
      count: { increment: 1 },
      actorNames: deduped.length > 0 ? JSON.stringify(deduped) : null,
      // 无昵称的系统事件不清空 actorName。
      ...(actor ? { actorName: actor } : {}),
      title: data.title,
      ...(data.link ? { link: data.link } : {}),
      // lastMergedAt 用于聚合和排序；createdAt 仅用于清理。
      lastMergedAt: new Date(),
    },
  });
}

async function upsertNotification(userId: string, data: NotificationData) {
  const actor = data.actorName?.trim() || null;

  if (data.aggregateKey) {
    // 并发时可能产生两条等价通知；不影响业务正确性，不加分布式锁。
    const merged = await mergeIntoAggregate(userId, data, actor);
    // 合并路径同样需要清理，否则只收聚合通知的用户会长期超过上限。
    if (merged) {
      maybeCleanup(userId);
      return merged;
    }
  }

  const created = await prisma.notification.create({
    data: {
      userId,
      category: data.category,
      type: data.type,
      title: data.title,
      actorName: actor,
      link: data.link ?? null,
      aggregateKey: data.aggregateKey ?? null,
      actorNames: actor ? JSON.stringify([actor]) : null,
      count: 1,
    },
  });
  maybeCleanup(userId);
  return created;
}

export async function createNotification(userId: string, data: NotificationData) {
  return upsertNotification(userId, data);
}

export async function notifyAdmins(data: NotificationData) {
  const admins = await prisma.user.findMany({
    where: { role: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] } },
    select: { id: true },
  });
  if (admins.length === 0) return;
  // 聚合键按管理员隔离，因此逐个写入。
  await Promise.all(admins.map((a) => upsertNotification(a.id, data)));
}

function serialize(n: {
  id: string;
  category: string;
  type: string;
  actorName: string | null;
  title: string;
  link: string | null;
  read: boolean;
  lastMergedAt: Date;
  actorNames: string | null;
  count: number;
}): NotificationItem {
  return {
    id: n.id,
    category: n.category as NotificationCategory,
    type: n.type,
    actorName: n.actorName,
    actorNames: parseActorNames(n.actorNames),
    count: n.count,
    title: n.title,
    link: n.link,
    read: n.read,
    lastMergedAt: n.lastMergedAt.toISOString(),
  };
}

export async function getUserNotifications(
  userId: string,
  category: NotificationCategory | "all",
  cursor?: NotificationCursor,
  pageSize = 20
): Promise<{ items: NotificationItem[]; nextCursor: NotificationCursor | null }> {
  const where = {
    userId,
    ...(category !== "all" ? { category } : {}),
    ...(cursor ? { OR: [
      { lastMergedAt: { lt: new Date(cursor.lastMergedAt) } },
      { lastMergedAt: new Date(cursor.lastMergedAt), id: { lt: cursor.id } },
    ] } : {}),
  };
  const rows = await prisma.notification.findMany({
    where,
    orderBy: [{ lastMergedAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
    select: {
      id: true,
      category: true,
      type: true,
      actorName: true,
      title: true,
      link: true,
      read: true,
      lastMergedAt: true,
      actorNames: true,
      count: true,
    },
  });

  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  return {
    items: page.map(serialize),
    nextCursor: hasMore && page.length > 0
      ? { id: page[page.length - 1].id, lastMergedAt: page[page.length - 1].lastMergedAt.toISOString() }
      : null,
  };
}

export async function getUnreadSummary(userId: string): Promise<NotificationUnreadSummary> {
  const grouped = await prisma.notification.groupBy({
    by: ["category"],
    where: { userId, read: false },
    _count: { _all: true },
  });
  const byCategory = {
    [NOTIFICATION_CATEGORIES.SYSTEM]: 0,
    [NOTIFICATION_CATEGORIES.LIKE]: 0,
    [NOTIFICATION_CATEGORIES.COMMENT]: 0,
  } as Record<NotificationCategory, number>;
  let total = 0;
  for (const g of grouped) {
    const c = g.category as NotificationCategory;
    byCategory[c] = g._count._all;
    total += g._count._all;
  }
  return { total, byCategory };
}
