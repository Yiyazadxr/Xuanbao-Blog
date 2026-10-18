import type { Metadata } from "next";
import Link from "next/link";
import { SITE, SKILLS, TIMELINE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { Timeline } from "@/components/about/Timeline";
import { Avatar } from "@/components/ui/Avatar";
import { ROLES } from "@/lib/roles";
import { websiteOpenGraph } from "@/lib/metadata";

const aboutDescription = `关于 ${SITE.shortName}——个人简介、技能栈与建站时间线`;

export const metadata: Metadata = {
  title: "关于作者",
  description: aboutDescription,
  openGraph: websiteOpenGraph("关于作者", aboutDescription, "/about"),
};

// 含博主资料查询；资料变更由设置页 revalidatePath("/about") 即时刷新。
export const revalidate = 60;

export default async function AboutPage() {
  const blogger = await prisma.user.findFirst({
    where: { role: ROLES.SUPER_ADMIN },
    select: { name: true, image: true, id: true },
  });

  return (
    // 不透明背景遮住水墨；顶部间距由 --content-pt 控制。
    <div className="mx-auto mt-[var(--content-pt)] w-full max-w-3xl rounded-2xl border border-border bg-background px-4 pt-8 pb-24 sm:px-6">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar
          image={blogger?.image}
          name={blogger?.name}
          seed={blogger?.id}
          eager
          className="size-[88px] text-6xl"
        />
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">你好，我是{SITE.shortName}</h1>
          <p className="mt-2 leading-relaxed text-muted">
            一名正在学习全栈开发的爱好者。这个博客是我从零搭建的，从最初的纯手写
            HTML，走到今天的 Next.js 全栈应用。我在这里记录技术、生活，和一切令我着迷的东西。
          </p>
        </div>
      </div>

      <h2 className="mt-16 text-2xl font-bold tracking-tight">持续学习</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {SKILLS.map((skill) => (
          <span
            key={skill}
            className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium"
          >
            {skill}
          </span>
        ))}
      </div>

      <h2 className="mt-16 text-2xl font-bold tracking-tight">时间线</h2>
      <Timeline items={TIMELINE} />

      <p className="mt-16 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-muted">
        想和我交流？去{" "}
        <Link href="/social" className="text-accent hover:underline">
          社交页
        </Link>{" "}
        找到我，或{" "}
        <Link href="/register" className="text-accent hover:underline">
          申请账号
        </Link>{" "}
        后在文章下留言。
      </p>
    </div>
  );
}
