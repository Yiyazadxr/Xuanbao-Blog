import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  createNotification: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requirePermission: mocks.requirePermission, getFreshUser: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ createNotification: mocks.createNotification }));
vi.mock("@/lib/permissions-server", () => ({ hasPermission: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { comment: { findUnique: mocks.findUnique, updateMany: mocks.updateMany } } }));

import { approveComment } from "./actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requirePermission.mockResolvedValue({ id: "admin" });
  mocks.findUnique.mockResolvedValue({
    id: "comment", postId: "post", authorId: "author", parent: null,
    post: { slug: "post", title: "文章", authorId: "post-author" },
    author: { name: "评论者" },
  });
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

it("只有首次审核成功才发送通知", async () => {
  expect((await approveComment("comment")).ok).toBe(true);
  expect(mocks.updateMany).toHaveBeenCalledWith({
    where: { id: "comment", isApproved: false }, data: { isApproved: true },
  });
  expect(mocks.createNotification).toHaveBeenCalledTimes(2);

  mocks.updateMany.mockResolvedValue({ count: 0 });
  expect(await approveComment("comment")).toEqual({ ok: false, error: "评论已审核" });
  expect(mocks.createNotification).toHaveBeenCalledTimes(2);
  expect(mocks.revalidatePath).toHaveBeenCalledTimes(2);
});
