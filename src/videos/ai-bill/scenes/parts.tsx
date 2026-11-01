import React from "react";
import { useCurrentFrame } from "remotion";
import { Eyebrow, Reveal } from "../../../lib/components";
import { ease, prog } from "../../../lib/motion";
import { SAFE, color, font } from "../../../lib/theme";

/** 章节眉标 + 标题 */
export const Header: React.FC<{ eyebrow: string[]; head?: string; at?: number }> = ({ eyebrow, head, at = 4 }) => (
  <div style={{ position: "absolute", left: SAFE.x, top: SAFE.y }}>
    <Eyebrow index={eyebrow[0]} label={eyebrow[1]} at={at} />
    {head && (
      <Reveal
        text={head}
        at={at + 6}
        stagger={1.6}
        style={{ fontFamily: font.serif, fontWeight: 700, fontSize: 64, color: color.ink, marginTop: 24, whiteSpace: "nowrap" }}
      />
    )}
  </div>
);

/** 从下方浮入 */
export const Rise: React.FC<{ at: number; dur?: number; dist?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  dur = 24,
  dist = 36,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, dur, ease.out);
  return <div style={{ ...style, opacity: p * ((style?.opacity as number | undefined) ?? 1), transform: `translateY(${(1 - p) * dist}px)` }}>{children}</div>;
};

export const up = color.pc;
export const down = color.red;
