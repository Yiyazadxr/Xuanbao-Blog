import { beforeEach, expect, it, vi } from "vitest";

const { searchPosts } = vi.hoisted(() => ({ searchPosts: vi.fn() }));
vi.mock("@/lib/posts", () => ({ searchPosts }));

import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  searchPosts.mockResolvedValue({ posts: [], total: 45 });
});

it("参数无效时拒绝搜索", async () => {
  const response = await GET(new Request("https://example.test/api/search-index?q="));
  expect(response.status).toBe(400);
  expect(searchPosts).not.toHaveBeenCalled();
});

it("分页查询并禁止共享缓存", async () => {
  const response = await GET(new Request("https://example.test/api/search-index?q=%E6%AD%A3%E6%96%87&page=2"));
  expect(searchPosts).toHaveBeenCalledWith("正文", 20, 20);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("server-timing")).toMatch(/^query;dur=/);
  expect(response.headers.get("x-result-count")).toBe("0");
  expect(await response.json()).toEqual({ posts: [], total: 45, page: 2 });
});

it("超出末页的请求收敛到最后一页", async () => {
  const response = await GET(new Request("https://example.test/api/search-index?q=正文&page=999"));
  expect(await response.json()).toEqual({ posts: [], total: 45, page: 3 });
});
