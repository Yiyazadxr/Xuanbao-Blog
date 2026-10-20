import { prisma } from "@/lib/prisma";

// wordCount 保存首次阅读快照；upsert 原子去重，失败不影响页面。
export async function recordRead(postId: string, userId?: string, wordCount?: number | null) {
  if (!userId) return;
  try {
    // 空 update 的 upsert 会退化成「先查再写」，并发下可能撞唯一约束；
    // createMany + skipDuplicates 编译为 INSERT ... ON CONFLICT DO NOTHING，语义一致且原子。
    await prisma.readingLog.createMany({
      data: [{ userId, postId, wordCount: wordCount ?? 0 }],
      skipDuplicates: true,
    });
  } catch (e) {
    console.error("记录阅读失败：", e);
  }
}

export async function getReadingStats(userId: string) {
  const agg = await prisma.readingLog.aggregate({
    where: { userId },
    _sum: { wordCount: true },
    _count: true,
  });
  return {
    postsRead: agg._count,
    wordsRead: agg._sum.wordCount ?? 0,
  };
}
