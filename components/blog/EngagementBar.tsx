"use client";

import { useEffect, useState } from "react";
import { BookmarkButton } from "@/components/blog/BookmarkButton";
import { LikeButton } from "@/components/blog/LikeButton";
import { ShareButton } from "@/components/blog/ShareButton";

type Engagement = {
  likeCount: number;
  liked: boolean;
  bookmarked: boolean;
  isLoggedIn: boolean;
};

// ISR 页面在客户端获取个性化状态；占位按钮保持布局尺寸。
export function EngagementBar({
  postId,
  slug,
  title,
}: {
  postId: string;
  slug: string;
  title: string;
}) {
  const [data, setData] = useState<Engagement | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/posts/${encodeURIComponent(slug)}/engagement`)
      .then((r) => (r.ok ? (r.json() as Promise<Engagement>) : null))
      .then((d) => {
        if (cancelled) return;
        if (!d) {
          setFailed(true);
          return;
        }
        setData(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, retry]);

  return (
    <div className="mt-12 flex items-center justify-center gap-3">
      {failed ? (
        <p role="alert" className="text-sm text-muted">
          互动状态加载失败。
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setRetry((value) => value + 1);
            }}
            className="ml-1 text-accent underline"
          >
            重试
          </button>
        </p>
      ) : data ? (
        <>
          <LikeButton
            postId={postId}
            slug={slug}
            initialCount={data.likeCount}
            initialLiked={data.liked}
            isLoggedIn={data.isLoggedIn}
          />
          <BookmarkButton
            postId={postId}
            initialBookmarked={data.bookmarked}
            isLoggedIn={data.isLoggedIn}
          />
        </>
      ) : (
        <>
          <span className="inline-flex h-11 w-24 animate-pulse rounded-full border border-border bg-surface" />
          <span className="inline-flex h-11 w-24 animate-pulse rounded-full border border-border bg-surface" />
        </>
      )}
      <ShareButton title={title} slug={slug} />
    </div>
  );
}
