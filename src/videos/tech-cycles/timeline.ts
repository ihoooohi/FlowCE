import { makeTimeline, type RawScene } from "../../lib/timeline";
import tl from "./timeline.json";

export const { SCENES, TOTAL_FRAMES, scene, beats } = makeTimeline(tl.scenes as RawScene[]);
