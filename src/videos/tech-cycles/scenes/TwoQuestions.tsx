import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Reveal } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { beats } from "../timeline";

const B = beats<{ a: number; b: number; mid: number; quote: number }>("two");
const C = COPY.two;

/** 横版左右分屏；竖版上下分屏 */
const Question: React.FC<{ tag: string; text: string; at: number; first: boolean; spread: number; dim: number }> = ({
  tag,
  text,
  at,
  first,
  spread,
  dim,
}) => {
  const frame = useCurrentFrame();
  const { portrait, pick, padX } = useLayout();
  const dir = first ? -1 : 1;
  return (
    <div
      style={{
        position: "absolute",
        top: portrait ? (first ? 470 : 1010) : 380,
        left: portrait ? padX : first ? 150 : 1030,
        width: pick(760, 920),
        opacity: dim,
        filter: dim < 1 ? `blur(${(1 - dim) * 8}px)` : undefined,
        transform: portrait ? `translateY(${dir * spread}px)` : `translateX(${dir * spread}px)`,
      }}
    >
      <div style={{ fontFamily: font.mono, fontSize: 24, letterSpacing: "0.2em", color: color.accent, opacity: fade(frame, at, 14) }}>
        {tag}
      </div>
      <Reveal
        text={text}
        at={at + 6}
        stagger={2}
        style={{ fontFamily: font.serif, fontWeight: 900, fontSize: pick(74, 72), color: color.ink, lineHeight: 1.4, marginTop: 24 }}
      />
    </div>
  );
};

export const TwoQuestions: React.FC = () => {
  const frame = useCurrentFrame();
  const { W, portrait, pick } = useLayout();
  const divider = prog(frame, 0, 40, ease.inOut);
  const split = prog(frame, B.mid, 30, ease.inOut);
  const partOne = 1 - prog(frame, B.quote - 30, 24, ease.inOut);
  const midY = pick(540, 900);
  const quoteP = prog(frame, B.quote, 40, ease.inOut);

  return (
    <AbsoluteFill>
      {frame < B.quote && (
        <AbsoluteFill style={{ opacity: partOne }}>
          <div
            style={
              portrait
                ? {
                    position: "absolute",
                    top: midY,
                    left: W / 2 - 420 * divider,
                    height: 2,
                    width: 840 * divider,
                    background: `linear-gradient(90deg, transparent, ${color.gridStrong}, transparent)`,
                  }
                : {
                    position: "absolute",
                    left: 959,
                    top: midY - 300 * divider,
                    width: 2,
                    height: 600 * divider,
                    background: `linear-gradient(180deg, transparent, ${color.gridStrong}, transparent)`,
                  }
            }
          />
          <Question tag={C.a[0]} text={C.a[1]} at={B.a} first spread={split * 40} dim={1 - 0.72 * split} />
          <Question tag={C.b[0]} text={C.b[1]} at={B.b} first={false} spread={split * 40} dim={1 - 0.72 * split} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: midY,
              display: "flex",
              justifyContent: "center",
              transform: "translateY(-50%)",
            }}
          >
            <div
              style={{
                padding: pick("26px 60px", "22px 44px"),
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
                style={{ fontFamily: font.serif, fontWeight: 900, fontSize: pick(84, 68), color: color.accent, whiteSpace: "nowrap" }}
              />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {frame >= B.quote - 6 && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: pick(230, 130), paddingBottom: pick(0, 180) }}>
          <div
            style={{
              position: "absolute",
              left: pick(170, 84),
              top: pick(540, 870) - pick(190, 180) * quoteP,
              width: 5,
              height: pick(380, 360) * quoteP,
              background: color.accent,
            }}
          />
          <Reveal
            text={C.quote}
            at={B.quote + 8}
            stagger={3}
            dur={28}
            style={{ fontFamily: font.serif, fontWeight: 900, fontSize: pick(92, 78), color: color.ink, lineHeight: 1.45 }}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
