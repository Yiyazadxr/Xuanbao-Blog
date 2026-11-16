import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ headers: vi.fn(), query: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn() }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mocks.query,
    rateLimit: { deleteMany: mocks.deleteMany, findUnique: mocks.findUnique },
  },
}));
import { cleanupExpiredRateLimits, getClientIp, rateLimit } from "./rate-limit";
describe("可信代理和限流故障", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("TRUSTED_PROXY_HOPS", "0"); });
  afterEach(() => { vi.unstubAllEnvs(); });
  it("取可信入口追加的最右侧地址，忽略左侧伪造前缀", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.2" }));
    expect(await getClientIp()).toBe("203.0.113.2");
  });
  it("已知多层代理按显式配置跳过", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.2, 10.0.0.1" }));
    expect(await getClientIp()).toBe("203.0.113.2");
  });
  it("非法 IP 不能创建任意限流键", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "random-text" }));
    expect(await getClientIp()).toBe("unknown");
  });
  it("非法代理配置回落到最右侧地址，不阻断请求", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1garbage");
    mocks.headers.mockResolvedValue(
      new Headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.2" })
    );
    expect(await getClientIp()).toBe("203.0.113.2");
  });
  it("预检在达到上限时阻止下一次请求", async () => {
    const resetAt = new Date(Date.now() + 60_000);
    mocks.findUnique.mockResolvedValue({ key: "k", count: 5, resetAt });
    await expect(rateLimit.isBlocked("k", "v", 5)).resolves.toEqual({
      blocked: true,
      retryAfterSec: expect.any(Number),
    });
    await expect(rateLimit.isBlocked("k", "v", 6)).resolves.toEqual({
      blocked: false,
      retryAfterSec: 0,
    });
  });

  it("限流键不写入明文邮箱与 IP，同值稳定、异值分离", async () => {
    mocks.query.mockResolvedValue([{ count: 1, resetAt: new Date(Date.now() + 60_000) }]);
    await rateLimit.checkAndHit("login-email", "user@example.com", 5, 60_000);
    await rateLimit.checkAndHit("login-email", "user@example.com", 5, 60_000);
    await rateLimit.checkAndHit("login-email", "other@example.com", 5, 60_000);

    const [first, second, third] = mocks.query.mock.calls.map((call) => call[1] as string);
    expect(first).toMatch(/^login-email:[A-Za-z0-9_-]{32}$/);
    expect(first).not.toContain("user@example.com");
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });

  it("计数器无返回值不放行", async () => {
    mocks.query.mockResolvedValue([]);
    await expect(rateLimit.checkAndHit("test", "ip", 5, 60_000)).rejects.toThrow("限流计数未返回结果");
  });
  it("清理只删除过期超过宽限期的计数行", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 3 });
    await cleanupExpiredRateLimits();
    expect(mocks.deleteMany).toHaveBeenCalledTimes(1);
    const cutoff = mocks.deleteMany.mock.calls[0][0].where.resetAt.lt as Date;
    // 宽限期 1 小时：截止时间约在 1 小时前（允许测试执行的时间漂移）。
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(Date.now() - 2 * 60 * 60 * 1000);
    expect(cutoff.getTime()).toBeLessThanOrEqual(Date.now() - 60 * 60 * 1000);
  });
});
