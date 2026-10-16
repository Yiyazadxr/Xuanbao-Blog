// 通知分类与类型由客户端和服务端共用。
// category 决定通知中心的 Tab 分组；type 为细分事件（用于图标与文案）

export const NOTIFICATION_CATEGORIES = {
  SYSTEM: "system",
  LIKE: "like",
  COMMENT: "comment",
} as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

export const NOTIFICATION_CATEGORY_META: Record<
  NotificationCategory,
  { label: string; icon: string; color: string }
> = {
  [NOTIFICATION_CATEGORIES.SYSTEM]: {
    label: "系统通知",
    icon: "ph:megaphone-bold",
    color: "text-accent",
  },
  [NOTIFICATION_CATEGORIES.LIKE]: {
    label: "赞",
    icon: "ph:heart-bold",
    color: "text-rose-500",
  },
  [NOTIFICATION_CATEGORIES.COMMENT]: {
    label: "评论与回复",
    icon: "ph:chat-circle-dots-bold",
    color: "text-sky-500",
  },
};

export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  NOTIFICATION_CATEGORIES.SYSTEM,
  NOTIFICATION_CATEGORIES.LIKE,
  NOTIFICATION_CATEGORIES.COMMENT,
];

// 可序列化通知条目。
export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  type: string;
  actorName: string | null;
  // 聚合后去重过的触发者昵称（最新在前）
  actorNames: string[];
  // 聚合的事件总次数（同一人反复触发也累加；无昵称的系统通知用它显示「×N」）
  count: number;
  title: string;
  link: string | null;
  read: boolean;
  // 最近一次聚合（或首次创建）的时间，用于排序与「N 分钟前」展示
  lastMergedAt: string;
};

export type NotificationCursor = { id: string; lastMergedAt: string };

// 铃铛和通知中心共用聚合文案。
// 规则：单个触发者显示其昵称；多个触发者显示首位昵称 + 总人数
export type NotificationText = {
  actorText: string | null;
  title: string;
  // 无触发者的系统通知用「×N」表达聚合次数
  countSuffix: string | null;
};

export function formatNotificationText(item: NotificationItem): NotificationText {
  const names = item.actorNames;
  let actorText: string | null = null;
  if (names.length >= 2) {
    actorText = `${names[0]} 等 ${names.length} 人`;
  } else if (names.length === 1) {
    actorText = names[0];
  } else if (item.actorName) {
    // 兼容仅含 actorName 的旧通知。
    actorText = item.actorName;
  }
  return {
    actorText,
    title: item.title,
    countSuffix: !actorText && item.count > 1 ? `×${item.count}` : null,
  };
}

// 各分类未读计数汇总
export type NotificationUnreadSummary = {
  total: number;
  byCategory: Record<NotificationCategory, number>;
};
