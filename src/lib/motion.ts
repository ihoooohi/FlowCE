import { Easing, interpolate, random } from "remotion";

export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  soft: Easing.bezier(0.33, 1, 0.68, 1),
  linear: (t: number) => t,
};

/** start 帧开始、持续 dur 帧的 0→1 进度 */
export const prog = (frame: number, start: number, dur: number, easing: (t: number) => number = ease.out) =>
  interpolate(frame, [start, start + Math.max(1, dur)], [0, 1], { ...CLAMP, easing });

/** 淡入（可选淡出）的不透明度 */
export const fade = (frame: number, inAt: number, inDur = 18, outAt?: number, outDur = 18) => {
  const a = prog(frame, inAt, inDur, ease.soft);
  if (outAt === undefined) return a;
  return a * (1 - prog(frame, outAt, outDur, ease.inOut));
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 平滑噪声（用于镜头抖动、漂移） */
export const noise1 = (seed: string, t: number) => {
  const i = Math.floor(t);
  const f = t - i;
  const s = f * f * (3 - 2 * f);
  return lerp(random(`${seed}-${i}`) * 2 - 1, random(`${seed}-${i + 1}`) * 2 - 1, s);
};
