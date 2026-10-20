"use client";

import { AnimatePresence, m } from "framer-motion";
import { useState, useCallback, useRef, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { SITE } from "@/lib/constants";
import { POEMS } from "@/lib/poems";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// 首页副标题：欢迎语 + 一句古诗文（同行展示），右侧小圆圈刷新按钮换下一句
// 悬停诗句超 500ms 以浮层方式展示出处
export function PoemQuote() {
  const reduceMotion = usePrefersReducedMotion();
  // 初始固定为 0，避免 SSR 与客户端 Math.random() 不一致导致水合警告；
  // 挂载后再随机选中一首
  const [index, setIndex] = useState(0);
  const [showSource, setShowSource] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poem = POEMS[index];
  // 作者 + 篇名两端着色
  const [, sourceAuthor, sourceTitle] = /^(.*?)(《[^》]*》)$/.exec(poem.source) ?? [];

  // 首次挂载时选一句：需在客户端运行才能在 SSR 水合一致。
  // 只在挂载后随机一次；这是对客户端随机状态的收尾，允许在 effect 内 setState。
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setIndex(Math.floor(Math.random() * POEMS.length));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // 卸载时清理悬停定时器，避免对已卸载组件 setState。
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const refresh = useCallback(() => {
    setIndex((prev) => {
      let next = Math.floor(Math.random() * POEMS.length);
      // 避免刷新后仍显示同一条
      while (next === prev) next = Math.floor(Math.random() * POEMS.length);
      return next;
    });
  }, []);

  function handleEnter() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowSource(true), 500);
  }

  function handleLeave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setShowSource(false);
  }

  return (
    <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
      欢迎来到{SITE.shortName}的个人博客
      <span className="ml-4 inline-flex min-w-0 items-baseline gap-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={index}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative inline-block min-w-0"
          >
            <span
              className="cursor-default text-accent"
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
              onFocus={handleEnter}
              onBlur={handleLeave}
            >
              <span className="mr-0.5">「</span>
              {poem.text}
              <span className="ml-0.5">」</span>
            </span>
            {/* 出处浮层：绝对定位、不占文档流，避免显示/隐藏引起布局回流，把诗句挤离鼠标并触发 mouseleave。 */}
            <AnimatePresence>
              {showSource && (
                <m.span
                  initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute left-0 top-full z-20 mt-2.5 origin-top-left"
                >
                  <span className="relative flex items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-surface/95 px-3 py-1.5 shadow-lg shadow-black/5 backdrop-blur-sm dark:shadow-black/40">
                    {/* 指向诗句的小箭头：旋转方块只留上/左边框，与卡片同色 */}
                    <span className="absolute -top-1 left-6 size-2 rotate-45 border-l border-t border-border bg-surface" />
                    <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                    <span className="text-[0.7rem] tracking-[0.2em] text-muted">
                      出处
                    </span>
                    <span className="h-3 w-px shrink-0 bg-border" />
                    <span className="text-xs">
                      {sourceAuthor ? (
                        <>
                          <span className="font-medium text-accent">
                            {sourceAuthor}
                          </span>
                          <span className="text-foreground">{sourceTitle}</span>
                        </>
                      ) : (
                        <span className="text-foreground">{poem.source}</span>
                      )}
                    </span>
                  </span>
                </m.span>
              )}
            </AnimatePresence>
          </m.span>
        </AnimatePresence>
        <button
          type="button"
          onClick={refresh}
          aria-label="换一句"
          title="换一句"
          className="-mb-0.5 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full align-baseline text-muted transition-colors duration-200 hover:text-accent"
        >
          <Icon icon="ph:arrows-clockwise-bold" width={13} height={13} aria-hidden />
        </button>
      </span>
    </p>
  );
}
