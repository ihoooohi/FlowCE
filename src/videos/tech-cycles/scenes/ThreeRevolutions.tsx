import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { linear } from "../../../lib/chart";
import { Eyebrow, Reveal } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";

const B = beats<{ line: number; m1: number; m2: number; m3: number; q: number }>("three");
const C = COPY.three;

const TINT = { pc: color.pc, net: color.net, ai: color.ai } as const;
const STARTS = [1981.58, 1996.0, 2022.83];
const ENDS = [1996.0, 2022.83, 2026.8];
const TICKS = [1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025];

/** 横版：水平时间轴、卡片在上方；竖版：纵向时间轴、卡片在右侧 */
export const ThreeRevolutions: React.FC = () => {
  const frame = useCurrentFrame();
  const { W, H, portrait, pick, padX, top } = useLayout();
  const lineP = prog(frame, B.line, 60, ease.inOut);
  const at = [B.m1, B.m2, B.m3];

  // 横版：轴在 y=690；竖版：轴在 x=170，从上往下
  const AXIS = pick(690, 170);
  const T = portrait ? linear(1981, 2027, 440, 1110) : linear(1981, 2027, 170, 1750);
  const pos = (t: number) => (portrait ? { x: AXIS, y: T(t) } : { x: T(t), y: AXIS });
  const a0 = pos(1981);
  const a1 = pos(1981 + 46 * lineP);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: padX, top }}>
        <Eyebrow index={C.eyebrow[0]} label={C.eyebrow[1]} at={4} />
        <Reveal
          text={C.head}
          at={10}
          stagger={1.8}
          style={{ fontFamily: font.serif, fontWeight: 700, fontSize: pick(70, 62), color: color.ink, marginTop: 26, maxWidth: W - 2 * padX }}
        />
      </div>

      <svg width={W} height={H} style={{ position: "absolute" }}>
        <line x1={a0.x} x2={a1.x} y1={a0.y} y2={a1.y} stroke={color.dim} strokeWidth={2} />
        {TICKS.map((yr, i) => {
          const p = pos(yr);
          return (
            <g key={yr} opacity={fade(frame, B.line + 10 + i * 4, 12)}>
              {portrait ? (
                <>
                  <line x1={p.x - 10} x2={p.x} y1={p.y} y2={p.y} stroke={color.dim} strokeWidth={2} />
                  <text x={p.x - 22} y={p.y + 7} textAnchor="end" fontFamily={font.mono} fontSize={20} fill={color.muted}>
                    {yr}
                  </text>
                </>
              ) : (
                <>
                  <line x1={p.x} x2={p.x} y1={p.y} y2={p.y + 10} stroke={color.dim} strokeWidth={2} />
                  <text x={p.x} y={p.y + 42} textAnchor="middle" fontFamily={font.mono} fontSize={20} fill={color.muted}>
                    {yr}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {C.items.map((it, i) => {
          const tint = TINT[it.key as keyof typeof TINT];
          const stem = prog(frame, at[i], 22);
          const bar = prog(frame, at[i] + 10, 50, ease.inOut);
          const p = pos(STARTS[i]);
          const q = pos(STARTS[i] + (ENDS[i] - STARTS[i]) * bar);
          const stemEnd = portrait ? { x: p.x + 60 * stem, y: p.y } : { x: p.x, y: p.y - 210 * stem };
          return (
            <g key={it.key}>
              <line x1={p.x} x2={q.x} y1={p.y} y2={q.y} stroke={tint} strokeWidth={6} strokeLinecap="round" />
              <line x1={p.x} x2={stemEnd.x} y1={p.y} y2={stemEnd.y} stroke={tint} strokeWidth={2} opacity={0.7} />
              {stem > 0 && (
                <>
                  <circle cx={p.x} cy={p.y} r={10 + 14 * (1 - stem)} fill={tint} opacity={0.25 * stem} />
                  <circle cx={p.x} cy={p.y} r={8} fill={tint} />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {C.items.map((it, i) => {
        const tint = TINT[it.key as keyof typeof TINT];
        const p = pos(STARTS[i]);
        const right = !portrait && i === 2;
        const show = prog(frame, at[i] + 8, 26);
        const box: React.CSSProperties = portrait
          ? { top: p.y - 26, left: p.x + 70, borderLeft: `2px solid ${tint}`, padding: "0 0 0 22px" }
          : {
              top: 300,
              left: right ? undefined : p.x - 2,
              right: right ? W - p.x - 2 : undefined,
              textAlign: right ? "right" : "left",
              borderLeft: right ? undefined : `2px solid ${tint}`,
              borderRight: right ? `2px solid ${tint}` : undefined,
              padding: right ? "0 22px 0 0" : "0 0 0 22px",
              height: 180,
            };
        return (
          <div
            key={it.key}
            style={{
              position: "absolute",
              ...box,
              opacity: show,
              transform: portrait ? `translateX(${(1 - show) * 30}px)` : `translateY(${(1 - show) * 30}px)`,
            }}
          >
            <div style={{ fontFamily: font.mono, fontSize: pick(30, 28), color: color.ink, fontWeight: 700, letterSpacing: "0.06em" }}>{it.date}</div>
            <div style={{ fontFamily: font.sans, fontWeight: 900, fontSize: pick(60, 54), color: tint, marginTop: 6 }}>{it.name}</div>
            <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 27, color: color.body, marginTop: 10 }}>{it.tag}</div>
          </div>
        );
      })}

      <div style={{ position: "absolute", left: padX, top: pick(820, 1295) }}>
        <Reveal
          text={C.q}
          at={B.q}
          stagger={1.6}
          style={{ fontFamily: font.serif, fontWeight: 700, fontSize: pick(50, 46), color: color.ink, lineHeight: 1.55 }}
        />
      </div>
    </AbsoluteFill>
  );
};
