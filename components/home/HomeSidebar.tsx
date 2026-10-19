import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SITE } from "@/lib/constants";
import { SocialLinks } from "@/components/home/SocialLinks";

// 首页左侧信息栏：单一 DOM 响应式切换——
// 移动端为顶部水平简介卡（头像居左），lg 起变为 sticky 纵向栏（资料卡 + 分类 + 标签）。
// 资料卡内层用 lg:contents 打平：移动端「昵称签名 + 社交」裹在一列里跟在头像右侧，
// lg 起社交链接作为纵排卡片的直接子项，保持居中三段式，无需两套 DOM。
export function HomeSidebar({
  owner,
  categories,
  tags,
}: {
  owner?: { name: string; image: string | null } | null;
  categories: { id: string; name: string; slug: string; postCount: number }[];
  tags: { id: string; name: string; slug: string; postCount: number }[];
}) {
  const name = owner?.name ?? SITE.shortName;
  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:w-72 lg:self-start">
      {/* 资料卡：移动端横排，lg 起居中纵排 */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 lg:flex-col lg:p-6 lg:text-center">
        {/* 首屏最大的一张图，作为 LCP 直接立即加载 */}
        <Avatar
          image={owner?.image}
          name={name}
          seed={owner?.name ?? name}
          eager
          className="size-24 shrink-0 text-6xl lg:size-28 lg:text-7xl"
        />
        <div className="lg:contents">
          <div>
            <p className="font-bold lg:text-lg">{name}</p>
            <p className="mt-1 text-sm text-muted">遗憾你自己留着吧，我有小怡了。</p>
          </div>
          <div className="mt-2 lg:mt-0">
            <SocialLinks />
          </div>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="hidden rounded-2xl border border-border bg-surface p-5 lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">分类</p>
          <div className="mt-3 flex flex-col gap-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog/category/${cat.slug}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
              >
                <span>{cat.name}</span>
                <span className="text-xs tabular-nums text-muted/60">{cat.postCount}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div className="hidden rounded-2xl border border-border bg-surface p-5 lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">标签</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.slice(0, 12).map((tag) => (
              <Link
                key={tag.id}
                href={`/blog/tag/${tag.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors duration-150 hover:border-accent hover:text-accent"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
