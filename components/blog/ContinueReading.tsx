"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  readReadingPosition,
  saveReadingPosition,
  type ReadingPosition,
} from "@/lib/reading-position";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

const CONTENT_ID = "post-reading-content";

function contentMetrics() {
  const content = document.getElementById(CONTENT_ID);
  if (!content) return null;
  const top = content.getBoundingClientRect().top + window.scrollY;
  const distance = content.scrollHeight - window.innerHeight;
  return distance > 0 ? { top, distance } : null;
}

export function ContinueReading({
  postId,
  slug,
  title,
  revision,
}: {
  postId: string;
  slug: string;
  title: string;
  revision: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [position, setPosition] = useState<ReadingPosition | null>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        if (window.scrollY < 80) {
          setPosition(readReadingPosition(localStorage, postId, revision));
        }
      } catch {
        // 浏览器禁用存储时不影响阅读。
      }
    });

    const persist = () => {
      if (!hasScrolled.current) return;
      const metrics = contentMetrics();
      if (!metrics) return;
      const progress = (window.scrollY - metrics.top) / metrics.distance;
      try {
        saveReadingPosition(localStorage, {
          postId,
          slug,
          title,
          revision,
          progress,
          updatedAt: Date.now(),
        });
      } catch {
        // 浏览器禁用存储时不影响离开页面。
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persist();
    };
    const onScroll = () => {
      hasScrolled.current = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      persist();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [postId, revision, slug, title]);

  if (!position) return null;

  const percent = Math.round(position.progress * 100);
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-5 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 shadow-xl shadow-foreground/10"
    >
      <Icon icon="ph:article-bold" width={20} height={20} className="shrink-0 text-accent" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-muted">
        上次读到 <span className="font-semibold text-foreground">{percent}%</span>
      </p>
      <button
        type="button"
        onClick={() => {
          const metrics = contentMetrics();
          if (metrics) {
            window.scrollTo({
              top: metrics.top + metrics.distance * position.progress,
              behavior: reduceMotion ? "auto" : "smooth",
            });
          }
          setPosition(null);
        }}
        className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
      >
        继续阅读
      </button>
      <button
        type="button"
        onClick={() => setPosition(null)}
        aria-label="关闭继续阅读提示"
        title="关闭"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <Icon icon="ph:x-bold" width={16} height={16} aria-hidden />
      </button>
    </div>
  );
}
