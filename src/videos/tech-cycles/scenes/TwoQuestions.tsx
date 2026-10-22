import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Reveal } from "../../../lib/components";
import { ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";

const B = beats<{ a: number; b: number; mid: number; quote: number }>("two");
const C = COPY.two;

const Question: React.FC<{ tag: string; text: string; at: number; side: "left" | "right"; spread: number; dim: number }> = ({
  tag,
  text,
  at,
  side,
  spread,
  dim,
}) => {
  const frame = useCurrentFrame();
  const left = side === "left";
  return (
    <div
      style={{
        position: "absolute",
        top: 380,
        left: left ? 150 : 1030,
        width: 760,
        opacity: dim,
        filter: dim < 1 ? `blur(${(1 - dim) * 8}px)` : undefined,
        transform: `translateX(${(left ? -1 : 1) * spread}px)`,
      }}
    >
      <div style={{ fontFamily: font.mono, fontSize: 24, letterSpacing: "0.2em", color: color.accent, opacity: fade(frame, at, 14) }}>
        {tag}
      </div>
      <Reveal
        text={text}
        at={at + 6}
        stagger={2}
        style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 74, color: color.ink, lineHeight: 1.4, marginTop: 24 }}
      />
    </div>
  );
};

export const TwoQuestions: React.FC = () => {
  const frame = useCurrentFrame();
  const divider = prog(frame, 0, 40, ease.inOut);
  const split = prog(frame, B.mid, 30, ease.inOut);
  const partOne = 1 - prog(frame, B.quote - 30, 24, ease.inOut);

  return (
    <AbsoluteFill>
      {frame < B.quote && (
        <AbsoluteFill style={{ opacity: partOne }}>
          <div
            style={{
              position: "absolute",
              left: 959,
              top: 540 - 300 * divider,
              width: 2,
              height: 600 * divider,
              background: `linear-gradient(180deg, transparent, ${color.gridStrong}, transparent)`,
            }}
          />
          <Question tag={C.a[0]} text={C.a[1]} at={B.a} side="left" spread={split * 40} dim={1 - 0.72 * split} />
          <Question tag={C.b[0]} text={C.b[1]} at={B.b} side="right" spread={split * 40} dim={1 - 0.72 * split} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                padding: "26px 60px",
                background: `rgba(10,21,23,${0.88 * split})`,
                border: `1px solid rgba(239,137,106,${0.5 * split})`,
                borderRadius: 4,
                transform: `scale(${0.92 + 0.08 * split})`,
                opacity: split,
              }}
            >
              <Reveal
                text={C.mid}
                at={B.mid + 6}
                stagger={2.4}
                style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 84, color: color.accent }}
              />
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {frame >= B.quote - 6 && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 230 }}>
          <div
            style={{
              position: "absolute",
              left: 170,
              top: 540 - 190 * prog(frame, B.quote, 40, ease.inOut),
              width: 5,
              height: 380 * prog(frame, B.quote, 40, ease.inOut),
              background: color.accent,
            }}
          />
          <Reveal
            text={C.quote}
            at={B.quote + 8}
            stagger={3}
            dur={28}
            style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 92, color: color.ink, lineHeight: 1.45 }}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
