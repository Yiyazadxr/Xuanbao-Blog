import type { MetadataRoute } from "next";
import { QUERY_LIMITS, SITE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// 与公开页面一致，避免爬虫每次请求直达数据库。
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 四类条目均设 take 上限：文章按更新时间取最新，分类/标签/系列按名称稳定选取；
  // 超出上限的条目不进 sitemap（个人博客量级远低于上限，仅防止异常数据拖慢生成）。
  const [posts, categories, series, tags] = await Promise.all([
    prisma.post.findMany({
      where: { published: true, archived: false },
      orderBy: { updatedAt: "desc" },
      take: QUERY_LIMITS.sitemap,
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, take: QUERY_LIMITS.sitemap, select: { slug: true } }),
    prisma.series.findMany({ orderBy: { name: "asc" }, take: QUERY_LIMITS.sitemap, select: { slug: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, take: QUERY_LIMITS.sitemap, select: { slug: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/blog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/blog/archive`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/social`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE.url}/tools`, changeFrequency: "monthly", priority: 0.4 },
  ];

  return [
    ...staticPages,
    ...posts.map((post) => ({
      url: `${SITE.url}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: `${SITE.url}/blog/category/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...series.map((s) => ({
      url: `${SITE.url}/blog/series/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...tags.map((t) => ({
      url: `${SITE.url}/blog/tag/${t.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
