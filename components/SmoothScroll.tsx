"use client";

import Lenis from "lenis";
import { useEffect, useState } from "react";
import { DISPLAY_CHANGE_EVENT, readSmoothScroll } from "@/lib/display";
import { LENIS_CONFIG } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// Lenis 平滑滚动：尊重手动「减少动效」开关与系统 reduced-motion，
// 并可在显示设置中关闭（监听偏好变更事件即时生效），卸载时清理
export function SmoothScroll() {
  const reduceMotion = usePrefersReducedMotion();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // 异步后置 setState，遵守 React Compiler 对 effect 体的同步约束
    Promise.resolve().then(() => setEnabled(readSmoothScroll()));
    const onChange = () => setEnabled(readSmoothScroll());
    window.addEventListener(DISPLAY_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(DISPLAY_CHANGE_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!enabled || reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    const lenis = new Lenis(LENIS_CONFIG);

    // Lenis 只观察 documentElement，而它带 h-full，盒子高度始终等于视口；
    // 内容长高（评论、懒加载图片、字体等）时不会触发重算，limit 停留在挂载时的旧值。
    // 真实滚动超过旧 limit 后，向下的滚轮会被 clamp 成同一个值然后 return，
    // 表现为事件被吃掉但页面不动。这里改为观察 body，并防抖重算。
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const contentObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => lenis.resize(), 150);
    });
    contentObserver.observe(document.body);

    let rafId: number;
    const loop = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      contentObserver.disconnect();
      clearTimeout(resizeTimer);
      lenis.destroy();
    };
  }, [enabled, reduceMotion]);

  return null;
}
