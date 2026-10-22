import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Area, Callout, Dot, GridY, Hatch, Line, TicksX, linear, log, untilX, type Pt } from "../../../lib/chart";
import { Eyebrow, Reveal, fmt } from "../../../lib/components";
import { CLAMP, ease, fade, prog } from "../../../lib/motion";
import { SAFE, color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { FACTS, SERIES, dateToYear, decimalYear } from "../data";
import { beats } from "../timeline";

const B = beats<{ drawStart: number; drawEnd: number; eventYears: number[]; stat: number; underwater: number; swap: number }>("long");
const C = COPY.long;

const PLOT = { x0: 190, x1: 1760, top: 300, bottom: 900 };
const sx = linear(1980.5, 2027.5, PLOT.x0, PLOT.x1);
const sy = log(120, 40000, PLOT.bottom, PLOT.top);

const PTS: Pt[] = SERIES.map((p) => ({ x: sx(decimalYear(p.m)), y: sy(p.v) }));
const T_END = decimalYear(SERIES[SERIES.length - 1].m);

const PEAK_T = dateToYear(FACTS.peak2000.date);
const REC_T = dateToYear(FACTS.recover2015.date);

const BANDS = [
  { a: 1981.0, b: 1996.0, tint: color.pc },
  { a: 1996.0, b: REC_T, tint: color.net },
  { a: 2022.83, b: 2026.85, tint: color.ai },
];

/** 事件点：位置用素材里的点位 */
const EVENTS = [
  { v: 454.57, tint: color.pc, dx: -10, dy: -80, align: "middle" as const },
  { v: FACTS.peak2000.close, tint: color.net, dx: -24, dy: -70, align: "end" as const },
  { v: FACTS.low2002.close, tint: color.net, dx: 30, dy: 70, align: "start" as const },
  { v: 1377.84, tint: color.body, dx: 30, dy: 84, align: "start" as const },
  { v: 5056.06, tint: color.net, dx: 40, dy: 90, align: "start" as const },
  { v: FACTS.now.close, tint: color.ai, dx: -20, dy: 84, align: "end" as const },
];

export const LongView: React.FC = () => {
  const frame = useCurrentFrame();
  // 匀速推进：事件出现的时刻与配乐里的钟声一一对应
  const t = interpolate(frame, [B.drawStart, B.drawEnd], [1981, T_END], CLAMP);
  const line = untilX(PTS, sx(t));
  const done = t >= T_END - 0.001;
  const headVal = Math.pow(10, interpolate(line.head.y, [PLOT.top, PLOT.bottom], [Math.log10(40000), Math.log10(120)]));

  const uw = prog(frame, B.underwater, 40, ease.inOut);
  const dimOthers = 1 - 0.6 * uw;
  const swapOut = 1 - prog(frame, B.swap, 16, ease.inOut);

  const uwPts = untilX(
    PTS.filter((p) => p.x >= sx(PEAK_T) - 0.5),
    sx(PEAK_T + (REC_T - PEAK_T) * uw),
  ).pts;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.x, top: SAFE.y }}>
        <Eyebrow index={C.eyebrow[0]} label={C.eyebrow[1]} at={4} />
        <div style={{ position: "relative", marginTop: 26, height: 100 }}>
          <Reveal
            text={C.head}
            at={10}
            stagger={1.6}
            style={{ position: "absolute", fontFamily: font.serif, fontWeight: 700, fontSize: 66, color: color.ink, opacity: swapOut, whiteSpace: "nowrap" }}
          />
          {frame >= B.swap && (
            <Reveal
              text={C.head2}
              at={B.swap + 10}
              stagger={1.4}
              style={{ position: "absolute", fontFamily: font.serif, fontWeight: 700, fontSize: 66, color: color.ink, whiteSpace: "nowrap" }}
            />
          )}
        </div>
      </div>

      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <Hatch id="long-hatch" stroke={color.accent} opacity={0.5} />
        </defs>
        {BANDS.map((b, i) => {
          const op = fade(frame, B.drawStart + i * 10, 30) * (i === 1 ? 1 : dimOthers);
          return (
            <g key={i} opacity={op}>
              <rect x={sx(b.a)} y={PLOT.top} width={sx(b.b) - sx(b.a)} height={PLOT.bottom - PLOT.top} fill={b.tint} opacity={0.075} />
              <text x={sx(b.a) + 14} y={PLOT.top + 32} fontFamily={font.mono} fontSize={20} fontWeight={700} fill={b.tint} letterSpacing="0.08em">
                {C.eras[i]}
              </text>
            </g>
          );
        })}
        <g opacity={fade(frame, 10, 24)}>
          <GridY values={[300, 1000, 3000, 10000, 30000]} y={sy} x0={PLOT.x0} x1={PLOT.x1} format={(v) => fmt(v)} />
          <line x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.bottom} y2={PLOT.bottom} stroke={color.dim} strokeWidth={2} />
          <TicksX values={[1981, 1987, 1995, 2000, 2008, 2015, 2022, 2026]} x={sx} y0={PLOT.bottom} />
        </g>

        {/* 回本等待期 */}
        {uw > 0 && (
          <g>
            <Area pts={uwPts} baseY={sy(FACTS.peak2000.close)} fill="url(#long-hatch)" />
            <line
              x1={sx(PEAK_T)}
              x2={sx(PEAK_T) + (sx(REC_T) - sx(PEAK_T)) * uw}
              y1={sy(FACTS.peak2000.close)}
              y2={sy(FACTS.peak2000.close)}
              stroke={color.accent}
              strokeWidth={2.5}
              strokeDasharray="10 8"
            />
            <text
              x={(sx(PEAK_T) + sx(REC_T)) / 2}
              y={sy(FACTS.peak2000.close) - 22}
              textAnchor="middle"
              fontFamily={font.sans}
              fontWeight={900}
              fontSize={34}
              fill={color.accent}
              opacity={prog(frame, B.underwater + 30, 20)}
            >
              {C.underwater}
            </text>
          </g>
        )}

        <Line pts={line.pts} stroke={color.ink} width={4.5} glow={0.55} />
        {!done && frame >= B.drawStart && (
          <>
            <Dot x={line.head.x} y={line.head.y} fill={color.ink} r={7} />
            <text x={line.head.x + 16} y={line.head.y - 18} fontFamily={font.mono} fontSize={22} fill={color.ink}>
              {Math.floor(t)} · {fmt(headVal)}
            </text>
          </>
        )}

        {B.eventYears.map((ey, i) => {
          if (t < ey) return null;
          const e = EVENTS[i];
          const keep = i === 1 || i === 4;
          const op = fade(frame, B.drawStart + ((ey - 1981) / (T_END - 1981)) * (B.drawEnd - B.drawStart), 12) * (keep ? 1 : dimOthers);
          return (
            <g key={i} opacity={op}>
              <Dot x={sx(ey)} y={sy(e.v)} fill={e.tint} r={7} ring={i === 5} />
              <Callout x={sx(ey)} y={sy(e.v)} dx={e.dx} dy={e.dy} title={C.events[i].t} sub={C.events[i].sub} tint={e.tint} align={e.align} />
            </g>
          );
        })}
      </svg>

      {/* 45 年的跨度 */}
      <div style={{ position: "absolute", left: 230, top: 380, opacity: fade(frame, B.stat, 18) * dimOthers }}>
        <div style={{ fontFamily: font.sans, fontSize: 24, color: color.muted, fontWeight: 500 }}>{C.statLabel}</div>
        <div style={{ fontFamily: font.mono, fontSize: 50, color: color.ink, fontWeight: 800, marginTop: 4 }}>{C.stat}</div>
      </div>
    </AbsoluteFill>
  );
};
