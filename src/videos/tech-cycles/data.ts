import raw from "./data/nasdaq-monthly.json";

export type Month = { m: string; v: number };

/** 纳斯达克综合指数月末收盘（1981-01 → 2026-10），见 scripts/digitize_nasdaq.py */
export const SERIES: Month[] = raw.series;

export const indexOf = (m: string) => {
  const i = SERIES.findIndex((s) => s.m === m);
  if (i < 0) throw new Error(`no data for ${m}`);
  return i;
};

export const slice = (from: string, to: string) => SERIES.slice(indexOf(from), indexOf(to) + 1);

/** 与原图一致：月度点画在当月 1 日 */
export const decimalYear = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return y + (mo - 1) / 12;
};

export const dateToYear = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return y + (m - 1) / 12 + (day - 1) / 365;
};

/** 以起点（或给定基准）= 100 归一化 */
export const normalize = (months: Month[], base = months[0].v) => months.map((p) => (p.v / base) * 100);

/**
 * 素材中写明的关键数字。画面上出现的数字全部来自这里，
 * 曲线形状来自数字化序列。
 */
export const FACTS = {
  start1981: 197.5,
  peak2000: { date: "2000-03-10", close: 5048.62 },
  low2002: { date: "2002-10-09", close: 1114.11, drop: -78 },
  recover2015: { date: "2015-04-23", years: 15 },
  crash1987: { drop: -33, peakMonth: "1987-08", recoverMonth: "1989-06", years: 1.8 },
  now: { date: "2026-10-20", close: 26424.82, aiGain: 130 },
  gain48: { net: 284, ai: 130, pc: 54 },
} as const;

export const ERAS = {
  pc: { start: "1981-08", label: "PC 革命" },
  net: { start: "1996-01", label: "互联网革命" },
  ai: { start: "2022-11", label: "AI 革命" },
} as const;

/** 三次革命前 48 个月（第 0–47 个月），起点 = 100 */
export const first48 = {
  pc: normalize(slice("1981-08", "1985-07")),
  net: normalize(slice("1996-01", "1999-12")),
  ai: normalize(slice("2022-11", "2026-10")),
};

/** 互联网 1996-01 → 2002-10 完整周期，起点 = 100 */
export const netFull = normalize(slice("1996-01", "2002-10"));
