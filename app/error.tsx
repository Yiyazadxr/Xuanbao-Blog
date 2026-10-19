"use client";

import { useEffect } from "react";
import Link from "next/link";

// 页面运行时错误边界；不向用户展示错误详情，避免泄露内部信息。
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // 仅记录 digest，用于匹配服务端日志；不打印 error 对象本体。
    console.error("页面错误：", error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-bold tracking-tight text-muted/40">500</p>
      <h2 className="mt-4 text-xl font-bold tracking-tight">页面遇到了一点小问题</h2>
      <p className="mt-2 text-sm text-muted">请重试，或返回首页。</p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted/70">错误编号：{error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={unstable_retry}
          className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-accent px-6 text-sm font-semibold text-accent-foreground transition-colors duration-200 hover:opacity-90"
        >
          重试
        </button>
        <Link
          href="/"
          className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-border px-6 text-sm font-semibold transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
