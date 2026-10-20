import { afterEach, expect, it, vi } from "vitest";

const hook = vi.hoisted(() => ({
  subscribe: null as null | ((listener: () => void) => () => void),
  snapshot: null as null | (() => boolean),
}));
vi.mock("react", () => ({
  useSyncExternalStore: (subscribe: typeof hook.subscribe, snapshot: typeof hook.snapshot) => {
    hook.subscribe = subscribe;
    hook.snapshot = snapshot;
    return snapshot?.();
  },
}));

import { setReducedMotion, usePrefersReducedMotion } from "./use-reduced-motion";

afterEach(() => vi.unstubAllGlobals());

it("系统减少动效变化会通知订阅者，且站内关闭不覆盖系统偏好", () => {
  let systemReduced = false;
  let stored: string | null = null;
  let changed = () => {};
  const query = {
    get matches() { return systemReduced; },
    addEventListener: vi.fn((_event: string, listener: () => void) => { changed = listener; }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("window", { matchMedia: () => query });
  vi.stubGlobal("localStorage", {
    getItem: () => stored,
    setItem: (_key: string, value: string) => { stored = value; },
    removeItem: () => { stored = null; },
  });

  expect(usePrefersReducedMotion()).toBe(false);
  const listener = vi.fn();
  const unsubscribe = hook.subscribe!(listener);
  systemReduced = true;
  changed();
  expect(hook.snapshot!()).toBe(true);
  expect(listener).toHaveBeenCalledTimes(1);

  setReducedMotion(false);
  expect(hook.snapshot!()).toBe(true);
  systemReduced = false;
  changed();
  expect(hook.snapshot!()).toBe(false);
  unsubscribe();
  expect(query.removeEventListener).toHaveBeenCalledTimes(1);
});
