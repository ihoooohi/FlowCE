# 视频制作仓库约定

这是一个 Remotion（React + TypeScript）视频制作仓库，不是 Web 应用。每支视频 = `src/videos/<slug>/` 下的一组场景组件 + 在 `src/Root.tsx` 注册的 Composition。

## 工作流

1. 素材放 `materials/<slug>/source/`，先写 `materials/<slug>/storyboard.md`：核心意思、场景表、关键数字（数字必须能追溯到素材）。
2. 文案只写在 `src/videos/<slug>/copy.ts`；`useFontsReady(ALL_TEXT)` 会按其中的字符预加载中文字体切片，新增文案不放进 copy.ts 会导致渲染时字体缺失。
3. 场景时长与节拍点写在 `timeline.json`，场景内用 `beats<T>(id)` 读取；配乐脚本读同一份文件。改了时长或节拍点后运行 `npm run audio`。
4. 改完先导静帧检查：`node scripts/still.mjs <Id> out/stills <帧号...>`，确认排版后再 `npm run render`。
5. 定稿成片复制到 `exports/`。

## 约定

- 通用的东西（颜色、字体、动效、图表原语）放 `src/lib/`，某支视频独有的放它自己的目录。
- 帧动画一律由 `useCurrentFrame()` 推导，不用 CSS transition / animation、不用 `Math.random()`（用 remotion 的 `random(seed)`）。
- `interpolate` 的输入区间必须递增。
- 数字计数用等宽字体（`NumLabel` / `font.mono`），避免跳动。
- 云端没有 Remotion 自带浏览器时：`export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`。
- `npx tsc --noEmit` 是提交前的检查。
