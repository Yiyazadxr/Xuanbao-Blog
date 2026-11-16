"use client";

import { useSyncExternalStore } from "react";

// 手动「减少动效」开关；SSR 快照恒为 false，避免水合差异。
const KEY = "xr-reduce-motion";
const MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

const listeners = new Set<() => void>();
let cache: boolean | null = null;
let systemCache: boolean | null = null;
let mediaQuery: MediaQueryList | null = null;

// 站内显式选择：null 表示从未设置，true/false 表示用户的选择。
export function readReduceMotionSetting(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(KEY);
    return value === "1" ? true : value === "0" ? false : null;
  } catch {
    return null;
  }
}

export function readSystemReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia(MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

// 站内开关或系统偏好任一开启都生效；系统偏好优先，不能被站内关闭覆盖。
function read(): boolean {
  if (typeof window === "undefined") return false;
  const setting = readReduceMotionSetting();
  if (setting === true) return true;
  return readSystemReducedMotion();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (listeners.size === 1) {
    cache = read();
    systemCache = readSystemReducedMotion();
    try {
      mediaQuery = window.matchMedia(MEDIA_QUERY);
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
  systemCache = readSystemReducedMotion();
  listeners.forEach((listener) => listener());
}

function getSnapshot(): boolean {
  if (cache === null) cache = read();
  return cache;
}

function getSystemSnapshot(): boolean {
  if (systemCache === null) systemCache = readSystemReducedMotion();
  return systemCache;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// 只反映操作系统偏好；设置页据此禁用站内开关并给出解释。
export function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSystemSnapshot, () => false);
}

/** 写入并广播，所有 usePrefersReducedMotion 订阅者同步更新 */
export function setReducedMotion(on: boolean): void {
  try {
    // 显式写入 "0"，与「从未设置」区分，便于跨设备同步时不误存系统偏好。
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* 忽略 */
  }
  // 系统级减少动效始终优先，关闭站内开关不会覆盖系统无障碍偏好。
  cache = read();
  listeners.forEach((l) => l());
}
