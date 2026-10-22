import type { Cue } from "../../lib/captions";
import manifest from "./data/voiceover.json";
import narration from "./narration.json";
import { scene } from "./timeline";

type NarrationLine = { id: string; scene: string; at: number; text: string; say?: string; caption?: boolean };
type VoiceLine = { id: string; frame: number; lead: number; speech: number; duration: number; text: string };

const LINES = narration.lines as NarrationLine[];
const VOICE = (manifest.lines ?? []) as unknown as VoiceLine[];

/** 已经生成（或导入）旁白音频 */
export const HAS_VOICE = VOICE.length > 0;

/** 没有实测时长时按约 4.5 字/秒估算（仅用于预览字幕排版） */
const estimate = (text: string) => text.replace(/[，。？！、；：—\s]/g, "").length / 4.5 + 0.4;

/** 字幕：只给画面上没有的那些旁白出字幕 */
export const captionCues = (fps: number): Cue[] => {
  const measured = new Map(VOICE.map((v) => [v.id, v]));
  return LINES.filter((l) => l.caption !== false).map((l) => {
    const from = scene(l.scene).from + l.at;
    const sec = measured.get(l.id)?.speech ?? estimate(l.say ?? l.text);
    return { from, to: from + Math.round(sec * fps) + 8, text: l.text };
  });
};
