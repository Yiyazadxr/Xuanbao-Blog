"use client";

import { m } from "framer-motion";
import { useEffect, useState } from "react";
import { EASE_DRAMATIC } from "@/lib/motion";

// 每个会话播放一次；reduced-motion 下跳过。
export function Preloader() {
  const [phase, setPhase] = useState<"loading" | "exiting" | "done">("loading");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId: number;
    // 站点数据被禁用时 sessionStorage 会抛错；按「未跳过」处理，不能让首页被遮罩永久盖住。
    let shown = false;
    try {
      shown = Boolean(sessionStorage.getItem("preloader-shown"));
    } catch {
      shown = false;
    }
    const skip =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches || shown;

    if (skip) {
      rafId = requestAnimationFrame(() => setPhase("done"));
      return () => cancelAnimationFrame(rafId);
    }

    try {
      sessionStorage.setItem("preloader-shown", "1");
    } catch {
      /* 无法记录已播放：本次会话仍会播放 */
    }
    const DURATION = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(100, Math.round(((now - start) / DURATION) * 100));
      setProgress(p);
      if (p < 100) {
        rafId = requestAnimationFrame(tick);
      } else {
        setPhase("exiting");
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (phase === "done") return null;

  return (
    <m.div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
      initial={false}
      animate={phase === "exiting" ? { y: "-100%" } : { y: "0%" }}
      transition={{ duration: 0.7, ease: EASE_DRAMATIC }}
      onAnimationComplete={() => {
        if (phase === "exiting") setPhase("done");
      }}
    >
      <span className="text-base font-semibold tracking-tight text-foreground">
        Xuanbao<span className="text-accent">.</span>dev
      </span>
      <span className="mt-4 block h-px w-32 overflow-hidden bg-foreground/10">
        <span
          className="block h-full bg-accent transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </span>
    </m.div>
  );
}
