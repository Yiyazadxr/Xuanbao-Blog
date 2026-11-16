import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Prisma 客户端单例：开发环境热重载时复用同一个实例，避免连接数暴涨。
// 连接池按需创建，复用客户端时不会再分配一批闲置连接。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  // Vercel Serverless 每个 lambda 持独立连接池，max 过高会打满 Neon 连接上限。
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
