import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Eyebrow, Reveal } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { CLAMP, ease, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";

export const up = color.pc;
export const down = color.red;

/** 竖版顶部留给常驻标题栏，场景标题从这里往下排 */
export const useTop = () => useLayout().pick(96, 250);

/** 章节眉标 + 标题 */
export const Header: React.FC<{ eyebrow: string[]; head: string; at?: number }> = ({ eyebrow, head, at = 4 }) => {
  const { padX, pick } = useLayout();
  const top = useTop();
  return (
    <div style={{ position: "absolute", left: padX, top }}>
      <Eyebrow index={eyebrow[0]} label={eyebrow[1]} at={at} />
      <Reveal
        text={head}
        at={at + 6}
        stagger={1.4}
        style={{ fontFamily: font.serif, fontWeight: 900, fontSize: pick(64, 62), color: color.ink, marginTop: 22, whiteSpace: "nowrap" }}
      />
    </div>
  );
};

/** 从下方浮入 */
export const Rise: React.FC<{ at: number; dur?: number; dist?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  dur = 22,
  dist = 36,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, dur, ease.out);
  return <div style={{ ...style, opacity: p * ((style?.opacity as number | undefined) ?? 1), transform: `translateY(${(1 - p) * dist}px)` }}>{children}</div>;
};

/** 砸入：放大 + 模糊收拢（数字重击用） */
export const Slam: React.FC<{ at: number; from?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, from = 1.4, style, children }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, 14, ease.out);
  return (
    <div
      style={{
        ...style,
        opacity: interpolate(frame, [at - 1, at + 3], [0, 1], CLAMP),
        transform: `scale(${from - (from - 1) * p})`,
        filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
};

/** 盖章：旋转的描边方框 */
export const Stamp: React.FC<{ at: number; text: string; size: number; tint?: string; rotate?: number; style?: React.CSSProperties }> = ({
  at,
  text,
  size,
  tint = down,
  rotate = -8,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, 12, ease.out);
  return (
    <div
      style={{
        ...style,
        opacity: interpolate(frame, [at, at + 4], [0, 0.95], CLAMP),
        transform: `rotate(${rotate}deg) scale(${1.8 - 0.8 * p})`,
        border: `${Math.max(4, size * 0.07)}px solid ${tint}`,
        borderRadius: 10,
        padding: `${size * 0.08}px ${size * 0.28}px`,
        color: tint,
        fontFamily: font.sans,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.2,
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

/** 重击时的屏幕抖动幅度 */
export const hitShake = (frame: number, hits: number[], amp = 10) =>
  hits.reduce((a, h) => a + interpolate(frame, [h, h + 3, h + 20], [0, amp, 0], CLAMP), 0);

/** 重击时的红色脉冲 */
export const hitPulse = (frame: number, hits: number[], amp = 0.22) =>
  hits.reduce((a, h) => a + interpolate(frame, [h, h + 4, h + 36], [0, amp, 0], CLAMP), 0);
