import { Icon } from "@/components/ui/Icon";
import type { Metadata } from "next";
import { TOOLS, TOOL_CATEGORIES } from "@/lib/constants";
import { websiteOpenGraph } from "@/lib/metadata";

const toolsDescription = "常用工具，按设计、开发、安全、文件处理等分类整理。";

export const metadata: Metadata = {
  title: "工具",
  description: toolsDescription,
  openGraph: websiteOpenGraph("工具", toolsDescription, "/tools"),
};

// 常用工具推荐，按分类分组
export default function ToolsPage() {
  const grouped = TOOL_CATEGORIES.map((cat) => ({
    category: cat,
    items: TOOLS.filter((t) => t.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">工具</h1>
      <p className="mt-3 text-muted">一些实用的网站以及小工具</p>

      {grouped.map((group) => (
        <section key={group.category} className="mt-12">
          <h2 className="text-lg font-semibold text-foreground/80">{group.category}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {group.items.map((tool) => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent"
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon icon={tool.icon} width={22} height={22} aria-hidden />
                </span>
                <span>
                  <span className="block font-bold transition-colors duration-200 group-hover:text-accent">
                    {tool.name}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">
                    {tool.description}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
