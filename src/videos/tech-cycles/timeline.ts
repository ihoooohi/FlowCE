import tl from "./timeline.json";

type RawScene = { id: string; dur: number; overlap: number; fadeIn: number; fadeOut: number; beats: Record<string, unknown> };

export type SceneSpec = RawScene & { from: number };

/** 按 overlap 依次排布各场景，得到绝对起始帧 */
export const SCENES: SceneSpec[] = (() => {
  let cursor = 0;
  return (tl.scenes as RawScene[]).map((s, i) => {
    const from = i === 0 ? 0 : cursor - s.overlap;
    cursor = from + s.dur;
    return { ...s, from };
  });
})();

export const TOTAL_FRAMES = SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].dur;

export const scene = (id: string) => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown scene ${id}`);
  return s;
};

export const beats = <T,>(id: string) => scene(id).beats as T;
