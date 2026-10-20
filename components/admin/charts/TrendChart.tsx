"use client";

import { useId, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { TREND_SERIES, type TrendSeriesKey } from "@/lib/chart";
import type { TrendPoint } from "@/lib/stats";
import { formatCount } from "@/lib/utils";

// SVG 横向缩放；线宽用 non-scaling-stroke，文字和圆点由 HTML 覆盖层保持比例。
const VIEW_W = 1000;
const VIEW_H = 300;
const PAD_T = 16;
const PAD_B = 10;
const PLOT_H = VIEW_H - PAD_T - PAD_B;

// 步长归并到 1/2/5×10^n，确保四个刻度均为整数。
function niceScale(peak: number): { max: number; ticks: number[] } {
  if (peak <= 0) return { max: 3, ticks: [0, 1, 2, 3] };
  const raw = peak / 3;
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  const n = raw / base;
  const unit = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  const step = Math.max(1, Math.round(unit * base));
  return { max: step * 3, ticks: [0, step, step * 2, step * 3] };
}

// Catmull-Rom 转三次贝塞尔；张力 0.2，过大会过冲。
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const first = points[0];
  if (points.length === 1) return `M${first.x},${first.y}`;

  let d = `M${first.x},${first.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) * 0.2;
    const c1y = p1.y + (p2.y - p0.y) * 0.2;
    const c2x = p2.x - (p3.x - p1.x) * 0.2;
    const c2y = p2.y - (p3.y - p1.y) * 0.2;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

// 直接解析日键，避免 Date 的时区差异。
function dayLabel(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

// X 轴显示首尾和两个三等分点。
function xTickIndexes(count: number): number[] {
  if (count <= 0) return [];
  if (count <= 5) return Array.from({ length: count }, (_, i) => i);
  const last = count - 1;
  return [...new Set([0, Math.round(last / 3), Math.round((last * 2) / 3), last])];
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [hidden, setHidden] = useState<readonly TrendSeriesKey[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const visible = TREND_SERIES.filter((s) => !hidden.includes(s.key));
  const peak = data.reduce(
    (max, d) => visible.reduce((m, s) => Math.max(m, d[s.key]), max),
    0
  );
  const { max: yMax, ticks } = niceScale(peak);
  const isEmpty = data.length === 0;

  const xAt = (i: number) => (data.length < 2 ? VIEW_W / 2 : (i / (data.length - 1)) * VIEW_W);
  const yAt = (v: number) => PAD_T + (1 - v / yMax) * PLOT_H;

  const toggle = (key: TrendSeriesKey) => {
    setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const i = Math.round(ratio * (data.length - 1));
    setHoverIndex(Math.min(data.length - 1, Math.max(0, i)));
  };

  const hovered = hoverIndex === null ? null : data[hoverIndex];
  const hoverPct = hoverIndex === null || data.length < 2 ? 50 : (hoverIndex / (data.length - 1)) * 100;

  return (
    <figure className="m-0">
      <div className="flex gap-3">
        {/* HTML 刻度按 SVG y 坐标定位，避免非等比缩放文字。 */}
        <div className="relative h-56 w-10 shrink-0">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-[11px] leading-none text-muted tabular-nums"
              style={{ top: `${(yAt(t) / VIEW_H) * 100}%` }}
            >
              {formatCount(t)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="relative h-56 w-full"
            onPointerMove={handleMove}
            onPointerLeave={() => setHoverIndex(null)}
          >
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              className="size-full overflow-visible"
              aria-hidden
            >
              <defs>
                {TREND_SERIES.map((s) => (
                  <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>

              {ticks.map((t) => (
                <line
                  key={t}
                  x1={0}
                  x2={VIEW_W}
                  y1={yAt(t)}
                  y2={yAt(t)}
                  stroke="var(--border)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {visible.map((s) => {
                const points = data.map((d, i) => ({ x: xAt(i), y: yAt(d[s.key]) }));
                const line = smoothPath(points);
                const lastX = points.length > 0 ? points[points.length - 1].x : 0;
                const firstX = points.length > 0 ? points[0].x : 0;
                return (
                  <g key={s.key}>
                    <path d={`${line} L${lastX},${VIEW_H} L${firstX},${VIEW_H} Z`} fill={`url(#${uid}-${s.key})`} />
                    <path
                      d={line}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
            </svg>

            {hovered && (
              <>
                <div
                  className="pointer-events-none absolute inset-y-0 w-px bg-accent/40"
                  style={{ left: `${hoverPct}%` }}
                />
                {visible.map((s) => (
                  <span
                    key={s.key}
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
                    style={{
                      left: `${hoverPct}%`,
                      top: `${(yAt(hovered[s.key]) / VIEW_H) * 100}%`,
                      background: s.color,
                    }}
                  />
                ))}
                <div
                  className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg"
                  style={{ left: `${Math.min(86, Math.max(14, hoverPct))}%` }}
                >
                  <p className="font-medium text-foreground">{dayLabel(hovered.date)}</p>
                  <ul className="mt-1 space-y-0.5">
                    {visible.map((s) => (
                      <li key={s.key} className="flex items-center gap-1.5 text-muted">
                        <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                        {s.label}
                        <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">
                          {formatCount(hovered[s.key])}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {isEmpty && (
              <EmptyState
                size="sm"
                title="暂无数据"
                className="absolute inset-0 justify-center py-0"
              />
            )}
          </div>

          <div className="relative mt-2 h-4 text-[11px] leading-none text-muted">
            {xTickIndexes(data.length).map((i) => (
              <span
                key={i}
                className="absolute -translate-x-1/2 tabular-nums"
                style={{
                  left: data.length < 2 ? "50%" : `${(i / (data.length - 1)) * 100}%`,
                }}
              >
                {dayLabel(data[i].date)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TREND_SERIES.map((s) => {
          const off = hidden.includes(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              aria-pressed={!off}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium transition-opacity duration-200 ${
                off ? "text-muted opacity-50" : "text-foreground"
              }`}
            >
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          );
        })}
      </div>
    </figure>
  );
}
