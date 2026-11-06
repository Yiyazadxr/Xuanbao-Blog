// Vercel 构建前置步骤：只在生产环境应用数据库迁移。
// 预览构建不执行迁移，避免分支构建把未经评审的迁移应用到生产库。
import { spawnSync } from "node:child_process";

// Neon 计算节点休眠后的首个连接可能超过 Prisma 默认 5 秒；放宽超时并重试，避免构建被瞬时网络失败打断。
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5_000;
const CONNECT_TIMEOUT_SECONDS = 15;

if (process.env.VERCEL_ENV !== "production") {
  console.log(
    `[predeploy] VERCEL_ENV=${process.env.VERCEL_ENV ?? "(未设置)"}，跳过数据库迁移` +
      "（生产迁移在 Vercel 生产构建时执行，或手动运行 npm run db:deploy）"
  );
  process.exit(0);
}

// connect_timeout 由客户端解析，不影响 Neon 侧；已显式配置时保持原样。
function withConnectTimeout(url) {
  if (!url || /[?&]connect_timeout=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connect_timeout=${CONNECT_TIMEOUT_SECONDS}`;
}

const databaseUrl = withConnectTimeout(process.env.DATABASE_URL);
const env = databaseUrl ? { ...process.env, DATABASE_URL: databaseUrl } : process.env;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  console.log(`[predeploy] 应用数据库迁移（第 ${attempt}/${MAX_ATTEMPTS} 次）`);
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });

  if (!result.error && result.status === 0) process.exit(0);
  if (result.error) {
    console.error(`[predeploy] 迁移命令执行失败：${result.error.message}`);
  }
  if (attempt < MAX_ATTEMPTS) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
  }
}

console.error(`[predeploy] 数据库迁移连续失败 ${MAX_ATTEMPTS} 次，终止构建`);
process.exit(1);
