import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(), increment: vi.fn(), record: vi.fn(), user: vi.fn(),
  isBlocked: vi.fn(), checkAndHit: vi.fn(), ip: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { post: { findFirst: mocks.findFirst } } }));
vi.mock("@/lib/posts", () => ({ incrementViewCount: mocks.increment }));
vi.mock("@/lib/reading", () => ({ recordRead: mocks.record }));
vi.mock("@/lib/auth", () => ({ getFreshUser: mocks.user }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: mocks.ip, rateLimit: mocks }));
import { POST } from "./route";
const context = { params: Promise.resolve({ slug: "hello" }) };
const request = (body: unknown) => new Request("https://example.com/api/posts/hello/view", { method: "POST", body: JSON.stringify(body) });

describe("浏览上报安全边界", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.ip.mockResolvedValue("127.0.0.1");
    mocks.isBlocked.mockResolvedValue({ blocked: false });
    mocks.checkAndHit.mockResolvedValue({ blocked: false });
    mocks.findFirst.mockResolvedValue({ id: "post1", wordCount: 100 });
    mocks.increment.mockResolvedValue(true);
    mocks.user.mockResolvedValue({ id: "user1" });
  });
  it("无效/非公开/路径不匹配的文章不会写入统计", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect((await POST(request({ postId: "other" }), context)).status).toBe(404);
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other", slug: "hello", published: true, archived: false } }));
    expect(mocks.increment).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it("超限不增加浏览量，但仍记录登录用户的阅读", async () => {
    mocks.isBlocked.mockResolvedValue({ blocked: true, retryAfterSec: 12 });
    const response = await POST(request({ postId: "post1" }), context);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("12");
    expect(mocks.record).toHaveBeenCalledWith("post1", "user1", 100);
    expect(mocks.increment).not.toHaveBeenCalled();
    expect(mocks.checkAndHit).not.toHaveBeenCalled();
  });
  it("匿名超限在文章查询前返回", async () => {
    mocks.user.mockResolvedValue(null);
    mocks.isBlocked.mockResolvedValue({ blocked: true, retryAfterSec: 12 });
    expect((await POST(request({ postId: "post1" }), context)).status).toBe(429);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it("重复上报不再次增加浏览量", async () => {
    mocks.isBlocked.mockResolvedValueOnce({ blocked: false }).mockResolvedValueOnce({ blocked: true });
    expect((await POST(request({ postId: "post1" }), context)).status).toBe(200);
    expect(mocks.increment).not.toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith("post1", "user1", 100);
  });
  it("缺少可信 IP 时只记录登录用户阅读", async () => {
    mocks.ip.mockResolvedValue("unknown");
    expect((await POST(request({ postId: "post1" }), context)).status).toBe(200);
    expect(mocks.record).toHaveBeenCalledWith("post1", "user1", 100);
    expect(mocks.increment).not.toHaveBeenCalled();
    expect(mocks.checkAndHit).not.toHaveBeenCalled();
  });
  it("缺少可信 IP 的匿名请求不查询文章", async () => {
    mocks.ip.mockResolvedValue("unknown");
    mocks.user.mockResolvedValue(null);
    expect((await POST(request({ postId: "post1" }), context)).status).toBe(200);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it("使用数据库字数，不信任客户端统计", async () => {
    await POST(request({ postId: "post1", wordCount: 999 }), context);
    expect(mocks.record).toHaveBeenCalledWith("post1", "user1", 100);
  });
  it.each([-1, 1.5, 20_000_000])("拒绝非法字数 %s", async (wordCount) => {
    expect((await POST(request({ postId: "post1", wordCount }), context)).status).toBe(400);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
  it("限制实际请求体大小", async () => {
    expect((await POST(request({ postId: "x".repeat(2000) }), context)).status).toBe(413);
    expect(mocks.checkAndHit).not.toHaveBeenCalled();
  });
  it("拒绝跨站浏览器请求", async () => {
    const req = request({ postId: "post1" });
    req.headers.set("origin", "https://other.example");
    expect((await POST(req, context)).status).toBe(403);
  });
});
