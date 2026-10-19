// 显示偏好：字体缩放、页面间距、界面密度、导航栏与页脚自定义。默认存 localStorage，可开启跨设备同步。
// 客户端可用；applyDisplay 与预水合脚本配合，避免 FOUC

export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.2;
export const FONT_SCALE_STEP = 0.02;
export const FONT_SCALE_DEFAULT = 1;

// 页面间距（内容区上下呼吸空间倍率，独立于字体缩放）
export const SPACING_SCALE_MIN = 0.8;
export const SPACING_SCALE_MAX = 1.2;
export const SPACING_SCALE_STEP = 0.02;
export const SPACING_SCALE_DEFAULT = 1;

export function isSpacingScale(value: unknown): value is number {
  return (
    typeof value === "number" &&
    value >= SPACING_SCALE_MIN &&
    value <= SPACING_SCALE_MAX
  );
}

export type Density = "compact" | "normal" | "comfortable" | "custom";
export const DENSITY_DEFAULT: Density = "normal";

// 是否为合法密度值；非法值不静默归一。
export function isDensity(value: unknown): value is Density {
  return value === "compact" || value === "normal" || value === "comfortable" || value === "custom";
}

export const DENSITY_OPTIONS: { value: Density; label: string; desc: string }[] = [
  { value: "compact", label: "紧凑", desc: "更矮的导航栏与更紧凑的页脚" },
  { value: "normal", label: "标准", desc: "默认密度" },
  { value: "comfortable", label: "宽松", desc: "更舒适的间距" },
  { value: "custom", label: "自定义", desc: "单独调整导航栏高度与页脚间距" },
];

// 导航栏高度 / 页脚间距（自定义密度时使用，单位 px）
// 范围由预设值对称扩展：紧凑/1.2 ~ 宽松×1.2
// Header: 48/1.2=40 ~ 72×1.2=86.4; Footer: 24/1.2=20 ~ 48×1.2=57.6
export const HEADER_H_MIN = Math.round(48 / 1.2); // 40
export const HEADER_H_MAX = Math.floor(72 * 1.2); // 86
export const HEADER_H_DEFAULT = 64;
export const FOOTER_PY_MIN = Math.round(24 / 1.2); // 20
export const FOOTER_PY_MAX = Math.floor(48 * 1.2); // 57
export const FOOTER_PY_DEFAULT = 40;

// 远山水墨强度：0~1.5 倍率，作用于 WaveBackground 各层透明度
export const WAVE_INTENSITY_MIN = 0;
export const WAVE_INTENSITY_MAX = 1.5;
export const WAVE_INTENSITY_STEP = 0.05;
export const WAVE_INTENSITY_DEFAULT = 1;

export function isWaveIntensity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    value >= WAVE_INTENSITY_MIN &&
    value <= WAVE_INTENSITY_MAX
  );
}

// 水墨墨迹（InkBackground）开关：默认开
export const INK_ENABLED_DEFAULT = true;

// 正文行距：作用于 .prose p 的 line-height（文章阅读体验）
export const PROSE_LEADING_MIN = 1.5;
export const PROSE_LEADING_MAX = 2.2;
export const PROSE_LEADING_STEP = 0.05;
export const PROSE_LEADING_DEFAULT = 1.75;

export function isProseLeading(value: unknown): value is number {
  return (
    typeof value === "number" &&
    value >= PROSE_LEADING_MIN &&
    value <= PROSE_LEADING_MAX
  );
}

// 平滑滚动（Lenis）/ 阅读进度条开关：默认开
export const SMOOTH_SCROLL_DEFAULT = true;
export const READING_PROGRESS_DEFAULT = true;

// 显示偏好变更事件：写入函数派发，消费组件（SmoothScroll 等）监听以即时生效
export const DISPLAY_CHANGE_EVENT = "xr-display-change";

