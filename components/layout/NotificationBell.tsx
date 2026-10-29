"use client";

import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import type { NotificationItem, NotificationUnreadSummary } from "@/lib/notification-types";
import { useFocusTrap } from "@/lib/use-focus-trap";

const EMPTY_SUMMARY: NotificationUnreadSummary = {
  total: 0,
  byCategory: { system: 0, like: 0, comment: 0 },
};

// 站内通知铃铛：未读角标 + 下拉列表 + 前往通知中心
export function NotificationBell() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState<NotificationUnreadSummary>(EMPTY_SUMMARY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const requestVersion = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    const version = ++requestVersion.current;
    try {
      const data = await getNotifications("all");
      if (version !== requestVersion.current) return;
      setItems(data.items);
      setUnread(data.unread);
      setError(null);
    } catch {
      if (version === requestVersion.current) setError("通知加载失败");
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const versions = requestVersion;
    const version = ++requestVersion.current;
    getNotifications("all")
      .then((data) => {
        if (cancelled || version !== requestVersion.current) return;
        setItems(data.items);
        setUnread(data.unread);
      })
      .catch(() => {
        if (!cancelled && version === requestVersion.current) setError("通知加载失败");
      });
    return () => {
      cancelled = true;
      versions.current++;
    };
  }, [status]);

  // 点击外部 / Escape 关闭下拉
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useFocusTrap(panelRef, open);

  // 加载中占位，防布局跳动
  if (status === "loading") {
    return <span className="inline-block size-10" aria-hidden />;
  }
  if (status !== "authenticated") return null;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) refresh();
  }

  async function handleItemClick(item: NotificationItem) {
    if (busy.current) return;
    if (item.read) {
      setOpen(false);
      return;
    }
    busy.current = true;
    requestVersion.current++;
    setPending(true);
    setError(null);
    try {
      const readResult = await markNotificationRead(item.id);
      if (!readResult.ok) {
        setError(readResult.error ?? "标记已读失败，请稍后重试");
        return;
      }
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnread((prev) => ({
        total: Math.max(0, prev.total - 1),
        byCategory: {
          ...prev.byCategory,
          [item.category]: Math.max(0, prev.byCategory[item.category] - 1),
        },
      }));
      setOpen(false);
    } catch {
      setError("标记已读失败，请稍后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function handleMarkAll() {
    if (busy.current) return;
    busy.current = true;
    requestVersion.current++;
    setPending(true);
    setError(null);
    try {
      const allResult = await markAllNotificationsRead();
      if (!allResult.ok) {
        setError(allResult.error ?? "操作失败，请稍后重试");
        return;
      }
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(EMPTY_SUMMARY);
    } catch {
      setError("操作失败，请稍后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (busy.current) return;
    const target = items.find((n) => n.id === id);
    busy.current = true;
    requestVersion.current++;
    setPending(true);
    setError(null);
    try {
      const deleteResult = await deleteNotification(id);
      if (!deleteResult.ok) {
        setError(deleteResult.error ?? "删除失败，请稍后重试");
        return;
      }
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.read) {
        setUnread((prev) => ({
          total: Math.max(0, prev.total - 1),
          byCategory: {
            ...prev.byCategory,
            [target.category]: Math.max(0, prev.byCategory[target.category] - 1),
          },
        }));
      }
    } catch {
      setError("删除失败，请稍后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread.total > 0 ? `通知，${unread.total} 条未读` : "通知"}
        aria-expanded={open}
        className="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Icon icon="ph:bell-bold" width={22} height={22} />
        {unread.total > 0 && (
          <span className="absolute right-0 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread.total > 99 ? "99+" : unread.total}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="通知列表"
          className="absolute right-0 top-12 w-[22rem] overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">通知</span>
            {unread.total > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={pending}
                className="cursor-pointer text-xs text-accent hover:underline"
              >
                全部已读
              </button>
            )}
          </div>
          {error && <p role="alert" className="px-4 py-2 text-xs text-red-500">{error}</p>}

          <div className="max-h-[24rem] overflow-y-auto divide-y divide-border">
            {items.length === 0 ? (
              <EmptyState title="暂无通知" className="py-10" />
            ) : (
              items.map((item) => (
                <NotificationRow key={item.id} item={item} onDelete={handleDelete} onActivate={() => handleItemClick(item)} disabled={pending} compact />
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-border bg-foreground/5 px-4 py-2.5 text-xs font-medium text-muted transition-colors duration-150 hover:text-accent"
          >
            查看全部通知
            <Icon icon="ph:arrow-right-bold" width={12} height={12} aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
