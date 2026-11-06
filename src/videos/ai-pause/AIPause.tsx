import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout } from "../../lib/layout";
import { fade } from "../../lib/motion";
import { VideoShell } from "../../lib/shell";
import { color, font } from "../../lib/theme";
import { ALL_TEXT, COPY } from "./copy";
import { Board } from "./scenes/Board";
import { Coaster } from "./scenes/Coaster";
import { Corr } from "./scenes/Corr";
import { End } from "./scenes/End";
import { Hook } from "./scenes/Hook";
import { Why } from "./scenes/Why";
import { SCENES, TOTAL_FRAMES } from "./timeline";
import { HAS_VOICE, captionCues } from "./voiceover";

const COMPONENTS: Record<string, React.FC> = {
  hook: Hook,
  coaster: Coaster,
  board: Board,
  why: Why,
  corr: Corr,
  end: End,
};

export type AIPauseProps = {
  /** 是否带声音：有旁白时用混音 mix.m4a，否则用纯配乐 score.m4a */
  music: boolean;
  /** 这一期默认横竖版都出字幕（"auto" 即开）；"off" 关闭 */
  captions: "auto" | "on" | "off";
};

/** 常驻信息：竖版顶部标题栏（刷到时一眼知道在讲什么）+ 顶部章节进度条 */
const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const { portrait, W, pick } = useLayout();
  const n = SCENES.length;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 章节进度条 */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: pick(6, 10), display: "flex", gap: 4 }}>
        {SCENES.map((s, i) => {
          const end = i < n - 1 ? SCENES[i + 1].from : TOTAL_FRAMES;
          const p = Math.min(1, Math.max(0, (frame - s.from) / (end - s.from)));
          return (
            <div key={s.id} style={{ flex: end - s.from, background: "rgba(220,240,235,0.14)" }}>
              <div style={{ width: `${p * 100}%`, height: "100%", background: color.accent }} />
            </div>
          );
        })}
      </div>
      {portrait ? (
        <div style={{ position: "absolute", left: 80, right: 80, top: 92, display: "flex", alignItems: "center", gap: 20, opacity: fade(frame, 0, 8) }}>
          <div style={{ padding: "6px 16px", borderRadius: 8, background: color.red, color: "#1a0b0a", fontFamily: font.sans, fontWeight: 900, fontSize: 32 }}>{COPY.bar.tag}</div>
          <div style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 46, color: color.ink }}>{COPY.bar.title}</div>
          <div style={{ marginLeft: "auto", fontFamily: font.mono, fontSize: 22, color: color.dim, letterSpacing: "0.1em" }}>03</div>
        </div>
      ) : (
        <div style={{ position: "absolute", right: 140, top: 92, display: "flex", alignItems: "center", gap: 14, opacity: fade(frame, 0, 8) }}>
          <div style={{ padding: "4px 12px", borderRadius: 6, background: color.red, color: "#1a0b0a", fontFamily: font.sans, fontWeight: 900, fontSize: 22 }}>{COPY.bar.tag}</div>
          <div style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 28, color: color.body }}>{COPY.bar.title}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** 《AI 的暂停键｜一天蒸发 3 万亿》（市场的长镜头 · 03），竖版为主，横版同步 */
export const AIPause: React.FC<AIPauseProps> = ({ music, captions }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      <VideoShell
        scenes={SCENES}
        components={COMPONENTS}
        allText={ALL_TEXT}
        captions={captions === "off" ? undefined : captionCues(fps)}
        audio={music ? (HAS_VOICE ? "ai-pause/mix.m4a" : "ai-pause/score.m4a") : undefined}
      />
      <Chrome />
    </>
  );
};
