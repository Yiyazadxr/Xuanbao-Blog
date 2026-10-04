import { describe, expect, it } from "vitest";
import {
  buildSearchText,
  countWords,
  findTitleMatch,
  formatCount,
  formatDate,
  formatRelativeTime,
  markdownToText,
  plainExcerpt,
  readingTime,
  readingTimeFromWordCount,
  searchSnippet,
} from "@/lib/utils";

describe("formatCount", () => {
  it("千分位格式化", () => {
    expect(formatCount(1234)).toBe("1,234");
    expect(formatCount(0)).toBe("0");
  });

  it("负数与小数按 0 钳制", () => {
    expect(formatCount(-5)).toBe("0");
    expect(formatCount(3.6)).toBe("4");
  });
});

describe("formatDate", () => {
  it("用本地构造器格式化中文日期", () => {
    expect(formatDate(new Date(2026, 6, 17))).toBe("2026 年 7 月 17 日");
  });
});

describe("formatRelativeTime", () => {
  it("30 秒内显示刚刚", () => {
    expect(formatRelativeTime(new Date(Date.now() - 30_000))).toBe("刚刚");
  });

  it("5 分钟前", () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000))).toBe("5 分钟前");
  });

  it("3 小时前", () => {
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3_600_000))).toBe("3 小时前");
  });

  it("2 天前", () => {
    expect(formatRelativeTime(new Date(Date.now() - 2 * 86_400_000))).toBe("2 天前");
  });

  it("超过 30 天回落到绝对日期", () => {
    expect(formatRelativeTime(new Date(Date.now() - 31 * 86_400_000))).toContain("年");
  });
});

describe("countWords", () => {
  it("中文逐字计数", () => {
    expect(countWords("你好世界")).toBe(4);
  });

  it("英文按词计数", () => {
    expect(countWords("hello world")).toBe(2);
  });

  it("中英混合分别计数再相加", () => {
    expect(countWords("你好 hello")).toBe(3);
  });

  it("剔除 Markdown 符号", () => {
    expect(countWords("## 标题")).toBe(2);
  });
});

describe("readingTimeFromWordCount", () => {
  it("按 400 字/分钟折算", () => {
    expect(readingTimeFromWordCount(400)).toBe(1);
    expect(readingTimeFromWordCount(800)).toBe(2);
  });

  it("空值 / 0 回落为 1 分钟", () => {
    expect(readingTimeFromWordCount(null)).toBe(1);
    expect(readingTimeFromWordCount(0)).toBe(1);
    expect(readingTimeFromWordCount(undefined)).toBe(1);
  });
});

describe("readingTime", () => {
  it("从正文折算阅读时长", () => {
    expect(readingTime("字".repeat(400))).toBe(1);
    expect(readingTime("字".repeat(800))).toBe(2);
  });
});

describe("markdownToText", () => {
  it("移除代码块", () => {
    expect(markdownToText("```\nconst a = 1\n```")).toBe("");
  });

  it("移除图片", () => {
    expect(markdownToText("![alt](img.png)")).toBe("");
  });

  it("链接保留文字", () => {
    expect(markdownToText("[百度](https://baidu.com)")).toBe("百度");
  });

  it("移除标题符号", () => {
    expect(markdownToText("# 标题")).toBe("标题");
  });
});

describe("plainExcerpt", () => {
  it("短文本原样返回", () => {
    expect(plainExcerpt("短文本")).toBe("短文本");
  });

  it("超长文本截断加省略号", () => {
    const long = "字".repeat(200);
    const result = plainExcerpt(long, 50);
    expect(result.length).toBeLessThanOrEqual(51);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("searchSnippet", () => {
  it("命中时返回关键词附近片段", () => {
    expect(searchSnippet("hello world foo bar", "world")).toContain("world");
  });

  it("未命中返回 null", () => {
    expect(searchSnippet("abc", "xyz")).toBeNull();
  });

  it("空查询返回 null", () => {
    expect(searchSnippet("abc", "  ")).toBeNull();
  });
});

describe("buildSearchText", () => {
  it("去 Markdown 并保留正文文字", () => {
    expect(buildSearchText("# 标题\n\n正文内容")).toBe("标题 正文内容");
  });

  it("完整保留长正文文本", () => {
    const long = "字".repeat(1000);
    expect(buildSearchText(long)).toBe(long);
  });

  it("上限内原样返回", () => {
    const text = "短短一句话";
    expect(buildSearchText(text)).toBe(text);
  });
});

describe("findTitleMatch", () => {
  it("命中时返回前/中/后三段", () => {
    expect(findTitleMatch("Next.js 入门教程", "入门")).toEqual({
      before: "Next.js ",
      match: "入门",
      after: "教程",
    });
  });

  it("忽略大小写", () => {
    expect(findTitleMatch("Hello World", "world")).toEqual({
      before: "Hello ",
      match: "World",
      after: "",
    });
  });

  it("未命中返回 null", () => {
    expect(findTitleMatch("你好世界", "xyz")).toBeNull();
  });

  it("空关键词返回 null", () => {
    expect(findTitleMatch("标题", "  ")).toBeNull();
  });

  it("多个出现位置取首个", () => {
    expect(findTitleMatch("aXbXc", "X")).toEqual({ before: "a", match: "X", after: "bXc" });
  });
});
