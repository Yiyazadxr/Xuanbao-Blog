import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { SeriesChapter } from "@/lib/posts";
import { formatDate } from "@/lib/utils";

export function SeriesChapters({
  chapters,
  currentPostId,
}: {
  chapters: SeriesChapter[];
  currentPostId?: string;
}) {
  return (
    <ol className="divide-y divide-border rounded-xl border border-border bg-surface">
      {chapters.map((chapter, index) => {
        const current = chapter.id === currentPostId;
        return (
          <li key={chapter.id} className={current ? "bg-accent/5" : undefined}>
            <Link
              href={`/blog/${chapter.slug}`}
              aria-current={current ? "page" : undefined}
              className="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-foreground/[0.025] sm:px-5"
            >
              <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-xs font-semibold ${current ? "bg-accent text-accent-foreground" : "bg-foreground/5 text-muted"}`}>
                {current ? <Icon icon="ph:play-fill" width={14} height={14} aria-hidden /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold transition-colors ${current ? "text-accent" : "group-hover:text-accent"}`}>
                  {chapter.title}
                </span>
                {chapter.excerpt && <span className="mt-1 line-clamp-2 block text-sm text-muted">{chapter.excerpt}</span>}
                <span className="mt-2 block text-xs text-muted">
                  {formatDate(chapter.createdAt)} · 约 {chapter.readingTime} 分钟阅读
                </span>
              </span>
              <Icon icon="ph:caret-right-bold" width={16} height={16} className="mt-1 shrink-0 text-muted/60 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
