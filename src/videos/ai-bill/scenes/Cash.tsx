import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CLAMP, ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { NUM } from "../data";
import { beats } from "../timeline";
import { Header, Rise, down, up } from "./parts";

const B = beats<{ wf: number; amzn: number; fund: number; stamp: number }>("cash");
const C = COPY.cash;

const BASE = 640; // 零轴
const K = 0.5; // 每亿美元的像素
const BAR = 150;

const fmtSigned = (v: number) => (v > 0 ? `+${v}` : `−${Math.abs(v)}`);

/** 增长不等于现金：Alphabet 现金流瀑布 + 亚马逊自由现金流 + 钱从哪来 */
export const Cash: React.FC = () => {
  const frame = useCurrentFrame();
  const { ocf, capex, fcf } = NUM.alphabet;

  // Alphabet 瀑布
  const pO = prog(frame, B.wf, 26, ease.out);
  const pC = prog(frame, B.wf + 40, 30, ease.inOut);
  const pF = prog(frame, B.wf + 82, 20, ease.out);
  const topO = BASE - ocf * K;
  const xs = [200, 430, 660];

  // 亚马逊
  const pA1 = prog(frame, B.amzn, 22, ease.out);
  const pA2 = prog(frame, B.amzn + 24, 30, ease.inOut);
  const KA = 0.38;
  const ax = [1180, 1460];

  const stamp = prog(frame, B.stamp, 12, ease.out);
  const glow = interpolate(frame, [B.wf + 82, B.wf + 100, B.wf + 160], [0, 1, 0.4], CLAMP);

  const valueText = (x: number, y: number, v: number, op: number, tint: string, anchor: "start" | "middle" = "middle") => (
    <text x={x} y={y} textAnchor={anchor} fontFamily={font.mono} fontWeight={800} fontSize={40} fill={tint} opacity={op}>
      {fmtSigned(v)}
    </text>
  );

  return (
    <AbsoluteFill>
      <Header eyebrow={C.eyebrow} head={C.head} />

      <div style={{ position: "absolute", left: 140, top: 290, opacity: fade(frame, B.wf - 20, 16) }}>
        <span style={{ fontFamily: font.sans, fontWeight: 700, fontSize: 30, color: color.ink }}>{C.alphabetTitle}</span>
        <span style={{ fontFamily: font.mono, fontSize: 18, color: color.muted, marginLeft: 16 }}>{C.unit}</span>
      </div>
      <div style={{ position: "absolute", left: 1080, top: 290, opacity: fade(frame, B.amzn - 16, 16) }}>
        <span style={{ fontFamily: font.sans, fontWeight: 700, fontSize: 30, color: color.ink }}>{C.amazonTitle}</span>
        <span style={{ fontFamily: font.mono, fontSize: 18, color: color.muted, marginLeft: 16 }}>{C.unit}</span>
      </div>

      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {/* 零轴 */}
        <line x1={140} x2={940} y1={BASE} y2={BASE} stroke={color.gridStrong} strokeWidth={2} opacity={fade(frame, B.wf - 20, 16)} />
        <line x1={1080} x2={1780} y1={BASE} y2={BASE} stroke={color.gridStrong} strokeWidth={2} opacity={fade(frame, B.amzn - 16, 16)} />

        {/* 经营现金流：自零轴向上 */}
        <rect x={xs[0]} y={BASE - ocf * K * pO} width={BAR} height={ocf * K * pO} fill={up} opacity={0.85} rx={3} />
        {valueText(xs[0] + BAR / 2, topO - 16, ocf, fade(frame, B.wf + 16, 10), up)}
        {/* 资本开支：从经营现金流顶端往下 */}
        <line x1={xs[0] + BAR} x2={xs[1]} y1={topO} y2={topO} stroke={color.dim} strokeDasharray="6 6" opacity={pC} />
        <rect x={xs[1]} y={topO} width={BAR} height={capex * K * pC} fill={down} opacity={0.8} rx={3} />
        {valueText(xs[1] + BAR / 2, topO - 16, -capex, fade(frame, B.wf + 56, 10), down)}
        {/* 自由现金流：落到零轴以下 */}
        <line x1={xs[1] + BAR} x2={xs[2]} y1={BASE - fcf * K} y2={BASE - fcf * K} stroke={color.dim} strokeDasharray="6 6" opacity={pF} />
        <rect
          x={xs[2]}
          y={BASE}
          width={BAR}
          height={-fcf * K * pF}
          fill={down}
          rx={3}
          style={{ filter: `drop-shadow(0 0 ${18 * glow}px rgba(255,97,89,0.9))` }}
        />
        {valueText(xs[2] + BAR + 18, BASE - fcf * K + 6, fcf, fade(frame, B.wf + 92, 10), down, "start")}
        {C.alphabetBars.map((n, i) => (
          <text key={n} x={xs[i] + BAR / 2} y={745} textAnchor="middle" fontFamily={font.sans} fontSize={26} fill={color.body} opacity={fade(frame, B.wf + i * 40, 12)}>
            {n}
          </text>
        ))}

        {/* 亚马逊：一年前 vs 现在 */}
        <rect x={ax[0]} y={BASE - NUM.amazonFcf.before * KA * pA1} width={170} height={NUM.amazonFcf.before * KA * pA1} fill={up} opacity={0.85} rx={3} />
        {valueText(ax[0] + 85, BASE - NUM.amazonFcf.before * KA - 16, NUM.amazonFcf.before, fade(frame, B.amzn + 12, 10), up)}
        <rect
          x={ax[1]}
          y={BASE}
          width={170}
          height={-NUM.amazonFcf.now * KA * pA2}
          fill={down}
          rx={3}
          style={{ filter: `drop-shadow(0 0 ${14 * pA2}px rgba(255,97,89,0.7))` }}
        />
        {valueText(ax[1] + 85, BASE - NUM.amazonFcf.now * KA + 44, NUM.amazonFcf.now, fade(frame, B.amzn + 46, 10), down)}
        {C.amazonBars.map((n, i) => (
          <text key={n} x={ax[i] + 85} y={i === 0 ? BASE + 40 : BASE - 18} textAnchor="middle" fontFamily={font.sans} fontSize={26} fill={color.body} opacity={fade(frame, B.amzn + i * 24, 12)}>
            {n}
          </text>
        ))}
      </svg>

      {/* 钱从哪来 */}
      <div style={{ position: "absolute", left: 140, top: 905, display: "flex", alignItems: "center", gap: 28 }}>
        <Rise at={B.fund - 6}>
          <div style={{ fontFamily: font.mono, fontSize: 22, color: color.muted, letterSpacing: "0.06em", width: 330 }}>{C.fundLabel}</div>
        </Rise>
        {C.fund.map((f, i) => (
          <Rise key={f} at={B.fund + 8 + i * 22}>
            <div
              style={{
                fontFamily: font.sans,
                fontWeight: 700,
                fontSize: 38,
                color: color.ink,
                border: `2px solid ${color.gridStrong}`,
                borderRadius: 6,
                padding: "10px 26px",
              }}
            >
              {f}
            </div>
          </Rise>
        ))}
        <div
          style={{
            marginLeft: 30,
            fontFamily: font.mono,
            fontWeight: 800,
            fontSize: 52,
            color: down,
            border: `5px solid ${down}`,
            borderRadius: 8,
            padding: "4px 26px",
            opacity: stamp,
            transform: `rotate(-8deg) scale(${2.2 - 1.2 * stamp})`,
          }}
        >
          {C.stamp}
        </div>
      </div>
    </AbsoluteFill>
  );
};
