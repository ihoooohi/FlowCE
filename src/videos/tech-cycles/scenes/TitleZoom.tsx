import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Line, type Pt } from "../../../lib/chart";
import { Reveal } from "../../../lib/components";
import { CLAMP, ease, fade, lerp, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { SERIES, decimalYear } from "../data";
import { beats } from "../timeline";

const B = beats<{ zoomEnd: number; title: number }>("title");
const C = COPY.title;

const DATA = SERIES.map((p) => ({ t: decimalYear(p.m), lv: Math.log10(p.v) }));

/** 镜头窗口：横轴年份、纵轴 log10(点位) */
const W0 = { t: 2000.12, lv: 3.6, spanT: 1.6, spanLv: 0.32 };
const W1 = { t: 2003.9, lv: 3.32, spanT: 47.5, spanLv: 2.62 };

const BANDS = [
  { a: 1981.0, b: 1996.0, fill: color.pc },
  { a: 1996.0, b: 2015.31, fill: color.net },
  { a: 2022.83, b: 2026.85, fill: color.ai },
];

export const TitleZoom: React.FC = () => {
  const frame = useCurrentFrame();
  // 先慢后快再慢的"拉远"
  const z = prog(frame, 0, B.zoomEnd, ease.inOut);
  const spanT = Math.exp(lerp(Math.log(W0.spanT), Math.log(W1.spanT), z));
  const spanLv = Math.exp(lerp(Math.log(W0.spanLv), Math.log(W1.spanLv), z));
  const cz = Math.pow(z, 1.6);
  const ct = lerp(W0.t, W1.t, cz);
  const clv = lerp(W0.lv, W1.lv, cz);

  const X = (t: number) => 960 + ((t - ct) / spanT) * 1920;
  const Y = (lv: number) => 560 - ((lv - clv) / spanLv) * 900;
  const pts: Pt[] = DATA.map((d) => ({ x: X(d.t), y: Y(d.lv) }));
  const visible = pts.filter((p, i) => {
    const prev = pts[i - 1];
    const next = pts[i + 1];
    const inside = (q?: Pt) => q && q.x > -400 && q.x < 2320;
    return inside(p) || inside(prev) || inside(next);
  });

  const bandOp = prog(frame, B.zoomEnd - 30, 50) * 0.085;
  const overlay = prog(frame, B.zoomEnd - 10, 40, ease.soft);
  const lineW = interpolate(frame, [0, B.zoomEnd], [7, 3.5], CLAMP);

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {BANDS.map((b) => (
          <rect key={b.a} x={X(b.a)} y={0} width={X(b.b) - X(b.a)} height={1080} fill={b.fill} opacity={bandOp} />
        ))}
        <Line pts={visible} stroke={color.ink} width={lineW} glow={0.6} />
      </svg>

      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, rgba(10,21,23,0.94) 0%, rgba(10,21,23,0.82) 42%, rgba(10,21,23,0.15) 78%, rgba(10,21,23,0) 100%)`,
          opacity: overlay,
        }}
      />

      <AbsoluteFill style={{ padding: "0 140px", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 24,
            letterSpacing: "0.26em",
            color: color.accent,
            opacity: fade(frame, B.title - 8, 16),
            marginBottom: 34,
          }}
        >
          {C.eyebrow}
        </div>
        <Reveal
          text={C.title}
          at={B.title}
          stagger={4}
          dur={30}
          rise={40}
          blur={18}
          style={{ fontFamily: font.serif, fontWeight: 900, fontSize: 168, color: color.ink, lineHeight: 1.1, letterSpacing: "0.02em" }}
        />
        <div
          style={{
            width: 120 * prog(frame, B.title + 30, 30),
            height: 4,
            background: color.accent,
            margin: "44px 0 36px",
          }}
        />
        <Reveal
          text={C.sub}
          at={B.title + 40}
          stagger={2}
          style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 54, color: color.body, letterSpacing: "0.08em" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
