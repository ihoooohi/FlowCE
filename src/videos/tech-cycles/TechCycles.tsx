import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Backdrop, Grain, SceneFade, Vignette } from "../../lib/components";
import { useFontsReady } from "../../lib/fonts";
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

export type TechCyclesProps = { music: boolean };

/** 《市场的长镜头｜三次科技革命的股市曲线》 */
export const TechCycles: React.FC<TechCyclesProps> = ({ music }) => {
  useFontsReady(ALL_TEXT);
  return (
    <AbsoluteFill style={{ backgroundColor: "#060d0e" }}>
      <Backdrop />
      {SCENES.map((s) => {
        const Scene = COMPONENTS[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}>
            <SceneFade dur={s.dur} inDur={s.fadeIn} outDur={s.fadeOut}>
              <Scene />
            </SceneFade>
          </Sequence>
        );
      })}
      <Vignette />
      <Grain />
      {music && <Audio src={staticFile("tech-cycles/score.m4a")} />}
    </AbsoluteFill>
  );
};
