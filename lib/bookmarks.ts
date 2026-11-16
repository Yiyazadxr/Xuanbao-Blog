import { fetchPage, POSTS_PER_PAGE } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { listSelect, PUBLISHED_FILTER, toListItem, type PostListItem } from "@/lib/posts";

export async function getBookmarkInfo(postId: string, userId?: string) {
  const bookmarked = userId
    ? Boolean(await prisma.bookmark.findUnique({ where: { userId_postId: { userId, postId } } }))
    : false;
  return { bookmarked };
}

export async function getBookmarkCount(userId: string) {
  return prisma.bookmark.count({ where: { userId, post: PUBLISHED_FILTER } });
}

// 收藏列表仅含公开文章，按页取数以保持 RSC payload 有界。
export async function getBookmarkedPosts(userId: string, requestedPage: number): Promise<{
  posts: PostListItem[];
  total: number;
  page: number;
}> {
  const where = { userId, post: PUBLISHED_FILTER };
  const { rows, total, skip } = await fetchPage({
    count: () => prisma.bookmark.count({ where }),
    fetchRows: (pageSkip, pageTake) => prisma.bookmark.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { postId: "desc" }],
      skip: pageSkip,
      take: pageTake,
      select: { post: { select: listSelect } },
    }),
    requestedSkip: (requestedPage - 1) * POSTS_PER_PAGE,
    pageSize: POSTS_PER_PAGE,
  });
  return {
    posts: rows.map((r) => toListItem(r.post)),
    total,
    page: Math.floor(skip / POSTS_PER_PAGE) + 1,
  };
}
