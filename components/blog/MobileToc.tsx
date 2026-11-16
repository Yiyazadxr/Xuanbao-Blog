"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { TocList } from "@/components/blog/TocList";
import type { TocItem } from "@/lib/markdown";
import { useActiveHeading } from "@/lib/use-active-heading";

// 移动端目录：右下角悬浮按钮 + 原生模态底部抽屉（xl 及以上用桌面 Sidebar）
export function MobileToc({ toc }: { toc: TocItem[] }) {
  const [open, setOpen] = useState(false);
  // 当前小节高亮与桌面 Sidebar 共用逻辑
  const activeId = useActiveHeading(toc);
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (toc.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const dialog = dialogRef.current;
          if (!dialog || dialog.open) return;
          setOpen(true);
          dialog.showModal();
        }}
        aria-label="打开目录"
        aria-expanded={open}
        aria-controls="mobile-toc-dialog"
        className="fixed bottom-6 right-4 z-[60] flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium shadow-lg transition-colors duration-200 hover:border-accent xl:hidden"
      >
        <Icon icon="ph:list-bullets-bold" width={16} height={16} aria-hidden />
        目录
      </button>

      {/* 焦点约束、Esc 关闭、背景 inert 与焦点归还均由原生 dialog 提供 */}
      <dialog
        ref={dialogRef}
        id="mobile-toc-dialog"
        aria-labelledby="mobile-toc-title"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
        className="app-dialog toc-dialog z-[70]"
      >
        {/* svh 而非 dvh：地址栏收起时抽屉高度不会跟着跳 */}
        <div className="max-h-[72svh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border-t border-border bg-background p-5 pb-8">
          <div className="flex items-center justify-between">
            <p id="mobile-toc-title" className="text-xs font-semibold uppercase tracking-widest text-muted">
              目录
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              aria-label="关闭目录"
              className="rounded-full p-1 text-muted transition-colors duration-200 hover:text-foreground"
            >
              <Icon icon="ph:x-bold" width={18} height={18} aria-hidden />
            </button>
          </div>
          <TocList
            toc={toc}
            activeId={activeId}
            variant="drawer"
            onNavigate={() => dialogRef.current?.close()}
          />
        </div>
      </dialog>
    </>
  );
}
