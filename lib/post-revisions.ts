import type { Prisma } from "@/lib/generated/prisma/client";

type RevisionSource = Prisma.PostGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

const MAX_REVISIONS = 50;

/** 在文章写入事务中保存旧状态并裁剪版本，失败时一起回滚。 */
export async function snapshotPost(
  tx: Prisma.TransactionClient,
  post: RevisionSource,
  authorId: string,
) {
  await tx.postRevision.create({ data: {
    postId: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    categoryId: post.categoryId,
    seriesId: post.seriesId,
    tags: JSON.stringify(post.tags.map(({ tag }) => tag.name)),
    published: post.published,
    pinned: post.pinned,
    featured: post.featured,
    archived: post.archived,
    authorId,
  } });
  // 单次裁剪的行数设上限，避免一次性拼出超长 IN 列表。
  const obsolete = await tx.postRevision.findMany({
    where: { postId: post.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: MAX_REVISIONS,
    take: 200,
    select: { id: true },
  });
  if (obsolete.length) {
    await tx.postRevision.deleteMany({ where: { id: { in: obsolete.map(({ id }) => id) } } });
  }
}
