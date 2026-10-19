// 数据库固定窗口限流；多实例共享计数。
import { headers } from "next/headers";
import { runAfter } from "@/lib/deferred";
import { prisma } from "@/lib/prisma";
import { isIP } from "node:net";

function keyName(prefix: string, value: string) {
  return `${prefix}:${value}`;
}

export type RateLimitVerdict = { blocked: boolean; retryAfterSec: number };

// 去重键（如 view-post）按「访客×文章」组合无限增长，需惰性清理过期行。
// 删除过期行与窗口重置语义等价：行不存在或已过期的键都不再阻止请求。
const CLEANUP_PROBABILITY = 0.02;
const CLEANUP_MIN_INTERVAL_MS = 60 * 60 * 1000;
// 最长限流窗口为 1 小时，过期后再留 1 小时，避免清理与窗口重置互相干扰。
const CLEANUP_GRACE_MS = 60 * 60 * 1000;
let lastCleanupAt = 0;

// 删除已过期超过宽限期的计数行；失败不影响限流主流程。
export async function cleanupExpiredRateLimits(): Promise<void> {
  await prisma.rateLimit.deleteMany({
    where: { resetAt: { lt: new Date(Date.now() - CLEANUP_GRACE_MS) } },
  });
}

// 写入路径按概率触发清理；进程内节流，多实例各自独立触发。
function maybeCleanupExpired(): void {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_MIN_INTERVAL_MS) return;
  if (Math.random() >= CLEANUP_PROBABILITY) return;
  lastCleanupAt = now;
  runAfter(async () => {
    try {
      await cleanupExpiredRateLimits();
    } catch (e) {
      console.error("限流计数清理失败：", e);
    }
  });
}

// 原生 SQL 必须显式写入无默认值的 updatedAt。
export const rateLimit = {
  // 仅检查，不计数；前 limit 次放行。
  async isBlocked(
    prefix: string,
    value: string,
    limit: number
  ): Promise<RateLimitVerdict> {
    const key = keyName(prefix, value);
    const now = Date.now();
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row || row.resetAt.getTime() <= now) return { blocked: false, retryAfterSec: 0 };
    if (row.count > limit) {
      return { blocked: true, retryAfterSec: Math.ceil((row.resetAt.getTime() - now) / 1000) };
    }
    return { blocked: false, retryAfterSec: 0 };
  },

  // 单条 SQL 原子重置或自增；第 limit + 1 次起拒绝。
  async checkAndHit(
    prefix: string,
    value: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitVerdict> {
    maybeCleanupExpired();
    const key = keyName(prefix, value);
    const nowDate = new Date();
    const nextReset = new Date(nowDate.getTime() + windowMs);
    // 由 Prisma 序列化 UTC Date，避免 timestamp 时区歧义。
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt", "updatedAt")
      VALUES (${key}, 1, ${nextReset}, ${nowDate})
      ON CONFLICT ("key") DO UPDATE
      SET "count" = CASE
          WHEN "RateLimit"."resetAt" <= ${nowDate} THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimit"."resetAt" <= ${nowDate} THEN ${nextReset}
          ELSE "RateLimit"."resetAt"
        END,
        "updatedAt" = ${nowDate}
      RETURNING "count", "resetAt"
    `;
    const row = rows[0];
    if (!row) throw new Error("限流计数未返回结果");
    if (row.count > limit) {
      return {
        blocked: true,
        retryAfterSec: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)),
      };
    }
    return { blocked: false, retryAfterSec: 0 };
  },

  // 仅记录，供失败时计数。
  async hit(prefix: string, value: string, windowMs: number): Promise<void> {
    maybeCleanupExpired();
    const key = keyName(prefix, value);
    const nowDate = new Date();
    const nextReset = new Date(nowDate.getTime() + windowMs);
    await prisma.$executeRaw`
      INSERT INTO "RateLimit" ("key", "count", "resetAt", "updatedAt")
      VALUES (${key}, 1, ${nextReset}, ${nowDate})
      ON CONFLICT ("key") DO UPDATE
      SET "count" = CASE
          WHEN "RateLimit"."resetAt" <= ${nowDate} THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimit"."resetAt" <= ${nowDate} THEN ${nextReset}
          ELSE "RateLimit"."resetAt"
        END,
        "updatedAt" = ${nowDate}
    `;
  },

  async reset(prefix: string, value: string): Promise<void> {
    await prisma.rateLimit.deleteMany({ where: { key: keyName(prefix, value) } });
  },
};

// 入口负责清洗并追加 XFF；默认取最右侧地址，跳过的地址数只用于已知代理链。
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const configured = process.env.TRUSTED_PROXY_HOPS ?? "0";
  if (!/^\d+$/.test(configured) || !Number.isSafeInteger(Number(configured))) {
    throw new Error("TRUSTED_PROXY_HOPS 必须为非负整数");
  }
  const trustedHops = Number(configured);
  if (fwd) {
    const addresses = fwd.split(",").map((value) => value.trim()).filter(Boolean);
    const address = addresses[Math.max(0, addresses.length - trustedHops - 1)];
    return address && isIP(address) ? address : "unknown";
  }
  const address = h.get("x-real-ip");
  return address && isIP(address) ? address : "unknown";
}
