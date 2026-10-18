"use client";

// 归档页年份星图：年份按时间顺序布在椭圆环上，节点大小随当年文章数变化，
// 指针靠近时节点放大高亮，一颗时间游标沿环前进。
// 纯装饰（aria-hidden），页面下方仍有完整时间线，不承载信息职责。

import { readVar, type Rgb } from "@/lib/color";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useEffect, useRef } from "react";

/** 环半径占容器尺寸比例，另有像素上限，宽屏不铺满整块 */
const RADIUS_X_RATIO = 0.36;
const RADIUS_Y_RATIO = 0.33;
const RADIUS_X_MAX = 340;
const RADIUS_Y_MAX = 118;
/** 节点从正上方开始顺时针布点 */
const START_ANGLE = -Math.PI / 2;
/** 节点基础半径与按篇数增长系数（开方，避免大年份压垮小年份） */
const NODE_BASE = 2.6;
const NODE_GROWTH = 1.5;
/** 指针靠近时的放大倍率上限与影响半径 px */
const HOVER_GAIN = 0.45;
const HOVER_RADIUS = 96;
/** 指针视差最大旋转角 rad，跟随速率 1/s */
const PARALLAX = 0.16;
const PARALLAX_FOLLOW = 2.6;
/** 时间游标角速度 rad/s，尾迹段数与角度间隔 */
const CURSOR_SPEED = 0.22;
const CURSOR_TAIL = 14;
const CURSOR_TAIL_STEP = 0.035;
/** 节点呼吸浮动幅度 px */
const BOB_AMPLITUDE = 3;
/** 设备像素比上限 */
const MAX_DPR = 2;
/** 单帧最大步进秒数，切回标签页时防游标瞬移 */
const MAX_DT = 0.05;

export interface ArchiveOrbitYear {
  year: number;
  count: number;
}

interface Palette {
  accent: Rgb;
  ink: Rgb;
}

