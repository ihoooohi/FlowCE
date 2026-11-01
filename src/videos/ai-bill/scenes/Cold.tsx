import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Shake, Typewriter } from "../../../lib/components";
import { CLAMP, ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";

const B = beats<{ tag: number; s1: number; s2: number; s3: number; dim: number }>("cold");
const C = COPY.cold;
const HITS = [B.s1, B.s2, B.s3];

/** 冷开场：三个数字依次砸出 */
export const Cold: React.FC = () => {
  const frame = useCurrentFrame();
  const shake = HITS.reduce((a, h) => a + interpolate(frame, [h, h + 3, h + 22], [0, 10, 0], CLAMP), 0);
  const pulse = HITS.reduce((a, h) => a + interpolate(frame, [h, h + 4, h + 40], [0, 0.22, 0], CLAMP), 0);
  const dim = 1 - 0.55 * prog(frame, B.dim, 30, ease.inOut);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 50% at 50% 55%, rgba(255,70,60,${pulse}) 0%, transparent 70%)` }} />
      <Shake intensity={shake} seed="cold">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 40, opacity: dim }}>
          <Typewriter
            text={C.tag}
            at={B.tag}
            cps={0.9}
            style={{ fontFamily: font.mono, fontSize: 28, letterSpacing: "0.24em", color: color.accent, height: 40 }}
          />
          <div style={{ display: "flex", gap: 90, marginTop: 90 }}>
            {C.stats.map((s, i) => {
              const at = HITS[i];
              const p = prog(frame, at, 16, ease.out);
              return (
                <div key={s.label} style={{ width: 470, textAlign: "center", opacity: fade(frame, at - 2, 6) }}>
                  <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 32, color: color.muted }}>{s.label}</div>
                  <div
                    style={{
                      fontFamily: font.mono,
                      fontWeight: 800,
                      fontSize: 150,
                      color: color.red,
                      lineHeight: 1.2,
                      marginTop: 10,
                      transform: `scale(${1.35 - 0.35 * p})`,
                      filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined,
                      textShadow: `0 0 50px rgba(255,97,89,${0.45 * p})`,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontFamily: font.sans, fontSize: 28, color: color.body, marginTop: 12, opacity: fade(frame, at + 14, 14) }}>{s.sub}</div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Shake>
    </AbsoluteFill>
  );
};
