import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Line, type Pt } from "../../../lib/chart";
import { Reveal } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { CLAMP, ease, fade, lerp, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { SERIES, decimalYear } from "../data";
import { beats } from "../timeline";

const B = beats<{ zoomEnd: number; title: number }>("title");
const C = COPY.title;

const DATA = SERIES.map((p) => ({ t: decimalYear(p.m), lv: Math.log10(p.v) }));

/** 镜头窗口：横轴年份、纵轴 log10(点位)；竖版画面更窄，起始窗口相应收窄 */
const WINDOWS = {
  landscape: {
    from: { t: 2000.12, lv: 3.6, spanT: 1.6, spanLv: 0.32 },
    to: { t: 2003.9, lv: 3.32, spanT: 47.5, spanLv: 2.62 },
    cy: 560,
    h: 900,
  },
  portrait: {
    from: { t: 2000.1, lv: 3.6, spanT: 0.95, spanLv: 0.3 },
    to: { t: 2003.9, lv: 3.32, spanT: 47.5, spanLv: 2.62 },
    cy: 700,
    h: 820,
  },
};

const BANDS = [
  { a: 1981.0, b: 1996.0, fill: color.pc },
  { a: 1996.0, b: 2015.31, fill: color.net },
  { a: 2022.83, b: 2026.85, fill: color.ai },
];

export const TitleZoom: React.FC = () => {
  const frame = useCurrentFrame();
  const { W, H, portrait, pick, padX } = useLayout();
  const win = portrait ? WINDOWS.portrait : WINDOWS.landscape;

  // 先慢后快再慢的"拉远"
  const z = prog(frame, 0, B.zoomEnd, ease.inOut);
  const spanT = Math.exp(lerp(Math.log(win.from.spanT), Math.log(win.to.spanT), z));
  const spanLv = Math.exp(lerp(Math.log(win.from.spanLv), Math.log(win.to.spanLv), z));
  const cz = Math.pow(z, 1.6);
  const ct = lerp(win.from.t, win.to.t, cz);
  const clv = lerp(win.from.lv, win.to.lv, cz);

  const X = (t: number) => W / 2 + ((t - ct) / spanT) * W;
  const Y = (lv: number) => win.cy - ((lv - clv) / spanLv) * win.h;
  const pts: Pt[] = DATA.map((d) => ({ x: X(d.t), y: Y(d.lv) }));
  const visible = pts.filter((p, i) => {
    const inside = (q?: Pt) => q && q.x > -400 && q.x < W + 400;
    return inside(p) || inside(pts[i - 1]) || inside(pts[i + 1]);
  });

  const bandOp = prog(frame, B.zoomEnd - 30, 50) * 0.085;
  const overlay = prog(frame, B.zoomEnd - 10, 40, ease.soft);
  const lineW = interpolate(frame, [0, B.zoomEnd], [7, 3.5], CLAMP);

  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {BANDS.map((b) => (
          <rect key={b.a} x={X(b.a)} y={0} width={X(b.b) - X(b.a)} height={H} fill={b.fill} opacity={bandOp} />
        ))}
        <Line pts={visible} stroke={color.ink} width={lineW} glow={0.6} />
      </svg>

      <AbsoluteFill
        style={{
          background: portrait
            ? "linear-gradient(180deg, rgba(10,21,23,0) 0%, rgba(10,21,23,0.1) 42%, rgba(10,21,23,0.86) 60%, rgba(10,21,23,0.95) 100%)"
            : "linear-gradient(90deg, rgba(10,21,23,0.94) 0%, rgba(10,21,23,0.82) 42%, rgba(10,21,23,0.15) 78%, rgba(10,21,23,0) 100%)",
          opacity: overlay,
        }}
      />

      <AbsoluteFill style={{ padding: `0 ${padX}px`, justifyContent: portrait ? "flex-start" : "center", paddingTop: pick(0, 1180) }}>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: pick(24, 22),
            letterSpacing: pick("0.26em", "0.2em"),
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
          style={{ fontFamily: font.serif, fontWeight: 900, fontSize: pick(168, 136), color: color.ink, lineHeight: 1.1, letterSpacing: "0.02em" }}
        />
        <div
          style={{
            width: 120 * prog(frame, B.title + 30, 30),
            height: 4,
            background: color.accent,
            margin: pick("44px 0 36px", "36px 0 30px"),
          }}
        />
        <Reveal
          text={C.sub}
          at={B.title + 40}
          stagger={2}
          style={{ fontFamily: font.sans, fontWeight: 500, fontSize: pick(54, 48), color: color.body, letterSpacing: "0.08em" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
