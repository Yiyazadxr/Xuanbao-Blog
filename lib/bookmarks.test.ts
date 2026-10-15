import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ count: vi.fn(), findMany: vi.fn(), toListItem: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { bookmark: { count: mocks.count, findMany: mocks.findMany } },
}));
vi.mock("@/lib/posts", () => ({
  PUBLISHED_FILTER: { published: true, archived: false },
  listSelect: { id: true },
  toListItem: mocks.toListItem,
}));

import { getBookmarkedPosts } from "@/lib/bookmarks";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findMany.mockResolvedValue([]);
});

it("可访问第 100 篇之后的收藏，并保留真实总数", async () => {
  mocks.count.mockResolvedValue(121);
  mocks.findMany.mockResolvedValue([{ post: { id: "older-post" } }]);
  mocks.toListItem.mockReturnValue({ id: "older-post" });

  const result = await getBookmarkedPosts("user-1", 12);

  expect(result).toEqual({ posts: [{ id: "older-post" }], total: 121, page: 12 });
  expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { userId: "user-1", post: { published: true, archived: false } },
    orderBy: [{ createdAt: "desc" }, { postId: "desc" }],
    skip: 99,
    take: 9,
  }));
});

it("越界页钳到末页，空列表回到第一页", async () => {
  mocks.count.mockResolvedValueOnce(121).mockResolvedValueOnce(0);

  expect((await getBookmarkedPosts("user-1", 999)).page).toBe(14);
  expect(mocks.findMany.mock.calls[0][0].skip).toBe(117);
  expect((await getBookmarkedPosts("user-1", Infinity)).page).toBe(1);
  expect(mocks.findMany.mock.calls[1][0].skip).toBe(0);
});
