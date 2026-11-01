import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";
import { Header, Rise, down, up } from "./parts";

const B = beats<{ c1: number; c2: number; red: number; c3: number; red3: number }>("earnings");
const C = COPY.earnings;

/** 一周财报：三张卡片，增长是绿的，股价是红的 */
export const Earnings: React.FC = () => {
  const frame = useCurrentFrame();
  const show = [B.c1, B.c2, B.c3];
  const reds = [B.red, B.red, B.red3];

  return (
    <AbsoluteFill>
      <Header eyebrow={C.eyebrow} head={C.head} />
      <div style={{ position: "absolute", left: 140, top: 330, display: "flex", gap: 60 }}>
        {C.cards.map((c, i) => {
          const r = prog(frame, reds[i], 14, ease.out);
          return (
            <Rise key={c.name} at={show[i]} dist={50} style={{ width: 507 }}>
              <div style={{ height: 4, background: r > 0 ? down : color.gridStrong, opacity: 0.4 + 0.6 * r }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 26 }}>
                <span style={{ fontFamily: font.sans, fontWeight: 900, fontSize: 52, color: color.ink }}>{c.name}</span>
                <span style={{ fontFamily: font.mono, fontSize: 22, color: color.muted }}>{c.date}</span>
              </div>
              <div style={{ fontFamily: font.mono, fontSize: 20, color: up, letterSpacing: "0.2em", marginTop: 34 }}>{C.growthLabel}</div>
              {c.growth.map((g) => (
                <div key={g} style={{ fontFamily: font.sans, fontWeight: 700, fontSize: 40, color: color.ink, marginTop: 10 }}>
                  <span style={{ color: up, fontSize: 30, marginRight: 14 }}>▲</span>
                  {g}
                </div>
              ))}
              <div style={{ height: 1, background: "rgba(220,240,235,0.12)", margin: "30px 0 24px" }} />
              <div style={{ opacity: fade(frame, reds[i] - 2, 8) }}>
                <div style={{ fontFamily: font.mono, fontSize: 20, color: down, letterSpacing: "0.2em" }}>{C.stockLabel}</div>
                <div
                  style={{
                    fontFamily: font.mono,
                    fontWeight: 800,
                    fontSize: 60,
                    color: down,
                    marginTop: 8,
                    transform: `scale(${1.25 - 0.25 * r})`,
                    transformOrigin: "left center",
                    textShadow: `0 0 36px rgba(255,97,89,${0.4 * r})`,
                  }}
                >
                  ▼ {c.stock}
                </div>
                {c.note && <div style={{ fontFamily: font.sans, fontSize: 24, color: color.body, marginTop: 14, lineHeight: 1.5, whiteSpace: "pre-line" }}>{c.note}</div>}
              </div>
            </Rise>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
