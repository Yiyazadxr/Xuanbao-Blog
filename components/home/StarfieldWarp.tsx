"use client";

// 首页 Hero 星轨：粒子沿景深方向由远及近掠过，弦长随速度拉伸。
// 尾迹用 destination-out 淡出，画布保持透明，可叠在任意主题底色上。

import { mixRgb, readVar, type Rgb } from "@/lib/color";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useEffect, useRef } from "react";

/** 粒子数上限，大屏也不会拖慢主线程 */
const MAX_PARTICLES = 220;
const MIN_PARTICLES = 60;
/** 每多少平方像素放一个粒子，小屏自动取到下限 */
const AREA_PER_PARTICLE = 5200;
/** 焦距：越小冲刺感越强 */
const FOV = 300;
/** 出生景深，z 递减到 0 即到达镜头 */
const Z_FAR = 1000;
/** 贴近镜头后的淡出区间，避免粒子"撞屏"生硬消失 */
const Z_NEAR_FADE = 100;
/** 基础速度 z/秒，实际再乘 1~3 的随机倍率 */
const SPEED_BASE = 66;
/** 尾迹淡出强度，越大尾迹越短、线条越锐 */
const TRAIL_FADE = 0.45;
/** 设备像素比上限 */
const MAX_DPR = 2;
/** 整体不透明度倍率，保持背景属性，不抢正文 */
const GLOBAL_ALPHA = 0.8;
/** 指针视差最大位移 px */
const PARALLAX = 22;
/** 视差跟随速率 1/s，与帧率解耦 */
const PARALLAX_FOLLOW = 3;
/** 单帧最大步进秒数，切回标签页时防粒子瞬移 */
const MAX_DT = 0.05;
/** 深浅色下各自的高光强度：暗色底更显眼，亮色底压淡 */
const PEAK_ALPHA_DARK = 0.9;
const PEAK_ALPHA_LIGHT = 0.55;

interface Particle {
  /** 出生平面上的坐标，投影时按景深缩放 */
  x: number;
  y: number;
  z: number;
  /** z/秒 */
  speed: number;
  /** 弦长倍率，越大拖尾越长 */
  length: number;
  /** 0 主色 / 1 衍生色 */
  tone: number;
}

interface Palette {
  primary: Rgb;
  secondary: Rgb;
  peak: number;
}

export function StarfieldWarp({ className }: { className?: string }) {
  const reduceMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef<Palette>({
    primary: [15, 118, 110],
    secondary: [28, 25, 23],
    peak: PEAK_ALPHA_LIGHT,
  });

  // 监听 dark class 而非用 resolvedTheme，后者在 system 模式首帧可能是 undefined
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => {
      const isDark = html.classList.contains("dark");
      const accent = readVar("--accent", isDark ? [45, 212, 191] : [15, 118, 110]);
      const foreground = readVar(
        "--foreground",
        isDark ? [250, 250, 249] : [28, 25, 23]
      );
      paletteRef.current = {
        primary: accent,
        // 衍生色向文本色靠拢：亮色底偏深、暗色底偏亮，两个主题都有层次
        secondary: mixRgb(accent, foreground, 0.45),
        peak: isDark ? PEAK_ALPHA_DARK : PEAK_ALPHA_LIGHT,
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

    const particles: Particle[] = [];
    let width = 1;
    let height = 1;
    let originX = 0;
    let originY = 0;
    let rafId = 0;
    let last = 0;
    let pointerX = 0;
    let pointerY = 0;
    let parallaxX = 0;
    let parallaxY = 0;

    const spawn = (particle: Particle) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * width * 0.55;
      particle.x = Math.cos(angle) * radius;
      particle.y = Math.sin(angle) * radius;
      particle.z = Z_FAR;
      particle.speed = (1 + Math.random() * 2) * SPEED_BASE;
      particle.length = 0.5 + Math.random() * 2;
      particle.tone = Math.random() > 0.5 ? 0 : 1;
    };

    // 用箭头常量而非 function 声明：后者会被提升，闭包内丢失 canvas/ctx/host 的 null 收窄
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 出发点略低于正中，星轨向上铺满标题区
      originX = width / 2;
      originY = height * 0.66;

      const target = Math.min(
        MAX_PARTICLES,
        Math.max(MIN_PARTICLES, Math.round((width * height) / AREA_PER_PARTICLE))
      );
      while (particles.length < target) {
        const particle: Particle = { x: 0, y: 0, z: 0, speed: 0, length: 1, tone: 0 };
        spawn(particle);
        particles.push(particle);
      }
      particles.length = target;
      ctx.clearRect(0, 0, width, height);
    };

    const draw = () => {
      // 透明画布上的尾迹：只擦掉一部分既有像素，而不是铺底色
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_FADE})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      const palette = paletteRef.current;
      const peak = palette.peak * GLOBAL_ALPHA;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";

      for (const particle of particles) {
        const z = particle.z;
        const scale = FOV / z;
        const px = originX + particle.x * scale + parallaxX;
        const py = originY + particle.y * scale + parallaxY;

        // 弦尾画在更远处：z 更大 → 缩放更小 → 线条朝外
        const prevZ = z + particle.speed * particle.length;
        const prevScale = FOV / prevZ;
        const prevPx = originX + particle.x * prevScale + parallaxX;
        const prevPy = originY + particle.y * prevScale + parallaxY;

        // 远端渐显、近端渐隐，两端都不留突兀切口
        const depth = 1 - z / Z_FAR;
        const opacity = (z < Z_NEAR_FADE ? z / Z_NEAR_FADE : depth) * peak;
        if (opacity <= 0.004) continue;

        const [r, g, b] = particle.tone === 0 ? palette.primary : palette.secondary;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.lineWidth = Math.max(0.25, depth * 0.4);
        ctx.beginPath();
        ctx.moveTo(prevPx, prevPy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    };

    const step = (dt: number) => {
      for (const particle of particles) {
        particle.z -= particle.speed * dt;
        if (particle.z <= 0) spawn(particle);
      }
    };

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 1 / 60;
      last = now;
      // 指数平滑，与帧率解耦
      const k = 1 - Math.exp(-dt * PARALLAX_FOLLOW);
      parallaxX += (pointerX - parallaxX) * k;
      parallaxY += (pointerY - parallaxY) * k;
      step(dt);
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
      pointerX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * PARALLAX;
      pointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * PARALLAX;
    };

    // 铺开景深：刚出生的粒子 z 都在最远处、透明度为 0，
    // 不铺开的话开场一两秒（以及减少动效时的静态帧）画面都是空的。
    const scatter = () => {
      for (const particle of particles) {
        particle.z = Z_FAR * (0.05 + Math.random() * 0.9);
      }
    };

    resize();

    if (reduceMotion) {
      // 减少动效：只画一帧静态星轨，不做往返动画
      scatter();
      draw();
      const resizeObserver = new ResizeObserver(() => {
        resize();
        scatter();
        draw();
      });
      resizeObserver.observe(host);
      return () => resizeObserver.disconnect();
    }

    scatter();

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
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      intersection.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [reduceMotion]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none${className ? ` ${className}` : ""}`}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
