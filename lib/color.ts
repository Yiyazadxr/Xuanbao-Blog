// Canvas 取色：把主题色从 CSS 变量解析成 rgb。Canvas 无法直接使用 var()，亮暗切换时重新读取。
// 全站 Canvas 特效共用这一份，避免各写一套。

export type Rgb = [number, number, number];

/** 解析 #rgb / #rrggbb / #rrggbbaa / rgb(...) / 空格分隔数字，失败时回落 fallback */
export function parseColor(value: string, fallback: Rgb): Rgb {
  const raw = value.trim();
  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b] = [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
      if ([r, g, b].every((n) => Number.isFinite(n))) return [r, g, b];
    } else if (hex.length === 6 || hex.length === 8) {
      const [r, g, b] = [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
      if ([r, g, b].every((n) => Number.isFinite(n))) return [r, g, b];
    }
  } else {
    const m = raw.match(/-?\d+(\.\d+)?/g);
    if (m && m.length >= 3) {
      return [Number(m[0]), Number(m[1]), Number(m[2])];
    }
  }
  return fallback;
}

/** 读取 <html> 上的 CSS 颜色变量 */
export function readVar(name: string, fallback: Rgb): Rgb {
  if (typeof document === "undefined") return fallback;
  return parseColor(
    getComputedStyle(document.documentElement).getPropertyValue(name),
    fallback
  );
}

/** 读取 <html> 上的 CSS 数值变量（如远山强度 --wave-intensity） */
export function readNumVar(name: string, fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  );
  return Number.isFinite(v) ? v : fallback;
}

/** 两色线性混合，t 为 b 的占比 0~1；Canvas 特效里做主色衍生用 */
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}
