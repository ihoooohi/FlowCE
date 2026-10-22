import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Eyebrow, NumLabel, Reveal } from "../../../lib/components";
import { CLAMP, fade, lerp, prog } from "../../../lib/motion";
import { SAFE, color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { first48 } from "../data";
import { beats, scene } from "../timeline";
import { PLOT, RaceChart, TINT, type SeriesKey } from "./RaceChart";

const B = beats<{ drawStart: number; drawEnd: number; done: number; cap: number }>("race");
const DUR = scene("race").dur;
const C = COPY.race;

export const RACE_END_MONTH = 47;

const valueAt = (arr: number[], m: number) => {
  const i = Math.min(arr.length - 2, Math.floor(m));
  return lerp(arr[i], arr[i + 1], Math.min(1, m - i));
};

export const Race: React.FC = () => {
  const frame = useCurrentFrame();
  const m = interpolate(frame, [B.drawStart, B.drawEnd], [0, RACE_END_MONTH], {
    ...CLAMP,
    easing: Easing.bezier(0.3, 0, 0.6, 1),
  });
  // 收尾时把文字层淡出，只把图表交给下一场景
  const overlayOut = 1 - prog(frame, DUR - 40, 30);
  const keys = C.rows.map((r) => r.key as SeriesKey);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.x, top: SAFE.y, opacity: overlayOut }}>
        <Eyebrow index={C.eyebrow[0]} label={C.eyebrow[1]} at={4} />
        <Reveal
          text={C.head}
          at={10}
          stagger={1.6}
          style={{ fontFamily: font.serif, fontWeight: 700, fontSize: 66, color: color.ink, marginTop: 26 }}
        />
      </div>

      <RaceChart
        xMax={48}
        yMin={60}
        yMax={420}
        progress={{ net: m, ai: m, pc: m }}
        opacity={{ net: 1, ai: 1, pc: 1 }}
        gridOpacity={fade(frame, 14, 24)}
        dots={{ net: fade(frame, B.drawStart, 10), ai: fade(frame, B.drawStart, 10), pc: fade(frame, B.drawStart, 10) }}
        baseLabel={C.base}
      />

      {/* 月份计数 */}
      <div style={{ position: "absolute", left: 1460, top: 300, opacity: fade(frame, B.drawStart - 10, 14) * overlayOut }}>
        <div style={{ fontFamily: font.mono, fontSize: 20, color: color.muted, letterSpacing: "0.12em" }}>{C.axis}</div>
        <NumLabel template={C.month} value={String(Math.min(48, Math.floor(m) + 1))} size={66} tint={color.ink} style={{ marginTop: 8 }} />
      </div>

      {/* 实时涨幅 */}
      {keys.map((k, i) => {
        const row = C.rows[i];
        const v = valueAt(first48[k], m) - 100;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: 1460,
              top: 470 + i * 140,
              opacity: fade(frame, B.drawStart - 6 + i * 6, 14) * overlayOut,
              display: "flex",
              gap: 22,
              alignItems: "stretch",
            }}
          >
            <div style={{ width: 6, background: TINT[k], borderRadius: 3 }} />
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span style={{ fontFamily: font.sans, fontWeight: 900, fontSize: 34, color: TINT[k] }}>{row.name}</span>
                <span style={{ fontFamily: font.mono, fontSize: 17, color: color.muted }}>{row.period}</span>
              </div>
              <div style={{ fontFamily: font.mono, fontWeight: 800, fontSize: 64, color: color.ink, lineHeight: 1.1 }}>
                {v >= 0 ? "+" : "−"}
                {Math.abs(Math.round(v))}%
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ position: "absolute", left: PLOT.x0 + 40, top: PLOT.top + 10, opacity: overlayOut }}>
        <Reveal
          text={C.cap}
          at={B.cap}
          stagger={1.4}
          style={{ fontFamily: font.sans, fontWeight: 700, fontSize: 38, color: color.ink, lineHeight: 1.55 }}
        />
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 22,
            color: color.accent,
            marginTop: 22,
            letterSpacing: "0.08em",
            opacity: fade(frame, B.cap + 50, 16),
          }}
        >
          {C.note}
        </div>
      </div>
    </AbsoluteFill>
  );
};
