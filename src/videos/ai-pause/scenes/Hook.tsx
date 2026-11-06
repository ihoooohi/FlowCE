import React from "react";
import { AbsoluteFill, interpolateColors, useCurrentFrame } from "remotion";
import { Reveal, Shake, Typewriter } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { ease, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";
import { Rise, Slam, Stamp, down, hitPulse, hitShake } from "./parts";

const B = beats<{ tag: number; day: number; num: number; gone: number; date: number; worst: number }>("hook");
const C = COPY.hook;

/** 0 秒进题：一天，三万亿美元，没了 */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const hits = [B.num, B.gone];
  const red = prog(frame, B.gone, 10, ease.out);
  const ink = interpolateColors(red, [0, 1], [color.ink, down]);
  const strike = prog(frame, B.gone + 2, 12, ease.out);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse 70% 50% at 50% 45%, rgba(255,70,60,${hitPulse(frame, hits, 0.26) + 0.1 * red}) 0%, transparent 70%)` }}
      />
      <Shake intensity={hitShake(frame, hits, 12)} seed="hook">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: pick(40, 300) }}>
          <Typewriter
            text={C.tag}
            at={B.tag}
            cps={1.2}
            style={{ fontFamily: font.mono, fontSize: pick(28, 30), letterSpacing: "0.16em", color: color.accent, height: 44 }}
          />
          <Reveal
            text={C.day}
            at={B.day}
            stagger={3}
            style={{ fontFamily: font.serif, fontWeight: 900, fontSize: pick(110, 130), color: color.ink, marginTop: pick(20, 50), lineHeight: 1.2 }}
          />
          <Rise at={B.num - 6} dist={20}>
            <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: pick(34, 40), color: color.muted, marginTop: pick(16, 30), textAlign: "center" }}>
              {C.label}
            </div>
          </Rise>
          <div style={{ position: "relative" }}>
            <Slam at={B.num} from={1.6}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, color: ink, transform: `translateY(${red * 14}px)` }}>
                <span
                  style={{
                    fontFamily: font.mono,
                    fontWeight: 800,
                    fontSize: pick(300, 340),
                    lineHeight: 1.05,
                    textShadow: `0 0 60px rgba(255,97,89,${0.5 * red})`,
                  }}
                >
                  3
                </span>
                <span style={{ fontFamily: font.sans, fontWeight: 900, fontSize: pick(96, 104) }}>{C.unit}</span>
              </div>
            </Slam>
            {/* 划掉 */}
            <div
              style={{
                position: "absolute",
                left: -20,
                top: "54%",
                height: pick(12, 14),
                width: `calc(${strike * 100}% + 40px)`,
                background: down,
                transform: "rotate(-6deg)",
                transformOrigin: "left center",
                boxShadow: "0 0 24px rgba(255,97,89,0.6)",
                opacity: strike > 0 ? 1 : 0,
              }}
            />
            <Stamp at={B.gone + 6} text={C.stamp} size={pick(72, 80)} rotate={-12} style={{ position: "absolute", right: pick(-40, -30), top: pick(30, 30) }} />
          </div>
          <Rise at={B.date} style={{ marginTop: pick(30, 60), textAlign: "center" }}>
            <div style={{ fontFamily: font.mono, fontWeight: 700, fontSize: pick(40, 46), color: color.ink, letterSpacing: "0.04em" }}>{C.date}</div>
          </Rise>
          <Rise at={B.worst} style={{ marginTop: 14, textAlign: "center" }}>
            <div
              style={{
                fontFamily: font.sans,
                fontWeight: 700,
                fontSize: pick(38, 40),
                color: color.ink,
                background: "rgba(255,97,89,0.16)",
                border: `2px solid ${down}`,
                borderRadius: 10,
                padding: pick("10px 28px", "12px 26px"),
                whiteSpace: "nowrap",
              }}
            >
              {C.worst}
            </div>
          </Rise>
        </AbsoluteFill>
      </Shake>
    </AbsoluteFill>
  );
};
