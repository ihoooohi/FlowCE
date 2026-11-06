import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Shake } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";
import { Header, Rise, down, hitShake, up } from "./parts";

const B = beats<{ head: number; up: number; upNote: number; down: number; downNote: number; net: number }>("coaster");
const C = COPY.coaster;
const UP = 1569;
const DOWN = 1833;

/** 道指两天：选举后大涨 1,569 点，24 小时后跌 1,833 点（瀑布图） */
export const Coaster: React.FC = () => {
  const frame = useCurrentFrame();
  const { pick, W, H } = useLayout();
  const K = pick(0.3, 0.48); // 每点的像素
  const top = pick(330, 540);
  const base = top + UP * K;
  const bw = pick(260, 230);
  const x1 = pick(360, 110);
  const x2 = pick(700, 380);
  const noteX = pick(1080, 650);
  const pu = prog(frame, B.up, 30, ease.inOut);
  const pd = prog(frame, B.down, 34, ease.in);
  const hUp = UP * K * pu;
  const hDown = DOWN * K * pd;
  const net = prog(frame, B.net, 20, ease.out);
  const valSize = pick(54, 50);

  return (
    <AbsoluteFill>
      <Header eyebrow={C.eyebrow} head={C.head} />
      <Shake intensity={hitShake(frame, [B.down + 30], 9)} seed="coaster">
        <svg width={W} height={H} style={{ position: "absolute" }}>
          {/* 11/3 收盘水平 */}
          <line x1={x1 - 30} x2={noteX + pick(560, 330)} y1={base} y2={base} stroke={color.gridStrong} strokeWidth={2} strokeDasharray="8 8" opacity={0.5 + 0.5 * net} />
          <text x={x1 - 30} y={base + 34} fontFamily={font.mono} fontSize={pick(22, 24)} fill={color.muted} opacity={fade(frame, B.up, 16)}>
            {C.base}
          </text>
          {/* 第一天：涨 */}
          <rect x={x1} y={base - hUp} width={bw} height={hUp} fill={up} opacity={0.75} rx={4} />
          {/* 两天之间的连接线 */}
          <line x1={x1 + bw} x2={x2} y1={top} y2={top} stroke={color.body} strokeWidth={2} strokeDasharray="4 6" opacity={fade(frame, B.down - 6, 10)} />
          {/* 第二天：跌 */}
          <rect x={x2} y={top} width={bw} height={hDown} fill={down} opacity={0.8} rx={4} />
          {/* 跌破选举日收盘的那一截 */}
          <rect x={x2} y={base} width={bw} height={Math.max(0, (DOWN - UP) * K * net)} fill={down} rx={2} opacity={net} />
          {[
            { x: x1, d: C.days[0], at: B.up, tint: up },
            { x: x2, d: C.days[1], at: B.down, tint: down },
          ].map(({ x, d, at, tint }) => (
            <g key={d.date} opacity={fade(frame, at - 4, 12)}>
              <text x={x + bw / 2} y={top - 24} textAnchor="middle" fontFamily={font.sans} fontWeight={700} fontSize={pick(30, 32)} fill={color.body}>
                {d.date}
              </text>
              <text x={x + bw / 2} y={top + valSize + 22} textAnchor="middle" fontFamily={font.mono} fontWeight={800} fontSize={valSize} fill={color.ink} opacity={fade(frame, at + 18, 10)}>
                {d.value}
              </text>
              <text x={x + bw / 2} y={top + valSize + 66} textAnchor="middle" fontFamily={font.mono} fontWeight={700} fontSize={pick(30, 30)} fill={color.ink} opacity={0.8 * fade(frame, at + 22, 10)}>
                {d.pct}
              </text>
            </g>
          ))}
        </svg>
      </Shake>

      {/* 注释列 */}
      <Rise at={B.upNote} style={{ position: "absolute", left: noteX, top: top - 10, borderLeft: `5px solid ${up}`, paddingLeft: 24 }}>
        <div style={{ fontFamily: font.sans, fontWeight: 900, fontSize: pick(40, 36), color: up, lineHeight: 1.4, whiteSpace: "pre-line" }}>{C.upNote}</div>
      </Rise>
      <Rise at={B.downNote} style={{ position: "absolute", left: noteX, top: pick(560, 880), borderLeft: `5px solid ${down}`, paddingLeft: 24 }}>
        <div style={{ fontFamily: font.sans, fontWeight: 900, fontSize: pick(40, 36), color: down, lineHeight: 1.4, whiteSpace: "pre-line" }}>{C.downNote}</div>
      </Rise>
      <Rise at={B.net} style={{ position: "absolute", left: noteX, top: base + pick(14, 16) }}>
        <div style={{ fontFamily: font.mono, fontWeight: 800, fontSize: pick(40, 34), color: color.ink, whiteSpace: "nowrap" }}>{C.net}</div>
        <div style={{ fontFamily: font.sans, fontSize: pick(26, 24), color: color.body, marginTop: 6, whiteSpace: "nowrap" }}>{C.netSub}</div>
      </Rise>
    </AbsoluteFill>
  );
};
