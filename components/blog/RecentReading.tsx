"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import {
  parseReadingPositions,
  removeReadingPosition,
  READING_POSITION_KEY,
  type ReadingPosition,
} from "@/lib/reading-position";
import { formatRelativeTime } from "@/lib/utils";

export function RecentReading() {
  const [positions, setPositions] = useState<ReadingPosition[] | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        setPositions(parseReadingPositions(localStorage.getItem(READING_POSITION_KEY)));
      } catch {
        setPositions([]);
      }
    });
  }, []);

  const remove = (postId: string) => {
    try {
      removeReadingPosition(localStorage, postId);
    } catch {
      // 浏览器禁用存储时仅保留当前界面状态。
    }
    setPositions((current) => current?.filter((item) => item.postId !== postId) ?? []);
  };

  if (positions === null) return null;
  if (positions.length === 0) {
    return (
      <EmptyState
        size="lg"
        icon="ph:clock-counter-clockwise-bold"
        title="还没有阅读记录"
        description="开始阅读文章后，进度会保存在这台设备上"
        action={
          <Link href="/blog" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
            浏览文章
          </Link>
        }
      />
    );
  }

  return (
    <ol className="divide-y divide-border rounded-xl border border-border bg-surface">
      {positions.map((position) => {
        const progress = Math.round(position.progress * 100);
        return (
          <li key={position.postId} className="flex items-center gap-3 px-4 py-4 sm:px-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-sm font-semibold text-accent">
              {progress}%
            </span>
            <div className="min-w-0 flex-1">
              <Link href={`/blog/${position.slug}`} className="block truncate font-semibold transition-colors hover:text-accent">
                {position.title}
              </Link>
              <p className="mt-1 text-xs text-muted">{formatRelativeTime(new Date(position.updatedAt))}</p>
            </div>
            <Link
              href={`/blog/${position.slug}`}
              className="hidden shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent sm:block"
            >
              继续阅读
            </Link>
            <button
              type="button"
              onClick={() => remove(position.postId)}
              aria-label={`移除《${position.title}》的阅读记录`}
              title="移除记录"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <Icon icon="ph:x-bold" width={16} height={16} aria-hidden />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
