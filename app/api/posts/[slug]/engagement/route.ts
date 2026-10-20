import { NextResponse } from "next/server";
import { getFreshUser } from "@/lib/auth";
import { getBookmarkInfo } from "@/lib/bookmarks";
import { getLikeInfo } from "@/lib/likes";
import { prisma } from "@/lib/prisma";

// ISR 详情页在客户端按需加载个性化互动状态。
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, published: true, archived: true },
  });
  if (!post || !post.published || post.archived) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const user = await getFreshUser();
  const [like, bookmark] = await Promise.all([
    getLikeInfo(post.id, user?.id),
    getBookmarkInfo(post.id, user?.id),
  ]);

  return NextResponse.json({
    likeCount: like.count,
    liked: like.liked,
    bookmarked: bookmark.bookmarked,
    isLoggedIn: Boolean(user),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
