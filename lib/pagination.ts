export const POSTS_PER_PAGE = 9;

// URL 参数、客户端和数据层使用同一规则；不把 NaN/Infinity/小数传给 Prisma。
export function parsePage(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") return 1;
  if (typeof value === "string" && !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function clampPage(page: number, total: number, size = POSTS_PER_PAGE): number {
  return Math.min(parsePage(page), Math.max(1, Math.ceil(total / size)));
}

/**
 * 并行取总数与当前页；只有请求页越界时才补查末页。
 * 返回实际使用的 offset，调用方据此计算真实页码。
 */
// 超大 offset 可能让数据库扫描大量行；超过该值先取总数再收敛到末页。
const PARALLEL_SKIP_LIMIT = 10_000;

export async function fetchPage<T>({
  count,
  fetchRows,
  requestedSkip,
  pageSize,
}: {
  count: () => Promise<number>;
  fetchRows: (skip: number, take: number) => Promise<T[]>;
  requestedSkip: number;
  pageSize: number;
}): Promise<{ rows: T[]; total: number; skip: number }> {
  const skip = Number.isSafeInteger(requestedSkip) && requestedSkip >= 0 ? requestedSkip : 0;
  const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : POSTS_PER_PAGE;

  const lastSkipOf = (total: number) => Math.floor((total - 1) / size) * size;

  if (skip > PARALLEL_SKIP_LIMIT) {
    const total = await count();
    if (total === 0) return { rows: [], total, skip: 0 };
    const skipTo = Math.min(skip, lastSkipOf(total));
    return { rows: await fetchRows(skipTo, size), total, skip: skipTo };
  }

  // 大多数请求页码合法：两个查询并行，少一次数据库往返。
  const [total, firstRows] = await Promise.all([count(), fetchRows(skip, size)]);
  if (total === 0) return { rows: [], total, skip: 0 };

  const lastSkip = lastSkipOf(total);
  if (skip <= lastSkip) return { rows: firstRows, total, skip };

  const rows = await fetchRows(lastSkip, size);
  return { rows, total, skip: lastSkip };
}