// 显示偏好契约：客户端（DisplayForm/DisplaySync）与服务端（display-actions）共用
export type DisplayPreferenceValues = {
  fontScale: number;
  spacingScale: number;
  density: Density;
  headerH: number | null;
  footerPy: number | null;
  waveIntensity: number | null;
  inkEnabled: boolean | null;
  reduceMotion: boolean | null;
  proseLeading: number | null;
  smoothScroll: boolean | null;
  readingProgress: boolean | null;
};

const LS_FONT_SCALE = "xr-font-scale";
const LS_DENSITY = "xr-density";
const LS_HEADER_H = "xr-header-h";
const LS_FOOTER_PY = "xr-footer-py";
const LS_SPACING = "xr-spacing";
const LS_SYNC = "xr-sync";
const LS_WAVE_INTENSITY = "xr-wave-intensity";
const LS_INK_ENABLED = "xr-ink-enabled";
const LS_PROSE_LEADING = "xr-prose-leading";
const LS_SMOOTH_SCROLL = "xr-smooth-scroll";
const LS_READING_PROGRESS = "xr-reading-progress";

function clampNum(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function readFontScale(): number {
  if (typeof window === "undefined") return FONT_SCALE_DEFAULT;
  const v = Number(localStorage.getItem(LS_FONT_SCALE));
  return v >= FONT_SCALE_MIN && v <= FONT_SCALE_MAX ? v : FONT_SCALE_DEFAULT;
}

export function readSpacingScale(): number {
  if (typeof window === "undefined") return SPACING_SCALE_DEFAULT;
  const v = Number(localStorage.getItem(LS_SPACING));
  return isSpacingScale(v) ? v : SPACING_SCALE_DEFAULT;
}

export function readDensity(): Density {
  if (typeof window === "undefined") return DENSITY_DEFAULT;
  const d = localStorage.getItem(LS_DENSITY);
  return d === "compact" || d === "comfortable" || d === "custom" ? d : DENSITY_DEFAULT;
}

export function readHeaderH(): number {
  if (typeof window === "undefined") return HEADER_H_DEFAULT;
  const v = Number(localStorage.getItem(LS_HEADER_H));
  return Number.isFinite(v) ? clampNum(v, HEADER_H_MIN, HEADER_H_MAX) : HEADER_H_DEFAULT;
}

export function readFooterPy(): number {
  if (typeof window === "undefined") return FOOTER_PY_DEFAULT;
  const v = Number(localStorage.getItem(LS_FOOTER_PY));
  return Number.isFinite(v) ? clampNum(v, FOOTER_PY_MIN, FOOTER_PY_MAX) : FOOTER_PY_DEFAULT;
}

export function isSyncEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_SYNC) === "1";
}

export function writeFontScale(scale: number): void {
  try {
    localStorage.setItem(LS_FONT_SCALE, String(scale));
  } catch {
    /* 忽略 */
  }
}

export function writeSpacingScale(scale: number): void {
  try {
    localStorage.setItem(LS_SPACING, String(scale));
  } catch {
    /* 忽略 */
  }
}

export function writeDensity(density: Density): void {
  try {
    localStorage.setItem(LS_DENSITY, density);
  } catch {
    /* 忽略 */
  }
}

export function writeHeaderH(px: number): void {
  try {
    localStorage.setItem(LS_HEADER_H, String(px));
  } catch {
    /* 忽略 */
  }
}

export function writeFooterPy(px: number): void {
  try {
    localStorage.setItem(LS_FOOTER_PY, String(px));
  } catch {
    /* 忽略 */
  }
}

export function readWaveIntensity(): number {
  if (typeof window === "undefined") return WAVE_INTENSITY_DEFAULT;
  const v = Number(localStorage.getItem(LS_WAVE_INTENSITY));
  return Number.isFinite(v) && v >= WAVE_INTENSITY_MIN && v <= WAVE_INTENSITY_MAX
    ? v
    : WAVE_INTENSITY_DEFAULT;
}

export function writeWaveIntensity(v: number): void {
  try {
    localStorage.setItem(LS_WAVE_INTENSITY, String(v));
  } catch {
    /* 忽略 */
  }
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--wave-intensity", String(v));
  }
}

