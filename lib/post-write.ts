import { prisma } from "@/lib/prisma";
import { snapshotPost } from "@/lib/post-revisions";
import { buildSearchText, countWords, plainExcerpt } from "@/lib/utils";
import { slugify } from "@/lib/slug";
import type { z } from "zod";
import type { postSchema, batchPostsSchema } from "@/lib/validation";

export class PostWriteError extends Error {
  constructor(message: string, public readonly code?: "CONFLICT") {
    super(message);
    this.name = "PostWriteError";
  }
}

export async function writePost(p: z.infer<typeof postSchema>, authorId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = p.id ? await tx.post.findUnique({
      where: { id: p.id }, include: { tags: { include: { tag: true } } },
    }) : null;
    if (p.id && !existing) throw new PostWriteError("文章不存在");
    if (existing && existing.updatedAt.toISOString() !== p.expectedUpdatedAt) {
      throw new PostWriteError("文章已被修改或草稿版本已过期。请先对比当前版本后再保存。", "CONFLICT");
    }
    const slug = slugify(p.slug.trim() || p.title);
    if (await tx.post.findFirst({ where: { slug, ...(p.id ? { id: { not: p.id } } : {}) } })) {
      throw new PostWriteError("链接标识已被其他文章占用");
    }
    if (p.categoryId && !await tx.category.findUnique({ where: { id: p.categoryId } })) {
      throw new PostWriteError("分类不存在");
    }
    if (p.seriesId && !await tx.series.findUnique({ where: { id: p.seriesId } })) {
      throw new PostWriteError("系列不存在");
    }
    const data = {
      title: p.title, slug, content: p.content,
      excerpt: p.excerpt?.trim() || plainExcerpt(p.content) || null,
      coverImage: p.coverImage || null, categoryId: p.categoryId || null, seriesId: p.seriesId || null,
      published: p.published, archived: p.archived, pinned: p.pinned, featured: p.featured,
      publishedAt: existing?.publishedAt ?? (p.published ? new Date() : null),
      wordCount: countWords(p.content), searchText: buildSearchText(p.content),
      // 同一毫秒内的连续编辑也必须产生不同的版本时间。
      updatedAt: new Date(Math.max(Date.now(), (existing?.updatedAt.getTime() ?? 0) + 1)),
    };
    const names = [...new Set(p.tags.split(/[,，、]/).map((name) => name.trim()).filter(Boolean))];
    const tags = await Promise.all(names.map((name) => tx.tag.upsert({
      where: { name }, update: {}, create: { name, slug: slugify(name) },
    })));
    let id: string;
    if (existing) {
      await snapshotPost(tx, existing, authorId);
      await tx.post.update({ where: { id: existing.id }, data });
      await tx.postTag.deleteMany({ where: { postId: existing.id } });
      id = existing.id;
    } else {
      id = (await tx.post.create({ data: { ...data, authorId } })).id;
    }
    if (tags.length) await tx.postTag.createMany({ data: tags.map((tag) => ({ postId: id, tagId: tag.id })) });
    return id;
  }, { isolationLevel: "Serializable" });
}

export async function batchWritePosts(input: z.infer<typeof batchPostsSchema>) {
  return prisma.$transaction(async (tx) => {
    const { ids, operation, categoryId } = input;
    const where = { id: { in: ids } };
    if (operation === "delete") {
      const posts = await tx.post.findMany({ where,
        select: { coverImage: true, revisions: { select: { coverImage: true } } },
      });
      await tx.post.deleteMany({ where });
      return [...new Set(posts.flatMap((post) => [post.coverImage, ...post.revisions.map((r) => r.coverImage)])
        .filter((cover): cover is string => Boolean(cover)))];
    }
    if (operation === "publish") {
      await tx.post.updateMany({ where: { ...where, publishedAt: null }, data: { publishedAt: new Date() } });
      await tx.post.updateMany({ where, data: { published: true } });
    } else if (operation === "category") {
      if (categoryId && !await tx.category.findUnique({ where: { id: categoryId } })) {
        throw new PostWriteError("分类不存在");
      }
      await tx.post.updateMany({ where, data: { categoryId: categoryId || null } });
    } else {
      await tx.post.updateMany({ where, data: operation === "unpublish" ? { published: false } : { archived: true } });
    }
    return [];
  }, { isolationLevel: "Serializable" });
}

/** 权限和输入校验由调用方完成；业务读取和写入共享事务快照。 */
export async function restoreRevision(revisionId: string, authorId: string) {
  return prisma.$transaction(async (tx) => {
    const revision = await tx.postRevision.findUnique({ where: { id: revisionId } });
    if (!revision) throw new PostWriteError("版本不存在");
    const post = await tx.post.findUnique({
      where: { id: revision.postId },
      include: { tags: { include: { tag: true } } },
    });
    if (!post) throw new PostWriteError("文章不存在");
    const conflict = await tx.post.findFirst({
      where: { slug: revision.slug, id: { not: post.id } },
    });
    if (conflict) throw new PostWriteError("该版本的链接标识已被其他文章占用，无法回滚");

    const category = revision.categoryId
      ? await tx.category.findUnique({ where: { id: revision.categoryId } }) : null;
    const series = revision.seriesId
      ? await tx.series.findUnique({ where: { id: revision.seriesId } }) : null;
    // 损坏的版本数据不能被悄悄当作空标签覆盖现有内容。
    let names: unknown;
    try { names = JSON.parse(revision.tags); } catch {
      throw new PostWriteError("版本标签数据损坏，无法回滚");
    }
    if (!Array.isArray(names) || !names.every((name) => typeof name === "string")) {
      throw new PostWriteError("版本标签数据损坏，无法回滚");
    }
    const tagNames = [...new Set((names as string[]).map((name) => name.trim()).filter(Boolean))];

    await snapshotPost(tx, post, authorId);
    await tx.post.update({
      where: { id: post.id },
      data: {
        title: revision.title, slug: revision.slug, content: revision.content,
        excerpt: revision.excerpt?.trim() || plainExcerpt(revision.content) || null,
        coverImage: revision.coverImage,
        categoryId: category?.id ?? null, seriesId: series?.id ?? null,
        published: revision.published,
        publishedAt: post.publishedAt ?? (revision.published ? new Date() : null),
        pinned: revision.pinned, featured: revision.featured, archived: revision.archived,
        wordCount: countWords(revision.content), searchText: buildSearchText(revision.content),
      },
    });
    const tags = await Promise.all(tagNames.map((name) => tx.tag.upsert({
      where: { name }, update: {}, create: { name, slug: slugify(name) },
    })));
    await tx.postTag.deleteMany({ where: { postId: post.id } });
    if (tags.length) await tx.postTag.createMany({
      data: tags.map((tag) => ({ postId: post.id, tagId: tag.id })),
    });
  }, { isolationLevel: "Serializable" });
}
