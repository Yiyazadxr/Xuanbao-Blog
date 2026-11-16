"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { submitComment } from "@/app/(blog)/blog/actions";
import { errorCls, primaryBtnCls, successCls } from "@/components/ui/form-styles";
import type { MuteInfo } from "@/lib/mute-types";
import { formatDateTime } from "@/lib/utils";

// 评论表单：顶层评论与回复共用（parentId 区分）
export function CommentForm({
  postId,
  slug,
  parentId,
  onDone,
  muteInfo,
}: {
  postId: string;
  slug: string;
  parentId?: string;
  onDone?: () => void;
  muteInfo?: MuteInfo | null;
}) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!session?.user) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          登录
        </Link>{" "}
        后参与评论。本站采用邀请制，可去
        <Link href="/register" className="text-accent hover:underline">
          注册页
        </Link>
        提交申请
      </p>
    );
  }

  const muted = muteInfo?.muted === true;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await submitComment({ postId, slug, content, parentId });
        if (result.ok) {
          setContent("");
          setFeedback({ ok: true, text: result.message ?? "已提交" });
          onDone?.();
        } else {
          setFeedback({ ok: false, text: result.error ?? "提交失败" });
        }
      } catch {
        setFeedback({ ok: false, text: "提交失败，内容已保留，请稍后重试" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {muted ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          你当前已被{muteInfo.permanent ? "永久禁言" : muteInfo.until ? `禁言至 ${formatDateTime(muteInfo.until)}` : "禁言"}
          {muteInfo.reason ? `，原因：${muteInfo.reason}` : ""}，暂不能发表评论。
        </p>
      ) : (
        <>
          {feedback && (
            <p role={feedback.ok ? "status" : "alert"} className={feedback.ok ? successCls : errorCls}>
              {feedback.text}
            </p>
          )}
          <label htmlFor={`comment-${parentId ?? "root"}`} className="sr-only">
            {parentId ? "回复内容" : "评论内容"}
          </label>
          <textarea
            id={`comment-${parentId ?? "root"}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={parentId ? 2 : 3}
            maxLength={1000}
            required
            placeholder={parentId ? "写下你的回复…" : "友好交流，评论需审核后展示"}
            className="field-growing w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors duration-200 placeholder:text-muted focus:border-accent"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={pending} className={`${primaryBtnCls} w-auto px-6`}>
              {pending ? "提交中…" : parentId ? "回复" : "发表评论"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
