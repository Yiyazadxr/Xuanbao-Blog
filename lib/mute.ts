// 禁言数据层（服务端专用，依赖数据库）：判断用户是否被禁言（定时/永久）
import { prisma } from "@/lib/prisma";
import type { MuteInfo } from "@/lib/mute-types";

function isActiveMute(mutedDuring: Date | null, mutedPermanent: boolean): boolean {
  if (mutedPermanent) return true;
  if (!mutedDuring) return false;
  return mutedDuring.getTime() > Date.now();
}

// 读取某用户的禁言状态；定时禁言到期视为未禁言（惰性解禁）
export async function getMuteInfo(userId: string): Promise<MuteInfo> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { mutedDuring: true, mutedPermanent: true, mutedReason: true },
  });
  if (!row) return { muted: false, permanent: false, until: null, reason: null };
  const active = isActiveMute(row.mutedDuring, row.mutedPermanent);
  return {
    muted: active,
    permanent: row.mutedPermanent,
    until: row.mutedDuring ? row.mutedDuring.toISOString() : null,
    reason: row.mutedReason,
  };
}

// 判断用户当前是否处于禁言状态。
export async function isMuted(userId: string): Promise<boolean> {
  return (await getMuteInfo(userId)).muted;
}
