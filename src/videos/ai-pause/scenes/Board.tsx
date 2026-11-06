import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Shake } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { CLAMP, fade } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";
import { Header, Rise, Slam, Stamp, down, hitShake } from "./parts";

const B = beats<{ head: number; t1: number; t2: number; t3: number; t4: number; zero: number; foot: number }>("board");
const C = COPY.board;
const AT = [B.t1, B.t2, B.t3, B.t4];

/** 收盘成绩单：四块砸出来的红字 */
export const Board: React.FC = () => {
  const frame = useCurrentFrame();
  const { pick, portrait } = useLayout();
  const w = pick(380, 440);
  const h = pick(370, 350);
  const gap = 40;
  const x0 = pick(140, 80);
  const y0 = pick(330, 470);
  const pos = (i: number) => (portrait ? { left: x0 + (i % 2) * (w + gap), top: y0 + Math.floor(i / 2) * (h + gap) } : { left: x0 + i * (w + gap), top: y0 });

  return (
    <AbsoluteFill>
      <Header eyebrow={C.eyebrow} head={C.head} />
      <Shake intensity={hitShake(frame, AT, 7)} seed="board">
        <AbsoluteFill>
          {C.tiles.map((t, i) => {
            const at = AT[i];
            const hot = i === 3;
            const glow = hot ? interpolate(frame, [at, at + 6, at + 50], [0, 1, 0.5], CLAMP) : 0;
            return (
              <div
                key={t.name}
                style={{
                  position: "absolute",
                  ...pos(i),
                  width: w,
                  height: h,
                  boxSizing: "border-box",
                  padding: pick("34px 30px", "34px 34px"),
                  borderRadius: 14,
                  background: `rgba(255,97,89,${0.06 + 0.1 * glow})`,
                  border: `2px solid rgba(255,97,89,${0.25 + 0.75 * glow})`,
                  opacity: fade(frame, at - 3, 6),
                }}
              >
                <div style={{ fontFamily: font.sans, fontWeight: 700, fontSize: pick(34, 36), color: color.body }}>{t.name}</div>
                <Slam at={at} from={1.5} style={{ transformOrigin: "left center" }}>
                  <div style={{ fontFamily: font.mono, fontWeight: 800, fontSize: pick(94, 112), color: down, lineHeight: 1.25, marginTop: 18, letterSpacing: "-0.03em" }}>
                    {t.value}
                  </div>
                </Slam>
                {t.sub && (
                  <div style={{ fontFamily: font.sans, fontSize: pick(26, 28), color: color.muted, marginTop: 14, opacity: fade(frame, at + 14, 12) }}>{t.sub}</div>
                )}
                {hot && <Stamp at={B.zero} text={C.zero} size={pick(30, 32)} rotate={-4} style={{ marginTop: 14, display: "inline-block", transformOrigin: "left center" }} />}
              </div>
            );
          })}
        </AbsoluteFill>
      </Shake>
      <Rise at={B.foot} style={{ position: "absolute", left: x0, top: pick(760, 1270) }}>
        <div style={{ fontFamily: font.sans, fontWeight: 700, fontSize: pick(32, 32), color: color.ink, whiteSpace: "nowrap" }}>
          <span style={{ color: down }}>▼ </span>
          {C.foot}
        </div>
      </Rise>
    </AbsoluteFill>
  );
};
