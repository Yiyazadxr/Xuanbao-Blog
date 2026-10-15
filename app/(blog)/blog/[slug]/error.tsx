"use client";

import { useEffect } from "react";

export default function BlogError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("文章详情页错误：", error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <p className="text-6xl font-bold tracking-tight text-muted/40">:(</p>
      <h2 className="mt-4 text-xl font-bold tracking-tight">文章加载失败</h2>
      <p className="mt-2 text-sm text-muted">请稍后再试</p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted/70">错误编号：{error.digest}</p>
      )}
      <button
        onClick={unstable_retry}
        className="mt-6 inline-flex h-11 cursor-pointer items-center rounded-xl bg-accent px-6 text-sm font-semibold text-accent-foreground transition-colors duration-200 hover:opacity-90"
      >
        重试
      </button>
    </div>
  );
}
