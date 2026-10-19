"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// 后台行操作按钮：处理 pending、确认框、transition 与 router.refresh()，避免重复样板代码。
export type AdminActionResult = { ok: boolean; error?: string; message?: string };

const baseCls =
  "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50";

const variantCls = {
  muted: "text-muted hover:bg-foreground/5 hover:text-foreground",
  danger: "text-red-500 hover:bg-red-500/10",
  accent: "bg-accent/10 text-accent hover:bg-accent/20",
  success:
    "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
} as const;

export function AdminActionButton({
  action,
  variant = "muted",
  confirmText,
  onDone,
  className,
  children,
}: {
  action: () => Promise<AdminActionResult>;
  variant?: keyof typeof variantCls;
  confirmText?: string;
  onDone?: (result: AdminActionResult) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        onDone?.(result);
        if (!result.ok) setError(result.error ?? "操作失败，请稍后重试");
        else router.refresh();
      } catch {
        setError("操作失败，请稍后重试");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} onClick={run} className={className ?? `${baseCls} ${variantCls[variant]}`}>
        {children}
      </button>
      {error && <span role="alert" className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
