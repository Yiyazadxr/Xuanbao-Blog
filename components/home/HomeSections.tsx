import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { Reveal } from "@/components/ui/Reveal";
import { Stagger, StaggerItem } from "@/components/ui/Stagger";
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { getCategoriesWithCount, getFeaturedPosts, getPosts, getTagsWithCount } from "@/lib/posts";
import { getOwnerProfile } from "@/lib/profile";

// 首页主体：双栏布局
export async function HomeSections() {
  const [featured, { posts: latestPosts }, categories, tags, owner] = await Promise.all([
    getFeaturedPosts(),
    // 首页仅展示最新 6 篇，查询层直接 take，避免全量查询后内存切片
    getPosts({ take: 6 }),
    getCategoriesWithCount(),
    getTagsWithCount(),
    // 博主资料（数据访问收敛于 lib/）
    getOwnerProfile(),
  ]);


  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-24 sm:px-6 lg:flex-row">
      <HomeSidebar owner={owner} categories={categories} tags={tags} />

      <div className="min-w-0 flex-1 space-y-20">
        {featured.length > 0 && (
          <section aria-labelledby="featured-heading">
            <Reveal>
              <h2 id="featured-heading" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                精选文章
              </h2>
            </Reveal>
            <Stagger className="cover-grid-2 mt-6 grid gap-5 sm:grid-cols-2" staggerChildren={0.06}>
              {featured.map((post, i) => (
                <StaggerItem key={post.id}>
                  {/* 首屏前两张封面立即加载（LCP 候选） */}
                  <PostCard post={post} preload={i < 2} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        {latestPosts.length > 0 && (
          <section aria-labelledby="latest-heading">            <Reveal>
              <div className="flex items-end justify-between">
                <h2 id="latest-heading" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  最新文章
                </h2>
                <Link
                  href="/blog"
                  className="text-sm font-medium text-muted transition-colors duration-200 hover:text-accent"
                >
                  查看全部 →
                </Link>
              </div>
            </Reveal>
            <Stagger className="cover-grid-2 mt-6 grid gap-5 sm:grid-cols-2" staggerChildren={0.06}>
              {latestPosts.map((post) => (
                <StaggerItem key={post.id}>
                  <PostCard post={post} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}
      </div>
    </div>
  );
}
