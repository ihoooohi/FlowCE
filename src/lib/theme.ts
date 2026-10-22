/** 全局视觉规范：深色电影感 + 研究报告式排版。新视频可以直接复用或覆盖。 */
export const color = {
  bg: "#0a1517",
  bgLift: "#16343a",
  ink: "#f3efe6",
  body: "#c4cfcc",
  muted: "#8a9e9a",
  dim: "#4f6562",
  grid: "rgba(220, 240, 235, 0.07)",
  gridStrong: "rgba(220, 240, 235, 0.16)",
  accent: "#ef896a",
  red: "#ff6159",
  pc: "#3cc9a5",
  net: "#5f9ff2",
  ai: "#f6a545",
} as const;

export const font = {
  serif: '"Noto Serif SC", serif',
  sans: '"Noto Sans SC", sans-serif',
  mono: '"JetBrains Mono", "Noto Sans SC", monospace',
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** 画面安全边距 */
export const SAFE = { x: 140, y: 96 } as const;
