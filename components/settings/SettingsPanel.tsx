"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarEntryCard } from "@/components/settings/AvatarEntryCard";
import { DisplayForm } from "@/components/settings/DisplayForm";
import { ROLE_BADGE_CLS, ROLE_LABELS, type Role } from "@/lib/roles";
import { formatCount } from "@/lib/utils";

// 设置页：个人资料和显示两个分区
export function SettingsPanel({
  name,
  email,
  role,
  image,
  days,
  joinedDate,
  postsRead,
  wordsRead,
  bookmarkCount,
}: {
  name: string;
  email: string;
  role: Role;
  image?: string | null;
  days: number;
  joinedDate: string;
  postsRead: number;
  wordsRead: number;
  bookmarkCount: number;
}) {
  const [tab, setTab] = useState<"profile" | "display">("profile");

  const tabCls = (active: boolean) =>
    `flex-1 cursor-pointer rounded-xl py-2 text-sm font-medium transition-colors duration-200 ${
      active ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
    }`;

  return (
    // 不透明底，遮挡水墨背景
    <div className="mx-auto mt-[var(--content-pt)] w-full max-w-xl rounded-2xl border border-border bg-background px-4 pt-8 pb-24 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">设置</h1>
      <p className="mt-2 text-sm text-muted">管理你的个人资料与显示偏好</p>

      {/* 分区切换 */}
      <div role="tablist" className="mt-6 flex gap-1 rounded-2xl border border-border p-1">
        <button
          role="tab"
          aria-selected={tab === "profile"}
          onClick={() => setTab("profile")}
          className={tabCls(tab === "profile")}
        >
          个人资料
        </button>
        <button
          role="tab"
          aria-selected={tab === "display"}
          onClick={() => setTab("display")}
          className={tabCls(tab === "display")}
        >
          显示
        </button>
      </div>

      {tab === "profile" ? (
        <div className="mt-6 space-y-4">
          {/* 账号概览 */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-6">
            <Avatar image={image} name={name} className="size-14 text-xl" seed={name} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-bold">{name}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    ROLE_BADGE_CLS[role] ?? ROLE_BADGE_CLS.MEMBER
                  }`}
                >
                  {ROLE_LABELS[role] ?? role}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{email}</p>
              <p className="mt-0.5 text-xs text-muted">
                {days === 0 ? "今天加入本站" : `已加入本站 ${days} 天`} · 注册于 {joinedDate}
              </p>
            </div>
          </div>

          {/* 账号操作入口 */}
          <div className="flex flex-col gap-2">
            <Link
              href="/bookmarks"
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-accent"
            >
              <span>
                <span className="block font-medium">我的收藏</span>
                <span className="mt-0.5 block text-xs text-muted">收藏的文章</span>
              </span>
              <span className="text-muted">{bookmarkCount} 篇 →</span>
            </Link>
            <AvatarEntryCard image={image} />
            <Link
              href="/settings/name"
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-accent"
            >
              <span>
                <span className="block font-medium">修改昵称</span>
                <span className="mt-0.5 block text-xs text-muted">更换你的显示昵称</span>
              </span>
              <span className="text-muted">→</span>
            </Link>
            <Link
              href="/settings/password"
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-accent"
            >
              <span>
                <span className="block font-medium">修改密码</span>
                <span className="mt-0.5 block text-xs text-muted">需验证当前密码</span>
              </span>
              <span className="text-muted">→</span>
            </Link>
          </div>

          {/* 阅读统计 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs text-muted">已读文章</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatCount(postsRead)} 篇</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs text-muted">累计阅读</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatCount(wordsRead)} 字</p>
            </div>
          </div>
        </div>
      ) : (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-bold">显示</h2>
          <p className="mt-1 text-sm text-muted">调整字体、间距、行距与动效，改完即生效。</p>
          <div className="mt-5">
            <DisplayForm />
          </div>
        </section>
      )}
    </div>
  );
}
