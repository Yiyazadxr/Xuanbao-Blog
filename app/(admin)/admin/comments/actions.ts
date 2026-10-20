"use server";

// 审核要求 manage_comments；作者可删除自己的评论。
import { revalidatePath } from "next/cache";
import { getFreshUser, requirePermission } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import { parseId } from "@/lib/validation";
import type { AdminActionState } from "../action-types";

export async function approveComment(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.APPROVE_COMMENTS);
  if (!admin) return { ok: false, error: "无权限" };
  const cid = parseId(id);
  if (!cid.data) return { ok: false, error: cid.error ?? "参数不合法" };
  const comment = await prisma.comment.findUnique({
    where: { id: cid.data },
    include: {
      post: { select: { slug: true, title: true, authorId: true } },
      author: { select: { name: true } },
      parent: { select: { authorId: true } },
    },
  });
  if (!comment) return { ok: false, error: "评论不存在" };
  const approved = await prisma.comment.updateMany({
    where: { id: cid.data, isApproved: false },
    data: { isApproved: true },
  });
  if (approved.count === 0) return { ok: false, error: "评论已审核" };
  if (comment.authorId !== admin.id) {
    await createNotification(comment.authorId, {
      category: NOTIFICATION_CATEGORIES.SYSTEM,
      type: "comment_approved",
      title: "你的评论已通过审核",
      link: `/blog/${comment.post.slug}`,
      // 同一文章的审核结果合并通知。
      aggregateKey: `comment_approved:${comment.postId}`,
    });
  }
  if (
    comment.post.authorId !== comment.authorId &&
    comment.post.authorId !== admin.id
  ) {
    await createNotification(comment.post.authorId, {
      category: NOTIFICATION_CATEGORIES.COMMENT,
      type: "comment",
      actorName: comment.author.name,
      title: `评论了你的文章《${comment.post.title}》`,
      link: `/blog/${comment.post.slug}`,
      // 同一文章的评论合并通知。
      aggregateKey: `comment:${comment.postId}`,
    });
  }
  if (
    comment.parent &&
    comment.parent.authorId !== comment.authorId &&
    comment.parent.authorId !== admin.id
  ) {
    await createNotification(comment.parent.authorId, {
      category: NOTIFICATION_CATEGORIES.COMMENT,
      type: "reply",
      actorName: comment.author.name,
      title: "回复了你的评论",
      link: `/blog/${comment.post.slug}`,
      // 同一文章的回复合并通知。
      aggregateKey: `reply:${comment.postId}`,
    });
  }
  revalidatePath(`/blog/${comment.post.slug}`);
  revalidatePath("/admin/comments");
  return { ok: true, message: "已通过" };
}

export async function deleteComment(id: string): Promise<AdminActionState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "无权限" };
  const moderator = await hasPermission(user.role as Role, PERMISSIONS.DELETE_COMMENTS);
  const cid = parseId(id);
  if (!cid.data) return { ok: false, error: cid.error ?? "参数不合法" };
  const comment = await prisma.comment.findUnique({
    where: { id: cid.data },
    include: { post: { select: { slug: true } } },
  });
  if (!comment) return { ok: false, error: "评论不存在" };
  const permitted = moderator || comment.authorId === user.id;
  if (!permitted) return { ok: false, error: "无权限" };
  // 删除父评论时一并删除其下回复（回复的父级外键为 SET NULL，回复不能独立存在）。
  await prisma.comment.deleteMany({
    where: { OR: [{ id: cid.data }, { parentId: cid.data }] },
  });
  revalidatePath(`/blog/${comment.post.slug}`);
  revalidatePath("/admin/comments");
  return { ok: true, message: "已删除" };
}
