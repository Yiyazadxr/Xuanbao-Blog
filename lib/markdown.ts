// Markdown 相关工具：目录（TOC）提取
import GithubSlugger from "github-slugger";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

// Markdown 渲染插件链；公开正文与后台预览共用，保证预览与线上一致。
// 不启用 rehype-raw：原始 HTML 必须转义，避免存储型 XSS。
export const MARKDOWN_REMARK_PLUGINS = [remarkGfm];
export const MARKDOWN_REHYPE_PLUGINS = [rehypeSlug, rehypeHighlight];

export type TocItem = { id: string; text: string; level: number };

// 标题文本提取：结果需与 remark 渲染出的标题文字一致，
// 否则目录锚点与 rehype-slug 生成的 id 对不上（链接、图片、下划线都会造成偏差）。
function headingText(raw: string): string {
  return raw
    .replace(/\s+#+\s*$/, "") // ATX 闭合标记
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // 图片取 alt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接取文字
    .replace(/`([^`]*)`/g, "$1") // 行内代码
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 粗体
    .replace(/\*([^*]+)\*/g, "$1") // 斜体
    .replace(/~~([^~]+)~~/g, "$1") // 删除线
    .replace(/(^|\s)_([^_]+)_(?=\s|$)/g, "$1$2") // 下划线强调
    .trim();
}

// 从 Markdown 提取 h2/h3 生成目录；slug 算法与 rehype-slug 一致（github-slugger）
export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "");
  const items: TocItem[] = [];
  for (const line of withoutCode.split("\n")) {
    // 匹配全部级别：slugger 需要按文档顺序对所有标题计数，
    // 否则重名后缀会与 rehype-slug 生成的结果不一致。
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const text = headingText(match[2]);
    if (!text) continue;
    const id = slugger.slug(text);
    const level = match[1].length;
    if (level === 2 || level === 3) items.push({ id, text, level });
  }
  return items;
}
