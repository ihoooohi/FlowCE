import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Line, linear, partial, type Pt } from "../../../lib/chart";
import { Reveal, Shake, Typewriter, fmt } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { CLAMP, ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { FACTS, slice } from "../data";
import { beats } from "../timeline";

const B = beats<{ tag: number; count: number; countEnd: number; label: number; q1: number; q2: number; impact: number; after: number }>(
  "cold-open",
);
const C = COPY.cold;

/** 背景里那条 1996→2000 的上涨线 */
const RUN = slice("1996-01", "2000-03");

export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { W, H, portrait, pick } = useLayout();

  const xs = linear(0, RUN.length - 1, pick(120, 60), W - pick(120, 60));
  const ys = linear(1000, 5200, pick(900, 1360), pick(300, 760));
  const runPts: Pt[] = RUN.map((p, i) => ({ x: xs(i), y: ys(p.v) }));

  const countP = prog(frame, B.count, B.countEnd - B.count, ease.inOut);
  const phaseA = 1 - prog(frame, B.q1 - 18, 20, ease.inOut);
  const phaseB = 1 - prog(frame, B.impact - 4, 4, ease.linear);
  const hit = frame >= B.impact;

  const shake = interpolate(frame, [B.impact, B.impact + 4, B.impact + 34], [0, 22, 0], CLAMP);
  const flash = hit ? interpolate(frame, [B.impact, B.impact + 12], [0.55, 0], CLAMP) : 0;
  const bigScale = interpolate(frame, [B.impact, B.impact + 26], [1.28, 1], { ...CLAMP, easing: ease.out });
  const slowPush = interpolate(frame, [B.impact, B.impact + 160], [1, 1.06], CLAMP);

  const line = partial(runPts, countP * (runPts.length - 1));
  const center: React.CSSProperties = {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    textAlign: "center",
    paddingBottom: portrait ? 120 : 0,
  };

  return (
    <AbsoluteFill>
      {/* Phase A：数字 */}
      {!hit && (
        <AbsoluteFill style={{ opacity: phaseA, transform: `translateY(${(1 - phaseA) * -40}px)` }}>
          <svg width={W} height={H} style={{ position: "absolute", opacity: 0.32 }}>
            <Line pts={line.pts} stroke={color.net} width={4} glow={0.8} />
          </svg>
          <AbsoluteFill style={center}>
            <Typewriter
              text={C.tag}
              at={B.tag}
              cps={0.9}
              style={{ fontFamily: font.mono, fontSize: pick(28, 24), letterSpacing: "0.2em", color: color.accent, height: 40 }}
            />
            <div
              style={{
                fontFamily: font.mono,
                fontWeight: 800,
                fontSize: pick(230, 156),
                color: color.ink,
                letterSpacing: "-0.03em",
                marginTop: 24,
                opacity: fade(frame, B.count - 6, 10),
                textShadow: `0 0 60px rgba(95,159,242,${0.35 * countP})`,
              }}
            >
              {fmt(FACTS.peak2000.close * countP, 2)}
            </div>
            <div
              style={{
                fontFamily: font.sans,
                fontSize: pick(38, 34),
                fontWeight: 500,
                color: color.body,
                marginTop: 10,
                opacity: fade(frame, B.label, 16),
              }}
            >
              {C.label}
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* Phase B：问题 */}
      {!hit && frame >= B.q1 - 2 && (
        <AbsoluteFill style={{ ...center, opacity: phaseB }}>
          <Reveal
            text={C.q1}
            at={B.q1}
            stagger={2.2}
            style={{ fontFamily: font.serif, fontWeight: 700, fontSize: pick(92, 78), color: color.ink, lineHeight: 1.35 }}
          />
          <Reveal
            text={C.q2}
            at={B.q2}
            stagger={2.6}
            style={{ fontFamily: font.serif, fontWeight: 900, fontSize: pick(92, 78), color: color.ink, lineHeight: 1.35 }}
          />
        </AbsoluteFill>
      )}

      {/* Phase C：15 年 */}
      {hit && (
        <Shake intensity={shake}>
          <AbsoluteFill style={{ ...center, transform: `scale(${slowPush})` }}>
            <div
              style={{
                fontFamily: font.serif,
                fontWeight: 900,
                fontSize: pick(330, 290),
                color: color.ink,
                transform: `scale(${bigScale})`,
                textShadow: "0 0 80px rgba(239,137,106,0.35)",
                lineHeight: 1,
              }}
            >
              {C.big}
            </div>
            <Reveal
              text={C.after}
              at={B.after}
              stagger={1.4}
              style={{ fontFamily: font.sans, fontWeight: 500, fontSize: pick(44, 40), color: color.body, marginTop: 70, maxWidth: 920 }}
            />
          </AbsoluteFill>
        </Shake>
      )}

      {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: flash, mixBlendMode: "overlay" }} />}
    </AbsoluteFill>
  );
};
