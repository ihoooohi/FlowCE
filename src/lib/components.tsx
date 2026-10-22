import React from "react";
import { AbsoluteFill, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { CLAMP, ease, fade, noise1, prog } from "./motion";
import { color, font } from "./theme";

/* ------------------------------------------------------------------ */
/* 文字                                                                */
/* ------------------------------------------------------------------ */

export type Seg = string | { t: string; color?: string; weight?: number; font?: string };

const toSegs = (text: Seg | Seg[]) => (Array.isArray(text) ? text : [text]).map((s) => (typeof s === "string" ? { t: s } : s));

/**
 * 逐字浮现：每个字从模糊、下沉的状态依次就位。
 * 文本里的 "\n" 会换行；可以用 {t, color} 片段给局部上色。
 */
export const Reveal: React.FC<{
  text: Seg | Seg[];
  at: number;
  stagger?: number;
  dur?: number;
  out?: number;
  outDur?: number;
  rise?: number;
  blur?: number;
  style?: React.CSSProperties;
}> = ({ text, at, stagger = 1.6, dur = 22, out, outDur = 16, rise = 26, blur = 10, style }) => {
  const frame = useCurrentFrame();
  const outA = out === undefined ? 1 : 1 - prog(frame, out, outDur, ease.inOut);
  let i = 0;
  return (
    <div style={{ ...style, opacity: ((style?.opacity as number | undefined) ?? 1) * outA }}>
      {toSegs(text).map((seg, si) => (
        <React.Fragment key={si}>
          {seg.t.split("\n").map((line, li) => (
            <React.Fragment key={li}>
              {li > 0 && <br />}
              {Array.from(line).map((ch, ci) => {
                const p = prog(frame, at + i++ * stagger, dur);
                return (
                  <span
                    key={ci}
                    style={{
                      display: "inline-block",
                      whiteSpace: "pre",
                      opacity: p,
                      transform: `translateY(${(1 - p) * rise}px)`,
                      filter: p < 1 ? `blur(${(1 - p) * blur}px)` : undefined,
                      color: seg.color,
                      fontWeight: seg.weight,
                      fontFamily: seg.font,
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

/** 打字机效果（等宽标签用） */
export const Typewriter: React.FC<{ text: string; at: number; cps?: number; style?: React.CSSProperties; caret?: boolean }> = ({
  text,
  at,
  cps = 0.6,
  style,
  caret = true,
}) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.floor((frame - at) * cps));
  const shown = Array.from(text).slice(0, n).join("");
  const typing = n < Array.from(text).length;
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <div style={{ ...style, opacity: frame < at ? 0 : 1 }}>
      {shown}
      {caret && (typing || blink) && <span style={{ color: color.accent }}>▍</span>}
    </div>
  );
};

/** 章节眉标：一小段强调色短线 + 等宽字母 */
export const Eyebrow: React.FC<{ index: string; label: string; at: number; out?: number; style?: React.CSSProperties }> = ({
  index,
  label,
  at,
  out,
  style,
}) => {
  const frame = useCurrentFrame();
  const line = prog(frame, at, 24);
  const op = fade(frame, at, 14, out, 14);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: font.mono,
        fontSize: 22,
        letterSpacing: "0.18em",
        fontWeight: 500,
        color: color.muted,
        opacity: op,
        ...style,
      }}
    >
      <span style={{ width: 34 * line, height: 3, background: color.accent, display: "inline-block" }} />
      <span style={{ color: color.dim }}>{index}</span>
      <span>{label}</span>
    </div>
  );
};

/** "第 {n} 个月" 这类模板：汉字用黑体，数字用等宽字体（计数时不跳动） */
export const NumLabel: React.FC<{ template: string; value: string; size: number; tint: string; style?: React.CSSProperties }> = ({
  template,
  value,
  size,
  tint,
  style,
}) => {
  const [pre = "", post = ""] = template.split("{n}");
  const cjk: React.CSSProperties = { fontFamily: font.sans, fontWeight: 900, fontSize: size * 0.8 };
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: size * 0.16, color: tint, lineHeight: 1.15, whiteSpace: "nowrap", ...style }}>
      {pre.trim() && <span style={cjk}>{pre.trim()}</span>}
      <span style={{ fontFamily: font.mono, fontWeight: 800, fontSize: size, letterSpacing: "-0.02em" }}>{value}</span>
      {post.trim() && <span style={cjk}>{post.trim()}</span>}
    </div>
  );
};

export const fmt = (v: number, decimals = 0) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/* ------------------------------------------------------------------ */
/* 画面质感                                                            */
/* ------------------------------------------------------------------ */

export const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 120% 90% at 50% 38%, ${color.bgLift} 0%, ${color.bg} 62%, #060d0e 100%)`,
    }}
  />
);

/** 胶片颗粒：一张噪点贴图，每帧随机平移 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.16 }) => {
  const frame = useCurrentFrame();
  const x = Math.floor(random(`gx${frame}`) * 512);
  const y = Math.floor(random(`gy${frame}`) * 512);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile("textures/grain.png")})`,
        backgroundPosition: `${x}px ${y}px`,
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 85% 75% at 50% 50%, transparent 55%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/** 镜头抖动：intensity 为像素幅度 */
export const Shake: React.FC<{ intensity: number; children: React.ReactNode; seed?: string }> = ({
  intensity,
  children,
  seed = "shake",
}) => {
  const frame = useCurrentFrame();
  const t = frame * 0.9;
  const x = noise1(`${seed}x`, t) * intensity;
  const y = noise1(`${seed}y`, t + 40) * intensity;
  const r = noise1(`${seed}r`, t + 90) * intensity * 0.04;
  return <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg)` }}>{children}</AbsoluteFill>;
};

/** 缓慢推近 / 漂移，让静止画面也有呼吸感 */
export const Drift: React.FC<{ children: React.ReactNode; from?: number; to?: number; dur: number; origin?: string }> = ({
  children,
  from = 1,
  to = 1.04,
  dur,
  origin = "50% 50%",
}) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, dur], [from, to], CLAMP);
  return <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: origin }}>{children}</AbsoluteFill>;
};

/** 整个场景的淡入淡出包装 */
export const SceneFade: React.FC<{ dur: number; inDur?: number; outDur?: number; children: React.ReactNode }> = ({
  dur,
  inDur = 15,
  outDur = 15,
  children,
}) => {
  const frame = useCurrentFrame();
  const a = inDur > 0 ? prog(frame, 0, inDur, ease.soft) : 1;
  const b = outDur > 0 ? 1 - prog(frame, dur - outDur, outDur, ease.inOut) : 1;
  return <AbsoluteFill style={{ opacity: a * b }}>{children}</AbsoluteFill>;
};
