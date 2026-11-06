import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop, Grain, Vignette } from "../../lib/components";
import { useFontsReady } from "../../lib/fonts";
import { useLayout } from "../../lib/layout";
import { color, font } from "../../lib/theme";
import { ALL_TEXT, COPY } from "./copy";

const C = COPY.cover;

/** 投稿封面：大红数字 + 一个问题。横版 16:9，竖版 3:4 */
export const Cover: React.FC = () => {
  useFontsReady(ALL_TEXT);
  const { pick, portrait } = useLayout();
  return (
    <AbsoluteFill style={{ backgroundColor: "#060d0e" }}>
      <Backdrop />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 65% 55% at 50% 52%, rgba(255,60,50,0.32) 0%, transparent 70%)" }} />
      {/* 下跌箭头背景 */}
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", opacity: 0.16 }}>
        <polyline points="0,18 14,24 22,20 34,38 44,33 58,58 66,52 80,78 100,96" fill="none" stroke={color.red} strokeWidth={1.4} vectorEffect="non-scaling-stroke" style={{ strokeWidth: 10 }} />
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: pick(10, 20) }}>
        <div
          style={{
            padding: pick("8px 26px", "10px 30px"),
            background: color.red,
            color: "#1a0b0a",
            fontFamily: font.sans,
            fontWeight: 900,
            fontSize: pick(52, 60),
            borderRadius: 10,
            transform: "rotate(-2deg)",
          }}
        >
          {C.kicker}
        </div>
        <div style={{ fontFamily: font.serif, fontWeight: 900, fontSize: pick(150, 150), color: color.ink, marginTop: pick(20, 40), lineHeight: 1.1 }}>{C.line1}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, color: color.red, textShadow: "0 0 60px rgba(255,97,89,0.55)", lineHeight: 1 }}>
          <span style={{ fontFamily: font.mono, fontWeight: 800, fontSize: pick(330, 360) }}>{C.num}</span>
          <span style={{ fontFamily: font.sans, fontWeight: 900, fontSize: pick(150, 130) }}>{C.unit}</span>
        </div>
        <div
          style={{
            marginTop: pick(26, 44),
            padding: pick("12px 36px", "14px 30px"),
            background: "#f6d24a",
            color: "#151006",
            fontFamily: font.sans,
            fontWeight: 900,
            fontSize: pick(64, 58),
            borderRadius: 12,
            whiteSpace: "nowrap",
          }}
        >
          {C.q}
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: pick(36, 22), marginTop: pick(30, 46) }}>
          {C.stats.map((s) => (
            <div key={s} style={{ fontFamily: font.sans, fontWeight: 900, fontSize: pick(44, 40), color: color.ink, whiteSpace: "nowrap" }}>
              <span style={{ color: color.red }}>▼</span> {s}
            </div>
          ))}
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          ...(portrait ? { left: 0, right: 0, bottom: 50, textAlign: "center" } : { right: 60, bottom: 40 }),
          fontFamily: font.mono,
          fontSize: pick(26, 26),
          letterSpacing: "0.14em",
          color: color.muted,
        }}
      >
        市场的长镜头 · 03
      </div>
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
