import { NextResponse } from "next/server";
import { getPosts } from "@/lib/posts";
import { clampPage, parsePage, POSTS_PER_PAGE } from "@/lib/pagination";
import { postPageQuerySchema } from "@/lib/validation";
import type { PostPageResponse } from "@/lib/post-page-types";

export async function GET(request: Request) {
  const started = performance.now();
  const parsed = postPageQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  const { page: input, ...filters } = parsed.data;
  const requested = parsePage(input);
  // 上限先裁至可安全表示的 offset，查询层再按实际文章数收敛到末页。
  const skip = Math.min(requested - 1, Math.floor(Number.MAX_SAFE_INTEGER / POSTS_PER_PAGE)) * POSTS_PER_PAGE;
  const { posts, total } = await getPosts({ ...filters, skip, take: POSTS_PER_PAGE });
  const response: PostPageResponse = {
    posts: posts.map((post) => ({ ...post, createdAt: post.createdAt.toISOString() })),
    total, page: clampPage(requested, total),
  };
  const duration = Math.max(0, performance.now() - started).toFixed(1);
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      "Server-Timing": `query;dur=${duration}`,
      "X-Result-Count": String(posts.length),
    },
  });
}
