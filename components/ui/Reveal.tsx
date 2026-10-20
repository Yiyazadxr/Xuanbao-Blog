"use client";

import { m } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// 滚动进入视口时的入场动画包装（respect reduced-motion）
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <m.div
      className={className}
      data-reveal=""
      initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      {children}
    </m.div>
  );
}
