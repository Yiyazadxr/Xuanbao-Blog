import Link from "next/link";

// 自定义 404 页面
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col items-center justify-center px-4 pt-16 text-center sm:px-6">
      <p className="font-display text-[clamp(5rem,18vw,10rem)] font-bold leading-none tracking-tight text-accent/25">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">该页面消失了</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        地址可能错误，也可能是我把它挪走了。请重试，或返回首页。
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="inline-flex h-11 cursor-pointer items-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
        >
          回首页
        </Link>
        <Link
          href="/blog"
          className="inline-flex h-11 cursor-pointer items-center rounded-full border border-border px-6 text-sm font-semibold transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          看文章
        </Link>
      </div>
    </div>
  );
}
