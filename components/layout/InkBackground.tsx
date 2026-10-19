"use client";

// 全站水墨背景：鼠标划过拖出墨迹，随流场晕开后淡去；点击是点墨

import { InkFluid, INK_MAX_DENSITY } from "@/lib/ink-fluid";
import { readVar, type Rgb } from "@/lib/color";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useEffect, useRef, useState } from "react";

/** 网格单元边长，越小越细腻但开销越大 */
const CELL_SIZE = 12;
/** 离屏放大倍率，先按 2 倍采样再拉伸 */
const RENDER_SCALE = 2;
/** 设备像素比上限，墨迹本身是柔化的，无需高分屏全量渲染 */
const MAX_DPR = 1.5;
/** 笔触半径，单位是格，乘以 CELL_SIZE 得像素大小 */
const SPLAT_RADIUS = 1.5;
const FORCE_SCALE = 0.3;
/** 速度上限，单位是格每秒，防止数值爆炸 */
const MAX_SPEED = 75;
const INK_STRENGTH = 0.7;
/** 环境流强度，过大会把墨摊开、扩大屏幕占比 */
const AMBIENT_STRENGTH = 0.9;
const IDLE_MS = 4000;
/** 墨迹淡尽阈值，必须按峰值判断，用平均值会在墨迹仍可见时提前停止 */
const INK_EPS = 3;

/** 墨量到不透明度的查找表，指数控制非线性映射：越大则中心越实、边缘越淡 */
const LUT_SIZE = 512;
const LUT_SCALE = (LUT_SIZE - 1) / INK_MAX_DENSITY;
const ALPHA_LUT = new Float32Array(LUT_SIZE);
for (let i = 0; i < LUT_SIZE; i++) {
  const d = (i / (LUT_SIZE - 1)) * INK_MAX_DENSITY;
  ALPHA_LUT[i] = 1 - Math.exp(-d * 4.0);
}

interface Palette {
  rgb: Rgb;
  /** 最浓处的不透明度 */
  peak: number;
}

