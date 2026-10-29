import { beforeEach, expect, it, vi } from "vitest";
const { getFreshUser, updateMany, deleteMany } = vi.hoisted(() => ({ getFreshUser: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getFreshUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { updateMany, deleteMany } } }));
vi.mock("@/lib/notifications", () => ({ getUserNotifications: vi.fn(), getUnreadSummary: vi.fn() }));
import { markNotificationRead, markAllNotificationsRead, markCategoryRead, clearReadNotifications, deleteNotification } from "./actions";

beforeEach(() => { vi.resetAllMocks(); getFreshUser.mockResolvedValue({ id: "owner" }); });

it("会话失效时返回未登录错误，不写库", async () => {
  getFreshUser.mockResolvedValue(null);
  for (const operation of [() => markNotificationRead("id"), markAllNotificationsRead, () => markCategoryRead("like"), clearReadNotifications, () => deleteNotification("id")]) {
    await expect(operation()).resolves.toEqual({ ok: false, error: "请先登录" });
  }
  expect(updateMany).not.toHaveBeenCalled();
  expect(deleteMany).not.toHaveBeenCalled();
});

it("ID 无效时返回错误，不写库", async () => {
  await expect(markNotificationRead(" ")).resolves.toEqual({ ok: false, error: "通知 ID 无效" });
  await expect(deleteNotification("")).resolves.toEqual({ ok: false, error: "通知 ID 无效" });
  expect(updateMany).not.toHaveBeenCalled();
  expect(deleteMany).not.toHaveBeenCalled();
});

it("分类无效时返回错误，不写库", async () => {
  await expect(markCategoryRead("nope" as never)).resolves.toEqual({ ok: false, error: "通知分类无效" });
  expect(updateMany).not.toHaveBeenCalled();
});

it("通知写入限定当前用户", async () => {
  await expect(markNotificationRead("notice")).resolves.toEqual({ ok: true });
  expect(updateMany).toHaveBeenLastCalledWith({ where: { id: "notice", userId: "owner", read: false }, data: { read: true } });
  await expect(markCategoryRead("like")).resolves.toEqual({ ok: true });
  expect(updateMany).toHaveBeenLastCalledWith({ where: { userId: "owner", category: "like", read: false }, data: { read: true } });
  await expect(deleteNotification("notice")).resolves.toEqual({ ok: true });
  expect(deleteMany).toHaveBeenLastCalledWith({ where: { id: "notice", userId: "owner" } });
});

it("数据库失败时返回受控错误，不暴露异常", async () => {
  deleteMany.mockRejectedValue(new Error("DB_FAILURE"));
  await expect(deleteNotification("notice")).resolves.toEqual({ ok: false, error: "操作失败，请稍后重试" });
});
