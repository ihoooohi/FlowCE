import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Captions, type Cue } from "./captions";
import { Backdrop, Grain, SceneFade, Vignette } from "./components";
import { useFontsReady } from "./fonts";
import type { SceneSpec } from "./timeline";

/** 每支视频的外壳：背景、按时间轴排布场景、暗角与颗粒、字幕、声音 */
export const VideoShell: React.FC<{
  scenes: SceneSpec[];
  components: Record<string, React.FC>;
  allText: string;
  audio?: string;
  captions?: Cue[];
}> = ({ scenes, components, allText, audio, captions }) => {
  useFontsReady(allText);
  return (
    <AbsoluteFill style={{ backgroundColor: "#060d0e" }}>
      <Backdrop />
      {scenes.map((s) => {
        const Scene = components[s.id];
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
      {captions && <Captions cues={captions} />}
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
};
