import type { Cue } from "./captions";

/** narration.json 里的一句旁白 */
export type NarrationLine = { id: string; scene: string; at: number; text: string; say?: string; caption?: boolean };
/** scripts/voiceover.py 生成的 data/voiceover.json 里的一句 */
export type VoiceLine = { id: string; frame: number; lead: number; speech: number; duration: number; text: string };

/** 没有实测时长时按约 4.5 字/秒估算（仅用于预览字幕排版） */
const estimate = (text: string) => text.replace(/[，。？！、；：—\s]/g, "").length / 4.5 + 0.4;

export const makeVoiceover = (narration: { lines: unknown[] }, manifest: { lines?: unknown[] }, sceneFrom: (id: string) => number) => {
  const lines = narration.lines as NarrationLine[];
  const voice = (manifest.lines ?? []) as VoiceLine[];
  const measured = new Map(voice.map((v) => [v.id, v]));
  return {
    /** 已经生成（或导入）旁白音频 */
    HAS_VOICE: voice.length > 0,
    /** 字幕：只给画面上没有的那些旁白出字幕 */
    captionCues: (fps: number): Cue[] =>
      lines
        .filter((l) => l.caption !== false)
        .map((l) => {
          const from = sceneFrom(l.scene) + l.at;
          const sec = measured.get(l.id)?.speech ?? estimate(l.say ?? l.text);
          return { from, to: from + Math.round(sec * fps) + 8, text: l.text };
        }),
  };
};
