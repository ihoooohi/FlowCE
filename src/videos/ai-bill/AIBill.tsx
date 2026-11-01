import React from "react";
import { useVideoConfig } from "remotion";
import { VideoShell } from "../../lib/shell";
import { ALL_TEXT } from "./copy";
import { Bill } from "./scenes/Bill";
import { Camps } from "./scenes/Camps";
import { Cash } from "./scenes/Cash";
import { Cold } from "./scenes/Cold";
import { Earnings } from "./scenes/Earnings";
import { LongEnd } from "./scenes/LongEnd";
import { Scope } from "./scenes/Scope";
import { SCENES } from "./timeline";
import { HAS_VOICE, captionCues } from "./voiceover";

const COMPONENTS: Record<string, React.FC> = {
  cold: Cold,
  scope: Scope,
  earnings: Earnings,
  cash: Cash,
  bill: Bill,
  camps: Camps,
  long: LongEnd,
};

export type AIBillProps = {
  /** 是否带声音：有旁白时用混音 mix.m4a，否则用纯配乐 score.m4a */
  music: boolean;
  /** 横版默认不出字幕；"on" 打开 */
  captions: "auto" | "on" | "off";
};

/** 《AI 的账单｜美股这次为什么跌》（市场的长镜头 · 02），横版 */
export const AIBill: React.FC<AIBillProps> = ({ music, captions }) => {
  const { fps } = useVideoConfig();
  return (
    <VideoShell
      scenes={SCENES}
      components={COMPONENTS}
      allText={ALL_TEXT}
      captions={captions === "on" ? captionCues(fps) : undefined}
      audio={music ? (HAS_VOICE ? "ai-bill/mix.m4a" : "ai-bill/score.m4a") : undefined}
    />
  );
};
