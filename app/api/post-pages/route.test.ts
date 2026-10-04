import { beforeEach, expect, it, vi } from "vitest";
const { getPosts } = vi.hoisted(() => ({ getPosts: vi.fn() }));
vi.mock("@/lib/posts", () => ({ getPosts }));
import { GET } from "./route";

beforeEach(() => { vi.resetAllMocks(); getPosts.mockResolvedValue({ posts: [], total: 20 }); });

it("拒绝不支持的分页参数，避免未校验查询", async () => {
  const response = await GET(new Request("https://example.test/api/post-pages?take=10000"));
  expect(response.status).toBe(400);
  expect(getPosts).not.toHaveBeenCalled();
});

it("末页响应包含收敛后的页码和筛选条件", async () => {
  const response = await GET(new Request("https://example.test/api/post-pages?page=999&tagSlug=notes"));
  expect(getPosts).toHaveBeenCalledWith({ tagSlug: "notes", skip: 8982, take: 9 });
  expect(response.headers.get("cache-control")).toContain("s-maxage=60");
  expect(response.headers.get("server-timing")).toMatch(/^query;dur=/);
  expect(response.headers.get("x-result-count")).toBe("0");
  expect(await response.json()).toEqual({ posts: [], total: 20, page: 3 });
});

it.each(["Infinity", "1.5", "-2"])("非法页码 %s 使用第一页", async (page) => {
  await GET(new Request(`https://example.test/api/post-pages?page=${page}`));
  expect(getPosts).toHaveBeenCalledWith({ skip: 0, take: 9 });
});
