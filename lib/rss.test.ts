import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cache: vi.fn((fn) => fn),
  postFindMany: vi.fn(),
  postCount: vi.fn(),
  categoryFindUnique: vi.fn(),
  seriesFindUnique: vi.fn(),
  tagFindUnique: vi.fn(),
}));
vi.mock("next/cache", () => ({ unstable_cache: mocks.cache }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  post: { findMany: mocks.postFindMany, count: mocks.postCount },
  category: { findUnique: mocks.categoryFindUnique },
  series: { findUnique: mocks.seriesFindUnique },
  tag: { findUnique: mocks.tagFindUnique },
} }));

import { getCachedRssFeedData } from "@/lib/rss";

beforeEach(() => {
  mocks.postFindMany.mockReset();
  mocks.postCount.mockReset();
  mocks.categoryFindUnique.mockReset();
  mocks.seriesFindUnique.mockReset();
  mocks.tagFindUnique.mockReset();
  mocks.postFindMany.mockResolvedValue([]);
  mocks.postCount.mockResolvedValue(0);
});

it("按分类和页码查询 RSS 数据，并配置 60 秒缓存", async () => {
  mocks.categoryFindUnique.mockResolvedValue({ name: "随笔" });

  expect(await getCachedRssFeedData("category", "notes", 3)).toEqual({
    name: "随笔", posts: [], total: 0,
  });
  expect(mocks.cache).toHaveBeenCalledWith(expect.any(Function), ["rss-feed-data"], { revalidate: 60 });
  expect(mocks.postFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { published: true, archived: false, category: { slug: "notes" } },
    skip: 40,
    take: 20,
  }));
});

it("分类不存在时不查询文章，并返回空结果标记", async () => {
  mocks.categoryFindUnique.mockResolvedValue(null);

  expect(await getCachedRssFeedData("category", "missing", 1)).toBeNull();
  expect(mocks.postFindMany).not.toHaveBeenCalled();
  expect(mocks.postCount).not.toHaveBeenCalled();
});
