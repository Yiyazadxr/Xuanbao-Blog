"use client";

import { useEffect } from "react";

// ISR 页面在客户端上报；模块级 Set 避免 StrictMode 和会话内重复计数。
const reported = new Set<string>();

export function ViewTracker({
  postId,
  slug,
  wordCount,
}: {
  postId: string;
  slug: string;
  wordCount: number | null;
}) {
  useEffect(() => {
    if (reported.has(postId)) return;
    reported.add(postId);
    // keepalive：用户立刻跳转时请求也不会被页面卸载中断
    void fetch(`/api/posts/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, wordCount }),
    }).catch(() => {
      // 上报失败允许下次重试
      reported.delete(postId);
    });
  }, [postId, slug, wordCount]);

  return null;
}
