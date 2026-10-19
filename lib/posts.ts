import { unstable_cache } from "next/cache";
import { cache } from "react";
import { QUERY_LIMITS, SITE } from "@/lib/constants";
import { recordDailyView } from "@/lib/daily-stats";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readingTimeFromWordCount, daysBetween, searchSnippet } from "@/lib/utils";

// 公开可见的文章过滤条件：已发布且未归档（草稿/归档均不进入前台）
export const PUBLISHED_FILTER = { published: true, archived: false } as const;

// 列表项不包含正文，摘要和阅读时长由服务端生成。
export type PostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  readingTime: number;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
};

type ListPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  wordCount: number | null;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
};

// 摘要和字数已落库，列表查询不读取正文。
export function toListItem(row: ListPostRow): PostListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    coverImage: row.coverImage,
    readingTime: readingTimeFromWordCount(row.wordCount),
    createdAt: row.createdAt,
    category: row.category,
    tags: row.tags,
  };
}

// 列表查询不读取 content。
export const listSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  wordCount: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
} as const;

// 公开文章置顶优先；take 在查询层限制数量。
export async function getPosts({
  categorySlug,
  tagSlug,
  seriesSlug,
  skip = 0,
  take,
}: {
  categorySlug?: string;
  tagSlug?: string;
  seriesSlug?: string;
  skip?: number;
  take?: number;
} = {}) {
  const where = {
    ...PUBLISHED_FILTER,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
    ...(seriesSlug ? { series: { slug: seriesSlug } } : {}),
  };

  const pageSize = typeof take === "number" && Number.isSafeInteger(take) && take > 0
    ? Math.min(take, QUERY_LIMITS.postList) : QUERY_LIMITS.postList;
  const offset = Number.isSafeInteger(skip) && skip >= 0 ? skip : 0;
  const total = await prisma.post.count({ where });
  const effectiveSkip = total === 0 ? 0 : Math.min(offset, Math.floor((total - 1) / pageSize) * pageSize);
  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: listSelect,
    skip: effectiveSkip,
    take: pageSize,
  });

  const posts = rows.map(toListItem);
  return { posts, total };
}

// 首页精选文章
export async function getFeaturedPosts() {
  const rows = await prisma.post.findMany({
    where: { ...PUBLISHED_FILTER, featured: true },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: listSelect,
  });
  return rows.map(toListItem);
}

// 公开搜索覆盖全部文章，只将当前结果页返回客户端。
export async function searchPosts(query: string, skip: number, take: number) {
  const normalized = query.trim();
  if (!normalized) return { posts: [], total: 0 };

  const where = {
    ...PUBLISHED_FILTER,
    OR: [
      { title: { contains: normalized, mode: "insensitive" as const } },
      { excerpt: { contains: normalized, mode: "insensitive" as const } },
      { searchText: { contains: normalized, mode: "insensitive" as const } },
    ],
  };
  const pageSize = Number.isSafeInteger(take) && take > 0
    ? Math.min(take, QUERY_LIMITS.searchPage) : QUERY_LIMITS.searchPage;
  const offset = Number.isSafeInteger(skip) && skip >= 0 ? skip : 0;
  const total = await prisma.post.count({ where });
  const effectiveSkip = total === 0 ? 0 : Math.min(offset, Math.floor((total - 1) / pageSize) * pageSize);
  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: { ...listSelect, searchText: true },
    skip: effectiveSkip,
    take: pageSize,
  });
  return {
    posts: rows.map((row) => ({
      ...toListItem(row),
      snippet: searchSnippet(row.searchText ?? row.excerpt ?? "", normalized),
    })),
    total,
  };
}

// 单篇文章详情
// React cache 在单次请求内复用详情查询。
export const getPostBySlug = cache(async (slug: string) => {
  return prisma.post.findFirst({
    where: { slug, ...PUBLISHED_FILTER },
    include: {
      author: { select: { name: true, image: true } },
      category: true,
      series: true,
      tags: { include: { tag: true } },
    },
  });
});

// 分类详情（按 slug）
// React cache 在单次请求内复用分类查询。
export const getCategoryBySlug = cache(async (slug: string) => {
  return prisma.category.findUnique({ where: { slug } });
});

// 旧 slug 只从版本表解析到当前文章，供永久重定向使用；草稿和归档不暴露旧地址。
export const getPublishedPostByLegacySlug = cache(async (slug: string) => {
  const revision = await prisma.postRevision.findFirst({
    where: { slug, post: PUBLISHED_FILTER },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { post: { select: { slug: true } } },
  });
  return revision?.post ?? null;
});

// 标签/系列 metadata 与页面主体共用，避免同一次请求重复查询 Prisma。
export const getTagBySlug = cache(async (slug: string) => {
  return prisma.tag.findUnique({ where: { slug } });
});

export const getSeriesBySlug = cache(async (slug: string) => {
  return prisma.series.findUnique({ where: { slug } });
});

export type SeriesChapter = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  createdAt: Date;
  readingTime: number;
};

// 系列章节和文章页前后篇共用创建时间 + ID 的稳定顺序。
// 目录只选择展示所需字段，不读取正文。
export async function getSeriesChapters(seriesId: string): Promise<SeriesChapter[]> {
  const rows = await prisma.post.findMany({
    where: { ...PUBLISHED_FILTER, seriesId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      createdAt: true,
      wordCount: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    createdAt: row.createdAt,
    readingTime: readingTimeFromWordCount(row.wordCount),
  }));
}

