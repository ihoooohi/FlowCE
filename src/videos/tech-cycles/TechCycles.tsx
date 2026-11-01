import React from "react";
import { useVideoConfig } from "remotion";
import { useLayout } from "../../lib/layout";
import { VideoShell } from "../../lib/shell";
import { ALL_TEXT } from "./copy";
import { AINow } from "./scenes/AINow";
import { ColdOpen } from "./scenes/ColdOpen";
import { Crash } from "./scenes/Crash";
import { LongView } from "./scenes/LongView";
import { LongWait } from "./scenes/LongWait";
import { Outro } from "./scenes/Outro";
import { Race } from "./scenes/Race";
import { ThreeRevolutions } from "./scenes/ThreeRevolutions";
import { TitleZoom } from "./scenes/TitleZoom";
import { TwoQuestions } from "./scenes/TwoQuestions";
import { SCENES } from "./timeline";
import { HAS_VOICE, captionCues } from "./voiceover";

const COMPONENTS: Record<string, React.FC> = {
  "cold-open": ColdOpen,
  title: TitleZoom,
  three: ThreeRevolutions,
  race: Race,
  crash: Crash,
  wait: LongWait,
  long: LongView,
  ai: AINow,
  two: TwoQuestions,
  outro: Outro,
};

export type TechCyclesProps = {
  /** 是否带声音：有旁白时用混音 mix.m4a，否则用纯配乐 score.m4a */
  music: boolean;
  /** auto：竖版且已有旁白时显示字幕 */
  captions: "auto" | "on" | "off";
};

/** 《市场的长镜头｜三次科技革命的股市曲线》，横版与竖版共用 */
export const TechCycles: React.FC<TechCyclesProps> = ({ music, captions }) => {
  const { fps } = useVideoConfig();
  const { portrait } = useLayout();
  const showCaptions = captions === "on" || (captions === "auto" && portrait && HAS_VOICE);
  return (
    <VideoShell
      scenes={SCENES}
      components={COMPONENTS}
      allText={ALL_TEXT}
      captions={showCaptions ? captionCues(fps) : undefined}
      audio={music ? (HAS_VOICE ? "tech-cycles/mix.m4a" : "tech-cycles/score.m4a") : undefined}
    />
  );
};
