import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { RevisionList } from "@/components/admin/RevisionList";
import { prisma } from "@/lib/prisma";
import { parseId } from "@/lib/validation";

export const metadata: Metadata = { title: "版本历史" };
export const dynamic = "force-dynamic";

// 文章版本历史：查看历史版本并支持回滚
export default async function PostRevisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requirePermission(PERMISSIONS.MANAGE_POSTS))) redirect("/admin");
  const { id } = await params;
  const parsed = parseId(id);
  if (!parsed.data) notFound();
  const post = await prisma.post.findUnique({
    where: { id: parsed.data },
    select: { id: true, title: true },
  });
  if (!post) notFound();

  const revisions = await prisma.postRevision.findMany({
    where: { postId: parsed.data },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, content: true, published: true, archived: true, createdAt: true },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">版本历史</h1>
        <Link
          href={`/admin/posts/${post.id}/edit`}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          ← 返回编辑
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">《{post.title}》的历史版本，最多保留最近 50 个</p>
      <div className="mt-8">
        <RevisionList revisions={revisions} />
      </div>
    </>
  );
}
