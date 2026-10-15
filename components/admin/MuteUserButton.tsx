"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { muteUser, unmuteUser } from "@/app/(admin)/admin/users/actions";
import { formatDateTime } from "@/lib/utils";

// 用户列表行「禁言/解禁」：展开小面板，输入禁言天数（0=永久）与原因
export function MuteUserButton({
  userId,
  isMuted,
  muteInfo,
}: {
  userId: string;
  isMuted: boolean;
  muteInfo: { permanent: boolean; until: string | null; reason: string | null };
}) {
  const router = useRouter();
  // 同一页面存在多个实例（每用户行一个），id 必须唯一。
  const daysId = useId();
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();

  function handleMute(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("");
    const daysNum = Number(days);
    if (!Number.isInteger(daysNum) || daysNum < 0 || daysNum > 3650) {
      setFeedback("请输入 0~3650 的整数天数，0 为永久");
      return;
    }
    startTransition(async () => {
      const result = await muteUser(userId, daysNum, reason.trim());
      if (result.ok) {
        setOpen(false);
        setReason("");
        setFeedback("");
      } else {
        setFeedback(result.error ?? "禁言失败");
      }
      router.refresh();
    });
  }

  function handleUnmute() {
    setFeedback("");
    startTransition(async () => {
      const result = await unmuteUser(userId);
      if (!result.ok) setFeedback(result.error ?? "解除失败");
      setOpen(false);
      router.refresh();
    });
  }

  function toggle() {
    setFeedback("");
    setOpen((v) => !v);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50 ${
          isMuted
            ? "text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
            : "text-muted hover:bg-foreground/5 hover:text-foreground"
        }`}
      >
        {isMuted ? "解除禁言" : "禁言"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-border bg-surface p-4 shadow-lg">
          {isMuted ? (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                该用户当前处于禁言状态
                {muteInfo.permanent
                  ? "（永久）"
                  : muteInfo.until
                    ? `，解禁时间 ${formatDateTime(muteInfo.until)}`
                    : ""}
                {muteInfo.reason ? `，原因：${muteInfo.reason}` : ""}
              </p>
              <button
                type="button"
                onClick={handleUnmute}
                disabled={pending}
                className="w-full cursor-pointer rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors duration-200 hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-400"
              >
                {pending ? "处理中…" : "解除禁言"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleMute} className="space-y-3">
              <label htmlFor={daysId} className="block text-xs font-medium text-muted">禁言天数（0 为永久）</label>
              <input
                id={daysId}
                type="number"
                min={0}
                max={3650}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition-colors duration-200 focus:border-accent"
              />
              <label htmlFor={reasonId} className="block text-xs font-medium text-muted">原因</label>
              <input
                id={reasonId}
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                placeholder="选填，例如：恶意刷屏"
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition-colors duration-200 placeholder:text-muted focus:border-accent"
              />
              {feedback && <p className="text-xs text-red-500">{feedback}</p>}
              <button
                type="submit"
                disabled={pending}
                className="w-full cursor-pointer rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors duration-200 hover:bg-red-500/20 disabled:opacity-50"
              >
                {pending ? "处理中…" : "确认禁言"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
