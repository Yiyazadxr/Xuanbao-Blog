"use client";

import { Icon } from "@/components/ui/Icon";
import { m } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { PoemQuote } from "@/components/home/PoemQuote";
import { FestivalFeature } from "@/components/home/FestivalFeature";
import { StarfieldWarp } from "@/components/home/StarfieldWarp";
import { getFestivalsForDay } from "@/lib/festivals";
import { useFestivalDay } from "@/lib/use-festival-day";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { MaskedText } from "@/components/ui/MaskedText";

// 首页顶部欢迎区
export function Hero() {
  const reduceMotion = usePrefersReducedMotion();
  const day = useFestivalDay();
  const hasFestival = getFestivalsForDay(day).length > 0;
  const { data: session } = useSession();
  // 登录后显示用户昵称，未登录显示朋友
  const displayName = session?.user?.name ?? "朋友";

  // lerp 平滑鼠标视差，插值系数 0.06
  const blobARef = useRef<HTMLDivElement>(null);
  const blobBRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reduceMotion) return;
    let rafId = 0;
    const onMove = (e: PointerEvent) => {
      // 归一化到 -0.5 ~ 0.5
      target.current.x = e.clientX / window.innerWidth - 0.5;
      target.current.y = e.clientY / window.innerHeight - 0.5;
    };
    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.06;
      current.current.y += (target.current.y - current.current.y) * 0.06;
      if (blobARef.current) {
        blobARef.current.style.transform = `translate(${current.current.x * 60}px, ${current.current.y * 40}px)`;
      }
      if (blobBRef.current) {
        blobBRef.current.style.transform = `translate(${current.current.x * -50}px, ${current.current.y * -30}px)`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduceMotion]);

  return (
    <section className="relative overflow-hidden text-foreground">
      {/* 背景光斑：lerp 跟随鼠标柔和视差 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          ref={blobARef}
          className="absolute -top-1/3 left-[8%] size-[40vmax] rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)] will-change-transform"
        />
        <div
          ref={blobBRef}
          className="absolute right-[-12%] bottom-[-20%] size-[36vmax] rounded-full bg-[radial-gradient(circle,var(--glow-2),transparent_65%)] will-change-transform"
        />
        {/* 星轨：景深粒子由远及近掠过，叠在光斑之上 */}
        <StarfieldWarp />
      </div>

      {/* 内容区使用统一 Stagger 编排入场 */}
      <m.div
        // 顶部沿用全站内容区间，跟随显示密度设置
        className="relative mx-auto w-full max-w-6xl px-4 pt-[var(--content-pt)] pb-24 sm:px-6 sm:pb-32"
        variants={staggerContainer({ staggerChildren: 0.12, delayChildren: 0.15 })}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
      >
        <FestivalFeature day={day} />

        {!hasFestival && (
          <>
            <m.p
              variants={fadeUp()}
              className="font-display mb-5 text-sm font-medium uppercase tracking-[0.3em] text-muted"
            >
              Xuanbao · XR · Blog
            </m.p>
            <m.h1
              variants={fadeUp(32, 0.9)}
              className="font-display break-words text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.05] font-bold tracking-tight"
            >
              <MaskedText text="你好，" delay={0.1} />
              <MaskedText text={displayName} delay={0.45} className="text-accent" />
            </m.h1>
          </>
        )}

        <m.div variants={fadeUp()} className={hasFestival ? "mt-5" : undefined}>
          <PoemQuote />
        </m.div>

        <m.div
          variants={fadeUp()}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/blog"
            className="group relative inline-flex h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-[transform,box-shadow] duration-200 hover:scale-[1.03] hover:shadow-[0_0_28px_-8px_var(--accent)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {/* 扫光：hover 时一道斜向高光横穿按钮。取 --background 与按钮底色互为反色，
                亮暗主题都看得见；系统开启减少动效时整条隐藏。 */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--background)_62%,transparent),transparent)] opacity-0 motion-reduce:hidden group-hover:animate-cta-sheen"
            />
            <span className="relative">开始阅读</span>
            <Icon
              icon="ph:arrow-right-bold"
              width={16}
              height={16}
              className="relative transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </m.div>
      </m.div>
    </section>
  );
}
