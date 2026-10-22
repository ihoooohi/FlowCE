import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Reveal } from "../../../lib/components";
import { ease, fade, prog } from "../../../lib/motion";
import { SAFE, color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";

const B = beats<{ cards: number; end: number }>("outro");
const C = COPY.outro;

/** 三根竖条的字标（沿用原网站的 wordmark） */
const Wordmark: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const bars = [
    { h: 28, c: color.ink },
    { h: 52, c: color.accent },
    { h: 38, c: color.ink },
  ];
  return (
    <div style={{ display: "flex", gap: 7, alignItems: "flex-end", height: 52 }}>
      {bars.map((b, i) => (
        <div key={i} style={{ width: 10, height: b.h * prog(frame, at + i * 6, 26), background: b.c, borderRadius: 1 }} />
      ))}
    </div>
  );
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const cardsOut = 1 - prog(frame, B.end - 30, 24, ease.inOut);

  return (
    <AbsoluteFill>
      {frame < B.end && (
        <AbsoluteFill style={{ opacity: cardsOut }}>
          <div style={{ position: "absolute", left: SAFE.x, top: 270 }}>
            <Reveal text={C.head} at={4} stagger={1.6} style={{ fontFamily: font.serif, fontWeight: 700, fontSize: 64, color: color.ink }} />
          </div>
          <div style={{ position: "absolute", left: SAFE.x, top: 480, display: "flex", gap: 34 }}>
            {C.rules.map(([n, title, desc], i) => {
              const p = prog(frame, B.cards + i * 22, 30);
              return (
                <div key={n} style={{ width: 386, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
                  <div style={{ height: 3, width: `${100 * prog(frame, B.cards + i * 22, 40, ease.inOut)}%`, background: color.gridStrong }} />
                  <div style={{ fontFamily: font.mono, fontSize: 24, color: color.accent, marginTop: 26, fontWeight: 700 }}>{n}</div>
                  <div style={{ fontFamily: font.sans, fontWeight: 900, fontSize: 42, color: color.ink, marginTop: 14 }}>{title}</div>
                  <div style={{ fontFamily: font.sans, fontWeight: 400, fontSize: 27, color: color.body, marginTop: 18, lineHeight: 1.65 }}>
                    {desc}
                  </div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {frame >= B.end - 4 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <Wordmark at={B.end} />
          <div
            style={{
              fontFamily: font.mono,
              fontSize: 26,
              letterSpacing: "0.34em",
              color: color.muted,
              marginTop: 30,
              opacity: fade(frame, B.end + 16, 18),
            }}
          >
            {C.mark}
          </div>
          <Reveal
            text={C.title}
            at={B.end + 26}
            stagger={4}
            dur={30}
            blur={16}
            style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 124, color: color.ink, marginTop: 20, letterSpacing: "0.04em" }}
          />
          <Reveal
            text={C.tagline}
            at={B.end + 80}
            stagger={2}
            style={{ fontFamily: font.serif, fontWeight: 700, fontSize: 44, color: color.body, marginTop: 40, lineHeight: 1.6, textAlign: "center" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: SAFE.y,
              fontFamily: font.sans,
              fontSize: 20,
              color: color.muted,
              opacity: fade(frame, B.end + 150, 24),
              letterSpacing: "0.04em",
            }}
          >
            {C.footer}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
