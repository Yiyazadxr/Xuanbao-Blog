import { describe, expect, it } from "vitest";
import {
  READING_POSITION_KEY,
  parseReadingPositions,
  readReadingPosition,
  removeReadingPosition,
  saveReadingPosition,
  type ReadingPosition,
} from "@/lib/reading-position";

function createStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: (_key: string) => value,
    setItem: (_key: string, next: string) => { value = next; },
    value: () => value,
  };
}

const position: ReadingPosition = {
  postId: "post-1",
  slug: "hello",
  title: "文章",
  revision: "2026-10-04T00:00:00.000Z",
  progress: 0.42,
  updatedAt: 1,
};

describe("阅读位置", () => {
  it("保存后可按文章版本恢复", () => {
    const storage = createStorage();
    saveReadingPosition(storage, position);
    expect(readReadingPosition(storage, position.postId, position.revision)?.progress).toBe(0.42);
    expect(JSON.parse(storage.value() ?? "[]")).toHaveLength(1);
  });

  it("内容版本变化、开头和接近读完时不恢复", () => {
    const storage = createStorage();
    saveReadingPosition(storage, position);
    expect(readReadingPosition(storage, position.postId, "new-revision")).toBeNull();
    saveReadingPosition(storage, { ...position, progress: 0.03 });
    expect(readReadingPosition(storage, position.postId, position.revision)).toBeNull();
    saveReadingPosition(storage, { ...position, progress: 0.95 });
    expect(readReadingPosition(storage, position.postId, position.revision)).toBeNull();
  });

  it("同一文章覆盖旧位置并支持删除", () => {
    const storage = createStorage();
    saveReadingPosition(storage, position);
    saveReadingPosition(storage, { ...position, progress: 0.6, updatedAt: 2 });
    expect(parseReadingPositions(storage.getItem(READING_POSITION_KEY))).toHaveLength(1);
    expect(readReadingPosition(storage, position.postId, position.revision)?.progress).toBe(0.6);
    removeReadingPosition(storage, position.postId);
    expect(parseReadingPositions(storage.value())).toEqual([]);
  });

  it("最多保留最近的 20 篇文章", () => {
    const storage = createStorage();
    for (let i = 0; i < 21; i += 1) {
      saveReadingPosition(storage, { ...position, postId: `post-${i}`, updatedAt: i });
    }
    const saved = parseReadingPositions(storage.getItem(READING_POSITION_KEY));
    expect(saved).toHaveLength(20);
    expect(saved[0]?.postId).toBe("post-20");
    expect(saved.some((item) => item.postId === "post-0")).toBe(false);
  });

  it("损坏存储回落为空列表", () => {
    expect(parseReadingPositions("not-json")).toEqual([]);
    expect(parseReadingPositions(JSON.stringify([{ postId: 1 }]))).toEqual([]);
  });
});
