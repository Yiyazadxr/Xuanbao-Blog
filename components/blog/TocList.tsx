import type { TocItem } from "@/lib/markdown";

// 目录列表：桌面 Sidebar 与移动端抽屉共用同一份渲染。
// variant 只区分两处视觉差异：桌面带左侧轨道线、行高紧凑；抽屉行高加大，适配触控。
export function TocList({
  toc,
  activeId,
  onNavigate,
  variant = "sidebar",
}: {
  toc: TocItem[];
  activeId: string;
  /** 点击某项后的回调（移动端用于关闭抽屉） */
  onNavigate?: () => void;
  variant?: "sidebar" | "drawer";
}) {
  return (
    <ul
      className={
        variant === "sidebar"
          ? "space-y-1 border-l border-border text-sm"
          : "mt-3 space-y-1 text-sm"
      }
    >
      {toc.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            onClick={onNavigate}
            className={`block border-l-2 pr-2 leading-snug transition-colors duration-200 ${
              variant === "sidebar" ? "py-1" : "py-1.5"
            } ${item.level === 3 ? "pl-7" : "pl-4"} ${
              activeId === item.id
                ? "-ml-px border-accent font-medium text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
