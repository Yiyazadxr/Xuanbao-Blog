import Link from "next/link";
import { FadeInImage } from "@/components/ui/FadeInImage";
import type { PostListItem } from "@/lib/posts";
import { findTitleMatch, formatDate } from "@/lib/utils";

export function PostCard({
  post,
  searchQuery,
  snippet,
  preload = false,
}: {
  post: PostListItem;
  searchQuery?: string;
  snippet?: string | null;
  /** 首屏卡片置 true：封面图在 <head> 预加载（Next 16 起 priority 已弃用，改用 preload） */
  preload?: boolean;
}) {
  const titleMatch = searchQuery ? findTitleMatch(post.title, searchQuery) : null;
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-foreground/5">
      {/* 固定封面高度，避免分页和骨架切换时布局跳动。 */}
      <div className="relative -mx-6 -mt-6 mb-4 h-40 overflow-hidden rounded-t-2xl">
        {post.coverImage ? (
          <>
            <FadeInImage
              src={post.coverImage}
              alt={post.title}
              fill
              preload={preload}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-[opacity,transform] duration-300 motion-reduce:duration-0 group-hover:scale-105"
            />
            {/* 封面底部收边：多段色标渐隐，收在 transparent 上会掺黑发灰，
                故全程用 color-mix 只降 alpha、保住 --surface 色相 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
              style={{
                backgroundImage:
                  "linear-gradient(to top, var(--surface) 0%, var(--surface) 26%, color-mix(in oklab, var(--surface) 55%, transparent) 55%, color-mix(in oklab, var(--surface) 18%, transparent) 80%, color-mix(in oklab, var(--surface) 0%, transparent) 100%)",
              }}
            />
          </>
        ) : (
          <div aria-hidden className="cover-gradient size-full" />
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted">
        {post.category && (
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="relative z-10 rounded-full bg-accent/10 px-2.5 py-1 font-medium text-accent transition-colors duration-200 hover:bg-accent/20"
          >
            {post.category.name}
          </Link>
        )}
        <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time>
        <span>约 {post.readingTime} 分钟阅读</span>
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug tracking-tight">
        {/* 伪元素扩展链接点击区域。 */}
        <Link
          href={`/blog/${post.slug}`}
          className="after:absolute after:inset-0 after:rounded-2xl group-hover:text-accent transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {titleMatch ? (
            <>
              {titleMatch.before}
              <mark className="rounded-sm bg-accent/20 text-accent">{titleMatch.match}</mark>
              {titleMatch.after}
            </>
          ) : (
            post.title
          )}
        </Link>
      </h3>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
        {snippet ?? post.excerpt}
      </p>

      {post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map(({ tag }) => (
            <Link
              key={tag.id}
              href={`/blog/tag/${tag.slug}`}
              className="relative z-10 text-xs text-muted transition-colors duration-200 hover:text-accent"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
