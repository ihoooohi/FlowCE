import React from "react";
import { Dot, GridY, Line, TicksX, linear, partial, type Pt } from "../../../lib/chart";
import { useLayout } from "../../../lib/layout";
import { color, font } from "../../../lib/theme";
import { first48, netFull } from "../data";

/** Race 与 Crash 两个场景共用的图表：横轴为各自起点后的月份，纵轴为起点 = 100 */
export const plotFor = (portrait: boolean) =>
  portrait ? { x0: 130, x1: 990, top: 600, bottom: 1150 } : { x0: 190, x1: 1370, top: 300, bottom: 930 };

export type SeriesKey = "net" | "ai" | "pc";

export const TINT: Record<SeriesKey, string> = { net: color.net, ai: color.ai, pc: color.pc };

/** 互联网完整周期（含 48 个月之后），PC/AI 只有前 48 个月 */
const RAW: Record<SeriesKey, number[]> = { net: netFull, ai: first48.ai, pc: first48.pc };

export type RaceState = {
  xMax: number;
  yMin: number;
  yMax: number;
  progress: Record<SeriesKey, number>;
  opacity: Record<SeriesKey, number>;
  gridOpacity?: number;
  dots?: Partial<Record<SeriesKey, number>>;
  extra?: (sx: (v: number) => number, sy: (v: number) => number) => React.ReactNode;
};

export const RaceChart: React.FC<RaceState & { baseLabel: string; baseLabelOpacity?: number }> = ({
  xMax,
  yMin,
  yMax,
  progress,
  opacity,
  gridOpacity = 1,
  dots = {},
  extra,
  baseLabel,
  baseLabelOpacity = 1,
}) => {
  const { W, H, portrait } = useLayout();
  const PLOT = plotFor(portrait);
  const sx = linear(0, xMax, PLOT.x0, PLOT.x1);
  const sy = linear(yMin, yMax, PLOT.bottom, PLOT.top);
  const yTicks = [100, 200, 300, 400, 500].filter((v) => v <= yMax + 1);
  const step = xMax > 60 ? 12 : 6;
  const xTicks = Array.from({ length: Math.floor(xMax / step) + 1 }, (_, i) => i * step);
  const order: SeriesKey[] = ["pc", "ai", "net"];

  return (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      <defs>
        <clipPath id="race-plot">
          <rect x={PLOT.x0 - 20} y={PLOT.top - 160} width={PLOT.x1 - PLOT.x0 + 60} height={PLOT.bottom - PLOT.top + 180} />
        </clipPath>
      </defs>
      <GridY values={yTicks} y={sy} x0={PLOT.x0} x1={PLOT.x1} opacity={gridOpacity} strong={[100]} />
      <text x={PLOT.x1} y={sy(100) - 14} textAnchor="end" fontFamily={font.mono} fontSize={19} fill={color.muted} opacity={gridOpacity * baseLabelOpacity}>
        {baseLabel}
      </text>
      <line x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.bottom} y2={PLOT.bottom} stroke={color.dim} strokeWidth={2} />
      <TicksX values={xTicks} x={sx} y0={PLOT.bottom} opacity={gridOpacity} />
      <g clipPath="url(#race-plot)">
        {order.map((k) => {
          const pts: Pt[] = RAW[k].map((v, i) => ({ x: sx(i), y: sy(v) }));
          const p = partial(pts, progress[k]);
          return (
            <g key={k}>
              <Line pts={p.pts} stroke={TINT[k]} width={5.5} opacity={opacity[k]} glow={0.7} />
              {(dots[k] ?? 0) > 0 && <Dot x={p.head.x} y={p.head.y} fill={TINT[k]} opacity={(dots[k] ?? 0) * opacity[k]} />}
            </g>
          );
        })}
        {extra?.(sx, sy)}
      </g>
    </svg>
  );
};
