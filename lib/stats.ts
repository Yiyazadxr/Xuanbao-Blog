// 后台统计看板数据聚合层：概览计数 + 趋势序列 + 热门文章 + 分类分布
// 说明：浏览量按天来自 DailyViewStat；评论/点赞/注册自带 createdAt，按天分桶推算即可。
import { dayKeyOf, dayKeyToStart, shiftDayKey } from "@/lib/daily-stats";
import { PUBLISHED_FILTER } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

// 可选时间范围（天）
export const DASHBOARD_RANGES = [7, 30, 90] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

// URL 参数 → 时间范围，非法值回落 30 天
export function parseRange(value: string | undefined): DashboardRange {
  const n = Number(value);
  return (DASHBOARD_RANGES as readonly number[]).includes(n) ? (n as DashboardRange) : 30;
}

export type TrendPoint = {
  date: string; // YYYY-MM-DD（东八区日键）
  views: number;
  comments: number;
  likes: number;
  users: number;
};

export type TopPostStat = {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  comments: number;
  likes: number;
};

export type CategoryStat = {
  id: string;
  name: string;
  slug: string;
  posts: number;
  views: number;
};

// 本期 vs 上一周期（等长），供卡片算环比
export type RangeDelta = { current: number; previous: number };

export type DashboardData = {
  range: DashboardRange;
  totals: {
    views: number; // 全站累计浏览（仅公开文章，与页脚口径一致）
    comments: number; // 已审核评论总数
    likes: number;
    published: number;
    drafts: number;
    users: number;
    pendingComments: number;
    pendingRequests: number;
  };
  delta: {
    views: RangeDelta;
    comments: RangeDelta;
    likes: RangeDelta;
    users: RangeDelta;
  };
  trend: TrendPoint[];
  topPosts: TopPostStat[];
  categories: CategoryStat[];
};

// 环图最多展示的分类数，其余归入「其他」
const MAX_CATEGORY_SLICES = 6;
// 热门文章条数
const TOP_POSTS_TAKE = 8;

