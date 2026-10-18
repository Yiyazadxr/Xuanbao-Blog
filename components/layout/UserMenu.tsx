"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { canAccessAdmin } from "@/lib/roles";
import { useFocusTrap } from "@/lib/use-focus-trap";

// 导航栏右侧用户区：未登录显示登录图标；已登录显示头像下拉菜单
export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 下拉打开时锁定焦点、关闭时归还给触发按钮
  useFocusTrap(panelRef, open);

  // 点击外部 / Escape 关闭下拉
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // 加载中占位，防布局跳动
  if (status === "loading") {
    return <span className="inline-block size-10" aria-hidden />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        aria-label="登录"
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Icon icon="ph:user-circle-bold" width={22} height={22} />
      </Link>
    );
  }

  const { user } = session;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="用户菜单"
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Avatar image={user.image} name={user.name} seed={user.id} eager className="size-8 text-sm" shape="circle" />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 top-12 w-44 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        >
          <p className="border-b border-border px-4 py-3 text-sm">
            <span className="block font-medium">{user.name}</span>
            <span className="mt-0.5 block truncate text-xs text-muted">{user.email}</span>
          </p>
          <Link
            href="/notifications"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
          >
            通知
          </Link>
          <Link
            href="/bookmarks"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
          >
            收藏
          </Link>
          <Link
            href="/reading"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
          >
            最近阅读
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
          >
            设置
          </Link>
          {canAccessAdmin(user.role) && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
            >
              管理后台
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
