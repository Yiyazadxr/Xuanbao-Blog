// RSS 订阅源：某分类下的文章，分页（?page=N）
import { SITE } from "@/lib/constants";
import { buildRssFeed, getCachedRssFeedData, parsePage } from "@/lib/rss";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const page = parsePage(url.searchParams);

  const data = await getCachedRssFeedData("category", slug, page);
  if (!data) {
    return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const { posts, total } = data;

  return buildRssFeed({
    title: `${SITE.name} · 分类「${data.name}」`,
    description: `${SITE.name}「${data.name}」分类下的文章订阅`,
    feedPath: `category/${slug}`,
    posts,
    page,
    total,
  });
}
