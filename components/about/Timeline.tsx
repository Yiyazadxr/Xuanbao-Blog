"use client";

import { useRef } from "react";
import { m, useScroll, useSpring, useTransform, type Variants } from "framer-motion";
import { EASE_OUT, SPRING_SNAP, staggerContainer } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

export type TimelineEntry = {
  // 展示文案，如 "2026.07"；dateTime 为机器可读格式，如 "2026-07"。
  time: string;
  dateTime?: string;
  title: string;
  description: string;
};

// 行容器只负责编排节奏：短须 → 节点 → 正文 依次入场
const rowVariants: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.04, staggerChildren: 0.07 } },
};

// 正文从轴线一侧滑入，与时间线的纵向结构一致。
const contentVariants: Variants = {
  hidden: { opacity: 0, x: -20, y: 8 },
  visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

// 横向短须：自轴线向节点生长
const tickVariants: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.45, ease: EASE_OUT } },
};

// 节点圆点单独弹入，与正文的淡入错开
const dotVariants: Variants = {
  hidden: { scale: 0 },
  visible: { scale: 1, transition: SPRING_SNAP },
};

// 最新一条持续外扩脉冲，表示「进行中」
const pulseVariants: Variants = {
  hidden: { scale: 0.5, opacity: 0 },
  visible: {
    scale: [0.6, 2.6],
    opacity: [0.5, 0],
    transition: { duration: 2.6, repeat: Infinity, ease: "easeOut" },
  },
};

// 关于页时间线：语义化有序列表，轴线随滚动生长，条目进入视口后逐条入场。
export function Timeline({ items }: { items: readonly TimelineEntry[] }) {
  const reduceMotion = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  // 轴线进度 = 列表在视口中推进的比例，经 spring 平滑后驱动竖线生长与头部光点下移
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start 85%", "end 60%"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });
  const scaleY = useTransform(progress, [0, 1], [0.04, 1]);
  const headTop = useTransform(progress, [0, 1], ["0%", "100%"]);
  const headOpacity = useTransform(progress, [0, 0.04, 0.96, 1], [0, 0.85, 0.85, 0]);

  return (
    <div ref={wrapRef} className="relative mt-6">
      {/* 轨道：静态底线 + 随滚动生长的 accent 进度线，两端用遮罩淡出 */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-0 w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-border [mask-image:linear-gradient(to_bottom,transparent,black_5%,black_90%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_5%,black_90%,transparent)]"
      >
        <m.span
          className="absolute inset-0 origin-top rounded-full bg-accent"
          style={{ scaleY: reduceMotion ? 1 : scaleY }}
        />
      </span>

      {/* 进度线头部光点：骑行在已生长部分的末端 */}
      {!reduceMotion && (
        <m.span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent blur-[3px]"
          style={{ top: headTop, opacity: headOpacity }}
        />
      )}

      <m.ol
        aria-label="建站时间线"
        className="relative space-y-6 pl-8"
        variants={staggerContainer({ staggerChildren: 0.14, delayChildren: 0.08 })}
        initial={reduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
      >
        {items.map((item, index) => (
          <m.li
            key={`${item.time}-${item.title}`}
            variants={rowVariants}
            className="group relative"
          >
            <m.span
              aria-hidden="true"
              variants={tickVariants}
              className="absolute -left-5 top-[0.6rem] h-px w-4 origin-left bg-border transition-colors duration-300 group-hover:bg-accent/70"
            />
            <span aria-hidden="true" className="absolute -left-8 top-1 -translate-x-1/2">
              <m.span
                variants={dotVariants}
                className="relative block size-3 rounded-full bg-accent ring-4 ring-background transition-shadow duration-300 group-hover:shadow-[0_0_0_6px_var(--glow-1)]"
              >
                {index === items.length - 1 && !reduceMotion && (
                  <m.span
                    variants={pulseVariants}
                    className="absolute -inset-1 rounded-full border border-accent/40"
                  />
                )}
              </m.span>
            </span>
            <m.div
              variants={contentVariants}
              className="-mr-3 rounded-xl py-2 pr-3 transition-colors duration-300 group-hover:bg-surface"
            >
              <time
                dateTime={item.dateTime ?? item.time}
                className="font-display block text-sm font-bold tracking-wide text-accent"
              >
                {item.time}
              </time>
              <h3 className="mt-1 font-bold transition-colors duration-300 group-hover:text-accent">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            </m.div>
          </m.li>
        ))}
      </m.ol>
    </div>
  );
}
