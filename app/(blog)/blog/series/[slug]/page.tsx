import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeriesChapters } from "@/components/blog/SeriesChapters";
import { websiteOpenGraph } from "@/lib/metadata";
import { getSeriesBySlug, getSeriesChapters } from "@/lib/posts";
import { SITE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function generateStaticParams() {
  const series = await prisma.series.findMany({ select: { slug: true } });
  return series.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSeriesBySlug(slug);
  if (!s) return { title: "系列未找到" };
  const description = s.description || `浏览系列「${s.name}」的全部文章`;
  return {
    title: `${s.name} · 系列`,
    description,
    openGraph: websiteOpenGraph(`${s.name} · 系列`, description, `/blog/series/${slug}`),
    alternates: { types: { "application/rss+xml": `${SITE.url}/feed.xml/series/${slug}` } },
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  if (!series) notFound();

  const chapters = await getSeriesChapters(series.id);

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{series.name}</h1>
      {series.description && <p className="mt-2 text-muted">{series.description}</p>}
      <p className="mt-1 text-sm text-muted">共 {chapters.length} 篇文章，按连载顺序排列</p>
      <div className="mt-8">
        <SeriesChapters chapters={chapters} />
      </div>
    </>
  );
}
