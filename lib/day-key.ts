// 当前中国标准时间日键；纯模块，浏览器与数据库统计共用。
export const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

export function dayKeyOf(date: Date = new Date()): string {
  return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export function dayKeyToStart(key: string): Date {
  return new Date(`${key}T00:00:00+08:00`);
}

export function shiftDayKey(key: string, days: number): string {
  return dayKeyOf(new Date(dayKeyToStart(key).getTime() + days * 86_400_000));
}
