import React from "react";
import { useCurrentFrame } from "remotion";
import { lerp } from "./motion";
import { color, font } from "./theme";

/* 轻量 SVG 图表原语：比例尺、可逐段绘制的折线、网格与标注。 */

export type Pt = { x: number; y: number };
export type Scale = (v: number) => number;

export const linear =
  (d0: number, d1: number, r0: number, r1: number): Scale =>
  (v) =>
    r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

export const log =
  (d0: number, d1: number, r0: number, r1: number): Scale =>
  (v) =>
    r0 + ((Math.log10(v) - Math.log10(d0)) / (Math.log10(d1) - Math.log10(d0))) * (r1 - r0);

export const toPath = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join("");

/** 折线绘制到第 p 个点（可为小数），返回路径与笔头位置 */
export const partial = (pts: Pt[], p: number) => {
  if (!pts.length) return { pts: [] as Pt[], head: { x: 0, y: 0 } };
  const k = Math.max(0, Math.min(pts.length - 1, p));
  const i = Math.floor(k);
  const f = k - i;
  const out = pts.slice(0, i + 1);
  let head = pts[i];
  if (f > 0 && i + 1 < pts.length) {
    head = { x: lerp(pts[i].x, pts[i + 1].x, f), y: lerp(pts[i].y, pts[i + 1].y, f) };
    out.push(head);
  }
  return { pts: out, head };
};

/** 沿横坐标裁剪：保留 x <= xMax 的部分（用于按"时间"而不是按点数推进） */
export const untilX = (pts: Pt[], xMax: number) => {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.x <= xMax) {
      out.push(p);
      continue;
    }
    if (i > 0) {
      const a = pts[i - 1];
      const f = (xMax - a.x) / (p.x - a.x);
      out.push({ x: xMax, y: lerp(a.y, p.y, f) });
    }
    break;
  }
  return { pts: out, head: out[out.length - 1] ?? pts[0] };
};

export const Line: React.FC<{
  pts: Pt[];
  stroke: string;
  width?: number;
  glow?: number;
  opacity?: number;
  dash?: string;
}> = ({ pts, stroke, width = 5, glow = 0.5, opacity = 1, dash }) => {
  if (pts.length < 2) return null;
  const d = toPath(pts);
  return (
    <g opacity={opacity}>
      {glow > 0 && (
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={width * 3.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={glow * 0.45}
          style={{ filter: "blur(9px)" }}
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    </g>
  );
};

/** 折线与某条水平基线之间的填充（例如"水下"区域） */
export const Area: React.FC<{ pts: Pt[]; baseY: number; fill: string; opacity?: number }> = ({
  pts,
  baseY,
  fill,
  opacity = 1,
}) => {
  if (pts.length < 2) return null;
  const d = `${toPath(pts)}L${pts[pts.length - 1].x},${baseY}L${pts[0].x},${baseY}Z`;
  return <path d={d} fill={fill} opacity={opacity} />;
};

/** 斜线阴影图案：放进 <defs>，用 fill="url(#id)" 引用 */
export const Hatch: React.FC<{ id: string; stroke: string; gap?: number; width?: number; opacity?: number }> = ({
  id,
  stroke,
  gap = 11,
  width = 2,
  opacity = 0.55,
}) => (
  <pattern id={id} patternUnits="userSpaceOnUse" width={gap} height={gap} patternTransform="rotate(45)">
    <line x1={0} y1={0} x2={0} y2={gap} stroke={stroke} strokeWidth={width} opacity={opacity} />
  </pattern>
);

/** 笔头圆点 + 呼吸光环 */
export const Dot: React.FC<{ x: number; y: number; fill: string; r?: number; ring?: boolean; opacity?: number }> = ({
  x,
  y,
  fill,
  r = 9,
  ring = true,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const t = (frame % 45) / 45;
  return (
    <g opacity={opacity}>
      {ring && <circle cx={x} cy={y} r={r + t * 26} fill="none" stroke={fill} strokeWidth={2} opacity={(1 - t) * 0.7} />}
      <circle cx={x} cy={y} r={r + 5} fill={fill} opacity={0.25} />
      <circle cx={x} cy={y} r={r} fill={fill} />
      <circle cx={x} cy={y} r={r * 0.38} fill="#fff" opacity={0.85} />
    </g>
  );
};

/** 水平网格线 + 左侧刻度 */
export const GridY: React.FC<{
  values: number[];
  y: Scale;
  x0: number;
  x1: number;
  format?: (v: number) => string;
  opacity?: number;
  strong?: number[];
}> = ({ values, y, x0, x1, format = String, opacity = 1, strong = [] }) => (
  <g opacity={opacity}>
    {values.map((v) => (
      <g key={v}>
        <line
          x1={x0}
          x2={x1}
          y1={y(v)}
          y2={y(v)}
          stroke={strong.includes(v) ? color.gridStrong : color.grid}
          strokeWidth={strong.includes(v) ? 2 : 1.5}
          strokeDasharray={strong.includes(v) ? "8 10" : undefined}
        />
        <text
          x={x0 - 20}
          y={y(v) + 7}
          textAnchor="end"
          fontFamily={font.mono}
          fontSize={20}
          fill={color.muted}
        >
          {format(v)}
        </text>
      </g>
    ))}
  </g>
);

/** 底部刻度 */
export const TicksX: React.FC<{
  values: number[];
  x: Scale;
  y0: number;
  format?: (v: number) => string;
  opacity?: number;
  grid?: { top: number };
}> = ({ values, x, y0, format = String, opacity = 1, grid }) => (
  <g opacity={opacity}>
    {values.map((v) => (
      <g key={v}>
        {grid && <line x1={x(v)} x2={x(v)} y1={grid.top} y2={y0} stroke={color.grid} strokeWidth={1.5} />}
        <line x1={x(v)} x2={x(v)} y1={y0} y2={y0 + 10} stroke={color.dim} strokeWidth={2} />
        <text x={x(v)} y={y0 + 40} textAnchor="middle" fontFamily={font.mono} fontSize={20} fill={color.muted}>
          {format(v)}
        </text>
      </g>
    ))}
  </g>
);

/** 带引线的标注 */
export const Callout: React.FC<{
  x: number;
  y: number;
  dx: number;
  dy: number;
  title: string;
  sub?: string;
  tint: string;
  opacity?: number;
  align?: "start" | "end" | "middle";
}> = ({ x, y, dx, dy, title, sub, tint, opacity = 1, align = "start" }) => {
  const tx = x + dx;
  const ty = y + dy;
  return (
    <g opacity={opacity}>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={tint} strokeWidth={1.6} opacity={0.6} />
      <text x={tx} y={ty + (dy < 0 ? -34 : 30)} textAnchor={align} fontFamily={font.sans} fontWeight={700} fontSize={28} fill={tint}>
        {title}
      </text>
      {sub && (
        <text x={tx} y={ty + (dy < 0 ? -6 : 60)} textAnchor={align} fontFamily={font.mono} fontSize={20} fill={color.body}>
          {sub}
        </text>
      )}
    </g>
  );
};
