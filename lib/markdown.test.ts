import { describe, expect, it } from "vitest";
import GithubSlugger from "github-slugger";

import { extractToc } from "./markdown";

// 目录锚点必须与 rehype-slug（github-slugger）生成的结果一致，
// 否则目录跳转与当前小节高亮会失效。
describe("目录提取", () => {
  it("保留下划线并去掉链接语法", () => {
    const toc = extractToc("## use_state 与 use_effect\n\n## [text](https://example.com)");
    expect(toc.map((item) => item.id)).toEqual([
      "use_state-与-use_effect",
      "text",
    ]);
  });

  it("去掉 ATX 闭合标记与强调符号", () => {
    const toc = extractToc("## Title ##\n\n## **粗体** 标题");
    expect(toc.map((item) => item.id)).toEqual(["title", "粗体-标题"]);
  });

  it("只输出二三级标题，但按全部标题计数", () => {
    const toc = extractToc("# 一级\n\n## 二级\n\n### 三级");
    expect(toc.map((item) => item.level)).toEqual([2, 3]);
    // 与 rehype-slug 同步：同名标题在后一位加后缀
    const slugger = new GithubSlugger();
    expect(slugger.slug("二级")).toBe("二级");
  });

  it("同名标题生成递增后缀", () => {
    const toc = extractToc("## 标题\n\n## 标题");
    expect(toc.map((item) => item.id)).toEqual(["标题", "标题-1"]);
  });

  it("忽略代码块中的标题", () => {
    const toc = extractToc("```\n## 代码块标题\n```\n\n## 正常标题");
    expect(toc.map((item) => item.text)).toEqual(["正常标题"]);
  });

  it("锚点与 github-slugger 对同一文本的结果一致", () => {
    const slugger = new GithubSlugger();
    const text = "React 19 与 Next.js 16";
    const toc = extractToc(`## ${text}`);
    expect(toc[0].id).toBe(slugger.slug(text));
  });
});
