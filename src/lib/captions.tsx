import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useLayout } from "./layout";
import { fade } from "./motion";
import { color, font } from "./theme";

/** 一条字幕：绝对帧区间 + 文本 */
export type Cue = { from: number; to: number; text: string };

/**
 * 把一句旁白按标点拆成短句，按字数分配时长，保证每屏一行左右。
 * 长度上限按画幅给：竖版约 18 字，横版约 28 字。
 */
export const splitCue = (cue: Cue, maxChars: number): Cue[] => {
  const parts = cue.text.match(/[^，。？！；：、——]+[，。？！；：、—]*/g) ?? [cue.text];
  const chunks: string[] = [];
  for (const p of parts) {
    const last = chunks[chunks.length - 1];
    if (last && (last + p).length <= maxChars && !/[。？！]$/.test(last)) chunks[chunks.length - 1] = last + p;
    else chunks.push(p);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  let t = cue.from;
  return chunks.map((c) => {
    const len = ((cue.to - cue.from) * c.length) / total;
    const out = { from: Math.round(t), to: Math.round(t + len), text: c.replace(/[，、；：]$/, "") };
    t += len;
    return out;
  });
};

export const Captions: React.FC<{ cues: Cue[] }> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { portrait, W } = useLayout();
  const chunks = cues.flatMap((c) => splitCue(c, portrait ? 18 : 28));
  const cur = chunks.find((c) => frame >= c.from && frame < c.to);
  if (!cur) return null;
  const op = fade(frame, cur.from, 5, cur.to - 5, 5);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          ...(portrait ? { top: 1468 } : { bottom: 64 }),
          display: "flex",
          justifyContent: "center",
          opacity: op,
        }}
      >
        <div
          style={{
            maxWidth: W - (portrait ? 120 : 400),
            padding: portrait ? "14px 30px" : "10px 26px",
            borderRadius: 10,
            background: "rgba(5, 11, 12, 0.62)",
            fontFamily: font.sans,
            fontWeight: 700,
            fontSize: portrait ? 44 : 38,
            lineHeight: 1.45,
            color: color.ink,
            textAlign: "center",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          {cur.text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
