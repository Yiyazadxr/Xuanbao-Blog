// RSS 订阅源：全站最新文章，分页（?page=N，每页 20 篇）
import { SITE } from "@/lib/constants";
import { buildRssFeed, getCachedRssFeedData, parsePage } from "@/lib/rss";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parsePage(url.searchParams);
  const data = await getCachedRssFeedData("all", "", page);
  if (!data) {
    // 数据不可用时返回 503，让订阅端按 Retry-After 重试，而不是抛出 500。
    return new Response("Service Unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "60" },
    });
  }
  const { posts, total } = data;

  return buildRssFeed({
    title: SITE.name,
    description: SITE.description,
    feedPath: "",
    posts,
    page,
    total,
  });
}
