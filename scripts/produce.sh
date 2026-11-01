#!/usr/bin/env bash
# 一键出片：检查 → MiniMax 配音 → 混音 → 渲染 → 复制到 exports/
#   bash scripts/produce.sh [slug]             有配音（slug 默认 tech-cycles）
#   bash scripts/produce.sh [slug] --no-voice  只用配乐重渲染
set -euo pipefail
cd "$(dirname "$0")/.."

SLUG=tech-cycles
NO_VOICE=""
for a in "$@"; do
  case "$a" in
    --no-voice) NO_VOICE=1 ;;
    *) SLUG="$a" ;;
  esac
done
# 每支视频要渲染的 Composition 与导出文件名
case "$SLUG" in
  tech-cycles) TARGETS="TechCycles:tech-cycles TechCyclesVertical:tech-cycles-vertical" ;;
  ai-bill) TARGETS="AIBill:ai-bill" ;;
  *) echo "未知视频：$SLUG（在 scripts/produce.sh 里登记）"; exit 1 ;;
esac

# 云端环境没有 Remotion 自带浏览器时，用预装的 Chromium
if [ -z "${REMOTION_BROWSER_EXECUTABLE:-}" ] && [ -x /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell ]; then
  export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
fi
[ -d node_modules ] || npm install --no-fund --no-audit
python3 -c "import numpy, scipy" 2>/dev/null || pip install -q -r scripts/requirements.txt

if [ -z "$NO_VOICE" ]; then
  echo "== 1/4 检查 MiniMax（不计费）"
  python3 -I scripts/voiceover.py ping
  echo "== 2/4 合成旁白"
  python3 -I scripts/voiceover.py generate --slug="$SLUG"
fi

echo "== 3/4 配乐与混音"
python3 -I scripts/make_audio.py --slug="$SLUG"

echo "== 4/4 渲染"
for t in $TARGETS; do
  id="${t%%:*}"; name="${t##*:}"
  node scripts/render.mjs "$id" "out/$name.mp4"
  cp "out/$name.mp4" "exports/$name.mp4"
  echo "完成：exports/$name.mp4"
done
