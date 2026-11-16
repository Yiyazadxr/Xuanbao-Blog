import { describe, expect, it, vi } from "vitest";
import { clampPage, fetchPage, parsePage } from "@/lib/pagination";
import { postPageQuerySchema } from "@/lib/validation";

describe("公开文章分页", () => {
  it.each([undefined, null, "", "-1", "0", "1.5", "Infinity", "NaN", "1e3", "abc", NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
  ("非法页码 %s 回落第一页", (input) => { expect(parsePage(input)).toBe(1); });

  it("接受安全正整数，越界请求收敛到末页", () => {
    expect(parsePage("12")).toBe(12);
    expect(parsePage(12)).toBe(12);
    expect(clampPage(999, 20)).toBe(3);
    expect(clampPage(999, 18)).toBe(2);
    expect(clampPage(999, 0)).toBe(1);
  });

  it("拒绝未知查询字段和超长筛选，允许中文 slug", () => {
    expect(postPageQuerySchema.safeParse({ categorySlug: "随笔", page: "2" }).success).toBe(true);
    expect(postPageQuerySchema.safeParse({ take: "99999" }).success).toBe(false);
    expect(postPageQuerySchema.safeParse({ tagSlug: "a".repeat(201) }).success).toBe(false);
  });
});

describe("并行分页查询", () => {
  it("合法页码只查一次数据页", async () => {
    const fetchRows = vi.fn(async (skip: number) => [skip]);
    const result = await fetchPage({
      count: async () => 20,
      fetchRows,
      requestedSkip: 9,
      pageSize: 9,
    });
    expect(result).toEqual({ rows: [9], total: 20, skip: 9 });
    expect(fetchRows).toHaveBeenCalledOnce();
    expect(fetchRows).toHaveBeenCalledWith(9, 9);
  });

  it("越界页码补查末页并返回实际 offset", async () => {
    const fetchRows = vi.fn(async (skip: number) => [skip]);
    const result = await fetchPage({
      count: async () => 20,
      fetchRows,
      requestedSkip: 900,
      pageSize: 9,
    });
    expect(result).toEqual({ rows: [18], total: 20, skip: 18 });
    expect(fetchRows).toHaveBeenNthCalledWith(1, 900, 9);
    expect(fetchRows).toHaveBeenNthCalledWith(2, 18, 9);
  });

  it("超大 offset 先取总数再收敛到末页，避免全表扫描", async () => {
    const count = vi.fn(async () => 20);
    const fetchRows = vi.fn(async (skip: number) => [skip]);
    await expect(fetchPage({
      count,
      fetchRows,
      requestedSkip: 1_000_000,
      pageSize: 9,
    })).resolves.toEqual({ rows: [18], total: 20, skip: 18 });
    expect(count).toHaveBeenCalledOnce();
    expect(fetchRows).toHaveBeenCalledOnce();
    expect(fetchRows).toHaveBeenCalledWith(18, 9);
  });

  it("空结果与非法 offset 都不向数据库传越界值", async () => {
    const fetchRows = vi.fn(async (skip: number) => [skip]);
    await expect(fetchPage({
      count: async () => 0,
      fetchRows,
      requestedSkip: 999,
      pageSize: 9,
    })).resolves.toEqual({ rows: [], total: 0, skip: 0 });

    await fetchPage({
      count: async () => 1,
      fetchRows,
      requestedSkip: -3,
      pageSize: 0,
    });
    expect(fetchRows).toHaveBeenLastCalledWith(0, 9);
  });
});
