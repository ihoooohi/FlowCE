import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Area, Callout, Dot, GridY, Hatch, Line, TicksX, linear, log, untilX, type Pt } from "../../../lib/chart";
import { Eyebrow, Reveal, fmt } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { CLAMP, ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { FACTS, SERIES, dateToYear, decimalYear } from "../data";
import { beats } from "../timeline";

const B = beats<{ drawStart: number; drawEnd: number; eventYears: number[]; stat: number; underwater: number; swap: number }>("long");
const C = COPY.long;

const T_END = decimalYear(SERIES[SERIES.length - 1].m);

const PEAK_T = dateToYear(FACTS.peak2000.date);
const REC_T = dateToYear(FACTS.recover2015.date);

const BANDS = [
  { a: 1981.0, b: 1996.0, tint: color.pc },
  { a: 1996.0, b: REC_T, tint: color.net },
  { a: 2022.83, b: 2026.85, tint: color.ai },
];

type Align = "start" | "middle" | "end";

/** 事件点：位置用素材里的点位；标注偏移分横版 / 竖版两套 */
const EVENTS: { v: number; tint: string; land: [number, number, Align]; port: [number, number, Align] }[] = [
  { v: 454.57, tint: color.pc, land: [-10, -80, "middle"], port: [-10, -70, "middle"] },
  { v: FACTS.peak2000.close, tint: color.net, land: [-24, -70, "end"], port: [-16, -60, "end"] },
  { v: FACTS.low2002.close, tint: color.net, land: [30, 70, "start"], port: [-20, 64, "end"] },
  { v: 1377.84, tint: color.body, land: [30, 84, "start"], port: [24, 76, "start"] },
  { v: 5056.06, tint: color.net, land: [40, 90, "start"], port: [26, 84, "start"] },
  { v: FACTS.now.close, tint: color.ai, land: [-20, 84, "end"], port: [-16, 80, "end"] },
];

export const LongView: React.FC = () => {
  const frame = useCurrentFrame();
  const { W, H, portrait, pick, padX, top } = useLayout();
  const PLOT = pick({ x0: 190, x1: 1760, top: 300, bottom: 900 }, { x0: 120, x1: 1000, top: 610, bottom: 1150 });
  const sx = linear(1980.5, 2027.5, PLOT.x0, PLOT.x1);
  const sy = log(120, 40000, PLOT.bottom, PLOT.top);
  const PTS: Pt[] = SERIES.map((p) => ({ x: sx(decimalYear(p.m)), y: sy(p.v) }));
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
      <div style={{ position: "absolute", left: padX, top }}>
        <Eyebrow index={C.eyebrow[0]} label={C.eyebrow[1]} at={4} />
        <div style={{ position: "relative", marginTop: 26, height: 100 }}>
          <Reveal
            text={C.head}
            at={10}
            stagger={1.6}
            style={{ position: "absolute", fontFamily: font.serif, fontWeight: 700, fontSize: pick(66, 56), color: color.ink, opacity: swapOut, whiteSpace: "nowrap" }}
          />
          {frame >= B.swap && (
            <Reveal
              text={portrait ? C.head2V : C.head2}
              at={B.swap + 10}
              stagger={1.4}
              style={{
                position: "absolute",
                fontFamily: font.serif,
                fontWeight: 700,
                fontSize: pick(66, 56),
                lineHeight: 1.35,
                color: color.ink,
                whiteSpace: portrait ? "normal" : "nowrap",
                width: portrait ? W - 2 * padX : undefined,
              }}
            />
          )}
        </div>
      </div>

      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <Hatch id="long-hatch" stroke={color.accent} opacity={0.5} />
        </defs>
        {BANDS.map((b, i) => {
          const op = fade(frame, B.drawStart + i * 10, 30) * (i === 1 ? 1 : dimOthers);
          return (
            <g key={i} opacity={op}>
              <rect x={sx(b.a)} y={PLOT.top} width={sx(b.b) - sx(b.a)} height={PLOT.bottom - PLOT.top} fill={b.tint} opacity={0.075} />
              <text x={sx(b.a) + pick(14, 8)} y={PLOT.top + 32} fontFamily={font.mono} fontSize={pick(20, 17)} fontWeight={700} fill={b.tint} letterSpacing={pick("0.08em", "0")}>
                {C.eras[i]}
              </text>
            </g>
          );
        })}
        <g opacity={fade(frame, 10, 24)}>
          <GridY values={[300, 1000, 3000, 10000, 30000]} y={sy} x0={PLOT.x0} x1={PLOT.x1} format={(v) => fmt(v)} />
          <line x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.bottom} y2={PLOT.bottom} stroke={color.dim} strokeWidth={2} />
          <TicksX values={pick([1981, 1987, 1995, 2000, 2008, 2015, 2022, 2026], [1981, 1990, 2000, 2008, 2015, 2026])} x={sx} y0={PLOT.bottom} />
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
              fontSize={pick(34, 30)}
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
            <text
              x={line.head.x + (line.head.x > W - 260 ? -16 : 16)}
              y={line.head.y - 18}
              textAnchor={line.head.x > W - 260 ? "end" : "start"}
              fontFamily={font.mono}
              fontSize={22}
              fill={color.ink}
            >
              {Math.floor(t)} · {fmt(headVal)}
            </text>
          </>
        )}

        {B.eventYears.map((ey, i) => {
          if (t < ey) return null;
          const e = EVENTS[i];
          const [dx, dy, align] = portrait ? e.port : e.land;
          const keep = i === 1 || i === 4;
          const op = fade(frame, B.drawStart + ((ey - 1981) / (T_END - 1981)) * (B.drawEnd - B.drawStart), 12) * (keep ? 1 : dimOthers);
          return (
            <g key={i} opacity={op}>
              <Dot x={sx(ey)} y={sy(e.v)} fill={e.tint} r={7} ring={i === 5} />
              <Callout x={sx(ey)} y={sy(e.v)} dx={dx} dy={dy} title={C.events[i].t} sub={C.events[i].sub} tint={e.tint} align={align} />
            </g>
          );
        })}
      </svg>

      {/* 45 年的跨度 */}
      <div style={{ position: "absolute", left: pick(230, padX), top: pick(380, 1235), opacity: fade(frame, B.stat, 18) * pick(dimOthers, 1) }}>
        <div style={{ fontFamily: font.sans, fontSize: 24, color: color.muted, fontWeight: 500 }}>{C.statLabel}</div>
        <div style={{ fontFamily: font.mono, fontSize: 50, color: color.ink, fontWeight: 800, marginTop: 4 }}>{C.stat}</div>
      </div>
    </AbsoluteFill>
  );
};
