"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { getDisplayPreferences } from "@/app/settings/display-actions";
import {
  applyDisplay,
  isSyncEnabled,
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
} from "@/lib/display";
import { setReducedMotion } from "@/lib/use-reduced-motion";

// 登录后若开启跨设备同步，从账号拉取显示偏好并应用（否则仅用本地 localStorage）
export function DisplaySync() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !isSyncEnabled()) return;
    let cancelled = false;
    getDisplayPreferences()
      .then((prefs) => {
        if (cancelled || !prefs) return;
      writeFontScale(prefs.fontScale);
      writeSpacingScale(prefs.spacingScale);
      writeDensity(prefs.density);
      if (prefs.headerH != null) writeHeaderH(prefs.headerH);
      if (prefs.footerPy != null) writeFooterPy(prefs.footerPy);
      if (prefs.waveIntensity != null) writeWaveIntensity(prefs.waveIntensity);
      if (prefs.inkEnabled != null) writeInkEnabled(prefs.inkEnabled);
      if (prefs.reduceMotion != null) setReducedMotion(prefs.reduceMotion);
      if (prefs.proseLeading != null) writeProseLeading(prefs.proseLeading);
      if (prefs.smoothScroll != null) writeSmoothScroll(prefs.smoothScroll);
      if (prefs.readingProgress != null) writeReadingProgress(prefs.readingProgress);
      applyDisplay(
        prefs.fontScale,
        prefs.density,
        prefs.headerH ?? undefined,
        prefs.footerPy ?? undefined,
        prefs.spacingScale
      );
      })
      // 拉取失败时静默回退到本地偏好。
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
