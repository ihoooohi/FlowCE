import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useLayout } from "../../../lib/layout";
import { CLAMP, ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";
import { Header, Rise, Stamp, down } from "./parts";

const B = beats<{ head: number; fill: number; cross: number; stamp: number; cb: number; cb2: number }>("corr");
const C = COPY.corr;
const SCALE = 15; // 量尺底部 = −15%

/** 回撤量尺：从 10/6 高点一路跌穿 −10% 回调线；再接回上期 */
export const Corr: React.FC = () => {
  const frame = useCurrentFrame();
  const { pick, portrait } = useLayout();
  const gx = pick(220, 120);
  const gw = pick(90, 100);
  const gTop = pick(340, 460);
  const gH = pick(540, 780);
  const y = (v: number) => gTop + (v / SCALE) * gH;
  const v = interpolate(frame, [B.fill, B.cross, B.cross + 24], [0, 10, 11.9], { ...CLAMP, easing: ease.inOut });
  const crossed = prog(frame, B.cross, 10, ease.out);
  const lx = gx + gw + 40;
  const gaugeOp = portrait ? 1 - prog(frame, B.cb - 10, 16, ease.inOut) : 1;

  const cards = [
    { d: C.prev, at: B.cb, hot: false },
    { d: C.now, at: B.cb2, hot: true },
  ];

  return (
    <AbsoluteFill>
      <Header eyebrow={C.eyebrow} head={C.head} />

      <AbsoluteFill style={{ opacity: gaugeOp }}>
        {/* 顶部：历史高点 */}
        <div style={{ position: "absolute", left: lx, top: gTop - 20, fontFamily: font.mono, fontSize: pick(24, 26), color: color.muted, whiteSpace: "nowrap", opacity: fade(frame, B.fill - 16, 14) }}>
          {C.top}
        </div>
        <svg width={pick(1100, 1080)} height={pick(1080, 1920)} style={{ position: "absolute", left: 0, top: 0 }}>
          <defs>
            <linearGradient id="dd" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color.accent} />
              <stop offset="1" stopColor={down} />
            </linearGradient>
          </defs>
          <rect x={gx} y={gTop} width={gw} height={gH} rx={8} fill="rgba(220,240,235,0.05)" stroke={color.gridStrong} strokeWidth={2} />
          <rect x={gx} y={gTop} width={gw} height={y(v) - gTop} rx={8} fill="url(#dd)" opacity={0.85} />
          {[0, 5, 10, 15].map((t) => (
            <text key={t} x={gx - 16} y={y(t) + 8} textAnchor="end" fontFamily={font.mono} fontSize={pick(22, 24)} fill={color.dim}>
              {t === 0 ? "0%" : `−${t}%`}
            </text>
          ))}
          {C.marks.map((m) => {
            const line = m.v === 10;
            const op = line ? fade(frame, B.fill - 10, 14) : fade(frame, m.v <= 8 ? B.fill + 30 : B.cross + 20, 12);
            return (
              <line
                key={m.label}
                x1={gx - 10}
                x2={line ? lx + pick(560, 640) : gx + gw + 24}
                y1={y(m.v)}
                y2={y(m.v)}
                stroke={line ? down : color.ink}
                strokeWidth={line ? 3 : 2}
                strokeDasharray={line ? "10 8" : undefined}
                opacity={op * (line ? 0.6 + 0.4 * crossed : 1)}
              />
            );
          })}
        </svg>
        {C.marks.map((m) => {
          const line = m.v === 10;
          const at = line ? B.fill - 10 : m.v <= 8 ? B.fill + 30 : B.cross + 20;
          return (
            <div
              key={m.label}
              style={{
                position: "absolute",
                left: line ? lx + pick(330, 380) : lx,
                top: y(m.v) - pick(line ? 44 : 26, line ? 48 : 28),
                display: "flex",
                alignItems: "baseline",
                gap: 18,
                whiteSpace: "nowrap",
                opacity: fade(frame, at, 12),
              }}
            >
              <span style={{ fontFamily: font.mono, fontWeight: 800, fontSize: pick(line ? 30 : 44, line ? 32 : 46), color: line ? down : m.v > 10 ? down : color.ink }}>
                {m.sub}
              </span>
              <span style={{ fontFamily: font.sans, fontWeight: 700, fontSize: pick(28, 30), color: line ? down : color.body }}>{m.label}</span>
            </div>
          );
        })}
        <Stamp at={B.stamp} text={C.stamp} size={pick(54, 60)} rotate={-6} style={{ position: "absolute", left: lx + pick(10, 0), top: y(11.9) + pick(46, 50) }} />
      </AbsoluteFill>

      {/* 系列回扣：上期 → 这期 */}
      {cards.map(({ d, at, hot }, i) => (
        <Rise
          key={d.title}
          at={at}
          style={{
            position: "absolute",
            left: pick(1100, 80),
            top: pick(330 + i * 300, 470 + i * 400),
            width: pick(680, 920),
            boxSizing: "border-box",
            padding: pick("30px 36px", "36px 40px"),
            borderRadius: 16,
            background: hot ? "rgba(255,97,89,0.12)" : "rgba(10,21,23,0.85)",
            border: `2px solid ${hot ? down : "rgba(220,240,235,0.18)"}`,
          }}
        >
          <div style={{ fontFamily: font.mono, fontSize: pick(24, 26), letterSpacing: "0.12em", color: hot ? down : color.muted }}>{d.tag}</div>
          <div style={{ fontFamily: font.serif, fontWeight: 900, fontSize: pick(60, 72), color: hot ? color.ink : color.body, marginTop: 10 }}>{d.title}</div>
          <div style={{ fontFamily: font.sans, fontSize: pick(30, 34), color: hot ? color.ink : color.muted, marginTop: 10 }}>{d.sub}</div>
        </Rise>
      ))}
      <div
        style={{
          position: "absolute",
          left: pick(1100 + 340 - 20, 80 + 460 - 22),
          top: pick(330 + 238, 470 + 318),
          fontFamily: font.sans,
          fontWeight: 900,
          fontSize: 48,
          color: color.accent,
          opacity: fade(frame, B.cb2 - 10, 10),
        }}
      >
        ↓
      </div>
    </AbsoluteFill>
  );
};
