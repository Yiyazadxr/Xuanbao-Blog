"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "@/lib/legal";

// 告知-同意的合规强化：点击勾选会弹出包含《用户协议》与《隐私政策》的窗口，
// 需停留阅读 3 秒后「我已阅读并同意」按钮才可用，确认后复选框才真正勾选成功
export function ConsentCheckbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  function handleToggle() {
    if (checked) {
      onCheckedChange(false);
    } else {
      setOpen(true);
    }
  }

  return (
    <>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleToggle}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
        />
        <span className="text-muted">
          我已阅读并同意本站的
          <span className="text-accent underline">《用户协议》</span>
          与
          <span className="text-accent underline">《隐私政策》</span>
        </span>
      </label>

      {open && (
        <ConsentDialog
          onConfirm={() => {
            onCheckedChange(true);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ConsentDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [remaining, setRemaining] = useState(3);
  const ready = remaining <= 0;
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 挂载后进入顶层；焦点、Esc、背景 inert 与焦点归还交给原生 dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  // 用 returnValue 区分确认/取消，Esc 与点击遮罩都按取消处理
  function closeWith(value: "confirm" | "cancel") {
    dialogRef.current?.close(value);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="consent-dialog-title"
      onClose={(e) => {
        if (e.currentTarget.returnValue === "confirm") onConfirm();
        else onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeWith("cancel");
      }}
      className="app-dialog consent-dialog z-[100]"
    >
      <div className="flex max-h-[85svh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="consent-dialog-title" className="font-display text-lg font-bold tracking-tight">
            阅读并同意
          </h2>
          <button
            type="button"
            autoFocus
            onClick={() => closeWith("cancel")}
            aria-label="关闭"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/10 hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-5 sm:flex-row">
          {/* 左：隐私政策（独立滚动） */}
          <section className="flex min-h-0 flex-1 flex-col">
            <p className="mb-2 shrink-0 border-b border-border pb-2 text-base font-bold">隐私政策</p>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <LegalMarkdown content={PRIVACY_POLICY} />
            </div>
          </section>
          {/* 右：用户协议（独立滚动） */}
          <section className="flex min-h-0 flex-1 flex-col">
            <p className="mb-2 shrink-0 border-b border-border pb-2 text-base font-bold">用户协议</p>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <LegalMarkdown content={TERMS_OF_SERVICE} />
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <span className="text-sm text-muted">
            {ready ? "请确认您已阅读全部内容" : `请阅读以上内容（${remaining} 秒后可同意）`}
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => closeWith("cancel")}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors duration-200 hover:border-accent hover:text-accent"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => closeWith("confirm")}
              disabled={!ready}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              我已阅读并同意
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function LegalMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-stone dark:prose-invert max-w-none prose-sm text-[13px] prose-headings:font-bold prose-headings:tracking-tight">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
