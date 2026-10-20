"use client";

import { m, type Variants } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// 父容器统筹子项逐项入场，子项无需手写 delay
export function Stagger({
  children,
  className,
  delayChildren = 0.1,
  staggerChildren = 0.06,
}: {
  children: React.ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
}) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <m.div
      className={className}
      data-reveal=""
      variants={staggerContainer({ staggerChildren, delayChildren })}
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({
  children,
  className,
  variants = fadeUp(),
}: {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
}) {
  return (
    <m.div className={className} data-reveal="" variants={variants}>
      {children}
    </m.div>
  );
}

