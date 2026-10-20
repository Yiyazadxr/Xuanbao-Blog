import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), update: vi.fn(), checkAndHit: vi.fn(), reset: vi.fn(), isBlocked: vi.fn(), compare: vi.fn(),
  authorize: undefined as undefined | ((credentials: unknown) => Promise<unknown>),
  jwt: undefined as undefined | ((args: { token: Record<string, unknown>; user?: Record<string, unknown>; trigger?: string; session?: Record<string, unknown> }) => Promise<unknown>),
}));
vi.mock("next-auth", () => ({ default: (config: { providers: { authorize: typeof mocks.authorize }[]; callbacks: { jwt: typeof mocks.jwt } }) => {
  mocks.authorize = config.providers[0].authorize;
  mocks.jwt = config.callbacks.jwt;
  return {};
} }));
vi.mock("next-auth/providers/credentials", () => ({ default: (config: unknown) => config }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock("@/lib/permissions-server", () => ({ hasPermission: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: async () => "127.0.0.1", rateLimit: mocks }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));

describe("认证入口限流", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.checkAndHit.mockResolvedValue({ blocked: false });
    mocks.isBlocked.mockResolvedValue({ blocked: false });
  });

  it("IP 限额已满时不查询用户或计算密码", async () => {
    await import("@/lib/auth");
    mocks.isBlocked.mockResolvedValueOnce({ blocked: true });
    expect(await mocks.authorize!({ email: "test@example.com", password: "password123" })).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.checkAndHit).not.toHaveBeenCalled();
  });

  it("邮箱限额已满时不查询用户", async () => {
    await import("@/lib/auth");
    mocks.isBlocked.mockResolvedValueOnce({ blocked: false }).mockResolvedValueOnce({ blocked: true });
    expect(await mocks.authorize!({ email: "test@example.com", password: "password123" })).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("无效输入不触发数据库请求", async () => {
    await import("@/lib/auth");
    expect(await mocks.authorize!({ email: "invalid", password: "" })).toBeNull();
    expect(mocks.isBlocked).not.toHaveBeenCalled();
    expect(mocks.checkAndHit).not.toHaveBeenCalled();
  });

  it("密码错误才计数", async () => {
    await import("@/lib/auth");
    mocks.findUnique.mockResolvedValue({ id: "u1", password: "hash", activatedAt: new Date(), lastLoginAt: null, disabled: false });
    mocks.compare.mockResolvedValue(false);
    expect(await mocks.authorize!({ email: "test@example.com", password: "wrong123" })).toBeNull();
    expect(mocks.checkAndHit).toHaveBeenCalledTimes(2);
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it("登录成功不计入失败配额并清空邮箱计数", async () => {
    await import("@/lib/auth");
    mocks.findUnique.mockResolvedValue({ id: "u1", name: "u", email: "test@example.com", image: null, role: "MEMBER", sessionVersion: 0, password: "hash", activatedAt: new Date(), lastLoginAt: new Date(), disabled: false });
    mocks.compare.mockResolvedValue(true);
    expect(await mocks.authorize!({ email: "test@example.com", password: "right123" })).not.toBeNull();
    expect(mocks.checkAndHit).not.toHaveBeenCalled();
    expect(mocks.reset).toHaveBeenCalledWith("login-email", "test@example.com");
  });

  it("错误密码不能停用超过首次登录宽限期的账号", async () => {
    await import("@/lib/auth");
    mocks.findUnique.mockResolvedValue({ id: "u1", password: "hash", activatedAt: new Date(0), lastLoginAt: null, disabled: false });
    mocks.compare.mockResolvedValue(false);
    expect(await mocks.authorize!({ email: "test@example.com", password: "wrong123" })).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("旧会话不能通过 update 提交新版本来恢复权限", async () => {
    await import("@/lib/auth");
    mocks.findUnique.mockResolvedValue({ sessionVersion: 2, activatedAt: new Date(), disabled: false });
    expect(await mocks.jwt!({ token: { id: "u1", sessionVersion: 1 }, trigger: "update", session: { sessionVersion: 2 } })).toBeNull();
  });

  it("无版本的历史会话需要重新登录", async () => {
    await import("@/lib/auth");
    expect(await mocks.jwt!({ token: { id: "u1" } })).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("版本一致的会话继续可用", async () => {
    await import("@/lib/auth");
    mocks.findUnique.mockResolvedValue({ sessionVersion: 2, activatedAt: new Date(), disabled: false });
    const token = { id: "u1", sessionVersion: 2, syncedAt: Date.now() };
    expect(await mocks.jwt!({ token })).toEqual(token);
  });
});
