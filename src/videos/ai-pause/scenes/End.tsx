import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Reveal } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { CLAMP, ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";
import { Rise, down, up } from "./parts";

const B = beats<{ q: number; a: number; b: number; comment: number; follow: number; foot: number }>("end");
const C = COPY.end;

/** 结尾：抛问题（A 错杀 / B 转折点）→ 评论区 → 关注 */
export const End: React.FC = () => {
  const frame = useCurrentFrame();
  const { pick, portrait, W } = useLayout();
  const tints = [up, down];
  const pulse = 1 + 0.04 * Math.sin(((frame - B.follow) / 30) * Math.PI * 2) * prog(frame, B.follow + 16, 10);

  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: pick(150, 330) }}>
      <Reveal
        text={C.q}
        at={B.q}
        stagger={2}
        style={{ fontFamily: font.serif, fontWeight: 900, fontSize: pick(92, 92), color: color.ink, whiteSpace: "nowrap" }}
      />
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: pick(50, 34), marginTop: pick(56, 70) }}>
        {C.options.map((o, i) => {
          const at = [B.a, B.b][i];
          const p = prog(frame, at, 16, ease.out);
          return (
            <div
              key={o.k}
              style={{
                width: pick(560, 860),
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: 30,
                padding: pick("28px 34px", "28px 36px"),
                borderRadius: 18,
                border: `3px solid ${tints[i]}`,
                background: `${tints[i]}1f`,
                opacity: p,
                transform: `scale(${1.15 - 0.15 * p})`,
              }}
            >
              <div
                style={{
                  flex: "none",
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  background: tints[i],
                  color: "#08110f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: font.mono,
                  fontWeight: 800,
                  fontSize: 56,
                }}
              >
                {o.k}
              </div>
              <div>
                <div style={{ fontFamily: font.sans, fontWeight: 900, fontSize: pick(56, 60), color: color.ink }}>{o.t}</div>
                <div style={{ fontFamily: font.sans, fontSize: pick(26, 28), color: color.body, marginTop: 4 }}>{o.s}</div>
              </div>
            </div>
          );
        })}
      </div>
      <Rise at={B.comment} style={{ marginTop: pick(44, 56) }}>
        <div style={{ fontFamily: font.sans, fontWeight: 700, fontSize: pick(38, 40), color: color.accent }}>{C.comment} ↓</div>
      </Rise>

      {/* 关注 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          marginTop: pick(50, 80),
          opacity: fade(frame, B.follow, 12),
          transform: `translateY(${(1 - prog(frame, B.follow, 18)) * 30}px)`,
        }}
      >
        <div
          style={{
            padding: "14px 40px",
            borderRadius: 999,
            background: color.accent,
            color: "#1a0d08",
            fontFamily: font.sans,
            fontWeight: 900,
            fontSize: pick(40, 44),
            transform: `scale(${pulse})`,
          }}
        >
          + {C.follow}
        </div>
        <div style={{ fontFamily: font.sans, fontWeight: 700, fontSize: pick(34, 34), color: color.ink, whiteSpace: "nowrap" }}>{C.followSub}</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: pick(140, 80),
          right: pick(140, 80),
          ...(portrait ? { top: 1640 } : { bottom: 150 }),
          maxWidth: W - pick(280, 160),
          fontFamily: font.sans,
          fontSize: pick(20, 22),
          lineHeight: 1.6,
          color: color.dim,
          textAlign: "center",
          opacity: interpolate(frame, [B.foot, B.foot + 16], [0, 1], CLAMP),
        }}
      >
        {COPY.series} ｜ {C.footer}
      </div>
    </AbsoluteFill>
  );
};
