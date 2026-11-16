"use client";

import { TocList } from "@/components/blog/TocList";
import type { TocItem } from "@/lib/markdown";
import { useActiveHeading } from "@/lib/use-active-heading";

// 浮动目录（TOC）：xl 以上挂在正文右侧的 sticky 栏，当前小节高亮与移动端抽屉共用逻辑
export function Sidebar({ toc }: { toc: TocItem[] }) {
  const activeId = useActiveHeading(toc);

  if (toc.length === 0) return null;

  return (
    <nav
      aria-label="文章目录"
      className="sticky top-[calc(var(--header-h)+1rem)]"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        目录
      </p>
      <TocList toc={toc} activeId={activeId} />
    </nav>
  );
}