// 看板数据：一次性并行取数后按天分桶
export async function getDashboardData(range: DashboardRange): Promise<DashboardData> {
  const endKey = dayKeyOf();
  const startKey = shiftDayKey(endKey, -(range - 1));
  // 环比需要等长的上一周期，故窗口取 2 倍长度：一次查询后切成两段，省一轮库查询
  const windowStartKey = shiftDayKey(startKey, -range);
  const windowStart = dayKeyToStart(windowStartKey);
  const rangeEnd = dayKeyToStart(shiftDayKey(endKey, 1)); // 左闭右开

  const [
    viewRows,
    commentRows,
    likeRows,
    userRows,
    viewSum,
    commentCount,
    likeCount,
    published,
    drafts,
    users,
    pendingComments,
    pendingRequests,
    topRows,
    categoryRows,
  ] = await Promise.all([
    prisma.dailyViewStat.findMany({
      where: { date: { gte: windowStartKey, lte: endKey } },
      select: { date: true, views: true },
    }),
    // 只取 createdAt 一列在服务端按天分桶：个人博客数据量级下比按天 count 轮询更省
    prisma.comment.findMany({
      where: { isApproved: true, createdAt: { gte: windowStart, lt: rangeEnd } },
      select: { createdAt: true },
    }),
    prisma.like.findMany({
      where: { createdAt: { gte: windowStart, lt: rangeEnd } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: windowStart, lt: rangeEnd } },
      select: { createdAt: true },
    }),
    prisma.post.aggregate({ _sum: { viewCount: true }, where: PUBLISHED_FILTER }),
    prisma.comment.count({ where: { isApproved: true } }),
    prisma.like.count(),
    prisma.post.count({ where: PUBLISHED_FILTER }),
    prisma.post.count({ where: { published: false, archived: false } }),
    prisma.user.count(),
    prisma.comment.count({ where: { isApproved: false } }),
    prisma.accountRequest.count({ where: { status: "PENDING" } }),
    prisma.post.findMany({
      where: PUBLISHED_FILTER,
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: TOP_POSTS_TAKE,
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        _count: { select: { comments: { where: { isApproved: true } }, likes: true } },
      },
    }),
    // 分类维度同时要文章数与浏览量：一次取回后内存聚合，避免每个分类各查一次
    prisma.post.findMany({
      where: PUBLISHED_FILTER,
      select: { viewCount: true, category: { select: { id: true, name: true, slug: true } } },
    }),
  ]);

  // 按天分桶（东八区），缺失的日期补 0，保证趋势图 X 轴连续
  const buckets: TrendPoint[] = Array.from({ length: range * 2 }, (_, i) => ({
    date: shiftDayKey(windowStartKey, i),
    views: 0,
    comments: 0,
    likes: 0,
    users: 0,
  }));
  const indexOf = new Map(buckets.map((b, i) => [b.date, i]));

  for (const row of viewRows) {
    const i = indexOf.get(row.date);
    if (i !== undefined) buckets[i].views += row.views;
  }
  for (const row of commentRows) {
    const i = indexOf.get(dayKeyOf(row.createdAt));
    if (i !== undefined) buckets[i].comments += 1;
  }
  for (const row of likeRows) {
    const i = indexOf.get(dayKeyOf(row.createdAt));
    if (i !== undefined) buckets[i].likes += 1;
  }
  for (const row of userRows) {
    const i = indexOf.get(dayKeyOf(row.createdAt));
    if (i !== undefined) buckets[i].users += 1;
  }

  const previous = buckets.slice(0, range);
  const current = buckets.slice(range);
  const sum = (rows: TrendPoint[], key: keyof Omit<TrendPoint, "date">) =>
    rows.reduce((s, r) => s + r[key], 0);

  return {
    range,
    totals: {
      views: viewSum._sum.viewCount ?? 0,
      comments: commentCount,
      likes: likeCount,
      published,
      drafts,
      users,
      pendingComments,
      pendingRequests,
    },
    delta: {
      views: { current: sum(current, "views"), previous: sum(previous, "views") },
      comments: { current: sum(current, "comments"), previous: sum(previous, "comments") },
      likes: { current: sum(current, "likes"), previous: sum(previous, "likes") },
      users: { current: sum(current, "users"), previous: sum(previous, "users") },
    },
    trend: current,
    topPosts: topRows.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      viewCount: p.viewCount,
      comments: p._count.comments,
      likes: p._count.likes,
    })),
    categories: aggregateCategories(categoryRows),
  };
}

type CategoryRow = {
  viewCount: number;
  category: { id: string; name: string; slug: string } | null;
};

// 分类聚合：按文章数降序，超出上限的合并为「其他」
function aggregateCategories(rows: CategoryRow[]): CategoryStat[] {
  const map = new Map<string, CategoryStat>();
  for (const row of rows) {
    const c = row.category;
    const key = c?.id ?? "__none__";
    const hit = map.get(key);
    if (hit) {
      hit.posts += 1;
      hit.views += row.viewCount;
    } else {
      map.set(key, {
        id: key,
        name: c?.name ?? "未分类",
        slug: c?.slug ?? "",
        posts: 1,
        views: row.viewCount,
      });
    }
  }

  const sorted = [...map.values()].sort((a, b) => b.posts - a.posts || b.views - a.views);
  if (sorted.length <= MAX_CATEGORY_SLICES + 1) return sorted;

  const head = sorted.slice(0, MAX_CATEGORY_SLICES);
  const rest = sorted.slice(MAX_CATEGORY_SLICES);
  head.push({
    id: "__other__",
    name: "其他",
    slug: "",
    posts: rest.reduce((s, r) => s + r.posts, 0),
    views: rest.reduce((s, r) => s + r.views, 0),
  });
  return head;
}