// 同一系列内的上一篇 / 下一篇（按发布时间升序，即系列连载顺序）
export async function getSeriesAdjacent(seriesId: string, postId: string) {
  const select = { id: true, title: true, slug: true, createdAt: true } as const;
  const current = await prisma.post.findFirst({ where: { ...PUBLISHED_FILTER, id: postId, seriesId }, select });
  if (!current) return { prev: null, next: null };
  const [prev, next] = await Promise.all([
    prisma.post.findFirst({
      where: { ...PUBLISHED_FILTER, seriesId, OR: [
        { createdAt: { lt: current.createdAt } },
        { createdAt: current.createdAt, id: { lt: current.id } },
      ] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select,
    }),
    prisma.post.findFirst({
      where: { ...PUBLISHED_FILTER, seriesId, OR: [
        { createdAt: { gt: current.createdAt } },
        { createdAt: current.createdAt, id: { gt: current.id } },
      ] },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select,
    }),
  ]);
  return {
    prev: prev ? { title: prev.title, slug: prev.slug } : null,
    next: next ? { title: next.title, slug: next.slug } : null,
  };
}

// 上一篇 / 下一篇（按发布时间和 ID 稳定排序）
export async function getAdjacentPosts(postId: string, createdAt: Date) {
  const select = { title: true, slug: true } as const;
  const [prev, next] = await Promise.all([
    prisma.post.findFirst({
      where: {
        ...PUBLISHED_FILTER,
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: postId } },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select,
    }),
    prisma.post.findFirst({
      where: {
        ...PUBLISHED_FILTER,
        OR: [
          { createdAt: { gt: createdAt } },
          { createdAt, id: { gt: postId } },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select,
    }),
  ]);
  return { prev, next };
}

// 相关阅读条数
const RELATED_COUNT = 3;

// 相关阅读：优先同分类、不足补同标签，按浏览量降序（热文优先）。
// 分两段查询而非 OR：同分类结果排在前，避免被同标签结果打乱顺序。
export async function getRelatedPosts(post: {
  id: string;
  categoryId: string | null;
  tagIds: string[];
}): Promise<PostListItem[]> {
  const picked: PostListItem[] = [];
  const exclude = new Set<string>([post.id]);

  if (post.categoryId) {
    const rows = await prisma.post.findMany({
      where: { ...PUBLISHED_FILTER, categoryId: post.categoryId, id: { notIn: [...exclude] } },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: RELATED_COUNT,
      select: listSelect,
    });
    for (const row of rows) {
      picked.push(toListItem(row));
      exclude.add(row.id);
    }
  }

  if (picked.length < RELATED_COUNT && post.tagIds.length > 0) {
    const rows = await prisma.post.findMany({
      where: {
        ...PUBLISHED_FILTER,
        id: { notIn: [...exclude] },
        tags: { some: { tagId: { in: post.tagIds } } },
      },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: RELATED_COUNT - picked.length,
      select: listSelect,
    });
    for (const row of rows) picked.push(toListItem(row));
  }

  return picked;
}

// 仅统计仍然公开的文章；无效 ID 或撤稿不会污染每日统计。
export async function incrementViewCount(id: string) {
  // Prisma 的 @updatedAt 会让 updateMany 同时修改文章版本；浏览量不是内容修订，
  // 因此使用参数化 SQL 仅递增计数，避免使“继续阅读”中的内容版本失效。
  const changed = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE "Post"
    SET "viewCount" = "viewCount" + 1
    WHERE "id" = ${id} AND "published" = true AND "archived" = false
    RETURNING "id"
  `);
  if (changed.length === 0) return false;
  await recordDailyView();
  return true;
}

// 分类列表（带公开文章数）
export async function getCategoriesWithCount() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { posts: { where: PUBLISHED_FILTER } } } },
    orderBy: { name: "asc" },
  });
  return categories.map((c) => ({ ...c, postCount: c._count.posts }));
}

// 标签列表（带公开文章数）
export async function getTagsWithCount() {
  const tags = await prisma.tag.findMany({
    include: {
      _count: { select: { posts: { where: { post: PUBLISHED_FILTER } } } },
    },
    orderBy: { name: "asc" },
  });
  return tags.map((t) => ({ ...t, postCount: t._count.posts }));
}

// 归档：全部公开文章按年份分组（新→旧）
export async function getArchive() {
  const posts = await prisma.post.findMany({
    where: PUBLISHED_FILTER,
    orderBy: { createdAt: "desc" },
    select: { title: true, slug: true, createdAt: true },
    take: QUERY_LIMITS.archive,
  });
  const byYear = new Map<number, typeof posts>();
  for (const post of posts) {
    const year = post.createdAt.getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(post);
  }
  return [...byYear.entries()].map(([year, items]) => ({ year, posts: items }));
}

// 页脚统计：运行天数 + 总阅读量 + 公开文章数 + 正文总字数
// 用 unstable_cache 包裹，5 分钟内重复请求直接返回缓存，避免每个页面都查库。
// 注：Next 16 中 unstable_cache 已弃用，推荐迁移至 "use cache" + cacheTag/cacheLife；
// 但需要在 next.config.ts 启用 cacheComponents，并显式声明动态 API，
// 会改变所有路由的缓存语义，暂未迁移。
export const getSiteStats = unstable_cache(
  async () => {
    const aggregate = await prisma.post.aggregate({
      where: PUBLISHED_FILTER,
      _count: { _all: true },
      _sum: { viewCount: true, wordCount: true },
    });

    const days = daysBetween(SITE.launchedAt);

    return {
      days,
      views: aggregate._sum.viewCount ?? 0,
      posts: aggregate._count._all,
      words: aggregate._sum.wordCount ?? 0,
    };
  },
  ["site-stats"],
  { revalidate: 300 } // 5 分钟 ISR 缓存
);
