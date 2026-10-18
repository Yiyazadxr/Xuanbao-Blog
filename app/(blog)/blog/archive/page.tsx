import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveOrbit } from "@/components/blog/ArchiveOrbit";
import { websiteOpenGraph } from "@/lib/metadata";
import { getArchive } from "@/lib/posts";
import { formatDate } from "@/lib/utils";

const archiveDescription = "按时间线浏览全部文章";

export const metadata: Metadata = {
  title: "归档",
  description: archiveDescription,
  openGraph: websiteOpenGraph("归档", archiveDescription, "/blog/archive"),
};
export const revalidate = 60;

// 时间线归档：按年分组，最新的在上面
export default async function ArchivePage() {
  const archive = await getArchive();

  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">归档</h1>
      <p className="mt-3 text-muted">按时间线浏览全部文章</p>
      {/* 年份星图：节点大小随当年文章数变化，指针靠近放大 */}
      <ArchiveOrbit
        years={archive.map(({ year, posts }) => ({ year, count: posts.length }))}
        className="mt-8"
      />
      <div className="mt-8 space-y-14">
        {archive.map(({ year, posts }) => (
          <section key={year}>
            <h2 className="font-display text-3xl font-bold tracking-tight text-accent">{year}</h2>
            <ul className="mt-6 space-y-3 border-l-2 border-border pl-6">
              {posts.map((post) => (
                <li key={post.slug} className="group relative">
                  <span className="absolute -left-[calc(1.5rem+2px)] top-1/2 block size-2 -translate-y-1/2 rounded-full border-2 border-border bg-background group-hover:border-accent" />
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex flex-wrap items-baseline gap-x-4 gap-y-1 text-foreground transition-colors duration-200 hover:text-accent"
                  >
                    <span className="text-base font-medium leading-snug tracking-tight">
                      {post.title}
                    </span>
                    <time className="shrink-0 text-sm text-muted" dateTime={post.createdAt.toISOString()}>
                      {formatDate(post.createdAt)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
