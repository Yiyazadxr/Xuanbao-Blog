import { beforeEach, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { findMany } } }));
vi.mock("@/lib/deferred", () => ({ runAfter: vi.fn() }));

import { getUserNotifications } from "@/lib/notifications";

function row(id: string, date: string) {
  return {
    id, category: "system", type: "test", actorName: null, title: "通知",
    link: null, read: false, lastMergedAt: new Date(date), actorNames: null, count: 1,
  };
}

beforeEach(() => vi.resetAllMocks());

it("通知分页使用时间和 ID 边界，游标记录删除后仍可继续", async () => {
  findMany.mockResolvedValueOnce([
    row("c", "2026-10-16T10:00:00.000Z"),
    row("b", "2026-10-16T09:00:00.000Z"),
    row("a", "2026-10-16T08:00:00.000Z"),
  ]).mockResolvedValueOnce([row("a", "2026-10-16T08:00:00.000Z")]);

  const first = await getUserNotifications("owner", "all", undefined, 2);
  expect(first.nextCursor).toEqual({ id: "b", lastMergedAt: "2026-10-16T09:00:00.000Z" });
  const second = await getUserNotifications("owner", "all", first.nextCursor!, 2);
  expect(second.items.map((item) => item.id)).toEqual(["a"]);
  expect(second.nextCursor).toBeNull();
  expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({
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
