// 为存量文章回填完整 searchText，否则搜索只能命中已有截断文本。
// 运行：npx tsx scripts/backfill-search-text.ts
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { buildSearchText } from "../lib/utils";

const BATCH_SIZE = 100;

async function main() {
  // 比较完整文本，既补空值也更新历史的截断索引。
  const posts = await prisma.post.findMany({
    select: { id: true, title: true, content: true, searchText: true },
  });
  const targets = posts.filter((post) => post.searchText !== buildSearchText(post.content));

  if (targets.length === 0) {
    console.log("没有需要回填的文章（所有文章都已是完整 searchText）");
    await prisma.$disconnect();
    return;
  }

  let total = 0;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((p) =>
        prisma.post.update({
          where: { id: p.id },
          data: { searchText: buildSearchText(p.content) },
        })
      )
    );
    for (const p of batch) {
      console.log(`  ✅ ${p.title}`);
    }
    total += batch.length;
  }

  console.log(`回填完成，共 ${total} 篇`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
