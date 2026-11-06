import { expect, it } from "vitest";
import { DISPLAY_PREHYDRATE_SCRIPT } from "./display";

// 模板字符串里的反斜杠会被转义消耗；这里锁定最终脚本中的正则原文。
it("预水合脚本按数值白名单写入 CSS 变量", () => {
  expect(DISPLAY_PREHYDRATE_SCRIPT).toContain("/^\\d*\\.?\\d+$/");
  expect(DISPLAY_PREHYDRATE_SCRIPT).toContain("/^(compact|normal|comfortable)$/");
});

it("数值白名单拒绝带单位的注入字符串", () => {
  const start = DISPLAY_PREHYDRATE_SCRIPT.indexOf("/^");
  const end = DISPLAY_PREHYDRATE_SCRIPT.indexOf("$/", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  const pattern = new RegExp(DISPLAY_PREHYDRATE_SCRIPT.slice(start + 1, end + 1));
  expect(pattern.test("1.15")).toBe(true);
  expect(pattern.test("0.8")).toBe(true);
  expect(pattern.test("1px;}body{display:none")).toBe(false);
});
