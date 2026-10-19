import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostCard } from "@/components/blog/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { getFreshUser } from "@/lib/auth";
import { getBookmarkedPosts } from "@/lib/bookmarks";
import { parsePage, POSTS_PER_PAGE } from "@/lib/pagination";

export const metadata: Metadata = { title: "我的收藏" };
export const dynamic = "force-dynamic";

// 收藏列表（需登录）。
export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getFreshUser();
  if (!user) redirect("/");

  const { page: pageParam } = await searchParams;
  const { posts, total, page } = await getBookmarkedPosts(user.id, parsePage(pageParam));

  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">我的收藏</h1>
      <p className="mt-3 text-muted">共 {total} 篇收藏文章</p>
      <div className="mt-10">
        {posts.length === 0 ? (
          <EmptyState
            size="lg"
            title="还没有收藏的文章"
            description="读到想留下的文章，点一下收藏，就会出现在这里。"
          />
        ) : (
          <div className="cover-grid-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / POSTS_PER_PAGE))} basePath="/bookmarks" />
      </div>
    </>
  );
}
