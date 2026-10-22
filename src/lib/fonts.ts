import "@fontsource/noto-serif-sc/700.css";
import "@fontsource/noto-serif-sc/900.css";
import "@fontsource/noto-sans-sc/400.css";
import "@fontsource/noto-sans-sc/500.css";
import "@fontsource/noto-sans-sc/700.css";
import "@fontsource/noto-sans-sc/900.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/jetbrains-mono/800.css";
import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";

const FACES = [
  "700 40px 'Noto Serif SC'",
  "900 40px 'Noto Serif SC'",
  "400 40px 'Noto Sans SC'",
  "500 40px 'Noto Sans SC'",
  "700 40px 'Noto Sans SC'",
  "900 40px 'Noto Sans SC'",
  "400 40px 'JetBrains Mono'",
  "500 40px 'JetBrains Mono'",
  "700 40px 'JetBrains Mono'",
  "800 40px 'JetBrains Mono'",
];

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("") + "—–·×≈≠→←↑↓…“”‘’";

/**
 * 中文字体按 unicode-range 切片懒加载。渲染前把本片用到的全部字符预先加载，
 * 避免某一帧截图时字体还没到、出现回退字体。
 */
export const useFontsReady = (text: string) => {
  const [handle] = useState(() => delayRender("加载字体"));
  useEffect(() => {
    const chars = Array.from(new Set(Array.from(text + ASCII))).join("");
    Promise.all(FACES.map((face) => document.fonts.load(face, chars)))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [handle, text]);
};
