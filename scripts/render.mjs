// 渲染成片。
// 用法：node scripts/render.mjs [CompositionId] [输出路径] [--scale=0.5] [--frames=0-299]
// 例：  node scripts/render.mjs TechCycles out/tech-cycles.mp4
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const [id = "TechCycles", output = `out/${id}.mp4`] = args.filter((a) => !a.startsWith("--"));
const scale = Number(opt("scale") ?? 1);
const frameRange = opt("frames")?.split("-").map(Number);

const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = { music: true };
const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable });

let last = -1;
await renderMedia({
  serveUrl,
  composition,
  inputProps,
  codec: "h264",
  crf: 18,
  pixelFormat: "yuv420p",
  audioBitrate: "192k",
  outputLocation: output,
  scale,
  frameRange: frameRange ? [frameRange[0], frameRange[1]] : null,
  browserExecutable,
  concurrency: Number(process.env.REMOTION_CONCURRENCY ?? 4),
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 100);
    if (pct !== last && pct % 5 === 0) {
      last = pct;
      console.log(`${pct}%`);
    }
  },
});
console.log(`→ ${output}`);
