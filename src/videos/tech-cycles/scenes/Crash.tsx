import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Callout, Dot } from "../../../lib/chart";
import { Eyebrow, Reveal, Shake } from "../../../lib/components";
import { CLAMP, ease, fade, lerp, prog } from "../../../lib/motion";
import { SAFE, color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { FACTS, SERIES, indexOf, netFull } from "../data";
import { beats } from "../timeline";
import { RaceChart } from "./RaceChart";
import { RACE_END_MONTH } from "./Race";

const B = beats<{ rescale: number; approach: number; peak: number; crashStart: number; crashEnd: number; statement: number }>("crash");
const C = COPY.crash;

const BASE = SERIES[indexOf("1996-01")].v; // 1996-01 月末收盘 = 100
const PEAK_N = (FACTS.peak2000.close / BASE) * 100;
const LOW_N = (FACTS.low2002.close / BASE) * 100;
const PEAK_X = 50.3; // 2000-03-10
const LOW_X = 81.27; // 2002-10-09
const MONTH_PEAK = 49; // 2000-02 月末
const MONTH_END = netFull.length - 1; // 2002-10

export const Crash: React.FC = () => {
  const frame = useCurrentFrame();

  const r = prog(frame, B.rescale, 60, ease.inOut);
  const xMax = lerp(48, 84, r);
  const yMin = lerp(60, 0, r);
  const yMax = lerp(420, 520, r);

  const approach = interpolate(frame, [B.approach, B.peak], [RACE_END_MONTH, MONTH_PEAK], { ...CLAMP, easing: ease.inOut });
  const fall = interpolate(frame, [B.crashStart, B.crashEnd], [MONTH_PEAK, MONTH_END], {
    ...CLAMP,
    easing: Easing.bezier(0.42, 0, 0.72, 1),
  });
  const netP = frame < B.crashStart ? approach : fall;

  // 实时跌幅：已画出部分的最低点相对日收盘峰值
  const drawn = netFull.slice(MONTH_PEAK, Math.floor(netP) + 1);
  const minSoFar = drawn.length ? Math.min(...drawn) : PEAK_N;
  const lowShown = frame >= B.crashEnd;
  const dd = lowShown ? FACTS.low2002.drop : frame >= B.crashStart ? -(1 - minSoFar / PEAK_N) * 100 : 0;

  const shake = interpolate(frame, [B.crashStart, B.crashStart + 30, B.crashEnd - 30, B.crashEnd + 10], [0, 9, 6, 0], CLAMP);
  const redTint = interpolate(frame, [B.crashStart, B.crashStart + 30, B.crashEnd, B.crashEnd + 60], [0, 0.16, 0.12, 0.05], CLAMP);
  const dim = 1 - 0.72 * prog(frame, B.statement - 20, 30, ease.inOut);
  const others = 1 - 0.84 * prog(frame, 0, 30);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse 70% 60% at 40% 60%, rgba(255,70,60,${redTint}) 0%, transparent 70%)` }}
      />
      <Shake intensity={shake} seed="crash">
        <div style={{ position: "absolute", left: SAFE.x, top: SAFE.y }}>
          <Eyebrow index={C.eyebrow[0]} label={C.eyebrow[1]} at={18} />
          <Reveal
            text={C.head}
            at={26}
            stagger={1.6}
            style={{ fontFamily: font.serif, fontWeight: 700, fontSize: 66, color: color.ink, marginTop: 26 }}
          />
        </div>

        <AbsoluteFill style={{ opacity: dim }}>
          <RaceChart
            xMax={xMax}
            yMin={yMin}
            yMax={yMax}
            progress={{ net: netP, ai: RACE_END_MONTH, pc: RACE_END_MONTH }}
            opacity={{ net: 1, ai: others, pc: others }}
            dots={{ net: 1, ai: 1 - prog(frame, 0, 20), pc: 1 - prog(frame, 0, 20) }}
            baseLabel={COPY.race.base}
            baseLabelOpacity={1 - r}
            extra={(sx, sy) => (
              <>
                {frame >= B.peak && (
                  <>
                    <Dot x={sx(PEAK_X)} y={sy(PEAK_N)} fill={color.net} r={8} opacity={fade(frame, B.peak, 8)} />
                    <Callout
                      x={sx(PEAK_X)}
                      y={sy(PEAK_N)}
                      dx={70}
                      dy={-40}
                      title={C.peak[1]}
                      sub={C.peak[0]}
                      tint={color.ink}
                      opacity={fade(frame, B.peak + 4, 14)}
                    />
                  </>
                )}
                {lowShown && (
                  <>
                    <Dot x={sx(LOW_X)} y={sy(LOW_N)} fill={color.red} r={8} opacity={fade(frame, B.crashEnd, 8)} />
                    <Callout
                      x={sx(LOW_X)}
                      y={sy(LOW_N)}
                      dx={-50}
                      dy={36}
                      align="end"
                      title={C.low[1]}
                      sub={C.low[0]}
                      tint={color.red}
                      opacity={fade(frame, B.crashEnd + 4, 14)}
                    />
                  </>
                )}
              </>
            )}
          />
        </AbsoluteFill>
      </Shake>

      {/* 跌幅计数 */}
      <div style={{ position: "absolute", left: 1460, top: 330, opacity: fade(frame, B.crashStart - 10, 14) }}>
        <div style={{ fontFamily: font.sans, fontSize: 26, color: color.muted, fontWeight: 500 }}>{C.drawdown}</div>
        <div
          style={{
            fontFamily: font.mono,
            fontWeight: 800,
            fontSize: 132,
            color: color.red,
            lineHeight: 1.1,
            textShadow: `0 0 50px rgba(255,97,89,${0.5 * prog(frame, B.crashStart, 60)})`,
          }}
        >
          {dd < 0 ? "−" : ""}
          {Math.abs(Math.round(dd))}%
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 20, color: color.body, marginTop: 10, opacity: fade(frame, B.crashEnd, 16) }}>
          5,048.62 → 1,114.11
        </div>
      </div>

      {/* 结论 */}
      <div
        style={{
          position: "absolute",
          left: 190,
          width: 1180,
          top: 470,
          textAlign: "center",
        }}
      >
        <Reveal
          text={C.l1}
          at={B.statement}
          stagger={2}
          style={{ fontFamily: font.serif, fontWeight: 700, fontSize: 70, color: color.body, lineHeight: 1.5 }}
        />
        <Reveal
          text={C.l2}
          at={B.statement + 45}
          stagger={2}
          style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 70, color: color.ink, lineHeight: 1.5 }}
        />
      </div>
    </AbsoluteFill>
  );
};
