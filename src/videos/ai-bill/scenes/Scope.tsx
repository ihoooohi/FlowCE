import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Reveal } from "../../../lib/components";
import { ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";
import { Header, Rise, down, up } from "./parts";

const B = beats<{ title: number; titleOut: number; scope: number; cap: number }>("scope");
const C = COPY.scope;

/** 片名 → 跌了多少、谁在跌 */
export const Scope: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOp = 1 - prog(frame, B.titleOut, 14, ease.inOut);
  const drop = prog(frame, B.scope + 10, 40, ease.inOut);

  return (
    <AbsoluteFill>
      {frame < B.scope && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: titleOp }}>
          <div style={{ fontFamily: font.mono, fontSize: 26, letterSpacing: "0.34em", color: color.accent, opacity: fade(frame, B.title, 14) }}>
            {COPY.series}
          </div>
          <Reveal
            text={COPY.title.title}
            at={B.title + 6}
            stagger={4}
            dur={26}
            blur={16}
            style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 190, color: color.ink, marginTop: 24, letterSpacing: "0.04em" }}
          />
          <Reveal
            text={COPY.title.sub}
            at={B.title + 34}
            stagger={2}
            style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 52, color: color.body, marginTop: 20, letterSpacing: "0.1em" }}
          />
        </AbsoluteFill>
      )}

      {frame >= B.scope - 2 && (
        <AbsoluteFill>
          <Header eyebrow={C.eyebrow} at={B.scope} />
          {/* 左：距高点的跌幅 */}
          <div style={{ position: "absolute", left: 140, top: 300, width: 820 }}>
            <Rise at={B.scope + 4}>
              <div style={{ fontFamily: font.mono, fontSize: 24, color: color.muted, letterSpacing: "0.06em" }}>{C.high}</div>
            </Rise>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 34, marginTop: 18 }}>
              <div style={{ width: 10, height: 300, background: "rgba(255,255,255,0.08)", borderRadius: 5, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 10, height: 300 * drop, background: `linear-gradient(180deg, ${color.body}, ${down})` }} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: font.mono,
                    fontWeight: 800,
                    fontSize: 200,
                    lineHeight: 1,
                    color: down,
                    opacity: fade(frame, B.scope + 10, 12),
                    textShadow: "0 0 50px rgba(255,97,89,0.35)",
                  }}
                >
                  {C.big}
                </div>
                <Reveal text={C.bigLabel} at={B.scope + 30} stagger={1} style={{ fontFamily: font.sans, fontSize: 32, color: color.body, marginTop: 26 }} />
              </div>
            </div>
          </div>

          {/* 右：谁在跌，谁在涨 */}
          <div style={{ position: "absolute", left: 1080, top: 300, width: 700 }}>
            {C.rows.map((r, i) => (
              <Rise key={r.name} at={B.scope + 26 + i * 16} style={{ borderTop: "1px solid rgba(220,240,235,0.12)", padding: "20px 0 18px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
                    <span style={{ fontFamily: font.sans, fontWeight: 900, fontSize: 40, color: color.ink }}>{r.name}</span>
                    <span style={{ fontFamily: font.mono, fontSize: 20, color: color.muted }}>{r.when}</span>
                  </div>
                  <span style={{ fontFamily: font.mono, fontWeight: 800, fontSize: 48, color: r.up ? up : down }}>
                    {r.up ? "▲ " : "▼ "}
                    {r.value}
                  </span>
                </div>
                {r.note && <div style={{ fontFamily: font.sans, fontSize: 22, color: color.muted, marginTop: 6 }}>{r.note}</div>}
              </Rise>
            ))}
          </div>

          <div style={{ position: "absolute", left: 140, top: 880 }}>
            <Reveal text={C.cap} at={B.cap} stagger={2} style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 60, color: color.ink }} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