export function ArchiveOrbit({
  years,
  className,
}: {
  years: ArchiveOrbitYear[];
  className?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef<Palette>({
    accent: [15, 118, 110],
    ink: [28, 25, 23],
  });

  // 监听 dark class 而非用 resolvedTheme，后者在 system 模式首帧可能是 undefined
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => {
      const isDark = html.classList.contains("dark");
      paletteRef.current = {
        accent: readVar("--accent", isDark ? [45, 212, 191] : [15, 118, 110]),
        ink: readVar("--foreground", isDark ? [250, 250, 249] : [28, 25, 23]),
      };
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const host = canvas.parentElement;
    if (!host) return;

    // 取一次即可，draw 每帧调用，不能在里面读计算样式
    const fontFamily =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-space-grotesk")
        .trim() || "ui-sans-serif, system-ui, sans-serif";

    let width = 1;
    let height = 1;
    let centerX = 0;
    let centerY = 0;
    let radiusX = 1;
    let radiusY = 1;
    let rafId = 0;
    let last = 0;
    let elapsed = 0;
    // 时间游标当前角度，从最新年份处起步
    let cursorAngle = START_ANGLE;
    let pointerX = Number.NaN;
    let pointerY = Number.NaN;
    let targetSpin = 0;
    let spin = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      centerX = width / 2;
      centerY = height / 2;
      radiusX = Math.min(width * RADIUS_X_RATIO, RADIUS_X_MAX);
      radiusY = Math.min(height * RADIUS_Y_RATIO, RADIUS_Y_MAX);
    };

    // 第 index 个年份在环上的角度：按传入顺序（新→旧）从正上方顺时针铺开
    const angleAt = (index: number) =>
      START_ANGLE + (index / Math.max(1, years.length)) * Math.PI * 2;

    const radiusFor = (count: number) =>
      NODE_BASE + Math.sqrt(Math.max(0, count)) * NODE_GROWTH;

    const draw = () => {
      const palette = paletteRef.current;
      const rgba = (rgb: Rgb, alpha: number) =>
        `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

      ctx.clearRect(0, 0, width, height);

      // 环本身：细虚线，作为时间轨道的底
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(spin);
      ctx.setLineDash([2, 7]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(palette.ink, 0.16);
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      if (years.length === 0) return;

      // 节点坐标：环上位置 + 呼吸浮动 + 指针靠近程度
      const points = years.map((item, index) => {
        const angle = angleAt(index) + spin;
        const bob = reduceMotion
          ? 0
          : Math.sin(elapsed * 0.6 + index * 1.3) * BOB_AMPLITUDE;
        const px = centerX + Math.cos(angle) * radiusX;
        const py = centerY + Math.sin(angle) * radiusY + bob;
        const hovered = Number.isNaN(pointerX)
          ? 0
          : Math.max(
              0,
              1 - Math.hypot(pointerX - px, pointerY - py) / HOVER_RADIUS
            );
        return { item, px, py, hovered };
      });

      // 时间游标：尾迹由一组递减透明度的点串成，沿年份顺序前进
      if (!reduceMotion) {
        for (let tail = CURSOR_TAIL; tail >= 0; tail--) {
          const angle = cursorAngle - tail * CURSOR_TAIL_STEP;
          const t = 1 - tail / (CURSOR_TAIL + 1);
          const px = centerX + Math.cos(angle) * radiusX;
          const py = centerY + Math.sin(angle) * radiusY;
          ctx.beginPath();
          ctx.arc(px, py, 0.8 + t * 2.1, 0, Math.PI * 2);
          ctx.fillStyle = rgba(palette.accent, 0.06 + t * 0.5);
          ctx.fill();
        }
      }

      // 连接线：相邻年份之间的细线，串成一条时间环
      if (points.length > 1) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        for (let index = 0; index < points.length; index++) {
          const current = points[index];
          const next = points[(index + 1) % points.length];
          ctx.moveTo(current.px, current.py);
          ctx.lineTo(next.px, next.py);
        }
        ctx.strokeStyle = rgba(palette.ink, 0.14);
        ctx.stroke();
      }

      // 节点与年份标签
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      points.forEach(({ item, px, py, hovered }, index) => {
        const isNewest = index === 0;
        const radius = radiusFor(item.count) * (1 + hovered * HOVER_GAIN);
        // 最新年份保持一圈呼吸光晕，其余年份只在指针靠近时亮起
        const pulse = reduceMotion ? 0.5 : (Math.sin(elapsed * 1.6) + 1) / 2;
        const glow = isNewest ? 0.1 + pulse * 0.16 : hovered * 0.12;

        if (glow > 0.01) {
          ctx.beginPath();
          ctx.arc(px, py, radius + 9 + pulse * 4, 0, Math.PI * 2);
          ctx.fillStyle = rgba(palette.accent, glow);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = rgba(palette.accent, 0.55 + hovered * 0.4);
        ctx.fill();

        ctx.font = `${isNewest ? 600 : 500} 12px ${fontFamily}`;
        ctx.fillStyle = rgba(palette.ink, 0.55 + hovered * 0.4);
        ctx.fillText(String(item.year), px, py + radius + 15);
      });
    };

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 1 / 60;
      last = now;
      elapsed += dt;
      cursorAngle += CURSOR_SPEED * dt;
      // 指数平滑，与帧率解耦
      spin += (targetSpin - spin) * (1 - Math.exp(-dt * PARALLAX_FOLLOW));
      draw();
    };

    const start = () => {
      if (rafId || reduceMotion) return;
      last = 0;
      rafId = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      // 指针在环的哪一侧，环就朝哪一侧轻轻转一点
      targetSpin = ((pointerX - centerX) / Math.max(1, width)) * PARALLAX * 2;
    };

    // 只有真正离开窗口才复位，元素间移动时 pointerout 也会冒泡到 window
    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget !== null) return;
      pointerX = Number.NaN;
      pointerY = Number.NaN;
      targetSpin = 0;
    };

    resize();

    if (reduceMotion) {
      // 减少动效：只画一帧静态星图（游标停在起点，节点不浮动）
      draw();
      const resizeObserver = new ResizeObserver(() => {
        resize();
        draw();
      });
      resizeObserver.observe(host);
      return () => resizeObserver.disconnect();
    }

    // 离屏停帧，滚过去了就别烧 CPU
    const intersection = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
        else stop();
      },
      { rootMargin: "120px" }
    );
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (!rafId) draw();
    });
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    intersection.observe(host);
    resizeObserver.observe(host);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      intersection.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("visibilitychange", onVisibility);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [years, reduceMotion]);

  if (years.length === 0) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none relative h-44 w-full select-none sm:h-56${className ? ` ${className}` : ""}`}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
