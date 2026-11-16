"use client";

import { useState, useTransition } from "react";
import { deleteComment } from "@/app/(admin)/admin/comments/actions";
import { CommentForm } from "@/components/comments/CommentForm";
import { Avatar } from "@/components/ui/Avatar";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { CommentWithReplies } from "@/lib/comment-types";
import { formatDate } from "@/lib/utils";

// 单条评论
export function CommentItem({
  comment,
  postId,
  slug,
  canModerate,
  currentUserId,
  onChanged,
}: {
  comment: CommentWithReplies;
  postId: string;
  slug: string;
  canModerate: boolean;
  currentUserId: string | null;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  async function handleDelete(id: string) {
    if (!(await confirm("确定删除这条评论吗？其下回复也会一并删除。", "删除"))) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteComment(id);
        if (result.ok) onChanged();
        else setError(result.error ?? "删除失败，请重试");
      } catch {
        setError("删除失败，请稍后重试");
      }
    });
  }

  const canDeleteComment = canModerate || currentUserId === comment.author.id;

  return (
    <li className="py-5">
      {dialog}
      {error && <p role="alert">{error}</p>}
      <CommentBody
        name={comment.author.name}
        image={comment.author.image}
        seed={comment.author.id}
        date={comment.createdAt}
        content={comment.content}
        action={
          canDeleteComment ? (
            <button
              type="button"
              onClick={() => handleDelete(comment.id)}
              disabled={pending}
              className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition-colors duration-200 hover:bg-red-500/10 disabled:opacity-50"
            >
              删除
            </button>
          ) : undefined
        }
      />
      <button
        type="button"
        onClick={() => setReplying((v) => !v)}
        className="mt-2 cursor-pointer text-xs font-medium text-muted transition-colors duration-200 hover:text-accent"
      >
        {replying ? "收起" : "回复"}
      </button>

      {replying && (
        <div className="mt-3 pl-4 sm:pl-10">
          <CommentForm
            postId={postId}
            slug={slug}
            parentId={comment.id}
            onDone={() => { setReplying(false); onChanged(); }}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <ul className="mt-4 space-y-4 border-l-2 border-border pl-4 sm:pl-6">
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentBody
                name={reply.author.name}
                image={reply.author.image}
                seed={reply.author.id}
                date={reply.createdAt}
                content={reply.content}
                action={
                  canModerate || currentUserId === reply.author.id ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(reply.id)}
                      disabled={pending}
                      className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition-colors duration-200 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      删除
                    </button>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function CommentBody({
  name,
  image,
  seed,
  date,
  content,
  action,
}: {
  name: string;
  image?: string | null;
  seed?: string;
  date: Date | string;
  content: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Avatar image={image} name={name} seed={seed} shape="circle" className="size-9" />
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-sm font-semibold">{name}</span>
          <time className="text-xs text-muted">{formatDate(date)}</time>
          {action}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
