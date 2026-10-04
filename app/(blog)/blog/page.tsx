import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostsClient } from "@/components/blog/BlogPostsClient";
import { websiteOpenGraph } from "@/lib/metadata";
import { getCategoriesWithCount, getPosts } from "@/lib/posts";
import { POSTS_PER_PAGE } from "@/lib/pagination";

const blogDescription = "浏览全部文章，支持全文模糊搜索与分类筛选";

export const metadata: Metadata = {
  title: "文章",
  description: blogDescription,
  openGraph: websiteOpenGraph("文章", blogDescription, "/blog"),
};
export const revalidate = 60;

// 列表使用 ISR；搜索索引在客户端首次输入时按需获取。
export default async function BlogPage() {
  const [{ posts, total }, categories] = await Promise.all([
    getPosts({ take: POSTS_PER_PAGE }),
    getCategoriesWithCount(),
  ]);

  return (
    <>
      <div className="mb-5 flex items-center justify-end">
        <Link href="/reading" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-accent">
          最近阅读
        </Link>
      </div>
      <BlogPostsClient posts={posts} total={total} categories={categories} />
    </>
  );
}
