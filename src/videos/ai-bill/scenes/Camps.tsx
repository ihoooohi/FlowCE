import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";
import { Header, Rise, down, up } from "./parts";

const B = beats<{ bull: number; bear: number }>("camps");
const C = COPY.camps;

/** 外网两种声音：左右分屏，不站队 */
export const Camps: React.FC = () => {
  const frame = useCurrentFrame();
  const divider = prog(frame, 10, 40, ease.inOut);
  const sides = [
    { side: C.bull, at: B.bull, tint: up, x: 140 },
    { side: C.bear, at: B.bear, tint: down, x: 1010 },
  ];

  return (
    <AbsoluteFill>
      <Header eyebrow={C.eyebrow} />
      <div
        style={{
          position: "absolute",
          left: 959,
          top: 600 - 300 * divider,
          width: 2,
          height: 600 * divider,
          background: `linear-gradient(180deg, transparent, ${color.gridStrong}, transparent)`,
        }}
      />
      {sides.map(({ side, at, tint, x }) => (
        <div key={side.tag} style={{ position: "absolute", left: x, top: 330, width: 770 }}>
          <Rise at={at}>
            <div style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 72, color: tint }}>{side.tag}</div>
          </Rise>
          {side.items.map((it, i) => (
            <Rise key={it.who} at={at + 16 + i * 18} style={{ marginTop: 64 }}>
              <div style={{ fontFamily: font.mono, fontSize: 24, color: color.muted, letterSpacing: "0.04em" }}>{it.who}</div>
              <div style={{ fontFamily: font.serif, fontWeight: 700, fontSize: 46, color: color.ink, marginTop: 12, lineHeight: 1.45, whiteSpace: "pre-line" }}>
                “{it.say}”
              </div>
            </Rise>
          ))}
        </div>
      ))}
    </AbsoluteFill>
  );
};
