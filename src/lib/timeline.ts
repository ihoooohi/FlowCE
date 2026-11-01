/** 时间轴：每支视频的 timeline.json 描述场景时长、与上一场景的重叠和场景内节拍点 */
export type RawScene = { id: string; dur: number; overlap: number; fadeIn: number; fadeOut: number; beats: Record<string, unknown> };

export type SceneSpec = RawScene & { from: number };

/** 按 overlap 依次排布各场景，得到绝对起始帧 */
export const makeTimeline = (raw: RawScene[]) => {
  let cursor = 0;
  const SCENES: SceneSpec[] = raw.map((s, i) => {
    const from = i === 0 ? 0 : cursor - s.overlap;
    cursor = from + s.dur;
    return { ...s, from };
  });
  const TOTAL_FRAMES = SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].dur;
  const scene = (id: string) => {
    const s = SCENES.find((x) => x.id === id);
    if (!s) throw new Error(`unknown scene ${id}`);
    return s;
  };
  const beats = <T,>(id: string) => scene(id).beats as T;
  return { SCENES, TOTAL_FRAMES, scene, beats };
};
