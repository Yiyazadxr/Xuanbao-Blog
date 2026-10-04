"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { PostCard } from "@/components/blog/PostCard";
import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { PostListPaginated } from "@/components/blog/PostListPaginated";
import { PostSearch } from "@/components/blog/PostSearch";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PostListItem } from "@/lib/posts";
import type { PostSearchResponse } from "@/lib/post-page-types";
import { QUERY_LIMITS } from "@/lib/constants";

type CategoryEntry = { id: string; name: string; slug: string; postCount: number };
type SearchEntry = Omit<PostSearchResponse["posts"][number], "createdAt"> & { createdAt: string };
type SearchState = { query: string; page: number; data: PostSearchResponse };

export function BlogPostsClient({
  posts,
  total,
  categories,
}: {
  posts: PostListItem[];
  total: number;
  categories: CategoryEntry[];
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchState | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!trimmed) return;
    if (result?.query === trimmed && result.page === page) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ q: trimmed, page: String(page) });
      void fetch(`/api/search-index?${params}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("SEARCH_FAILED");
          return await response.json() as PostSearchResponse;
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          setResult({ query: trimmed, page: data.page, data });
          setPage(data.page);
          setSearchError(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearchError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, page, result, retry]);

  const current = result?.query === trimmed && result.page === page ? result.data : null;
  const entries = (current?.posts ?? []) as SearchEntry[];
  const totalPages = current ? Math.max(1, Math.ceil(current.total / QUERY_LIMITS.searchPage)) : 1;

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">文章</h1>
          <p className="mt-3 text-muted">
            {trimmed
              ? current ? `找到 ${current.total} 篇文章` : searchError ? "搜索加载失败" : "正在搜索…"
              : `共 ${total} 篇文章`}
          </p>
        </div>
        <PostSearch
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
            if (!value.trim()) {
              setResult(null);
              setSearchError(false);
              setLoading(false);
            }
          }}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {categories
          .filter((category) => category.postCount > 0)
          .map((category) => (
            <Link
              key={category.id}
              href={`/blog/category/${category.slug}`}
              className="rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
            >
              {category.name} · {category.postCount}
            </Link>
          ))}
        <Link
          href="/blog/archive"
          className="rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          归档
        </Link>
      </div>

      <div className="mt-10">
        {trimmed ? (
          searchError ? (
            <div role="alert" className="py-10 text-center">
              <p>搜索加载失败，请稍后重试</p>
              <button
                type="button"
                onClick={() => { setResult(null); setSearchError(false); setRetry((value) => value + 1); }}
                className="mt-3 text-accent underline"
              >
                重新加载
              </button>
            </div>
          ) : !current || loading ? (
            <PostGridSkeleton />
          ) : entries.length > 0 ? (
            <>
              <div className="cover-grid-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <PostCard
                    key={entry.id}
                    post={{ ...entry, createdAt: new Date(entry.createdAt) }}
                    searchQuery={trimmed}
                    snippet={entry.snippet}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <nav aria-label="搜索结果分页" className="mt-12 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span aria-live="polite" className="text-sm text-muted">第 {page} / {totalPages} 页</span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm disabled:opacity-50"
                  >
                    下一页
                  </button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState size="lg" title="没有找到相关文章" description="换个关键词试试" />
          )
        ) : (
          <Suspense fallback={<PostGridSkeleton />}>
            <PostListPaginated posts={posts} total={total} basePath="/blog" serverPaginated />
          </Suspense>
        )}
      </div>
    </>
  );
}
