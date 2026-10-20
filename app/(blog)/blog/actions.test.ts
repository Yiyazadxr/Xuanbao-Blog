import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getFreshUser: vi.fn(),
  likeCreateMany: vi.fn(),
  likeDeleteMany: vi.fn(),
  likeCount: vi.fn(),
  bookmarkCreateMany: vi.fn(),
  bookmarkDeleteMany: vi.fn(),
  findPost: vi.fn(),
  createNotification: vi.fn(),
  checkAndHit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: mocks.requirePermission,
  getFreshUser: mocks.getFreshUser,
}));
vi.mock("@/lib/mute", () => ({ getMuteInfo: vi.fn(async () => ({ muted: false, permanent: false, until: null, reason: null })) }));
vi.mock("@/lib/notifications", () => ({
  createNotification: mocks.createNotification,
  notifyAdmins: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(async () => "127.0.0.1"),
  rateLimit: { checkAndHit: mocks.checkAndHit },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: { findFirst: mocks.findPost },
    like: {
      createMany: mocks.likeCreateMany,
      deleteMany: mocks.likeDeleteMany,
      count: mocks.likeCount,
    },
    bookmark: {
      createMany: mocks.bookmarkCreateMany,
      deleteMany: mocks.bookmarkDeleteMany,
    },
  },
}));

import { setBookmark, setLike } from "./actions";

const user = { id: "u1", name: "访客", role: "MEMBER" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue(user);
  mocks.getFreshUser.mockResolvedValue(user);
  mocks.checkAndHit.mockResolvedValue({ blocked: false, retryAfterSec: 0 });
  mocks.findPost.mockResolvedValue({ id: "p1", title: "标题", slug: "post", authorId: "author" });
  mocks.likeCreateMany.mockResolvedValue({ count: 1 });
  mocks.likeDeleteMany.mockResolvedValue({ count: 1 });
  mocks.likeCount.mockResolvedValue(1);
  mocks.bookmarkCreateMany.mockResolvedValue({ count: 1 });
  mocks.bookmarkDeleteMany.mockResolvedValue({ count: 1 });
});

describe("点赞与收藏按目标状态写入", () => {
  it("点赞写入单条 ON CONFLICT DO NOTHING，并通知作者", async () => {
    const result = await setLike("p1", "post", true);
    expect(result).toEqual({ ok: true, liked: true, count: 1 });
    expect(mocks.likeCreateMany).toHaveBeenCalledWith({
      data: [{ userId: "u1", postId: "p1" }],
      skipDuplicates: true,
    });
    expect(mocks.likeDeleteMany).not.toHaveBeenCalled();
    expect(mocks.createNotification).toHaveBeenCalledTimes(1);
  });

  it("重复点赞不产生第二条通知，也不重复计数", async () => {
    mocks.likeCreateMany.mockResolvedValue({ count: 0 });
    const result = await setLike("p1", "post", true);
    expect(result.ok).toBe(true);
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it("点赞已写入时，通知失败不影响成功结果", async () => {
    mocks.createNotification.mockRejectedValue(new Error("mailbox unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(setLike("p1", "post", true)).resolves.toEqual({
        ok: true, liked: true, count: 1,
      });
    } finally {
      log.mockRestore();
    }
  });

  it("取消点赞只删除记录，不写入", async () => {
    const result = await setLike("p1", "post", false);
    expect(result).toEqual({ ok: true, liked: false, count: 1 });
    expect(mocks.likeDeleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", postId: "p1" },
    });
    expect(mocks.likeCreateMany).not.toHaveBeenCalled();
  });

  it("自己赞自己的文章不通知", async () => {
    mocks.findPost.mockResolvedValue({ id: "p1", title: "标题", slug: "post", authorId: "u1" });
    await setLike("p1", "post", true);
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it("收藏按目标状态写入且幂等", async () => {
    expect(await setBookmark("p1", true)).toEqual({ ok: true, bookmarked: true });
    expect(mocks.bookmarkCreateMany).toHaveBeenCalledWith({
      data: [{ userId: "u1", postId: "p1" }],
      skipDuplicates: true,
    });

    expect(await setBookmark("p1", false)).toEqual({ ok: true, bookmarked: false });
    expect(mocks.bookmarkDeleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", postId: "p1" },
    });
  });

  it("状态不是布尔值时拒绝且不写库", async () => {
    const result = await setLike("p1", "post", "yes" as unknown as boolean);
    expect(result.ok).toBe(false);
    expect(mocks.likeCreateMany).not.toHaveBeenCalled();
    expect(mocks.likeDeleteMany).not.toHaveBeenCalled();
  });

  it("文章不存在时不写库", async () => {
    mocks.findPost.mockResolvedValue(null);
    expect((await setLike("p1", "post", true)).ok).toBe(false);
    expect((await setBookmark("p1", true)).ok).toBe(false);
    expect(mocks.likeCreateMany).not.toHaveBeenCalled();
    expect(mocks.bookmarkCreateMany).not.toHaveBeenCalled();
  });
});