export function readInkEnabled(): boolean {
  if (typeof window === "undefined") return INK_ENABLED_DEFAULT;
  return localStorage.getItem(LS_INK_ENABLED) !== "0";
}

export function writeInkEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(LS_INK_ENABLED, enabled ? "1" : "0");
  } catch {
    /* 忽略 */
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-ink", enabled ? "on" : "off");
  }
}

export function readProseLeading(): number {
  if (typeof window === "undefined") return PROSE_LEADING_DEFAULT;
  const v = Number(localStorage.getItem(LS_PROSE_LEADING));
  return isProseLeading(v) ? v : PROSE_LEADING_DEFAULT;
}

export function writeProseLeading(v: number): void {
  try {
    localStorage.setItem(LS_PROSE_LEADING, String(v));
  } catch {
    /* 忽略 */
  }
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--prose-leading", String(v));
  }
}

export function readSmoothScroll(): boolean {
  if (typeof window === "undefined") return SMOOTH_SCROLL_DEFAULT;
  return localStorage.getItem(LS_SMOOTH_SCROLL) !== "0";
}

export function writeSmoothScroll(enabled: boolean): void {
  try {
    localStorage.setItem(LS_SMOOTH_SCROLL, enabled ? "1" : "0");
  } catch {
    /* 忽略 */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DISPLAY_CHANGE_EVENT));
  }
}

export function readReadingProgress(): boolean {
  if (typeof window === "undefined") return READING_PROGRESS_DEFAULT;
  return localStorage.getItem(LS_READING_PROGRESS) !== "0";
}

export function writeReadingProgress(enabled: boolean): void {
  try {
    localStorage.setItem(LS_READING_PROGRESS, enabled ? "1" : "0");
  } catch {
    /* 忽略 */
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-reading-progress", enabled ? "on" : "off");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DISPLAY_CHANGE_EVENT));
  }
}

export function setSyncEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(LS_SYNC, "1");
    else localStorage.removeItem(LS_SYNC);
  } catch {
    /* 忽略 */
  }
}

// 立即应用到 <html>（无需刷新）
export function applyDisplay(
  fontScale: number,
  density: Density,
  headerH?: number,
  footerPy?: number,
  spacingScale?: number
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--font-scale", String(fontScale));
  root.style.setProperty("--spacing-scale", String(spacingScale ?? readSpacingScale()));
  if (density === "custom") {
    root.removeAttribute("data-density");
    root.style.setProperty("--header-h", `${headerH ?? readHeaderH()}px`);
    root.style.setProperty("--footer-py", `${footerPy ?? readFooterPy()}px`);
  } else {
    root.setAttribute("data-density", density);
    root.style.removeProperty("--header-h");
    root.style.removeProperty("--footer-py");
  }
}

// 预水合内联脚本（注入到 <head>，React 挂载前执行，避免 FOUC）
export const DISPLAY_PREHYDRATE_SCRIPT = `(function(){try{var s=localStorage.getItem("xr-font-scale"),sp=localStorage.getItem("xr-spacing"),d=localStorage.getItem("xr-density"),hh=localStorage.getItem("xr-header-h"),fp=localStorage.getItem("xr-footer-py"),wv=localStorage.getItem("xr-wave-intensity"),ink=localStorage.getItem("xr-ink-enabled"),pl=localStorage.getItem("xr-prose-leading"),rp=localStorage.getItem("xr-reading-progress"),h=document.documentElement;if(s)h.style.setProperty("--font-scale",s);if(sp)h.style.setProperty("--spacing-scale",sp);if(wv)h.style.setProperty("--wave-intensity",wv);if(pl)h.style.setProperty("--prose-leading",pl);if(ink==="0")h.setAttribute("data-ink","off");if(rp==="0")h.setAttribute("data-reading-progress","off");if(d==="custom"){if(hh)h.style.setProperty("--header-h",hh+"px");if(fp)h.style.setProperty("--footer-py",fp+"px");}else if(d){h.setAttribute("data-density",d);}}catch(e){}})();`;
