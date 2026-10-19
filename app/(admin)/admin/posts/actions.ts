"use server";

// 文章操作要求 manage_posts 权限。
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { runAfter } from "@/lib/deferred";
import { deleteImage, saveImage } from "@/lib/image-storage";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePostContent } from "@/lib/post-cache";
import { batchWritePosts, PostWriteError, restoreRevision, writePost } from "@/lib/post-write";
import { batchPostsSchema, parseId, parseInput, postSchema } from "@/lib/validation";
import type { AdminActionState } from "../action-types";
import type { PostConflict } from "@/lib/post-page-types";

export async function savePost(
  payload: unknown
): Promise<AdminActionState & { id?: string; conflict?: PostConflict }> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };

  const parsed = parseInput(postSchema, payload);
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const p = parsed.data;

  try {
    const postId = await writePost(p, admin.id);

    // 旧封面可能被历史版本引用，只在删除文章时清理。
    revalidatePostContent();
    return { ok: true, message: p.id ? "已保存" : "已创建", id: postId };
  } catch (e) {
    if (e instanceof PostWriteError) {
      if (e.code === "CONFLICT" && p.id) {
        const current = await prisma.post.findUnique({
          where: { id: p.id },
          select: { updatedAt: true, title: true, slug: true, excerpt: true, content: true },
        });
        if (current) {
          return {
            ok: false,
            error: e.message,
            conflict: { ...current, updatedAt: current.updatedAt.toISOString() },
          };
        }
      }
      return { ok: false, error: e.message };
    }
    console.error("保存文章失败：", e);
    return { ok: false, error: "保存失败，请稍后重试" };
  }
}

export async function deletePost(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };
  const pid = parseId(id);
  if (!pid.data) return { ok: false, error: pid.error ?? "参数不合法" };
  const post = await prisma.post.findUnique({
    where: { id: pid.data },
    include: { revisions: { select: { coverImage: true } } },
  });
  if (!post) return { ok: false, error: "文章不存在" };
  // 同时删除当前和历史版本引用的封面。
  const covers = [post.coverImage, ...post.revisions.map((r) => r.coverImage)].filter(
    (c): c is string => Boolean(c)
  );
  await prisma.post.delete({ where: { id: pid.data } });
  runAfter(() => Promise.all(covers.map((cover) => deleteImage(cover))));
  revalidatePostContent();
  return { ok: true, message: "已删除" };
}

export async function togglePublish(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };
  const pid = parseId(id);
  if (!pid.data) return { ok: false, error: pid.error ?? "参数不合法" };
  const post = await prisma.post.findUnique({ where: { id: pid.data } });
  if (!post) return { ok: false, error: "文章不存在" };
  const published = !post.published;
  await prisma.post.update({
    where: { id: pid.data },
    data: {
      published,
      publishedAt: published && !post.publishedAt ? new Date() : post.publishedAt,
    },
  });
  revalidatePostContent();
  return { ok: true, message: published ? "已发布" : "已转为草稿" };
}

export async function togglePin(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };
  const pid = parseId(id);
  if (!pid.data) return { ok: false, error: pid.error ?? "参数不合法" };
  const post = await prisma.post.findUnique({ where: { id: pid.data } });
  if (!post) return { ok: false, error: "文章不存在" };
  await prisma.post.update({ where: { id: pid.data }, data: { pinned: !post.pinned } });
  revalidatePostContent();
  return { ok: true, message: post.pinned ? "已取消置顶" : "已置顶" };
}

// 归档文章不进入公开列表和 SEO。
export async function toggleArchive(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };
  const pid = parseId(id);
  if (!pid.data) return { ok: false, error: pid.error ?? "参数不合法" };
  const post = await prisma.post.findUnique({ where: { id: pid.data } });
  if (!post) return { ok: false, error: "文章不存在" };
  await prisma.post.update({ where: { id: pid.data }, data: { archived: !post.archived } });
  revalidatePostContent();
  return { ok: true, message: post.archived ? "已取消归档" : "已归档" };
}

export async function deletePostAndRedirect(id: string) {
  const result = await deletePost(id);
  if (result.ok) redirect("/admin/posts");
  return result;
}

export async function batchPosts(
  ids: unknown,
  operation: string,
  categoryId?: unknown
): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };

  const parsed = parseInput(batchPostsSchema, { ids, operation, categoryId });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  try {
    const covers = await batchWritePosts(parsed.data);
    if (covers.length) runAfter(() => Promise.all(covers.map((cover) => deleteImage(cover))));
  } catch (e) {
    if (e instanceof PostWriteError) return { ok: false, error: e.message };
    console.error("批量处理文章失败：", e);
    return { ok: false, error: "批量处理失败，请稍后重试" };
  }

  revalidatePostContent();
  return { ok: true, message: "已批量处理" };
}

// 仅暴露已知上传错误，避免泄漏存储服务内部信息。
const IMAGE_ERROR_MESSAGES = ["仅支持 JPEG / PNG / WebP / GIF 图片", "图片大小不能超过 5MB"];

export async function uploadImage(
  formData: FormData
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { ok: false, error: "未选择文件" };
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await saveImage(buf);
    return { ok: true, url };
  } catch (e) {
    const known =
      e instanceof Error
        ? IMAGE_ERROR_MESSAGES.find((m) => e.message.includes(m)) ?? null
        : null;
    if (!known) console.error("上传图片失败：", e);
    return { ok: false, error: known ?? "上传失败，请稍后重试" };
  }
}

export async function restorePostRevision(revisionId: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };
  const rid = parseId(revisionId);
  if (!rid.data) return { ok: false, error: rid.error ?? "参数不合法" };

  try {
    await restoreRevision(rid.data, admin.id);

    revalidatePostContent();
    return { ok: true, message: "已回滚到该版本" };
  } catch (e) {
    if (e instanceof PostWriteError) return { ok: false, error: e.message };
    console.error("回滚失败：", e);
    return { ok: false, error: "回滚失败，请稍后重试" };
  }
}
