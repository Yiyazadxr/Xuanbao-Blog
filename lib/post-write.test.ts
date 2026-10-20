import { beforeEach, describe, expect, it, vi } from "vitest";

const { tx, snapshot, transaction } = vi.hoisted(() => {
  const tx = {
    postRevision: { findUnique: vi.fn() },
    post: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    category: { findUnique: vi.fn() }, series: { findUnique: vi.fn() },
    tag: { upsert: vi.fn(), findMany: vi.fn() },
    postTag: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  return { tx, snapshot: vi.fn(), transaction: vi.fn(async (fn) => fn(tx)) };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
vi.mock("@/lib/post-revisions", () => ({ snapshotPost: snapshot }));

import { restoreRevision, writePost } from "@/lib/post-write";
import { postSchema } from "@/lib/validation";

describe("旧编辑表单校验", () => {
  it.each([undefined, "2025-01-01T00:00:00.000Z"])("缺失或过期版本 %s 不允许覆盖", async (expectedUpdatedAt) => {
    vi.clearAllMocks();
    tx.post.findUnique.mockResolvedValue({ id: "post", updatedAt: new Date("2026-01-01T00:00:00Z") });
    const input = postSchema.parse({ id: "post", title: "标题", content: "正文", published: false, featured: false, expectedUpdatedAt });
    await expect(writePost(input, "admin")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(snapshot).not.toHaveBeenCalled();
    expect(tx.post.update).not.toHaveBeenCalled();
    expect(tx.tag.upsert).not.toHaveBeenCalled();
  });
});

describe("标签与并发写入", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.post.findUnique.mockResolvedValue(null);
    tx.post.findFirst.mockResolvedValue(null);
    tx.post.create.mockResolvedValue({ id: "new-post" });
    tx.tag.findMany.mockResolvedValue([]);
    tx.tag.upsert.mockResolvedValue({ id: "tag" });
  });

  it("标签链接标识冲突时给出可读错误，不写入文章", async () => {
    // slugify("Node.js") 与 slugify("Node js") 相同，会撞 Tag.slug 唯一约束。
    tx.tag.findMany.mockResolvedValue([{ name: "Node.js" }]);
    const input = postSchema.parse({
      title: "标题", content: "正文", published: false, featured: false, tags: "Node js",
    });
    await expect(writePost(input, "admin")).rejects.toThrow("链接标识");
    expect(tx.tag.upsert).not.toHaveBeenCalled();
    expect(tx.post.create).not.toHaveBeenCalled();
  });

  it("同一批次内两个标签生成相同标识时拒绝保存", async () => {
    const input = postSchema.parse({
      title: "标题", content: "正文", published: false, featured: false, tags: "Node.js, Node js",
    });
    await expect(writePost(input, "admin")).rejects.toThrow("链接标识");
    expect(tx.post.create).not.toHaveBeenCalled();
  });

  it("序列化写冲突自动重试", async () => {
    const conflict = Object.assign(new Error("write conflict"), { code: "P2034" });
    transaction.mockImplementationOnce(async () => {
      throw conflict;
    });
    const input = postSchema.parse({ title: "标题", content: "正文", published: false, featured: false });
    await writePost(input, "admin");
    expect(transaction).toHaveBeenCalledTimes(2);
  });
});

describe("文章版本恢复", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.postRevision.findUnique.mockResolvedValue({
      postId: "post", title: "旧标题", slug: "old", content: "正文",
      excerpt: null, coverImage: null, categoryId: "deleted", seriesId: "deleted",
      published: true, pinned: false, featured: false, archived: false,
      tags: '["React","React"]',
    });
    tx.post.findUnique.mockResolvedValue({ id: "post", publishedAt: null, tags: [] });
    tx.post.findFirst.mockResolvedValue(null);
    tx.category.findUnique.mockResolvedValue(null);
    tx.series.findUnique.mockResolvedValue(null);
    tx.tag.upsert.mockResolvedValue({ id: "tag" });
    tx.tag.findMany.mockResolvedValue([]);
  });

  it("恢复已删除分类的版本时清空失效关联，补齐首次发布时间并去重标签", async () => {
    await restoreRevision("revision", "admin");
    expect(tx.post.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      categoryId: null, seriesId: null, publishedAt: expect.any(Date),
    }) }));
    expect(tx.tag.upsert).toHaveBeenCalledTimes(1);
    expect(snapshot).toHaveBeenCalledWith(tx, expect.objectContaining({ id: "post" }), "admin");
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });

  it("保留原始首次发布时间", async () => {
    const publishedAt = new Date("2025-01-01T00:00:00Z");
    tx.post.findUnique.mockResolvedValue({ id: "post", publishedAt, tags: [] });
    await restoreRevision("revision", "admin");
    expect(tx.post.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ publishedAt }),
    }));
  });

  it("损坏的标签数据阻止恢复且不创建快照或写入文章", async () => {
    tx.postRevision.findUnique.mockResolvedValue({ postId: "post", slug: "old", tags: "broken" });
    await expect(restoreRevision("revision", "admin")).rejects.toThrow("版本标签数据损坏");
    expect(snapshot).not.toHaveBeenCalled();
    expect(tx.post.update).not.toHaveBeenCalled();
  });

  it("链接冲突时不更改文章", async () => {
    tx.post.findFirst.mockResolvedValue({ id: "other" });
    await expect(restoreRevision("revision", "admin")).rejects.toThrow("已被其他文章占用");
    expect(snapshot).not.toHaveBeenCalled();
    expect(tx.post.update).not.toHaveBeenCalled();
  });
});
