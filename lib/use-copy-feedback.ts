"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CopyFeedback = "idle" | "copied" | "shared" | "failed";

// 复制/分享反馈状态：短暂显示「已复制/失败」后自动复位。
// ShareButton 与 CodeBlock 共用，避免各自维护 timer 造成重复逻辑。
export function useCopyFeedback(timeout = 2000) {
  const [status, setStatus] = useState<CopyFeedback>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const show = useCallback(
    (next: Exclude<CopyFeedback, "idle">) => {
      setStatus(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), timeout);
    },
    [timeout]
  );

  return { status, show };
}
