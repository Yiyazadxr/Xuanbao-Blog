// 全站动画常量与变体工厂，所有 framer-motion 动画共用

import type { Variants, Transition } from "framer-motion";

// ---------- 缓动，单一来源全站只认这几条 ----------

// 入场：快出缓收的 expo-out，用于滚动 reveal / 元素淡入
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// 强调转场：慢起猛收，用于遮罩揭开与幕布转场，对应 CSS --ease-custom。
export const EASE_DRAMATIC = [0.79, 0, 0.06, 1] as const;

// Spring 参数：磁吸 / 弹性缩放，导航按钮用
export const SPRING_SNAP = {
  type: "spring",
  stiffness: 350,
  damping: 22,
} as const satisfies Transition;

// ---------- 时长节奏，单位秒 ----------
export const DURATION = {
  fast: 0.4,
  base: 0.7,
  slow: 1.1,
} as const;

// ---------- 变体工厂 ----------

/** 标准淡入上移：默认入场姿态 */
export function fadeUp(distance = 24, duration?: number, ease?: Transition["ease"]): Variants {
  const d = duration ?? DURATION.base;
  const e = ease ?? EASE_OUT;
  return {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: d, ease: e },
    },
  };
}

/** 父容器 Stagger 编排：给 motion.div 的 variants 用，子项用 fadeUp */
export function staggerContainer({
  staggerChildren = 0.06,
  delayChildren = 0.1,
}: {
  staggerChildren?: number;
  delayChildren?: number;
} = {}): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren, delayChildren },
    },
  };
}

// ---------- Lenis 平滑滚动，全局唯一配置 ----------
export const LENIS_CONFIG = {
  lerp: 0.12,
} as const;
