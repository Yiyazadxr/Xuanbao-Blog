"use client";

import { useEffect, useRef, useState } from "react";
import { DISPLAY_CHANGE_EVENT, readReadingProgress } from "@/lib/display";

// 阅读进度条：固定在页面顶部，随滚动填充；可在显示设置中关闭。
// 支持滚动驱动动画的浏览器由 CSS 直接驱动，不再逐帧写 React 状态。
export function ReadingProgress() {
  const [enabled, setEnabled] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);

  // 初次渲染始终输出进度条（与 SSR 一致），水合后按本地偏好卸载；
  // 水合前的隐藏由预水合脚本写入的 html[data-reading-progress="off"] 完成
  useEffect(() => {
    Promise.resolve().then(() => setEnabled(readReadingProgress()));
    const onChange = () => setEnabled(readReadingProgress());
    window.addEventListener(DISPLAY_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(DISPLAY_CHANGE_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // 原生滚动时间线已接管进度，无需滚动监听
    if (CSS.supports("animation-timeline", "scroll()")) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = total > 0 ? Math.min(1, window.scrollY / total) : 0;
      barRef.current?.style.setProperty("--reading-progress", String(ratio));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="reading-progress fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent">
      <div ref={barRef} className="reading-progress-bar h-full bg-accent" />
    </div>
  );
}
