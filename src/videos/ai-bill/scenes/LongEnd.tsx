import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Reveal } from "../../../lib/components";
import { ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";
import { Header, Rise } from "./parts";

const B = beats<{ bars: number; line: number; end: number }>("long");
const C = COPY.long;
const E = COPY.end;

const X0 = 520;
const PX = 14; // 每 1% 的像素

/** 拉远镜头：这次的跌幅放进历史；然后片尾 */
export const LongEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const out = 1 - prog(frame, B.end - 24, 22, ease.inOut);

  return (
    <AbsoluteFill>
      {frame < B.end && (
        <AbsoluteFill style={{ opacity: out }}>
          <Header eyebrow={C.eyebrow} head={C.head} />
          {C.bars.map((b, i) => {
            const at = B.bars + (i === 0 ? 0 : 18 + i * 12);
            const p = prog(frame, at, i === 0 ? 30 : 36, ease.inOut);
            const now = i === 0;
            const y = 300 + i * 100;
            return (
              <div key={b.label} style={{ position: "absolute", left: 0, top: y, width: 1920, height: 70, opacity: fade(frame, at - 4, 10) }}>
                <div
                  style={{
                    position: "absolute",
                    right: 1920 - X0 + 30,
                    top: 12,
                    fontFamily: font.sans,
                    fontWeight: now ? 900 : 500,
                    fontSize: 34,
                    color: now ? color.ink : color.body,
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.label}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: X0,
                    top: 14,
                    height: 42,
                    width: b.value * PX * p,
                    background: now ? color.accent : "rgba(255,97,89,0.38)",
                    borderRadius: 4,
                    boxShadow: now ? "0 0 30px rgba(239,137,106,0.55)" : undefined,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: X0 + b.value * PX * p + 22,
                    top: 8,
                    fontFamily: font.mono,
                    fontWeight: 800,
                    fontSize: 42,
                    color: now ? color.accent : color.body,
                    whiteSpace: "nowrap",
                  }}
                >
                  −{b.value % 1 === 0 ? b.value : b.value.toFixed(1)}%
                  {b.note && <span style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 22, color: color.muted, marginLeft: 16 }}>{b.note}</span>}
                </div>
              </div>
            );
          })}
          <div style={{ position: "absolute", right: 140, top: 812, fontFamily: font.mono, fontSize: 18, color: color.muted, opacity: fade(frame, B.bars + 80, 14) }}>
            {C.note}
          </div>
          <div style={{ position: "absolute", left: 140, top: 870 }}>
            <Reveal text={C.line} at={B.line} stagger={1.8} style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 60, color: color.ink }} />
          </div>
        </AbsoluteFill>
      )}

      {frame >= B.end - 4 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: font.mono, fontSize: 26, letterSpacing: "0.34em", color: color.accent, opacity: fade(frame, B.end, 14) }}>
            {COPY.series}
          </div>
          <Reveal
            text={E.title}
            at={B.end + 8}
            stagger={4}
            dur={26}
            blur={14}
            style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 150, color: color.ink, marginTop: 22, letterSpacing: "0.04em" }}
          />
          <Rise at={B.end + 40} style={{ display: "flex", alignItems: "baseline", gap: 26, marginTop: 50 }}>
            <span style={{ fontFamily: font.mono, fontSize: 24, color: color.accent, letterSpacing: "0.1em" }}>{E.watchLabel}</span>
            {E.watch.map((w, i) => (
              <span key={w} style={{ fontFamily: font.sans, fontWeight: 700, fontSize: 32, color: color.body }}>
                {i > 0 && <span style={{ color: color.dim, marginRight: 26 }}>·</span>}
                {w}
              </span>
            ))}
          </Rise>
          <div
            style={{
              position: "absolute",
              bottom: 96,
              fontFamily: font.sans,
              fontSize: 20,
              color: color.muted,
              letterSpacing: "0.04em",
              opacity: fade(frame, B.end + 70, 20),
            }}
          >
            {E.footer}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
