import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PostContent } from "@/components/blog/PostContent";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { parseId } from "@/lib/validation";
import { formatDate, readingTimeFromWordCount } from "@/lib/utils";

export const metadata: Metadata = { title: "预览文章" };
export const dynamic = "force-dynamic";

// 后台预览：草稿/归档文章也可查看（仅拥有 manage_posts 权限者）
export default async function PreviewPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) redirect("/");

  const { id } = await params;
  const parsed = parseId(id);
  if (!parsed.data) notFound();
  const post = await prisma.post.findUnique({
    where: { id: parsed.data },
    include: { category: true, tags: { include: { tag: true } } },
  });
  if (!post) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/posts/${post.id}/edit`}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          ← 返回编辑
        </Link>
        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          预览模式{post.published && !post.archived ? "" : "（非公开文章）"}
        </span>
      </div>

      <article className="mt-8">
        <header>
          {post.category && (
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {post.category.name}
            </span>
          )}
          <h1 className="font-display mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          {post.coverImage && (
            <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border">
              <Image src={post.coverImage} alt={post.title} fill sizes="(max-width: 896px) 100vw, 896px" className="object-cover" />
            </div>
          )}
          <p className="mt-4 text-sm text-muted">
            {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.updatedAt)} · 约{" "}
            {readingTimeFromWordCount(post.wordCount)} 分钟
          </p>
        </header>
        <div className="mt-10">
          <PostContent content={post.content} />
        </div>
      </article>
    </>
  );
}
