import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ headers: vi.fn(), query: vi.fn(), deleteMany: vi.fn() }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: mocks.query, rateLimit: { deleteMany: mocks.deleteMany } } }));
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
  it("非法代理配置不静默接受", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1garbage");
    mocks.headers.mockResolvedValue(new Headers());
    await expect(getClientIp()).rejects.toThrow("TRUSTED_PROXY_HOPS");
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
