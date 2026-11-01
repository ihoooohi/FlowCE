import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { NUM } from "../data";
import { beats } from "../timeline";
import { Header, Rise, down } from "./parts";

const B = beats<{ towers: number; goldman: number; money: number; oil: number; fed: number }>("bill");
const C = COPY.bill;

const BASE = 860;
const K = 0.17; // 每亿美元的像素

/** 账单还在变大（资本开支塔 + 高盛估算），钱却在变贵（油价、加息） */
export const Bill: React.FC = () => {
  const frame = useCurrentFrame();
  const left = 1 - 0.35 * prog(frame, B.money, 30, ease.inOut);

  return (
    <AbsoluteFill>
      <Header eyebrow={C.eyebrow} head={C.head} />

      {/* 资本开支塔 */}
      <div style={{ position: "absolute", left: 140, top: 270, opacity: fade(frame, B.towers - 10, 14) * left }}>
        <div style={{ fontFamily: font.mono, fontSize: 20, color: color.muted, letterSpacing: "0.06em" }}>{C.capexLabel}</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", opacity: left }}>
        <line x1={140} x2={720} y1={BASE} y2={BASE} stroke={color.gridStrong} strokeWidth={2} />
        {C.towers.map((t, i) => {
          const p = prog(frame, B.towers + i * 14, 40, ease.inOut);
          const h = NUM.capex[i] * K * p;
          const x = 170 + i * 190;
          return (
            <g key={t.name}>
              <rect x={x} y={BASE - h} width={130} height={h} fill={color.accent} opacity={0.35 + 0.25 * (2 - i) / 2} rx={3} />
              <rect x={x} y={BASE - h} width={130} height={4} fill={color.accent} />
              <text x={x + 65} y={BASE - h - 16} textAnchor="middle" fontFamily={font.mono} fontWeight={800} fontSize={34} fill={color.ink} opacity={p}>
                {t.value}
              </text>
              <text x={x + 65} y={BASE + 42} textAnchor="middle" fontFamily={font.sans} fontWeight={900} fontSize={32} fill={color.body}>
                {t.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 高盛估算 */}
      <Rise at={B.goldman} style={{ position: "absolute", left: 790, top: 430, width: 470, opacity: left }}>
        <div style={{ borderLeft: `4px solid ${color.accent}`, paddingLeft: 26 }}>
          <div style={{ fontFamily: font.sans, fontSize: 26, color: color.body, lineHeight: 1.5, whiteSpace: "pre-line" }}>{C.goldman.label}</div>
          <div style={{ fontFamily: font.mono, fontWeight: 800, fontSize: 64, color: color.accent, marginTop: 12, whiteSpace: "nowrap" }}>{C.goldman.big}</div>
          <div style={{ fontFamily: font.sans, fontSize: 24, color: color.muted, marginTop: 14, lineHeight: 1.5, whiteSpace: "pre-line" }}>{C.goldman.sub}</div>
        </div>
      </Rise>

      {/* 钱在变贵 */}
      <div style={{ position: "absolute", left: 1290, top: 270, width: 500 }}>
        <Rise at={B.money}>
          <div style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 44, color: down }}>{C.moneyLabel}</div>
        </Rise>
        {[
          { at: B.oil, d: C.oil },
          { at: B.fed, d: C.fed },
        ].map(({ at, d }) => (
          <Rise key={d.label} at={at} style={{ marginTop: 40, borderTop: "1px solid rgba(220,240,235,0.12)", paddingTop: 22 }}>
            <div style={{ fontFamily: font.sans, fontSize: 26, color: color.muted }}>{d.label}</div>
            <div style={{ fontFamily: font.mono, fontWeight: 800, fontSize: 60, color: color.ink, marginTop: 6, whiteSpace: "nowrap" }}>{d.big}</div>
            <div style={{ fontFamily: font.sans, fontSize: 26, color: color.body, marginTop: 8 }}>{d.sub}</div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
};
