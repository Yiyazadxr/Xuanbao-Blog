"use server";

// 公开互动需登录并具备对应权限。
import { getFreshUser, requirePermission } from "@/lib/auth";
import { getApprovedComments } from "@/lib/comments";
import type { CommentCursor, CommentWithReplies } from "@/lib/comment-types";
import { getMuteInfo } from "@/lib/mute";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { ROLES } from "@/lib/roles";
import { formatDateTime } from "@/lib/utils";
import { bookmarkSchema, commentPageSchema, commentSchema, likeSchema, parseInput } from "@/lib/validation";

export type CommentActionState = { ok: boolean; error?: string; message?: string };

// 评论默认进入审核状态。
export async function submitComment(payload: unknown): Promise<CommentActionState> {
  const user = await requirePermission(PERMISSIONS.COMMENT);
  if (!user) return { ok: false, error: "请先登录再评论" };

  // SUPER_ADMIN 不受禁言限制。
  if (user.role !== ROLES.SUPER_ADMIN) {
    const mute = await getMuteInfo(user.id);
    if (mute.muted) {
      const untilText = mute.permanent
        ? ""
        : mute.until
          ? `，解禁时间为 ${formatDateTime(mute.until)}`
          : "";
      return { ok: false, error: `你已被禁言${untilText}${mute.reason ? `，原因：${mute.reason}` : ""}` };
    }
  }

  const parsed = parseInput(commentSchema, payload);
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { postId, content, parentId } = parsed.data;

  const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;

  // 普通用户每 30 秒一条；SUPER_ADMIN 不限流。
  if (!isSuperAdmin) {
    const check = await rateLimit.checkAndHit("comment", user.id, 1, 30 * 1000);
    if (check.blocked) {
      return { ok: false, error: `操作过于频繁，请 ${check.retryAfterSec} 秒后再试` };
    }
  }

  const post = await prisma.post.findFirst({ where: { id: postId, published: true, archived: false } });
  if (!post) return { ok: false, error: "文章不存在" };

  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, postId, isApproved: true },
    });
    if (!parent) return { ok: false, error: "回复的评论不存在" };
    if (parent.parentId) return { ok: false, error: "只支持一层回复" };
  }

  await prisma.comment.create({
    data: {
      content,
      postId,
      authorId: user.id,
      parentId: parentId ?? null,
      isApproved: isSuperAdmin,
    },
  });

  // SUPER_ADMIN 评论直接公开。
  if (!isSuperAdmin) {
    // 通知失败不影响评论入库，交给管理员在后台处理。
    try {
      await notifyAdmins({
        category: NOTIFICATION_CATEGORIES.COMMENT,
        type: parentId ? "reply_pending" : "comment_pending",
        actorName: user.name,
        title: parentId ? "回复了评论，待审核" : `评论了你的文章《${post.title}》，待审核`,
        link: "/admin/comments",
        // 按「文章 + 类型」聚合
        aggregateKey: `${parentId ? "reply_pending" : "comment_pending"}:${postId}`,
      });
    } catch (error) {
      console.error("评论审核通知发送失败：", error);
    }
  }

  // 点赞数与评论数都在客户端按需拉取，文章页缓存不依赖它们，无需失效。
  return {
    ok: true,
    message: isSuperAdmin ? "评论已发布" : "评论已提交，博主审核通过后会显示在这里",
  };
}

// 点赞按目标状态写入（幂等）：客户端提交「要点赞 / 要取消点赞」，
// 并发点击不会像先删后建那样把取消操作变成点赞。
export async function setLike(
  postId: string,
  slug: string,
  liked: boolean
): Promise<CommentActionState & { liked?: boolean; count?: number }> {
  const user = await requirePermission(PERMISSIONS.LIKE);
  if (!user) return { ok: false, error: "请先登录再点赞" };

  const parsed = parseInput(likeSchema, { postId, slug, liked });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { postId: pid } = parsed.data;

  // 点赞限流防止高频写入；SUPER_ADMIN 不限流。
  if (user.role !== ROLES.SUPER_ADMIN) {
    const check = await rateLimit.checkAndHit("like", user.id, 30, 60 * 1000);
    if (check.blocked) {
      return { ok: false, error: `操作过于频繁，请 ${check.retryAfterSec} 秒后再试` };
    }
  }

  // 先校验文章，避免伪造 postId 触发外键错误。
  const post = await prisma.post.findFirst({
    where: { id: pid, published: true, archived: false },
    select: { id: true, title: true, slug: true, authorId: true },
  });
  if (!post) return { ok: false, error: "文章不存在" };

  const key = { userId: user.id, postId: pid };
  // 单条 INSERT ... ON CONFLICT DO NOTHING：重复点赞不报错，也不重复计数。
  const inserted = liked
    ? await prisma.like.createMany({ data: [key], skipDuplicates: true })
    : { count: 0 };
  if (!liked) {
    await prisma.like.deleteMany({ where: key });
  }

  // 站内通知文章作者有人点赞（自己赞自己不通知；重复点赞不重复通知）
  if (liked && inserted.count > 0 && post.authorId !== user.id) {
    try {
      await createNotification(post.authorId, {
        category: NOTIFICATION_CATEGORIES.LIKE,
        type: "like",
        actorName: user.name,
        title: `赞了你的文章《${post.title}》`,
        link: `/blog/${post.slug}`,
        // 同一篇文章的点赞合并为一条
        aggregateKey: `like:${post.id}`,
      });
    } catch (error) {
      // 点赞已写入；通知故障不能把成功操作报告成失败。
      console.error("点赞通知发送失败：", error);
    }
  }
  const count = await prisma.like.count({ where: { postId: pid } });

  // 点赞数在客户端按需拉取，文章页缓存不依赖它，无需失效。
  return { ok: true, liked, count };
}

// 收藏按目标状态写入（幂等），与点赞一致。
export async function setBookmark(
  postId: string,
  bookmarked: boolean
): Promise<CommentActionState & { bookmarked?: boolean }> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  const parsed = parseInput(bookmarkSchema, { postId, bookmarked });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };

  // 仅允许收藏公开文章。
  const post = await prisma.post.findFirst({
    where: { id: parsed.data.postId, published: true, archived: false },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "文章不存在" };

  const key = { userId: user.id, postId: parsed.data.postId };
  if (bookmarked) {
    await prisma.bookmark.createMany({ data: [key], skipDuplicates: true });
  } else {
    await prisma.bookmark.deleteMany({ where: key });
  }

  return { ok: true, bookmarked };
}

// 评论公开读取，分页按稳定的时间和 ID 游标继续。
export async function getMoreComments(
  postId: string,
  cursor: CommentCursor | null
): Promise<{ ok: boolean; error?: string; comments: CommentWithReplies[]; nextCursor?: CommentCursor | null }> {
  const parsed = parseInput(commentPageSchema, { postId, cursor });
  if (!parsed.data) {
    return { ok: false, error: parsed.error ?? "参数不合法", comments: [] };
  }

  // 游客请求按 IP 限流。
  const ip = await getClientIp();
  const ipCheck = await rateLimit.checkAndHit("comments-fetch", ip, 30, 60 * 1000);
  if (ipCheck.blocked) {
    return { ok: false, error: `操作过于频繁，请 ${ipCheck.retryAfterSec} 秒后再试`, comments: [] };
  }

  // 仅查询公开文章。
  const post = await prisma.post.findFirst({
    where: { id: parsed.data.postId, published: true, archived: false },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "文章不存在", comments: [] };

  const page = await getApprovedComments(parsed.data.postId, { cursor: parsed.data.cursor });
  return { ok: true, ...page };
}
