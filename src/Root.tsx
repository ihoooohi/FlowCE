import "./lib/fonts";
import React from "react";
import { Composition, Folder } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./lib/theme";
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
        defaultProps={{ music: true }}
      />
    </Folder>
  </>
);
