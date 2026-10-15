// RSS 订阅源：全站最新文章，分页（?page=N，每页 20 篇）
import { SITE } from "@/lib/constants";
import { buildRssFeed, getCachedRssFeedData, parsePage } from "@/lib/rss";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parsePage(url.searchParams);
  const data = await getCachedRssFeedData("all", "", page);
  if (!data) throw new Error("RSS 全站数据不可用");
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
