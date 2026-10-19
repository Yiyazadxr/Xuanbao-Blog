// 博主资料数据层。
import { prisma } from "@/lib/prisma";

// 取最早的超级管理员作为站长展示（多个超管时取最早创建者，保证稳定）
export async function getOwnerProfile() {
  return prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { name: true, image: true },
  });
}
