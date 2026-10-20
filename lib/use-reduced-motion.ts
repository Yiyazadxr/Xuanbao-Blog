"use client";

import { useSyncExternalStore } from "react";

// 手动减少动效开关；SSR 快照恒为 false，避免水合差异。
const KEY = "xr-reduce-motion";

const listeners = new Set<() => void>();
let cache: boolean | null = null;
let mediaQuery: MediaQueryList | null = null;

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(KEY) === "1") return true;
  } catch {
    /* 忽略 */
  }
  // 系统级「减少动态效果」同样生效，不只依赖站内开关。
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (listeners.size === 1) {
    cache = read();
    try {
      mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      mediaQuery.addEventListener("change", onSystemPreferenceChange);
    } catch {
      mediaQuery = null;
    }
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      mediaQuery?.removeEventListener("change", onSystemPreferenceChange);
      mediaQuery = null;
    }
  };
}

function onSystemPreferenceChange(): void {
  cache = read();
  listeners.forEach((listener) => listener());
}

function getSnapshot(): boolean {
  if (cache === null) cache = read();
  return cache;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** 写入并广播，所有 usePrefersReducedMotion 订阅者同步更新 */
export function setReducedMotion(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
  // 系统级减少动效始终优先，关闭站内开关不会覆盖系统无障碍偏好。
  cache = read();
  listeners.forEach((l) => l());
}
