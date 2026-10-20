// Vercel 构建前置步骤：只在生产环境应用数据库迁移。
// 预览构建不执行迁移，避免分支构建把未经评审的迁移应用到生产库。
import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log(
    `[predeploy] VERCEL_ENV=${process.env.VERCEL_ENV ?? "(未设置)"}，跳过数据库迁移` +
      "（生产迁移在 Vercel 生产构建时执行，或手动运行 npm run db:deploy）"
  );
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("[predeploy] 迁移命令执行失败：", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
