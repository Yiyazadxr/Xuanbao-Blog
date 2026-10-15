// RSS 2.0 分页使用 RFC 5005 的 self、next 和 previous 链接。
import { unstable_cache } from "next/cache";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/constants";
import { plainExcerpt } from "@/lib/utils";

export const RSS_PAGE_SIZE = 20;

// 页码设上限，防止巨额 offset 空扫。
export const RSS_MAX_PAGE = 1000;

export type RssPost = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  createdAt: Date;
  categoryName: string | null;
  tags: string[];
  authorName: string | null;
};

export function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function fetchRssPosts({
  where,
  page,
}: {
  where: Prisma.PostWhereInput;
  page: number;
}): Promise<{ posts: RssPost[]; total: number }> {
  const skip = (page - 1) * RSS_PAGE_SIZE;
  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: RSS_PAGE_SIZE,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        createdAt: true,
        category: { select: { name: true } },
        tags: { select: { tag: { select: { name: true } } } },
        author: { select: { name: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const posts: RssPost[] = rows.map((r) => ({
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    content: r.content,
    createdAt: r.createdAt,
    categoryName: r.category?.name ?? null,
    tags: r.tags.map((t) => t.tag.name),
    authorName: r.author?.name ?? null,
  }));

  return { posts, total };
}

export type RssFeedKind = "all" | "category" | "series" | "tag";

// Route Handler 要读取请求 URL，不能整体静态缓存；按订阅类型、slug 和页码缓存数据库结果。
export const getCachedRssFeedData = unstable_cache(
  async (kind: RssFeedKind, slug: string, page: number) => {
    let name: string | null = null;
    const where: Prisma.PostWhereInput = { published: true, archived: false };

    if (kind === "category") {
      name = (await prisma.category.findUnique({ where: { slug }, select: { name: true } }))?.name ?? null;
      where.category = { slug };
    } else if (kind === "series") {
      name = (await prisma.series.findUnique({ where: { slug }, select: { name: true } }))?.name ?? null;
      where.series = { slug };
    } else if (kind === "tag") {
      name = (await prisma.tag.findUnique({ where: { slug }, select: { name: true } }))?.name ?? null;
      where.tags = { some: { tag: { slug } } };
    }

    if (kind !== "all" && !name) return null;
    return { name, ...await fetchRssPosts({ where, page }) };
  },
  ["rss-feed-data"],
  { revalidate: 60 }
);

// 非法页码回落到第 1 页，并钳制到上限。
export function parsePage(searchParams: URLSearchParams): number {
  const raw = Number(searchParams.get("page"));
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(Math.floor(raw), RSS_MAX_PAGE);
}

export function buildRssFeed(opts: {
  title: string;
  description: string;
  feedPath: string;
  posts: RssPost[];
  page: number;
  total: number;
}): Response {
  const { title, description, feedPath, posts, page, total } = opts;

  const base = `${SITE.url}/feed.xml${feedPath ? `/${feedPath}` : ""}`;
  const selfUrl = page > 1 ? `${base}?page=${page}` : base;
  const totalPages = Math.max(1, Math.ceil(total / RSS_PAGE_SIZE));

  // channel link 指向对应的公开页面。
  const [kind, slug] = feedPath ? feedPath.split("/") : ["", ""];
  const channelLink = feedPath ? `${SITE.url}/blog/${kind}/${slug}` : `${SITE.url}/blog`;

  const items = posts
    .map((post) => {
      const categories = [post.categoryName, ...post.tags]
        .filter((c): c is string => Boolean(c))
        .map((c) => `      <category>${escapeXml(c)}</category>`)
        .join("\n");
      const creator = post.authorName
        ? `      <dc:creator>${escapeXml(post.authorName)}</dc:creator>`
        : "";
      const extras = [categories, creator].filter(Boolean).join("\n");
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE.url}/blog/${post.slug}</link>
      <guid>${SITE.url}/blog/${post.slug}</guid>
      <description>${escapeXml(post.excerpt || plainExcerpt(post.content))}</description>
      <pubDate>${post.createdAt.toUTCString()}</pubDate>${extras ? `\n${extras}` : ""}
    </item>`;
    })
    .join("\n");

  const navLinks: string[] = [`    <atom:link rel="self" href="${escapeXml(selfUrl)}" />`];
  if (page < totalPages) {
    navLinks.push(`    <atom:link rel="next" href="${escapeXml(`${base}?page=${page + 1}`)}" />`);
  }
  if (page > 1) {
    const prev = page - 1 === 1 ? base : `${base}?page=${page - 1}`;
    navLinks.push(`    <atom:link rel="previous" href="${escapeXml(prev)}" />`);
  }

  const lastBuildDate = (posts[0]?.createdAt ?? new Date(0)).toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>${escapeXml(SITE.name)}</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <ttl>60</ttl>
${navLinks.join("\n")}
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // CDN 按完整 URL（包括页码）缓存，减少重复抓取的数据库开销。
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
    },
  });
}
