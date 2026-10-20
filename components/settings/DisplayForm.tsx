"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearDisplayPreferences,
  getDisplayPreferences,
  saveDisplayPreferences,
} from "@/app/settings/display-actions";
import {
  applyDisplay,
  DENSITY_DEFAULT,
  DENSITY_OPTIONS,
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  FOOTER_PY_DEFAULT,
  FOOTER_PY_MAX,
  FOOTER_PY_MIN,
  HEADER_H_DEFAULT,
  HEADER_H_MAX,
  HEADER_H_MIN,
  INK_ENABLED_DEFAULT,
  isSyncEnabled,
  PROSE_LEADING_DEFAULT,
  PROSE_LEADING_MAX,
  PROSE_LEADING_MIN,
  PROSE_LEADING_STEP,
  READING_PROGRESS_DEFAULT,
  readDensity,
  readFooterPy,
  readFontScale,
  readHeaderH,
  readInkEnabled,
  readProseLeading,
  readReadingProgress,
  readSmoothScroll,
  readSpacingScale,
  readWaveIntensity,
  SMOOTH_SCROLL_DEFAULT,
  setSyncEnabled,
  SPACING_SCALE_DEFAULT,
  SPACING_SCALE_MAX,
  SPACING_SCALE_MIN,
  SPACING_SCALE_STEP,
  WAVE_INTENSITY_DEFAULT,
  WAVE_INTENSITY_MAX,
  WAVE_INTENSITY_MIN,
  WAVE_INTENSITY_STEP,
  writeDensity,
  writeFontScale,
  writeFooterPy,
  writeHeaderH,
  writeInkEnabled,
  writeProseLeading,
  writeReadingProgress,
  writeSmoothScroll,
  writeSpacingScale,
  writeWaveIntensity,
  type Density,
  type DisplayPreferenceValues,
} from "@/lib/display";
import { setReducedMotion, usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { successCls } from "@/components/ui/form-styles";

const rangeCls =
  "mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-foreground/10 accent-[var(--accent)]";

// 显示设置：字体缩放 + 页面间距 + 界面密度（含自定义导航栏/页脚）+ 跨设备同步
export function DisplayForm() {
  // SSR 与水合统一使用默认值；本地偏好在挂载后异步恢复，避免渲染期读取
  // localStorage 造成 hydration mismatch（视觉偏好已由预水合脚本提前应用）。
  const [fontScale, setFontScale] = useState(FONT_SCALE_DEFAULT);
  const [spacingScale, setSpacingScale] = useState(SPACING_SCALE_DEFAULT);
  const [density, setDensity] = useState<Density>(DENSITY_DEFAULT);
  const [headerH, setHeaderH] = useState(HEADER_H_DEFAULT);
  const [footerPy, setFooterPy] = useState(FOOTER_PY_DEFAULT);
  const [sync, setSync] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [msg, setMsg] = useState("");
  const [waveIntensity, setWaveIntensity] = useState(WAVE_INTENSITY_DEFAULT);
  const [inkEnabled, setInkEnabled] = useState(INK_ENABLED_DEFAULT);
  const [proseLeading, setProseLeading] = useState(PROSE_LEADING_DEFAULT);
  const [smoothScroll, setSmoothScroll] = useState(SMOOTH_SCROLL_DEFAULT);
  const [readingProgress, setReadingProgress] = useState(READING_PROGRESS_DEFAULT);
  const reduceMotion = usePrefersReducedMotion();
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清掉未触发的防抖保存，避免在已卸载组件上更新状态
  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  // localStorage 是外部系统：挂载后经微任务恢复本地偏好，effect 体内不同步 setState。
  useEffect(() => {
    Promise.resolve().then(() => {
      setFontScale(readFontScale());
      setSpacingScale(readSpacingScale());
      setDensity(readDensity());
      setHeaderH(readHeaderH());
      setFooterPy(readFooterPy());
      setWaveIntensity(readWaveIntensity());
      setInkEnabled(readInkEnabled());
      setProseLeading(readProseLeading());
      setSmoothScroll(readSmoothScroll());
      setReadingProgress(readReadingProgress());
      setSync(isSyncEnabled());
    });
  }, []);

  // 防抖后同步到账号：拖动滑块不触发请求风暴，失败时提示而非静默丢弃
  function persist(v: DisplayPreferenceValues) {
    if (!sync) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void saveDisplayPreferences(v).then((res) => {
        if (!res.ok) setMsg(res.error ?? "同步失败");
      });
    }, 500);
  }

  // 以当前状态为基础构造待保存偏好，调用方覆盖变更的字段
  function basePrefs(): DisplayPreferenceValues {
    return {
      fontScale,
      spacingScale,
      density,
      headerH: density === "custom" ? headerH : null,
      footerPy: density === "custom" ? footerPy : null,
      waveIntensity,
      inkEnabled,
      reduceMotion,
      proseLeading,
      smoothScroll,
      readingProgress,
    };
  }

  function changeFontScale(v: number) {
    setFontScale(v);
    writeFontScale(v);
    applyDisplay(v, density, headerH, footerPy, spacingScale);
    persist({ ...basePrefs(), fontScale: v });
  }

  function changeSpacingScale(v: number) {
    setSpacingScale(v);
    writeSpacingScale(v);
    applyDisplay(fontScale, density, headerH, footerPy, v);
    persist({ ...basePrefs(), spacingScale: v });
  }

  function changeDensity(d: Density) {
    setDensity(d);
    writeDensity(d);
    applyDisplay(fontScale, d, headerH, footerPy, spacingScale);
    persist({ ...basePrefs(), density: d });
  }

  function changeHeaderH(px: number) {
    setHeaderH(px);
    writeHeaderH(px);
    applyDisplay(fontScale, density, px, footerPy, spacingScale);
    persist({ ...basePrefs(), headerH: px });
  }

  function changeFooterPy(px: number) {
    setFooterPy(px);
    writeFooterPy(px);
    applyDisplay(fontScale, density, headerH, px, spacingScale);
    persist({ ...basePrefs(), footerPy: px });
  }

  function changeWaveIntensity(v: number) {
    setWaveIntensity(v);
    writeWaveIntensity(v);
    persist({ ...basePrefs(), waveIntensity: v });
  }

  function changeInkEnabled(enabled: boolean) {
    setInkEnabled(enabled);
    writeInkEnabled(enabled);
    persist({ ...basePrefs(), inkEnabled: enabled });
  }

  function changeProseLeading(v: number) {
    setProseLeading(v);
    writeProseLeading(v);
    persist({ ...basePrefs(), proseLeading: v });
  }

  function changeSmoothScroll(enabled: boolean) {
    setSmoothScroll(enabled);
    writeSmoothScroll(enabled);
    persist({ ...basePrefs(), smoothScroll: enabled });
  }

  function changeReadingProgress(enabled: boolean) {
    setReadingProgress(enabled);
    writeReadingProgress(enabled);
    persist({ ...basePrefs(), readingProgress: enabled });
  }

  function changeReduceMotion(enabled: boolean) {
    setReducedMotion(enabled);
    persist({ ...basePrefs(), reduceMotion: enabled });
  }

  async function toggleSync(enabled: boolean) {
    setSync(enabled);
    setSyncEnabled(enabled);
    setMsg("");
    setSyncPending(true);
    try {
      if (!enabled) {
        await clearDisplayPreferences();
        setMsg("已关闭跨设备同步，偏好仅保存在本机");
        return;
      }
      const prefs = await getDisplayPreferences();
      const finalScale = prefs?.fontScale ?? fontScale;
      const finalSpacing = prefs?.spacingScale ?? spacingScale;
      const finalDensity = prefs?.density ?? density;
      const finalH = prefs?.headerH ?? headerH;
      const finalFp = prefs?.footerPy ?? footerPy;
      const finalWave = prefs?.waveIntensity ?? waveIntensity;
      const finalInk = prefs?.inkEnabled ?? inkEnabled;
      const finalMotion = prefs?.reduceMotion ?? reduceMotion;
      const finalLeading = prefs?.proseLeading ?? proseLeading;
      const finalSmooth = prefs?.smoothScroll ?? smoothScroll;
      const finalProgress = prefs?.readingProgress ?? readingProgress;
      setFontScale(finalScale);
      setSpacingScale(finalSpacing);
      setDensity(finalDensity);
      setHeaderH(finalH);
      setFooterPy(finalFp);
      setWaveIntensity(finalWave);
      setInkEnabled(finalInk);
      setProseLeading(finalLeading);
      setSmoothScroll(finalSmooth);
      setReadingProgress(finalProgress);
      setReducedMotion(finalMotion);
      writeFontScale(finalScale);
      writeSpacingScale(finalSpacing);
      writeDensity(finalDensity);
      writeHeaderH(finalH);
      writeFooterPy(finalFp);
      writeWaveIntensity(finalWave);
      writeInkEnabled(finalInk);
      writeProseLeading(finalLeading);
      writeSmoothScroll(finalSmooth);
      writeReadingProgress(finalProgress);
      applyDisplay(finalScale, finalDensity, finalH, finalFp, finalSpacing);
      await saveDisplayPreferences({
        fontScale: finalScale,
        spacingScale: finalSpacing,
        density: finalDensity,
        headerH: finalDensity === "custom" ? finalH : null,
        footerPy: finalDensity === "custom" ? finalFp : null,
        waveIntensity: finalWave,
        inkEnabled: finalInk,
        reduceMotion: finalMotion,
        proseLeading: finalLeading,
        smoothScroll: finalSmooth,
        readingProgress: finalProgress,
      });
      setMsg("已开启跨设备同步，换设备登录后会拉取偏好");
    } catch {
      // 同步失败时回滚开关状态，避免界面显示「已开启」但账号端没有偏好。
      setSync(false);
      setSyncEnabled(false);
      setMsg("同步失败，请稍后重试");
    } finally {
      setSyncPending(false);
    }
  }

  const percent = Math.round(fontScale * 100);
  const spPercent = Math.round(spacingScale * 100);

  return (
    <div className="space-y-6">
      {/* 字体大小 */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="font-scale" className="text-sm font-medium">字体大小</label>
          <span className="text-sm tabular-nums text-muted">{percent}%</span>
        </div>
        <input
          id="font-scale"
          type="range"
          min={FONT_SCALE_MIN}
          max={FONT_SCALE_MAX}
          step={FONT_SCALE_STEP}
          value={fontScale}
          onChange={(e) => changeFontScale(Number(e.target.value))}
          className={rangeCls}
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>80%</span>
          <span>100%</span>
          <span>120%</span>
        </div>
      </div>

      {/* 页面间距 */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="spacing-scale" className="text-sm font-medium">页面间距</label>
          <span className="text-sm tabular-nums text-muted">{spPercent}%</span>
        </div>
        <input
          id="spacing-scale"
          type="range"
          min={SPACING_SCALE_MIN}
          max={SPACING_SCALE_MAX}
          step={SPACING_SCALE_STEP}
          value={spacingScale}
          onChange={(e) => changeSpacingScale(Number(e.target.value))}
          className={rangeCls}
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>80%</span>
          <span>100%</span>
          <span>120%</span>
        </div>
      </div>

      {/* 正文行距 */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="prose-leading" className="text-sm font-medium">正文行距</label>
          <span className="text-sm tabular-nums text-muted">{proseLeading.toFixed(2)}×</span>
        </div>
        <input
          id="prose-leading"
          type="range"
          min={PROSE_LEADING_MIN}
          max={PROSE_LEADING_MAX}
          step={PROSE_LEADING_STEP}
          value={proseLeading}
          onChange={(e) => changeProseLeading(Number(e.target.value))}
          className={rangeCls}
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>1.50×</span>
          <span>1.75×</span>
          <span>2.20×</span>
        </div>
      </div>

      {/* 界面密度 */}
      <div>
        <span className="text-sm font-medium">界面密度</span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DENSITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => changeDensity(o.value)}
              aria-pressed={density === o.value}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                density === o.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          {DENSITY_OPTIONS.find((o) => o.value === density)?.desc}
        </p>
      </div>

      {/* 自定义：导航栏高度 + 页脚间距 */}
      {density === "custom" && (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="header-h" className="text-sm font-medium">导航栏高度</label>
              <span className="text-sm tabular-nums text-muted">{headerH}px</span>
            </div>
            <input
              id="header-h"
              type="range"
              min={HEADER_H_MIN}
              max={HEADER_H_MAX}
              step={2}
              value={headerH}
              onChange={(e) => changeHeaderH(Number(e.target.value))}
              className={rangeCls}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="footer-py" className="text-sm font-medium">页脚间距</label>
              <span className="text-sm tabular-nums text-muted">{footerPy}px</span>
            </div>
            <input
              id="footer-py"
              type="range"
              min={FOOTER_PY_MIN}
              max={FOOTER_PY_MAX}
              step={2}
              value={footerPy}
              onChange={(e) => changeFooterPy(Number(e.target.value))}
              className={rangeCls}
            />
          </div>
        </div>
      )}

      {/* 远山水墨强度 */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="wave-intensity" className="text-sm font-medium">远山水墨强度</label>
          <span className="text-sm tabular-nums text-muted">{Math.round(waveIntensity * 100)}%</span>
        </div>
        <input
          id="wave-intensity"
          type="range"
          min={WAVE_INTENSITY_MIN}
          max={WAVE_INTENSITY_MAX}
          step={WAVE_INTENSITY_STEP}
          value={waveIntensity}
          onChange={(e) => changeWaveIntensity(Number(e.target.value))}
          className={rangeCls}
        />
        <p className="mt-1 text-xs text-muted">调节页面底部远山水墨装饰的浓淡</p>
      </div>

      {/* 水墨墨迹开关 */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">水墨墨迹</span>
          <span className="mt-0.5 block text-xs text-muted">
            鼠标划过时拖出水墨晕染特效
          </span>
        </span>
        <input
          type="checkbox"
          checked={inkEnabled}
          onChange={(e) => changeInkEnabled(e.target.checked)}
          className="size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
          role="switch"
        />
      </label>

      {/* 减少动效开关 */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">减少动效</span>
          <span className="mt-0.5 block text-xs text-muted">
            关闭全站入场与滚动动画，减少视觉刺激
          </span>
          <span className="mt-1 block text-xs text-muted">
            系统已开启「减少动效」时，此项自动开启且无法关闭。
          </span>
        </span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={(e) => changeReduceMotion(e.target.checked)}
          className="size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
          role="switch"
        />
      </label>

      {/* 平滑滚动开关 */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">平滑滚动</span>
          <span className="mt-0.5 block text-xs text-muted">
            惯性滚动让页面滑动更顺滑，关闭后使用系统原生滚动
          </span>
        </span>
        <input
          type="checkbox"
          checked={smoothScroll}
          onChange={(e) => changeSmoothScroll(e.target.checked)}
          className="size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
          role="switch"
        />
      </label>

      {/* 阅读进度条开关 */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">阅读进度条</span>
          <span className="mt-0.5 block text-xs text-muted">
            文章页顶部随滚动填充的进度条
          </span>
        </span>
        <input
          type="checkbox"
          checked={readingProgress}
          onChange={(e) => changeReadingProgress(e.target.checked)}
          className="size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
          role="switch"
        />
      </label>

      {/* 跨设备同步 */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">跨设备同步</span>
          <span className="mt-0.5 block text-xs text-muted">
            开启后偏好保存到账号，换设备登录会自动同步
          </span>
        </span>
        <input
          type="checkbox"
          checked={sync}
          disabled={syncPending}
          onChange={(e) => toggleSync(e.target.checked)}
          className="size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
          role="switch"
        />
      </label>

      {msg && <p className={successCls}>{msg}</p>}
    </div>
  );
}
