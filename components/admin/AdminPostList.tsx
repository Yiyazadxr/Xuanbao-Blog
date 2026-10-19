"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { batchPosts } from "@/app/(admin)/admin/posts/actions";
import { PostRowActions } from "@/components/admin/PostRowActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

type AdminPost = {
  id: string;
  title: string;
  published: boolean;
  archived: boolean;
  pinned: boolean;
  featured: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  viewCount: number;
  category: { name: string } | null;
};

type Category = { id: string; name: string };

// 文章列表（带批量操作）：勾选后批量 发布/转草稿/归档/改分类/删除
export function AdminPostList({
  posts,
  categories,
}: {
  posts: AdminPost[];
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (posts.length === 0) {
    return <EmptyState title="还没有文章" description="点右上角「写文章」开始。" />;
  }

  const allSelected = posts.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(posts.map((p) => p.id)));
  }

  function runBatch(operation: "publish" | "unpublish" | "archive" | "delete", categoryId?: string) {
    if (selected.size === 0) return;
    if (operation === "delete" && !window.confirm(`确定删除选中的 ${selected.size} 篇文章吗？该操作不可恢复。`)) return;
    startTransition(async () => {
      await batchPosts([...selected], operation, categoryId ?? null);
      setSelected(new Set());
      router.refresh();
    });
  }

  function runCategory(categoryId: string) {
    if (selected.size === 0) return;
    startTransition(async () => {
      await batchPosts([...selected], "category", categoryId || null);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <>
      {/* 批量操作工具栏 */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-foreground/5 px-4 py-3">
          <span className="text-sm text-muted">已选 {selected.size} 篇</span>
          <button type="button" disabled={pending} onClick={() => runBatch("publish")} className="cursor-pointer rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400">
            批量发布
          </button>
          <button type="button" disabled={pending} onClick={() => runBatch("unpublish")} className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-foreground/5 hover:text-foreground disabled:opacity-50">
            批量转草稿
          </button>
          <button type="button" disabled={pending} onClick={() => runBatch("archive")} className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-foreground/5 hover:text-foreground disabled:opacity-50">
            批量归档
          </button>
          <select
            value=""
            onChange={(e) => runCategory(e.target.value)}
            disabled={pending}
            className="cursor-pointer rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-muted outline-none"
            aria-label="批量移动到分类"
          >
            <option value="" disabled>
              移动到分类…
            </option>
            <option value="">（无分类）</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" disabled={pending} onClick={() => runBatch("delete")} className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50">
            批量删除
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground">
            取消选择
          </button>
        </div>
      )}

      <ul className="divide-y divide-border">
        {/* 全选 */}
        <li className="flex items-center gap-3 px-5 py-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label="全选本页文章"
            className="size-4 cursor-pointer accent-[var(--accent)]"
          />
          <span>全选本页</span>
        </li>
        {posts.map((post) => (
          <li
            key={post.id}
            className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(post.id)}
                onChange={() => toggle(post.id)}
                aria-label={`选择《${post.title}》`}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="truncate font-medium transition-colors duration-200 hover:text-accent"
                  >
                    {post.title}
                  </Link>
                  {post.archived ? (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">已归档</span>
                  ) : post.published ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">已发布</span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">草稿</span>
                  )}
                  {post.pinned && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">置顶</span>
                  )}
                  {post.featured && (
                    <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-400">精选</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {post.category?.name ?? "无分类"} ·{" "}
                  {post.publishedAt ? `发布于 ${formatDate(post.publishedAt)}` : `更新于 ${formatDate(post.updatedAt)}`} ·{" "}
                  {post.viewCount} 次浏览
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/admin/posts/${post.id}/preview`}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
              >
                预览
              </Link>
              <Link
                href={`/admin/posts/${post.id}/edit`}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
              >
                编辑
              </Link>
              <PostRowActions
                id={post.id}
                published={post.published}
                pinned={post.pinned}
                archived={post.archived}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
