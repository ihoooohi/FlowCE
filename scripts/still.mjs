// 批量导出静帧，用于检查画面。
// 用法：node scripts/still.mjs <CompositionId> <输出目录> <帧号...> [--scale=0.5] [--props='{"captions":"on"}']
// 例：  node scripts/still.mjs TechCycles out/stills 0 300 1200
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const args = process.argv.slice(2);
const scaleArg = args.find((a) => a.startsWith("--scale="));
const scale = scaleArg ? Number(scaleArg.split("=")[1]) : 1;
const [id, outDir, ...frames] = args.filter((a) => !a.startsWith("--"));
if (!id || !outDir || frames.length === 0) {
  console.error("用法：node scripts/still.mjs <CompositionId> <输出目录> <帧号...> [--scale=0.5]");
  process.exit(1);
}

const propsArg = args.find((a) => a.startsWith("--props="));
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = { music: false, captions: "auto", ...(propsArg ? JSON.parse(propsArg.slice(8)) : {}) };
const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable });

for (const f of frames) {
  const output = path.join(outDir, `${id}-${String(f).padStart(5, "0")}.png`);
  await renderStill({ serveUrl, composition, frame: Number(f), output, inputProps, scale, browserExecutable });
  console.log(output);
}
