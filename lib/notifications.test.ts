import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: mocks } }));
vi.mock("@/lib/deferred", () => ({ runAfter: vi.fn() }));

import { createNotification, getUserNotifications } from "@/lib/notifications";

function row(id: string, date: string) {
  return {
    id, category: "system", type: "test", actorName: null, title: "通知",
    link: null, read: false, lastMergedAt: new Date(date), actorNames: null, count: 1,
  };
}

beforeEach(() => vi.resetAllMocks());

it("通知分页使用时间和 ID 边界，游标记录删除后仍可继续", async () => {
  mocks.findMany.mockResolvedValueOnce([
    row("c", "2026-10-16T10:00:00.000Z"),
    row("b", "2026-10-16T09:00:00.000Z"),
    row("a", "2026-10-16T08:00:00.000Z"),
  ]).mockResolvedValueOnce([row("a", "2026-10-16T08:00:00.000Z")]);

  const first = await getUserNotifications("owner", "all", undefined, 2);
  expect(first.nextCursor).toEqual({ id: "b", lastMergedAt: "2026-10-16T09:00:00.000Z" });
  const second = await getUserNotifications("owner", "all", first.nextCursor!, 2);
  expect(second.items.map((item) => item.id)).toEqual(["a"]);
  expect(second.nextCursor).toBeNull();
  expect(mocks.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
    where: {
      userId: "owner",
      OR: [
        { lastMergedAt: { lt: new Date("2026-10-16T09:00:00.000Z") } },
        { lastMergedAt: new Date("2026-10-16T09:00:00.000Z"), id: { lt: "b" } },
      ],
    },
    orderBy: [{ lastMergedAt: "desc" }, { id: "desc" }],
  }));
});

it("并发合并冲突时重读，不用旧昵称覆盖新昵称", async () => {
  mocks.findFirst
    .mockResolvedValueOnce({ id: "n1", actorNames: JSON.stringify(["A"]) })
    .mockResolvedValueOnce({ id: "n1", actorNames: JSON.stringify(["B", "A"]) });
  mocks.updateMany
    .mockResolvedValueOnce({ count: 0 })
    .mockResolvedValueOnce({ count: 1 });
  mocks.findUnique.mockResolvedValue({ id: "n1" });

  await createNotification("owner", {
    category: "like",
    type: "like",
    title: "有人赞了你的文章",
    actorName: "C",
    aggregateKey: "like:p1",
  });

  expect(mocks.updateMany).toHaveBeenCalledTimes(2);
  // 第一次用读到的昵称作版本条件；冲突后重读，第二次把 C 合并到最新的 B、A 之前。
  expect(mocks.updateMany.mock.calls[0][0].where).toMatchObject({
    id: "n1",
    read: false,
    actorNames: JSON.stringify(["A"]),
  });
  expect(JSON.parse(mocks.updateMany.mock.calls[1][0].data.actorNames)).toEqual(["C", "B", "A"]);
  expect(mocks.create).not.toHaveBeenCalled();
});

it("合并持续冲突时新建通知，不丢事件", async () => {
  mocks.findFirst.mockResolvedValue({ id: "n1", actorNames: JSON.stringify(["A"]) });
  mocks.updateMany.mockResolvedValue({ count: 0 });
  mocks.create.mockResolvedValue({ id: "n2" });

  await createNotification("owner", {
    category: "like",
    type: "like",
    title: "有人赞了你的文章",
    actorName: "B",
    aggregateKey: "like:p1",
  });

  expect(mocks.updateMany).toHaveBeenCalledTimes(3);
  expect(mocks.create).toHaveBeenCalledOnce();
});