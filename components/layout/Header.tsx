"use client";

import { Icon } from "@/components/ui/Icon";
import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { EASE_OUT, SPRING_SNAP } from "@/lib/motion";
import { useFocusTrap } from "@/lib/use-focus-trap";

// 全站吸顶导航 移动端折叠成汉堡菜单
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // 路由变化时收起菜单（渲染期调整，React 支持同源 setState 模式）
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    // effect 体内不直接同步 setState，改为微任务后置。
    void Promise.resolve().then(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 移动端菜单打开时锁定焦点、关闭时归还
  useFocusTrap(menuPanelRef, menuOpen);

  // Escape 键关闭移动端菜单
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // 菜单打开时锁定背景滚动（与 MobileToc 行为一致）
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || menuOpen
          ? "border-b border-border/80 bg-background/70 backdrop-blur-sm backdrop-saturate-150"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav
        aria-label="主导航"
        className="mx-auto flex h-[var(--header-h)] max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        {/* Logo + 站名 */}
        <Link
          href="/"
          className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            lang="zh"
            className="font-display text-2xl font-bold leading-none text-accent"
            style={{ fontFamily: '"幼圆", "YouYuan", "Yuanti SC", "PingFang SC", sans-serif' }}
          >
            暄
          </span>
          <span className="text-base font-bold tracking-tight">
            {SITE.name}
          </span>
        </Link>

        {/* 桌面端导航 */}
        <div className="hidden items-center md:flex">
          <div className="flex items-center gap-0.5 rounded-full border border-border/10 bg-foreground/[0.03] p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] backdrop-blur-sm backdrop-saturate-150 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <m.div
                  key={link.href}
                  className="group"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_SNAP}
                >
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      active
                        ? "bg-surface text-foreground ring-1 ring-border shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)]"
                        : "text-muted hover:bg-foreground/[0.045] hover:text-foreground"
                    }`}
                  >
                    <AnimatedText text={link.label} />
                  </Link>
                </m.div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
          {/* 移动端汉堡按钮 */}
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
          >
            <Icon icon={menuOpen ? "ph:x-bold" : "ph:list-bold"} width={22} height={22} />
          </button>
        </div>
      </nav>

      {/* 移动端下拉菜单：AnimatePresence 提供展开/收起过渡，链接逐项错位淡入 */}
      <AnimatePresence>
        {menuOpen && (
          <m.div
            ref={menuPanelRef}
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="max-h-[calc(100dvh-var(--header-h))] overflow-y-auto border-b border-border/80 bg-background/80 backdrop-blur-sm backdrop-saturate-150 md:hidden"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {NAV_LINKS.map((link, i) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <m.div
                    key={link.href}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT, delay: 0.05 + i * 0.04 }}
                  >
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors duration-200 ${
                        active
                          ? "bg-foreground/5 text-foreground"
                          : "text-muted hover:bg-foreground/5 hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </m.div>
                );
              })}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
