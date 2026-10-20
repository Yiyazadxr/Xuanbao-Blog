"use client";

import { Icon } from "@/components/ui/Icon";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useState } from "react";
import { DURATION, EASE_OUT } from "@/lib/motion";

const SCROLL_THRESHOLD = 400;

// 回到顶部：滚动超过阈值后浮现，点击平滑滚动至顶部
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD);
    // effect 体内不直接同步 setState，改为微任务后置。
    void Promise.resolve().then(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <AnimatePresence>
      {visible && (
        <m.button
          type="button"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 16 }}
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
          aria-label="回到顶部"
          className="fixed bottom-4 right-4 z-40 flex size-11 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg ring-2 ring-accent/20 transition-shadow duration-200 hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:bottom-6 sm:right-6 sm:size-12"
        >
          <Icon icon="ph:arrow-up-bold" className="size-5 sm:size-6" aria-hidden />
        </m.button>
      )}
    </AnimatePresence>
  );
}
