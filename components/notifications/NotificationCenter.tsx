"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useRef, useState } from "react";
import {
  clearReadNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markCategoryRead,
  markNotificationRead,
} from "@/app/notifications/actions";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import {
  NOTIFICATION_CATEGORY_META,
  NOTIFICATION_CATEGORY_ORDER,
  type NotificationCategory,
  type NotificationCursor,
  type NotificationItem,
  type NotificationUnreadSummary,
} from "@/lib/notification-types";

type Tab = NotificationCategory | "all";

const EMPTY_SUMMARY: NotificationUnreadSummary = {
  total: 0,
  byCategory: { system: 0, like: 0, comment: 0 },
};

// 通知中心
// Tab 加载放在点击事件处理器里（允许同步 setState），避免 effect 内同步 setState
export function NotificationCenter({
  initialItems,
  initialCursor,
  initialUnread,
}: {
  initialItems: NotificationItem[];
  initialCursor: NotificationCursor | null;
  initialUnread: NotificationUnreadSummary;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<Record<Tab, NotificationItem[]>>({
    all: initialItems,
    system: [],
    like: [],
    comment: [],
  });
  const [nextCursor, setNextCursor] = useState<Record<Tab, NotificationCursor | null>>({
    all: initialCursor,
    system: null,
    like: null,
    comment: null,
  });
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  // 记录已加载过的分类（含空结果），避免每次切换 Tab 都重复请求
  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(() => new Set(["all"]));

  function selectTab(t: Tab) {
    if (busy.current) return;
    setTab(t);
    if (t !== "all" && !loadedTabs.has(t) && !loading) {
      busy.current = true;
      setLoading(true);
      setError(null);
      getNotifications(t)
        .then((res) => {
          setItems((prev) => ({ ...prev, [t]: res.items }));
          setNextCursor((prev) => ({ ...prev, [t]: res.nextCursor }));
          setUnread(res.unread);
          setLoadedTabs((prev) => new Set(prev).add(t));
        })
        .catch(() => setError("通知加载失败，请稍后重试"))
        .finally(() => { busy.current = false; setLoading(false); });
    }
  }

  function handleLoadMore() {
    const t = tab;
    const cursor = nextCursor[t];
    if (!cursor || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    getNotifications(t, cursor)
      .then((res) => {
        setItems((prev) => ({ ...prev, [t]: [...prev[t], ...res.items] }));
        setNextCursor((prev) => ({ ...prev, [t]: res.nextCursor }));
        setUnread(res.unread);
      })
      .catch(() => setError("通知加载失败，请稍后重试"))
      .finally(() => { busy.current = false; setLoading(false); });
  }

  async function handleItemClick(item: NotificationItem) {
    if (item.read || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await markNotificationRead(item.id);
      markLocalRead(item.id, item.category);
    } catch {
      setError("标记已读失败，请稍后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function markLocalRead(id: string, category: NotificationCategory) {
    setItems((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as Tab[]) {
        next[key] = next[key].map((n) => (n.id === id ? { ...n, read: true } : n));
      }
      return next;
    });
    setUnread((prev) => ({
      total: Math.max(0, prev.total - 1),
      byCategory: {
        ...prev.byCategory,
        [category]: Math.max(0, prev.byCategory[category] - 1),
      },
    }));
  }

  async function handleMarkAll() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      setItems((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next) as Tab[]) next[key] = next[key].map((n) => ({ ...n, read: true }));
        return next;
      });
      setUnread(EMPTY_SUMMARY);
    } catch {
      setError("操作失败，请稍后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function handleMarkCategory(t: Tab) {
    if (t === "all") return handleMarkAll();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await markCategoryRead(t);
      setItems((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next) as Tab[]) {
          next[key] = next[key].map((n) => n.category === t ? { ...n, read: true } : n);
        }
        return next;
      });
      setUnread((prev) => ({
        total: Math.max(0, prev.total - prev.byCategory[t]),
        byCategory: { ...prev.byCategory, [t]: 0 },
      }));
    } catch {
      setError("操作失败，请稍后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function handleClearRead() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await clearReadNotifications();
      setItems((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next) as Tab[]) next[key] = next[key].filter((n) => !n.read);
        return next;
      });
    } catch {
      setError("操作失败，请稍后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (busy.current) return;
    const target = items[tab].find((item) => item.id === id);
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await deleteNotification(id);
      setItems((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next) as Tab[]) next[key] = next[key].filter((n) => n.id !== id);
        return next;
      });
      if (target && !target.read) {
        setUnread((prev) => ({
          total: Math.max(0, prev.total - 1),
          byCategory: { ...prev.byCategory, [target.category]: Math.max(0, prev.byCategory[target.category] - 1) },
        }));
      }
    } catch {
      setError("删除失败，请稍后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const currentItems = items[tab];
  const categoryUnread = (t: Tab) => (t === "all" ? unread.total : unread.byCategory[t]);

  return (
    // 不透明底，遮挡水墨背景
    <div className="mx-auto mt-[var(--content-pt)] w-full max-w-3xl rounded-2xl border border-border bg-background px-4 pt-8 pb-24 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">通知</h1>
          <p className="mt-2 text-sm text-muted">收到的赞、评论回复与系统消息都在这里</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleClearRead}
            disabled={pending || loading}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
          >
            清空已读
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}

      {/* 分类 Tab */}
      <div role="tablist" className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {(["all", ...NOTIFICATION_CATEGORY_ORDER] as Tab[]).map((t) => {
          const active = tab === t;
          const count = categoryUnread(t);
          const label = t === "all" ? "全部" : NOTIFICATION_CATEGORY_META[t].label;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              disabled={loading || pending}
              onClick={() => selectTab(t)}
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-b border-border pb-3">
        <span className="text-sm text-muted">{categoryUnread(tab)} 条未读</span>
        {unread.total > 0 && (
          <button
            type="button"
            onClick={() => handleMarkCategory(tab)}
            disabled={pending || loading}
            className="cursor-pointer text-sm text-accent hover:underline disabled:opacity-50"
          >
            全部已读
          </button>
        )}
      </div>

      <div className="mt-2 divide-y divide-border">
        {currentItems.length === 0 ? (
          <EmptyState
            icon={tab === "all" ? "ph:bell-light" : NOTIFICATION_CATEGORY_META[tab as NotificationCategory].icon}
            title="暂无通知"
            description="有新消息时会出现在这里。"
            className="py-20"
          />
        ) : (
          currentItems.map((item) => (
            <NotificationRow key={item.id} item={item} onDelete={handleDelete} onActivate={() => handleItemClick(item)} disabled={pending || loading} />
          ))
        )}
      </div>

      {nextCursor[tab] && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading || pending}
            className="cursor-pointer rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {loading ? "加载中…" : "加载更多"}
          </button>
        </div>
      )}
    </div>
  );
}
