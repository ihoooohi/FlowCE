import React from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Callout, Dot, GridY, Line, TicksX, linear, partial, type Pt } from "../../../lib/chart";
import { Eyebrow, Reveal } from "../../../lib/components";
import { useLayout } from "../../../lib/layout";
import { CLAMP, ease, fade, prog } from "../../../lib/motion";
import { color, font } from "../../../lib/theme";
import { COPY } from "../copy";
import { FACTS, first48, netFull } from "../data";
import { beats } from "../timeline";

const B = beats<{ netStart: number; netEnd: number; aiStart: number; aiEnd: number; fog: number; swap: number }>("ai");
const C = COPY.ai;

const NOW_M = first48.ai.length - 1;
const TINT = { net: color.net, ai: color.ai } as const;

export const AINow: React.FC = () => {
  const frame = useCurrentFrame();
  const { W, H, portrait, pick, padX, top } = useLayout();
  const PLOT = pick({ x0: 190, x1: 1460, top: 300, bottom: 920 }, { x0: 120, x1: 990, top: 620, bottom: 1150 });
  const sx = linear(0, 84, PLOT.x0, PLOT.x1);
  const sy = linear(50, 520, PLOT.bottom, PLOT.top);
  const NET: Pt[] = netFull.map((v, i) => ({ x: sx(i), y: sy(v) }));
  const AI: Pt[] = first48.ai.map((v, i) => ({ x: sx(i), y: sy(v) }));
  const netP = interpolate(frame, [B.netStart, B.netEnd], [0, NET.length - 1], { ...CLAMP, easing: ease.inOut });
  const aiP = interpolate(frame, [B.aiStart, B.aiEnd], [0, NOW_M], { ...CLAMP, easing: ease.inOut });
  const net = partial(NET, netP);
  const ai = partial(AI, aiP);
  const ghost = 1 - 0.55 * prog(frame, B.aiStart - 20, 30);
  const arrived = frame >= B.aiEnd;
  const fog = prog(frame, B.fog, 50, ease.inOut);
  const swapOut = 1 - prog(frame, B.swap, 16, ease.inOut);
  const nowX = sx(NOW_M);
  const drift = (frame - B.fog) * 0.6;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: padX, top }}>
        <Eyebrow index={C.eyebrow[0]} label={C.eyebrow[1]} at={4} />
        <div style={{ position: "relative", marginTop: 26, height: 100 }}>
          <Reveal
            text={C.head}
            at={10}
            stagger={1.6}
            style={{ position: "absolute", fontFamily: font.serif, fontWeight: 700, fontSize: pick(66, 58), color: color.ink, opacity: swapOut, whiteSpace: "nowrap" }}
          />
          {frame >= B.swap && (
            <Reveal
              text={portrait ? C.head2V : C.head2}
              at={B.swap + 10}
              stagger={1.4}
              style={{
                position: "absolute",
                fontFamily: font.serif,
                fontWeight: 700,
                fontSize: pick(66, 56),
                lineHeight: 1.35,
                color: color.ink,
                whiteSpace: portrait ? "normal" : "nowrap",
                width: portrait ? W - 2 * padX : undefined,
              }}
            />
          )}
        </div>
      </div>

      <svg width={W} height={H} style={{ position: "absolute" }}>
        <g opacity={fade(frame, 10, 24)}>
          <GridY values={[100, 200, 300, 400, 500]} y={sy} x0={PLOT.x0} x1={PLOT.x1} strong={[100]} />
          <line x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.bottom} y2={PLOT.bottom} stroke={color.dim} strokeWidth={2} />
          <TicksX values={[0, 12, 24, 36, 48, 60, 72, 84]} x={sx} y0={PLOT.bottom} />
          <text x={PLOT.x1} y={PLOT.bottom + 76} textAnchor="end" fontFamily={font.mono} fontSize={18} fill={color.muted}>
            {C.axis}
          </text>
        </g>

        {/* 互联网曲线在"现在"之后的部分随雾气隐去，避免被当成 AI 的路线图 */}
        <Line pts={net.pts.filter((p) => p.x <= nowX + 0.5)} stroke={color.net} width={5} opacity={ghost} glow={0.5} />
        <Line pts={net.pts.filter((p) => p.x >= nowX - 0.5 - (NET[1].x - NET[0].x))} stroke={color.net} width={5} opacity={ghost * (1 - fog)} glow={0.5} />
        {frame >= B.netEnd - 20 && (
          <Callout
            x={sx(49)}
            y={sy(netFull[49])}
            dx={60}
            dy={-30}
            title={C.peak}
            tint={color.net}
            opacity={fade(frame, B.netEnd - 20, 14) * ghost * (1 - fog)}
          />
        )}

        <Line pts={ai.pts} stroke={color.ai} width={6} glow={0.9} />
        {frame >= B.aiStart && <Dot x={ai.head.x} y={ai.head.y} fill={color.ai} r={arrived ? 11 : 8} />}

        {arrived && (
          <g opacity={fade(frame, B.aiEnd, 16)}>
            <line x1={nowX} x2={nowX} y1={PLOT.top - 10} y2={PLOT.bottom} stroke={color.ai} strokeWidth={2} strokeDasharray="6 8" opacity={0.7} />
            <text x={nowX - 14} y={PLOT.bottom - 16} textAnchor="end" fontFamily={font.mono} fontSize={19} fill={color.ai}>
              {C.cut}
            </text>
            <Callout x={ai.head.x} y={ai.head.y} dx={-34} dy={-100} align="end" title={C.now[1]} sub={C.now[0]} tint={color.ai} />
          </g>
        )}
      </svg>

      {/* 未来：一片雾 */}
      <div
        style={{
          position: "absolute",
          left: nowX + 4,
          top: PLOT.top - 120,
          width: PLOT.x1 - nowX + 40,
          height: PLOT.bottom - PLOT.top + 160,
          opacity: fog,
          maskImage: "linear-gradient(180deg, transparent 0%, #000 16%, #000 86%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 16%, #000 86%, transparent 100%)",
          background: `linear-gradient(90deg, rgba(10,21,23,0) 0%, rgba(13,27,30,0.94) 14%, rgba(13,27,30,0.97) 100%)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -200,
            backgroundImage: `url(${staticFile("textures/fog.png")})`,
            backgroundSize: "900px 900px",
            backgroundPosition: `${drift}px ${drift * 0.3}px`,
            opacity: 0.55,
            mixBlendMode: "screen",
          }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Reveal
            text={C.fog}
            at={B.fog + 30}
            stagger={3}
            dur={30}
            style={{ fontFamily: font.serif, fontWeight: 700, fontSize: pick(58, 46), color: color.ink, lineHeight: 1.5, textAlign: "center" }}
          />
        </div>
      </div>

      {/* 图例 + 前 48 个月涨幅 */}
      <div
        style={{
          position: "absolute",
          left: pick(1540, padX),
          top: pick(330, 1232),
          width: pick(320, W - 2 * padX),
          display: portrait ? "flex" : "block",
          gap: 60,
        }}
      >
        {C.legend.map((l, i) => {
          const tint = TINT[l.key as keyof typeof TINT];
          const val = l.key === "net" ? FACTS.gain48.net : FACTS.gain48.ai;
          return (
            <div key={l.key} style={{ marginBottom: pick(44, 0), opacity: fade(frame, (i === 0 ? B.netStart : B.aiStart) - 8, 14) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 30, height: 6, background: tint, borderRadius: 3, display: "inline-block" }} />
                <span style={{ fontFamily: font.sans, fontWeight: 900, fontSize: 34, color: tint }}>{l.name}</span>
              </div>
              <div style={{ fontFamily: font.mono, fontSize: 18, color: color.muted, marginTop: 6 }}>{l.period}</div>
              <div style={{ fontFamily: font.mono, fontWeight: 800, fontSize: pick(56, 50), color: color.ink, opacity: fade(frame, B.aiEnd + 10 + i * 8, 14) }}>
                +{val}%
              </div>
              <div style={{ fontFamily: font.mono, fontSize: 16, color: color.muted, opacity: fade(frame, B.aiEnd + 10 + i * 8, 14) }}>
                {C.gainLabel}
              </div>
            </div>
          );
        })}
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 19,
            color: color.accent,
            lineHeight: 1.6,
            marginTop: pick(40, 4),
            width: pick(undefined, 240),
            opacity: fade(frame, B.swap + 40, 16),
          }}
        >
          {C.note}
        </div>
      </div>
    </AbsoluteFill>
  );
};
