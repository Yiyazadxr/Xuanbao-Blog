"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type ConfirmRequest = {
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
};

// 用原生 dialog 取代 window.confirm：不阻塞主线程，样式与全站一致。
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const requestRef = useRef<ConfirmRequest | null>(null);

  useEffect(() => {
    return () => {
      // 组件卸载时让等待方拿到取消，避免 Promise 永久悬挂。
      requestRef.current?.resolve(false);
      requestRef.current = null;
    };
  }, []);

  const confirm = useCallback((message: string, confirmLabel = "确定") => {
    return new Promise<boolean>((resolve) => {
      requestRef.current?.resolve(false);
      const next = { message, confirmLabel, resolve };
      requestRef.current = next;
      setRequest(next);
    });
  }, []);

  function settle(ok: boolean) {
    const current = requestRef.current;
    if (!current) return;
    requestRef.current = null;
    current.resolve(ok);
    setRequest(null);
  }

  const dialog = request ? (
    <ConfirmDialog
      message={request.message}
      confirmLabel={request.confirmLabel}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, dialog };
}

function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onClose={(e) => {
        if (e.currentTarget.returnValue === "confirm") onConfirm();
        else onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialogRef.current?.close("cancel");
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <h2 id={titleId} className="font-display text-lg font-bold tracking-tight">
          请确认
        </h2>
        <p id={messageId} className="mt-2 text-sm leading-relaxed text-muted">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          {/* 破坏性操作默认聚焦「取消」，避免回车误触。 */}
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close("cancel")}
            className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors duration-200 hover:border-accent hover:text-accent"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close("confirm")}
            className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
