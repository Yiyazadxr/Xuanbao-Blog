import { NextResponse } from "next/server";
import { searchPosts } from "@/lib/posts";
import { parsePage, clampPage } from "@/lib/pagination";
import { QUERY_LIMITS } from "@/lib/constants";
import { postSearchQuerySchema } from "@/lib/validation";
import type { PostSearchResponse } from "@/lib/post-page-types";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// 按需检索完整正文，只返回当前结果页，避免扩大 /blog 的 RSC payload。

export async function GET(request: Request) {
  const started = performance.now();
  const parsed = postSearchQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "搜索参数不合法" }, { status: 400 });
  const ip = await getClientIp();
  const check = await rateLimit.checkAndHit("post-search", ip, 120, 60_000);
  if (check.blocked) {
    return NextResponse.json({ error: "rate_limited" }, {
      status: 429,
      headers: { "Retry-After": String(check.retryAfterSec), "Cache-Control": "private, no-store" },
    });
  }
  const requested = parsePage(parsed.data.page);
  const skip = Math.min(requested - 1, Math.floor(Number.MAX_SAFE_INTEGER / QUERY_LIMITS.searchPage)) * QUERY_LIMITS.searchPage;
  const { posts, total } = await searchPosts(parsed.data.q, skip, QUERY_LIMITS.searchPage);
  const response: PostSearchResponse = {
    posts: posts.map((post) => ({ ...post, createdAt: post.createdAt.toISOString() })),
    total,
    page: clampPage(requested, total, QUERY_LIMITS.searchPage),
  };
  const duration = Math.max(0, performance.now() - started).toFixed(1);
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "private, no-store",
      "Server-Timing": `query;dur=${duration}`,
      "X-Result-Count": String(posts.length),
    },
  });
}
