"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/blog/PostCard";
import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import type { PostListItem } from "@/lib/posts";
import type { PostPageFilters, PostPageResponse } from "@/lib/post-page-types";
import { clampPage, parsePage, POSTS_PER_PAGE } from "@/lib/pagination";

// 首屏由 ISR 提供；公开列表后续页按需请求，收藏列表在客户端切片。
export function PostListPaginated({
  posts,
  total,
  basePath,
  serverPaginated = false,
  filters,
}: {
  posts: PostListItem[];
  total: number;
  basePath: string;
  serverPaginated?: boolean;
  filters?: PostPageFilters;
}) {
  const searchParams = useSearchParams();
  const requested = parsePage(searchParams.get("page"));
  const query = new URLSearchParams({ page: String(requested) });
  if (filters?.categorySlug) query.set("categorySlug", filters.categorySlug);
  if (filters?.tagSlug) query.set("tagSlug", filters.tagSlug);
  if (filters?.seriesSlug) query.set("seriesSlug", filters.seriesSlug);
  const requestUrl = serverPaginated && requested > 1 ? `/api/post-pages?${query}` : null;
  const [response, setResponse] = useState<{ url: string; data?: PostPageResponse; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!requestUrl) return;
    const controller = new AbortController();
    void fetch(requestUrl, { signal: controller.signal })
      .then(async (result) => {
        if (!result.ok) throw new Error("PAGE_LOAD_FAILED");
        return await result.json() as PostPageResponse;
      })
      .then((data) => {
        if (!controller.signal.aborted) setResponse({ url: requestUrl, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResponse({ url: requestUrl, error: "文章加载失败，请重试" });
      });
    return () => controller.abort();
  }, [requestUrl, retry]);

  const fetched = response?.url === requestUrl ? response : null;
  const pageTotal = fetched?.data?.total ?? total;
  const totalPages = Math.max(1, Math.ceil(pageTotal / POSTS_PER_PAGE));
  const page = fetched?.data?.page ?? clampPage(requested, total);
  const current = serverPaginated
    ? requestUrl
      ? fetched?.data?.posts.map((post) => ({ ...post, createdAt: new Date(post.createdAt) })) ?? []
      : posts
    : posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  if (requestUrl && !fetched) return <PostGridSkeleton />;
  if (fetched?.error) return (
    <div role="alert" className="py-10 text-center">
      <p>{fetched.error}</p>
      <button type="button" onClick={() => { setResponse(null); setRetry((value) => value + 1); }} className="mt-3 text-accent underline">重新加载</button>
    </div>
  );

  if (current.length === 0) {
    return <EmptyState size="lg" title="这里空空如也" description="没有匹配的文章，换个分类或标签试试" />;
  }

  return (
    <>
      <div className="cover-grid-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {current.map((post, i) => (
          // 首页前 3 张（首屏）立即加载封面，其余懒加载
          <PostCard key={post.id} post={post} preload={page === 1 && i < 3} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} basePath={basePath} />
    </>
  );
}
