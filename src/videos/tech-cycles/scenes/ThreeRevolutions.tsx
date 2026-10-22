import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { linear } from "../../../lib/chart";
import { Eyebrow, Reveal } from "../../../lib/components";
import { ease, fade, prog } from "../../../lib/motion";
import { SAFE, color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";

const B = beats<{ line: number; m1: number; m2: number; m3: number; q: number }>("three");
const C = COPY.three;

const AXIS_Y = 690;
const X = linear(1981, 2027, 170, 1750);
const TINT = { pc: color.pc, net: color.net, ai: color.ai } as const;
const STARTS = [1981.58, 1996.0, 2022.83];
const ENDS = [1996.0, 2022.83, 2026.8];

export const ThreeRevolutions: React.FC = () => {
  const frame = useCurrentFrame();
  const lineP = prog(frame, B.line, 60, ease.inOut);
  const at = [B.m1, B.m2, B.m3];

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.x, top: SAFE.y }}>
        <Eyebrow index={C.eyebrow[0]} label={C.eyebrow[1]} at={4} />
        <Reveal
          text={C.head}
          at={10}
          stagger={1.8}
          style={{ fontFamily: font.serif, fontWeight: 700, fontSize: 70, color: color.ink, marginTop: 26 }}
        />
      </div>

      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {/* 时间轴 */}
        <line x1={X(1981)} x2={X(1981) + (X(2027) - X(1981)) * lineP} y1={AXIS_Y} y2={AXIS_Y} stroke={color.dim} strokeWidth={2} />
        {[1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025].map((yr, i) => (
          <g key={yr} opacity={fade(frame, B.line + 10 + i * 4, 12)}>
            <line x1={X(yr)} x2={X(yr)} y1={AXIS_Y} y2={AXIS_Y + 10} stroke={color.dim} strokeWidth={2} />
            <text x={X(yr)} y={AXIS_Y + 42} textAnchor="middle" fontFamily={font.mono} fontSize={20} fill={color.muted}>
              {yr}
            </text>
          </g>
        ))}

        {C.items.map((it, i) => {
          const tint = TINT[it.key as keyof typeof TINT];
          const stem = prog(frame, at[i], 22);
          const bar = prog(frame, at[i] + 10, 50, ease.inOut);
          const x = X(STARTS[i]);
          const x2 = X(ENDS[i]);
          return (
            <g key={it.key}>
              <line x1={x} x2={x + (x2 - x) * bar} y1={AXIS_Y} y2={AXIS_Y} stroke={tint} strokeWidth={6} strokeLinecap="round" />
              <line x1={x} x2={x} y1={AXIS_Y} y2={AXIS_Y - 210 * stem} stroke={tint} strokeWidth={2} opacity={0.7} />
              {stem > 0 && (
                <>
                  <circle cx={x} cy={AXIS_Y} r={10 + 14 * (1 - stem)} fill={tint} opacity={0.25 * stem} />
                  <circle cx={x} cy={AXIS_Y} r={8} fill={tint} />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {C.items.map((it, i) => {
        const tint = TINT[it.key as keyof typeof TINT];
        const x = X(STARTS[i]);
        const right = i === 2;
        const p = prog(frame, at[i] + 8, 26);
        return (
          <div
            key={it.key}
            style={{
              position: "absolute",
              top: 300,
              left: right ? undefined : x - 2,
              right: right ? 1920 - x - 2 : undefined,
              textAlign: right ? "right" : "left",
              opacity: p,
              transform: `translateY(${(1 - p) * 30}px)`,
              borderLeft: right ? undefined : `2px solid ${tint}`,
              borderRight: right ? `2px solid ${tint}` : undefined,
              padding: right ? "0 22px 0 0" : "0 0 0 22px",
              height: 180,
            }}
          >
            <div style={{ fontFamily: font.mono, fontSize: 30, color: color.ink, fontWeight: 700, letterSpacing: "0.06em" }}>{it.date}</div>
            <div style={{ fontFamily: font.sans, fontWeight: 900, fontSize: 60, color: tint, marginTop: 6 }}>{it.name}</div>
            <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 27, color: color.body, marginTop: 10 }}>{it.tag}</div>
          </div>
        );
      })}

      <div style={{ position: "absolute", left: SAFE.x, top: 820 }}>
        <Reveal
          text={C.q}
          at={B.q}
          stagger={1.6}
          style={{ fontFamily: font.serif, fontWeight: 700, fontSize: 50, color: color.ink, lineHeight: 1.55 }}
        />
      </div>
    </AbsoluteFill>
  );
};
