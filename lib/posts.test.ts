import { beforeEach, describe, expect, it, vi } from "vitest";
const { count, findMany, findFirst, revisionFindFirst, queryRaw, recordDailyView } = vi.hoisted(() => ({ count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), revisionFindFirst: vi.fn(), queryRaw: vi.fn(), recordDailyView: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { post: { count, findMany, findFirst }, postRevision: { findFirst: revisionFindFirst }, $queryRaw: queryRaw } }));
vi.mock("@/lib/daily-stats", () => ({ recordDailyView }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { getAdjacentPosts, getPosts, getPublishedPostByLegacySlug, getSeriesAdjacent, getSeriesChapters, incrementViewCount, searchPosts } from "@/lib/posts";
import { QUERY_LIMITS } from "@/lib/constants";

beforeEach(() => { vi.resetAllMocks(); count.mockResolvedValue(20); findMany.mockResolvedValue([]); });

it("不存在或已撤稿的文章不能增加日统计", async () => {
  queryRaw.mockResolvedValue([]);
  expect(await incrementViewCount("missing")).toBe(false);
  expect(recordDailyView).not.toHaveBeenCalled();
  expect(queryRaw).toHaveBeenCalledOnce();
});

it("文章写入失败不会污染日统计", async () => {
  queryRaw.mockRejectedValue(new Error("unavailable"));
  await expect(incrementViewCount("post1")).rejects.toThrow("unavailable");
  expect(recordDailyView).not.toHaveBeenCalled();
});

describe("文章列表查询边界", () => {
  it("越界页定位末页，计数与查询使用同一公开筛选", async () => {
    const result = await getPosts({ categorySlug: "notes", skip: 900, take: 9 });
    expect(result.total).toBe(20);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 18, take: 9,
      where: { published: true, archived: false, category: { slug: "notes" } },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    }));
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
  });

  it.each([NaN, Infinity, -1, 1.5])("非法 offset %s 不传递到 Prisma", async (skip) => {
    await getPosts({ skip, take: 9 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 9 }));
  });

  it.each([0, -1, 1.5, Infinity, NaN, 99999])("非法或超大 take %s 受查询上限保护", async (take) => {
    await getPosts({ take });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: QUERY_LIMITS.postList }));
  });

  it("空库仍请求第一页并返回空列表", async () => {
    count.mockResolvedValue(0);
    expect(await getPosts({ skip: 999, take: 9 })).toEqual({ posts: [], total: 0 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
  });
});

it("全文搜索覆盖全部公开文章并按页返回命中字段", async () => {
  count.mockResolvedValue(205);
  findMany.mockResolvedValue([{
    id: "post-1", slug: "post-1", title: "标题", excerpt: "摘要", coverImage: null,
    wordCount: 120, createdAt: new Date("2026-01-01T00:00:00Z"), category: null, tags: [],
    searchText: "正文后段命中",
  }]);
  const result = await searchPosts("命中", 20, 20);
  expect(result.total).toBe(205);
  expect(result.posts[0].snippet).toContain("命中");
  expect(count).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      published: true,
      archived: false,
      OR: expect.arrayContaining([
        { title: { contains: "命中", mode: "insensitive" } },
        { excerpt: { contains: "命中", mode: "insensitive" } },
        { searchText: { contains: "命中", mode: "insensitive" } },
      ]),
    }),
  }));
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }));
});

it("同时间的系列文章通过 ID 确定相邻顺序", async () => {
  const createdAt = new Date("2026-01-01T00:00:00Z");
  findFirst.mockResolvedValueOnce({ id: "b", createdAt })
    .mockResolvedValueOnce({ title: "前文", slug: "a" })
    .mockResolvedValueOnce({ title: "后文", slug: "c" });
  expect(await getSeriesAdjacent("series", "b")).toEqual({ prev: { title: "前文", slug: "a" }, next: { title: "后文", slug: "c" } });
  expect(findFirst.mock.calls[1][0].where.OR).toContainEqual({ createdAt, id: { lt: "b" } });
  expect(findFirst.mock.calls[2][0].where.OR).toContainEqual({ createdAt, id: { gt: "b" } });
});

it("旧 slug 只解析到仍公开的当前文章", async () => {
  revisionFindFirst.mockResolvedValueOnce({ post: { slug: "new-slug" } });
  await expect(getPublishedPostByLegacySlug("old-slug")).resolves.toEqual({ slug: "new-slug" });
  expect(revisionFindFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: { slug: "old-slug", post: { published: true, archived: false } },
  }));
});

it("系列目录按创建时间和 ID 升序排列，且不读取正文", async () => {
  findMany.mockResolvedValueOnce([{
    id: "chapter-1", slug: "chapter-1", title: "第一章", excerpt: null,
    createdAt: new Date("2026-01-01"), wordCount: 800,
  }]);
  await expect(getSeriesChapters("series")).resolves.toEqual([{
    id: "chapter-1", slug: "chapter-1", title: "第一章", excerpt: "",
    createdAt: new Date("2026-01-01"), readingTime: 2,
  }]);
  expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({
    where: expect.objectContaining({ seriesId: "series" }),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: expect.not.objectContaining({ content: true }),
  }));
});

it("同时间的普通文章通过 ID 确定相邻顺序", async () => {
  const createdAt = new Date("2026-01-01T00:00:00Z");
  findFirst.mockResolvedValueOnce({ title: "前文", slug: "a" })
    .mockResolvedValueOnce({ title: "后文", slug: "c" });
  expect(await getAdjacentPosts("b", createdAt)).toEqual({ prev: { title: "前文", slug: "a" }, next: { title: "后文", slug: "c" } });
  expect(findFirst.mock.calls[0][0]).toMatchObject({
    where: { OR: expect.arrayContaining([{ createdAt, id: { lt: "b" } }]) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  expect(findFirst.mock.calls[1][0]).toMatchObject({
    where: { OR: expect.arrayContaining([{ createdAt, id: { gt: "b" } }]) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
});
