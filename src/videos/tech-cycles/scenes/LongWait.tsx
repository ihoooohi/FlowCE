import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Area, Callout, Dot, GridY, Hatch, Line, TicksX, linear, untilX, type Pt } from "../../../lib/chart";
import { Eyebrow, NumLabel, Reveal } from "../../../lib/components";
import { CLAMP, ease, fade, prog } from "../../../lib/motion";
import { SAFE, color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { FACTS, SERIES, dateToYear, decimalYear, slice } from "../data";
import { beats } from "../timeline";

const B = beats<{
  drawStart: number;
  recover: number;
  milestoneYears: number[];
  g1987: number;
  g1987End: number;
  compare: number;
  cap: number;
}>("wait");
const C = COPY.wait;

const PLOT = { x0: 190, x1: 1300, top: 330, bottom: 930 };
const sx = linear(0, 17, PLOT.x0, PLOT.x1);
const sy = linear(0, 150, PLOT.bottom, PLOT.top);

const PEAK_T = dateToYear(FACTS.peak2000.date);
const RECOVER_X = dateToYear(FACTS.recover2015.date) - PEAK_T;

/** 2000 年泡沫：以 2000-03-10 日收盘 = 100，月末点画在月底 */
const P2000: Pt[] = [
  { x: sx(0), y: sy(100) },
  ...slice("2000-03", "2017-06").map((p) => ({
    x: sx(decimalYear(p.m) + 1 / 12 - PEAK_T),
    y: sy((p.v / FACTS.peak2000.close) * 100),
  })),
];
const V2000 = (x: number) => {
  // 已画出部分在 x 处的点位（归一化值）
  const { head } = untilX(P2000, sx(x));
  return (PLOT.bottom - head.y) / ((PLOT.bottom - PLOT.top) / 150);
};

/** 1987 年股灾：以 1987-08 月末 = 100 */
const PEAK87 = SERIES.find((p) => p.m === FACTS.crash1987.peakMonth)!.v;
const T87 = decimalYear(FACTS.crash1987.peakMonth) + 1 / 12;
const P1987: Pt[] = slice("1987-08", "1991-03").map((p) => ({
  x: sx(decimalYear(p.m) + 1 / 12 - T87),
  y: sy((p.v / PEAK87) * 100),
}));
const RECOVER87 = { x: decimalYear(FACTS.crash1987.recoverMonth) + 1 / 12 - T87 };

export const LongWait: React.FC = () => {
  const frame = useCurrentFrame();

  const years =
    frame < B.recover
      ? interpolate(frame, [B.drawStart, B.recover], [0, RECOVER_X], CLAMP)
      : interpolate(frame, [B.recover, B.recover + 70], [RECOVER_X, 16.5], { ...CLAMP, easing: ease.out });
  const line = untilX(P2000, sx(years));
  const recovered = frame >= B.recover;
  const value = V2000(years);

  const y87 = interpolate(frame, [B.g1987, B.g1987End], [0, 3.35], { ...CLAMP, easing: ease.inOut });
  const l87 = untilX(P1987, sx(y87));
  const rec87 = y87 >= RECOVER87.x;

  const panelA = fade(frame, B.drawStart - 10, 16, B.g1987 - 20, 18);
  const panelB = fade(frame, B.compare, 16);
  const lineDim = 1 - 0.5 * prog(frame, B.g1987 - 10, 20);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.x, top: SAFE.y }}>
        <Eyebrow index={C.eyebrow[0]} label={C.eyebrow[1]} at={4} />
        <Reveal
          text={C.head}
          at={10}
          stagger={1.6}
          style={{ fontFamily: font.serif, fontWeight: 700, fontSize: 66, color: color.ink, marginTop: 26 }}
        />
      </div>

      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <Hatch id="wait-hatch" stroke={color.red} opacity={0.32} />
        </defs>
        <g opacity={fade(frame, 14, 24)}>
          <GridY values={[0, 50, 100, 150]} y={sy} x0={PLOT.x0} x1={PLOT.x1} strong={[100]} />
          <text x={PLOT.x1} y={sy(100) - 14} textAnchor="end" fontFamily={font.mono} fontSize={19} fill={color.muted}>
            {C.peakLine}
          </text>
          <TicksX values={[0, 2, 4, 6, 8, 10, 12, 14, 16]} x={sx} y0={PLOT.bottom} />
          <text x={PLOT.x1} y={PLOT.bottom + 76} textAnchor="end" fontFamily={font.mono} fontSize={18} fill={color.muted}>
            {C.axis}
          </text>
        </g>

        <g opacity={lineDim}>
          <Area pts={line.pts} baseY={sy(100)} fill="url(#wait-hatch)" />
          {B.milestoneYears.map((my, i) => {
            if (years < my) return null;
            const yv = V2000(my);
            const op = fade(frame, B.drawStart + (my / RECOVER_X) * (B.recover - B.drawStart), 12);
            return (
              <g key={i} opacity={op}>
                <line x1={sx(my)} x2={sx(my)} y1={sy(yv) + 12} y2={PLOT.bottom} stroke={color.accent} strokeWidth={1.5} strokeDasharray="4 6" opacity={0.6} />
                <circle cx={sx(my)} cy={sy(yv)} r={6} fill={color.bg} stroke={color.accent} strokeWidth={2.5} />
              </g>
            );
          })}
          <Line pts={line.pts} stroke={color.net} width={5.5} glow={0.7} />
          {!recovered && frame >= B.drawStart && <Dot x={line.head.x} y={line.head.y} fill={color.net} />}
        </g>

        {recovered && (
          <>
            <Dot x={sx(RECOVER_X)} y={sy(100)} fill={color.pc} r={10} opacity={lineDim} />
            <Callout
              x={sx(RECOVER_X)}
              y={sy(100)}
              dx={-30}
              dy={-80}
              align="end"
              title={C.recovered[1]}
              sub={C.recovered[0]}
              tint={color.pc}
              opacity={fade(frame, B.recover + 4, 14) * lineDim}
            />
          </>
        )}

        {frame >= B.g1987 && (
          <>
            <Line pts={l87.pts} stroke={color.pc} width={5.5} glow={0.8} />
            {!rec87 && <Dot x={l87.head.x} y={l87.head.y} fill={color.pc} />}
            {rec87 && (
              <>
                <Dot x={sx(RECOVER87.x)} y={sy(102)} fill={color.pc} r={9} />
                <Callout
                  x={sx(RECOVER87.x)}
                  y={sy(102)}
                  dx={40}
                  dy={-120}
                  title={C.g1987[1]}
                  sub={C.g1987[0]}
                  tint={color.pc}
                  opacity={fade(frame, B.g1987 + 40, 14)}
                />
              </>
            )}
          </>
        )}
      </svg>

      {/* 等待时钟 + 世界在变 */}
      <div style={{ position: "absolute", left: 1400, top: 330, width: 420, opacity: panelA }}>
        <div style={{ fontFamily: font.sans, fontSize: 24, color: color.muted, fontWeight: 500 }}>{C.clockLabel}</div>
        <NumLabel template={C.clock} value={Math.min(years, RECOVER_X).toFixed(1)} size={96} tint={recovered ? color.pc : color.ink} />
        <div style={{ fontFamily: font.mono, fontSize: 24, color: recovered ? color.pc : color.red, marginTop: 4 }}>
          {recovered ? C.recovered[1].split("，")[1] : `${C.under} −${Math.max(0, Math.round(100 - value))}%`}
        </div>
        <div style={{ marginTop: 50, display: "flex", flexDirection: "column", gap: 18 }}>
          {B.milestoneYears.map((my, i) => {
            const at = B.drawStart + (my / RECOVER_X) * (B.recover - B.drawStart);
            const p = prog(frame, at, 18);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 18,
                  alignItems: "baseline",
                  opacity: p,
                  transform: `translateX(${(1 - p) * 30}px)`,
                }}
              >
                <span style={{ fontFamily: font.mono, fontSize: 22, color: color.accent, fontWeight: 700 }}>{C.milestones[i].year}</span>
                <span style={{ fontFamily: font.sans, fontSize: 30, color: color.ink, fontWeight: 500 }}>{C.milestones[i].text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 对比 */}
      <div style={{ position: "absolute", left: 1400, top: 330, width: 420, opacity: panelB }}>
        {C.compare.map((c, i) => {
          const p = prog(frame, B.compare + 10 + i * 18, 40, ease.inOut);
          return (
            <div key={c.year} style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                <span style={{ fontFamily: font.sans, fontWeight: 900, fontSize: 32, color: c.tint }}>{c.year}</span>
                <span style={{ fontFamily: font.mono, fontWeight: 700, fontSize: 28, color: color.red }}>{c.drop}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
                <div style={{ height: 18, width: Math.max(8, (c.years / 15.1) * 250 * p), background: c.tint, borderRadius: 3 }} />
                <span style={{ fontFamily: font.mono, fontSize: 24, color: color.ink, opacity: p }}>{c.wait}</span>
              </div>
            </div>
          );
        })}
        <Reveal
          text={C.cap}
          at={B.cap}
          stagger={1.6}
          style={{ fontFamily: font.sans, fontWeight: 700, fontSize: 38, color: color.ink, lineHeight: 1.5, marginTop: 30 }}
        />
      </div>
    </AbsoluteFill>
  );
};