export function InkBackground() {
  const reduceMotion = usePrefersReducedMotion();
  const [enabled, setEnabled] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef<Palette>({ rgb: [28, 25, 23], peak: 0.42 });
  const reduceMotionRef = useRef(false);

  // 墨迹开关：读 <html data-ink>，设置页可关。默认开。
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setEnabled(html.getAttribute("data-ink") !== "off");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(html, { attributes: true, attributeFilter: ["data-ink"] });
    return () => obs.disconnect();
  }, []);

  // 用 ref 传值而非 effect 依赖，避免偏好变化时重建 fluid 把已有墨迹清空
  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  useEffect(() => {
    // 监听 dark class 而非用 resolvedTheme，后者在 system 模式首帧可能是 undefined
    const html = document.documentElement;
    function sync() {
      const isDark = html.classList.contains("dark");
      // 亮暗都取 --foreground 即可自动反色
      paletteRef.current = {
        rgb: readVar("--foreground", isDark ? [250, 250, 249] : [28, 25, 23]),
        peak: isDark ? 0.3 : 0.42,
      };
    }
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let fluid: InkFluid | null = null;
    let offCanvas: HTMLCanvasElement | null = null;
    let offCtx: CanvasRenderingContext2D | null = null;
    let imageData: ImageData | null = null;
    let cellW = CELL_SIZE;
    let cellH = CELL_SIZE;
    let rafId = 0;
    let running = false;
    let prevTime = 0;
    let lastSplatTime = 0;
    let lastX = 0;
    let lastY = 0;
    let lastMoveTime = 0;
    let hasLast = false;
    let resizeTimer: number | undefined;

    // 开场先落一笔墨；否则页面初始为空白，移动端没有鼠标更看不到效果。
    function seedInk() {
      const f = fluid;
      if (!f) return;
      const drops = [
        { x: 0.24, y: 0.28, r: 2.6, ink: 0.6, vx: 9, vy: 5 },
        { x: 0.68, y: 0.2, r: 2.1, ink: 0.45, vx: -7, vy: 6 },
        { x: 0.8, y: 0.62, r: 3, ink: 0.55, vx: -6, vy: -5 },
        { x: 0.38, y: 0.74, r: 1.9, ink: 0.4, vx: 5, vy: -9 },
      ];
      for (const d of drops) {
        const jx = (Math.random() - 0.5) * 0.08;
        const jy = (Math.random() - 0.5) * 0.08;
        f.splat((d.x + jx) * f.width, (d.y + jy) * f.height, d.r, d.vx, d.vy, d.ink);
      }
      lastSplatTime = performance.now();
    }

    // 改用箭头常量：function 声明会被提升，闭包内丢失 canvas/ctx 的 null 收窄
    const setup = () => {
      const vw = Math.max(1, window.innerWidth);
      const vh = Math.max(1, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.round(vw * dpr));
      canvas.height = Math.max(1, Math.round(vh * dpr));

      const f = new InkFluid(vw, vh, CELL_SIZE);
      cellW = vw / f.width;
      cellH = vh / f.height;

      const oc = document.createElement("canvas");
      oc.width = f.width * RENDER_SCALE;
      oc.height = f.height * RENDER_SCALE;
      const octx = oc.getContext("2d");
      if (!octx) {
        fluid = null;
        return;
      }
      fluid = f;
      offCanvas = oc;
      offCtx = octx;
      imageData = octx.createImageData(oc.width, oc.height);
      seedInk();
    }

    // 返回峰值 alpha 供判断是否淡尽
    const renderInk = (): number => {
      const f = fluid;
      const oc = offCanvas;
      const octx = offCtx;
      const img = imageData;
      if (!f || !oc || !octx || !img) return 0;

      const dens = f.density;
      const stride = f.stride;
      const rw = oc.width;
      const rh = oc.height;
      const data = img.data;
      const palette = paletteRef.current;
      const [r, g, b] = palette.rgb;
      const peak = palette.peak * 255;
      let maxAlpha = 0;

      for (let py = 0; py < rh; py++) {
        const gy = (py + 0.5) / RENDER_SCALE + 0.5;
        const j0 = gy | 0;
        const ty = gy - j0;
        const rowA = j0 * stride;
        const rowB = rowA + stride;
        for (let px = 0; px < rw; px++) {
          const gx = (px + 0.5) / RENDER_SCALE + 0.5;
          const i0 = gx | 0;
          const tx = gx - i0;
          const a = i0 + rowA;
          const c = i0 + rowB;
          const d =
            (dens[a] + (dens[a + 1] - dens[a]) * tx) * (1 - ty) +
            (dens[c] + (dens[c + 1] - dens[c]) * tx) * ty;
          let lut = d > 0 ? d * LUT_SCALE : 0;
          if (lut > LUT_SIZE - 1) lut = LUT_SIZE - 1;
          const li = lut < LUT_SIZE - 1 ? lut | 0 : LUT_SIZE - 2;
          const alpha =
            (ALPHA_LUT[li] + (ALPHA_LUT[li + 1] - ALPHA_LUT[li]) * (lut - li)) * peak;
          const o = (py * rw + px) << 2;
          data[o] = r;
          data[o + 1] = g;
          data[o + 2] = b;
          data[o + 3] = alpha;
          if (alpha > maxAlpha) maxAlpha = alpha;
        }
      }
      octx.putImageData(img, 0, 0);

      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // 三层叠加：外层放大、低透明形成边缘扩散；内层次之；原尺寸层保持笔触形状
      const padSoft = Math.round(cw * 0.012);
      ctx.globalAlpha = 0.18;
      ctx.drawImage(oc, -padSoft, -padSoft, cw + padSoft * 2, ch + padSoft * 2);
      const pad = Math.round(cw * 0.006);
      ctx.globalAlpha = 0.3;
      ctx.drawImage(oc, -pad, -pad, cw + pad * 2, ch + pad * 2);
      ctx.globalAlpha = 1;
      ctx.drawImage(oc, 0, 0, cw, ch);

      return maxAlpha;
    }

    function frame(now: number) {
      const f = fluid;
      if (!f) {
        running = false;
        return;
      }
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(0.033, Math.max(0.001, (now - prevTime) / 1000));
      prevTime = now;
      // 减少动效时只关环境流，出墨与淡出照常
      f.addAmbientFlow(now / 1000, dt, reduceMotionRef.current ? 0 : AMBIENT_STRENGTH);
      f.step(dt);
      const peakAlpha = renderInk();
      if (now - lastSplatTime > IDLE_MS && peakAlpha < INK_EPS) stop();
    }

    function start() {
      if (running) return;
      running = true;
      prevTime = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    // 不 clear；stop 只在墨迹淡到不可见时触发，避免抹掉仍可见的墨迹。
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    function onPointerMove(e: PointerEvent) {
      const f = fluid;
      if (!f) return;
      const now = performance.now();
      lastSplatTime = now;
      start();
      if (!hasLast) {
        lastX = e.clientX;
        lastY = e.clientY;
        lastMoveTime = now;
        hasLast = true;
        return;
      }
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) return;

      const dt = Math.max(8, now - lastMoveTime) / 1000;
      let vx = dx / cellW / dt;
      let vy = dy / cellH / dt;
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_SPEED) {
        const k = MAX_SPEED / speed;
        vx *= k;
        vy *= k;
      }

      // 沿轨迹补点，快速划动也不断墨
      const stepPx = SPLAT_RADIUS * 0.5 * cellW;
      const steps = Math.min(16, Math.max(1, Math.ceil(dist / stepPx)));
      // 位移越小出墨越少，避免静置出墨；系数控制低速灵敏度
      const ink = INK_STRENGTH * Math.min(1, dist / 3);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const cx = lastX + dx * t;
        const cy = lastY + dy * t;
        f.splat(
          cx / cellW + 0.5,
          cy / cellH + 0.5,
          SPLAT_RADIUS,
          vx * FORCE_SCALE,
          vy * FORCE_SCALE,
          ink
        );
      }
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveTime = now;
    }

    function onPointerDown(e: PointerEvent) {
      const f = fluid;
      if (!f) return;
      f.splat(
        e.clientX / cellW + 0.5,
        e.clientY / cellH + 0.5,
        SPLAT_RADIUS * 1.8,
        0,
        0,
        INK_STRENGTH * 1.6
      );
      lastSplatTime = performance.now();
      hasLast = false;
      start();
    }

    // 只有真正离开窗口才断开，元素间移动时 pointerout 也会冒泡到 window
    function onPointerOut(e: PointerEvent) {
      if (e.relatedTarget === null) hasLast = false;
    }

    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setup, 200);
    }

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        running = false;
      } else if (performance.now() - lastSplatTime < IDLE_MS) {
        start();
      }
    }

    setup();
    start();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(resizeTimer);
      cancelAnimationFrame(rafId);
      running = false;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
