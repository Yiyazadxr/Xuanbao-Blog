"use client";

import { useEffect } from "react";
import Link from "next/link";

// 后台错误边界：不向用户展示错误详情（避免泄露内部信息）
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("后台页面错误：", error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <h2 className="text-xl font-bold tracking-tight">后台出错了</h2>
      <p className="mt-2 text-sm text-muted">出了点小问题，请稍后重试</p>
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
          href="/admin"
          className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-border px-6 text-sm font-semibold transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          返回后台
        </Link>
      </div>
    </div>
  );
}
