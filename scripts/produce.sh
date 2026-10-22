#!/usr/bin/env bash
# 一键出片：检查 → MiniMax 配音 → 混音 → 横竖版渲染 → 复制到 exports/
#   bash scripts/produce.sh            有配音
#   bash scripts/produce.sh --no-voice 只用配乐重渲染
set -euo pipefail
cd "$(dirname "$0")/.."

# 云端环境没有 Remotion 自带浏览器时，用预装的 Chromium
if [ -z "${REMOTION_BROWSER_EXECUTABLE:-}" ] && [ -x /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell ]; then
  export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
fi
[ -d node_modules ] || npm install --no-fund --no-audit
python3 -c "import numpy, scipy" 2>/dev/null || pip install -q -r scripts/requirements.txt

if [ "${1:-}" != "--no-voice" ]; then
  echo "== 1/4 检查 MiniMax（不计费）"
  python3 -I scripts/voiceover.py ping
  echo "== 2/4 合成旁白"
  python3 -I scripts/voiceover.py generate
fi

echo "== 3/4 配乐与混音"
python3 -I scripts/make_audio.py

echo "== 4/4 渲染"
node scripts/render.mjs TechCycles out/tech-cycles.mp4
node scripts/render.mjs TechCyclesVertical out/tech-cycles-vertical.mp4
cp out/tech-cycles.mp4 exports/tech-cycles.mp4
cp out/tech-cycles-vertical.mp4 exports/tech-cycles-vertical.mp4
echo "完成：exports/tech-cycles.mp4、exports/tech-cycles-vertical.mp4"
