import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), compare: vi.fn(), reset: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getFreshUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique, updateMany: mocks.updateMany } } }));
vi.mock("@/lib/hcaptcha", () => ({ verifyHCaptcha: async () => true }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: async () => "127.0.0.1", rateLimit: { isBlocked: async () => ({ blocked: false }), checkAndHit: async () => ({ blocked: false, retryAfterSec: 0 }), reset: mocks.reset } }));
vi.mock("@/lib/image-storage", () => ({ deleteImage: vi.fn(), saveImage: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare, hash: async () => "new-hash" } }));
import { changePassword } from "./actions";
const data = () => {
  const form = new FormData();
  form.set("currentPassword", "old-password");
  form.set("newPassword", "new-password");
  form.set("confirmPassword", "new-password");
  return form;
};
describe("改密撤销会话", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "u1", sessionVersion: 4 });
    mocks.findUnique.mockResolvedValue({ password: "old-hash" });
    mocks.compare.mockResolvedValue(true);
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });
  it("密码和版本在同一条件更新中写入", async () => {
    expect((await changePassword({ ok: false }, data())).ok).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", password: "old-hash", sessionVersion: 4 },
      data: { password: "new-hash", sessionVersion: { increment: 1 } },
    });
  });
  it("并发改密失败不能宣告成功", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    expect((await changePassword({ ok: false }, data())).ok).toBe(false);
    expect(mocks.reset).not.toHaveBeenCalled();
  });
  it("已失效会话不能修改密码", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await changePassword({ ok: false }, data())).ok).toBe(false);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
