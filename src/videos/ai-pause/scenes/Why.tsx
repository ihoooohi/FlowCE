import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { useLayout } from "../../../lib/layout";
import { ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";
import { Header, Rise, Slam, down } from "./parts";

const B = beats<{ head: number; n1: number; n2: number; n3: number; n4: number; ubs: number; big: number; grid: number }>("why");
const C = COPY.why;
const AT = [B.n1, B.n2, B.n3, B.n4];

/** 30 格新增数据中心容量里，挑出 10 格（≈1/3）标成"可能落空"；用固定种子，保证每帧一致 */
const CELLS = 30;
const LOST = new Set(
  Array.from({ length: CELLS }, (_, i) => i)
    .sort((a, b) => random(`dc-${a}`) - random(`dc-${b}`))
    .slice(0, 10),
);

/** 导火索链条：选票 → 州长 → 数据中心 → 芯片；然后是瑞银的估算 */
export const Why: React.FC = () => {
  const frame = useCurrentFrame();
  const { pick, portrait } = useLayout();
  const chainOut = 1 - prog(frame, B.ubs - 8, 18, ease.inOut);

  // 链条卡片
  const cw = pick(360, 920);
  const ch = pick(270, 168);
  const gap = pick(66, 52);
  const x0 = pick(142, 80);
  const y0 = pick(380, 440);
  const pos = (i: number) => (portrait ? { left: x0, top: y0 + i * (ch + gap) } : { left: x0 + i * (cw + gap), top: y0 });

  // 方格
  const cell = pick(62, 72);
  const cg = pick(14, 16);
  const cols = 10;
  const gx = pick(1010, 108);
  const gy = pick(430, 1060);

  return (
    <AbsoluteFill>
      <Header eyebrow={C.eyebrow} head={C.head} />

      {/* 链条 */}
      <AbsoluteFill style={{ opacity: chainOut }}>
        {C.nodes.map((n, i) => {
          const hot = i === 3;
          const p = prog(frame, AT[i], 20, ease.out);
          return (
            <React.Fragment key={n.k}>
              <div
                style={{
                  position: "absolute",
                  ...pos(i),
                  width: cw,
                  height: ch,
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: portrait ? "row" : "column",
                  alignItems: portrait ? "center" : "flex-start",
                  gap: pick(18, 30),
                  padding: pick("30px 30px", "0 34px"),
                  borderRadius: 14,
                  background: hot ? "rgba(255,97,89,0.12)" : "rgba(220,240,235,0.05)",
                  border: `2px solid ${hot ? down : "rgba(220,240,235,0.16)"}`,
                  opacity: p,
                  transform: portrait ? `translateX(${(1 - p) * 40}px)` : `translateY(${(1 - p) * 40}px)`,
                }}
              >
                <div
                  style={{
                    flex: "none",
                    width: pick(84, 96),
                    height: pick(84, 96),
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: hot ? down : color.bgLift,
                    color: hot ? "#1a0b0a" : color.accent,
                    fontFamily: font.sans,
                    fontWeight: 900,
                    fontSize: pick(28, 32),
                  }}
                >
                  {n.k}
                </div>
                <div>
                  <div style={{ fontFamily: font.sans, fontWeight: 900, fontSize: pick(36, 40), color: hot ? down : color.ink, whiteSpace: "nowrap" }}>{n.t}</div>
                  <div style={{ fontFamily: font.sans, fontSize: pick(24, 26), color: color.muted, marginTop: 8, whiteSpace: "nowrap" }}>{n.s}</div>
                </div>
              </div>
              {i < 3 && (
                <div
                  style={{
                    position: "absolute",
                    ...(portrait
                      ? { left: x0 + cw / 2 - 20, top: y0 + i * (ch + gap) + ch + 2, width: 40, height: gap - 4 }
                      : { left: x0 + i * (cw + gap) + cw + 4, top: y0 + ch / 2 - 30, width: gap - 8, height: 60 }),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: font.sans,
                    fontWeight: 900,
                    fontSize: pick(44, 40),
                    color: color.accent,
                    opacity: fade(frame, AT[i + 1] - 8, 10),
                  }}
                >
                  {portrait ? "↓" : "→"}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </AbsoluteFill>

      {/* 瑞银估算 */}
      <div style={{ position: "absolute", left: pick(140, 80), top: pick(330, 430), width: pick(820, 920) }}>
        <Rise at={B.ubs}>
          <div style={{ fontFamily: font.sans, fontWeight: 700, fontSize: pick(34, 36), color: color.muted }}>{C.ubsLabel}</div>
        </Rise>
        <Slam at={B.big} from={1.4} style={{ transformOrigin: "left center" }}>
          <div style={{ fontFamily: font.mono, fontWeight: 800, fontSize: pick(170, 180), color: down, lineHeight: 1.15, letterSpacing: "-0.03em" }}>{C.big}</div>
        </Slam>
        <Rise at={B.big + 10}>
          <div style={{ fontFamily: font.sans, fontWeight: 700, fontSize: pick(38, 40), color: color.ink, lineHeight: 1.5, whiteSpace: "pre-line", marginTop: 6 }}>{C.ubsText}</div>
          <div style={{ fontFamily: font.sans, fontSize: pick(26, 28), color: color.muted, marginTop: 14 }}>{C.ubsNote}</div>
        </Rise>
      </div>
      <svg width={cols * (cell + cg)} height={3 * (cell + cg)} style={{ position: "absolute", left: gx, top: gy, overflow: "visible" }}>
        {Array.from({ length: CELLS }, (_, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const appear = fade(frame, B.ubs + 6 + i * 0.8, 8);
          const lost = LOST.has(i) ? prog(frame, B.grid + [...LOST].indexOf(i) * 3, 12, ease.out) : 0;
          const x = c * (cell + cg);
          const y = r * (cell + cg);
          return (
            <g key={i} opacity={appear}>
              <rect x={x} y={y} width={cell} height={cell} rx={6} fill={color.accent} opacity={0.55 * (1 - lost)} />
              <rect
                x={x + 1.5}
                y={y + 1.5}
                width={cell - 3}
                height={cell - 3}
                rx={6}
                fill="rgba(255,97,89,0.08)"
                stroke={down}
                strokeWidth={3}
                strokeDasharray="7 6"
                opacity={lost}
              />
            </g>
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          left: gx,
          top: gy + 3 * (cell + cg) + 6,
          fontFamily: font.sans,
          fontSize: pick(22, 24),
          color: color.dim,
          opacity: fade(frame, B.grid, 14),
        }}
      >
        {C.gridNote}
      </div>
    </AbsoluteFill>
  );
};
