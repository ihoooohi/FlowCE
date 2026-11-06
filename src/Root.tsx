import "./lib/fonts";
import React from "react";
import { Composition, Folder, Still } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./lib/theme";
import { AIBill } from "./videos/ai-bill/AIBill";
import { TOTAL_FRAMES as AI_BILL_FRAMES } from "./videos/ai-bill/timeline";
import { AIPause } from "./videos/ai-pause/AIPause";
import { Cover as AIPauseCover } from "./videos/ai-pause/Cover";
import { TOTAL_FRAMES as AI_PAUSE_FRAMES } from "./videos/ai-pause/timeline";
import { TechCycles } from "./videos/tech-cycles/TechCycles";
import { TOTAL_FRAMES } from "./videos/tech-cycles/timeline";

/** 每支视频在这里注册一个 Composition；id 即渲染时的名字 */
export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="tech-cycles">
      <Composition
        id="TechCycles"
        component={TechCycles}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ music: true, captions: "auto" as const }}
      />
      {/* 竖版 9:16：同一套场景按 useLayout() 重新排版 */}
      <Composition
        id="TechCyclesVertical"
        component={TechCycles}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={HEIGHT}
        height={WIDTH}
        defaultProps={{ music: true, captions: "auto" as const }}
      />
    </Folder>
    <Folder name="ai-bill">
      <Composition
        id="AIBill"
        component={AIBill}
        durationInFrames={AI_BILL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ music: true, captions: "auto" as const }}
      />
    </Folder>
    <Folder name="ai-pause">
      {/* 竖版为主（短视频平台），横版同一套场景 */}
      <Composition
        id="AIPauseVertical"
        component={AIPause}
        durationInFrames={AI_PAUSE_FRAMES}
        fps={FPS}
        width={HEIGHT}
        height={WIDTH}
        defaultProps={{ music: true, captions: "auto" as const }}
      />
      <Composition
        id="AIPause"
        component={AIPause}
        durationInFrames={AI_PAUSE_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ music: true, captions: "auto" as const }}
      />
      {/* 投稿封面：横版 16:9、竖版 3:4 */}
      <Still id="AIPauseCover" component={AIPauseCover} width={WIDTH} height={HEIGHT} />
      <Still id="AIPauseCoverVertical" component={AIPauseCover} width={1080} height={1440} />
    </Folder>
  </>
);
