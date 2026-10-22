"""旁白配音：MiniMax 语音合成（或你自己的录音）→ 对齐到画面节拍。

旁白稿：src/videos/<slug>/narration.json（每句 = 场景 + 场景内帧号 + 文本）
产物：  public/<slug>/vo/<id>.mp3 与 src/videos/<slug>/data/voiceover.json（时长、起点）

用法：
  python3 -I scripts/voiceover.py check               按估算语速检查每句会不会压到下一句（不调用 API）
  python3 -I scripts/voiceover.py voices              列出账号可用的系统音色
  python3 -I scripts/voiceover.py samples [音色...]   用同一句话给几个音色各生成一段试听 → out/voice-samples/
  python3 -I scripts/voiceover.py generate [--force]  逐句合成（有缓存，文本或音色不变就不重复计费）
  python3 -I scripts/voiceover.py import <目录>       用你自己的录音：目录里按句子 id 命名（01-peak.wav …）
  可选参数 --slug=tech-cycles

环境变量：MINIMAX_API_KEY（必填）；MINIMAX_API_HOST，默认 https://api.minimaxi.com，
国际站账号用 https://api.minimax.io（key 和 host 必须同一个站点）。

合成或导入之后运行 npm run audio：配乐会在旁白处自动让位，并输出混音 mix.m4a。
"""

import hashlib
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
FLAGS = {a.split("=")[0]: (a.split("=", 1)[1] if "=" in a else True) for a in sys.argv[1:] if a.startswith("--")}
SLUG = FLAGS.get("--slug", "tech-cycles")

VIDEO = ROOT / "src/videos" / SLUG
NARRATION = VIDEO / "narration.json"
MANIFEST = VIDEO / "data/voiceover.json"
TIMELINE = VIDEO / "timeline.json"
VO_DIR = ROOT / "public" / SLUG / "vo"

CHARS_PER_SEC = 4.5  # 估算用的中文语速
GAP = 0.15  # 两句之间至少留的空隙（秒）

SAMPLE_TEXT = "如果那天买入，要等多久才能回本？十五年。而这十五年，正是互联网改变世界的十五年。"
SAMPLE_VOICES = [
    "audiobook_male_1",
    "audiobook_male_2",
    "presenter_male",
    "male-qn-jingying",
    "audiobook_female_1",
    "presenter_female",
]


# ---------------------------------------------------------------------------


def load_json(p: Path) -> dict:
    return json.loads(p.read_text())


def scene_starts() -> tuple[dict[str, int], int, int]:
    tl = load_json(TIMELINE)
    starts, cursor = {}, 0
    for i, s in enumerate(tl["scenes"]):
        start = 0 if i == 0 else cursor - s["overlap"]
        cursor = start + s["dur"]
        starts[s["id"]] = start
    return starts, cursor, tl["fps"]


def cues() -> list[dict]:
    nar = load_json(NARRATION)
    starts, total, fps = scene_starts()
    out = []
    for line in nar["lines"]:
        frame = starts[line["scene"]] + line["at"]
        out.append({**line, "frame": frame, "t": frame / fps})
    out.sort(key=lambda x: x["frame"])
    return out


def estimate(text: str) -> float:
    """粗估朗读时长：汉字/数字按音节，标点给停顿"""
    sec = 0.0
    for ch in text:
        if "一" <= ch <= "鿿":
            sec += 1 / CHARS_PER_SEC
        elif ch.isdigit():
            sec += 1.4 / CHARS_PER_SEC
        elif ch in "，、；：":
            sec += 0.18
        elif ch in "。？！——":
            sec += 0.3
        elif ch.isalpha():
            sec += 0.35 / CHARS_PER_SEC
    return sec


def report(items: list[dict], total_sec: float) -> int:
    problems = 0
    for i, c in enumerate(items):
        end = c["t"] + c["dur"]
        nxt = items[i + 1]["t"] if i + 1 < len(items) else total_sec
        slack = nxt - end
        flag = ""
        if slack < GAP:
            flag = f"  ← 超出 {-(slack - GAP):.2f}s：缩短文本、提高 speed，或把下一句的 at 往后挪"
            problems += 1
        print(f"{c['t']:7.2f}s  {c['dur']:5.2f}s  余 {slack:5.2f}s  {c['id']:<14} {c['text']}{flag}")
    return problems


# ---------------------------------------------------------------------------
# MiniMax


def minimax(path: str, payload: dict) -> dict:
    key = os.environ.get("MINIMAX_API_KEY")
    if not key:
        sys.exit("缺少环境变量 MINIMAX_API_KEY（在云端环境设置里添加，新会话生效）。")
    host = os.environ.get("MINIMAX_API_HOST", "https://api.minimaxi.com").rstrip("/")
    req = urllib.request.Request(
        host + path,
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"MiniMax HTTP {e.code}: {e.read()[:300]!r}")
    except urllib.error.URLError as e:
        sys.exit(f"连不上 {host}：{e.reason}（检查网络放行与 MINIMAX_API_HOST）")
    base = data.get("base_resp", {})
    code = base.get("status_code", 0)
    if code != 0:
        hint = {1004: "API key 与 host 不匹配或无效", 2038: "需要先在开放平台完成实名认证"}.get(code, "")
        sys.exit(f"MiniMax 错误 {code}: {base.get('status_msg')} {hint}")
    return data


def synth(text: str, voice: dict) -> bytes:
    payload = {
        "model": voice["model"],
        "text": text,
        "stream": False,
        "voice_setting": {
            "voice_id": voice["voice_id"],
            "speed": voice.get("speed", 1.0),
            "vol": voice.get("vol", 1.0),
            "pitch": voice.get("pitch", 0),
            "emotion": voice.get("emotion", "neutral"),
        },
        "audio_setting": {"sample_rate": 44100, "bitrate": 256000, "format": "mp3", "channel": 1},
        "language_boost": voice.get("language_boost", "Chinese"),
    }
    data = minimax("/v1/t2a_v2", payload)
    audio = (data.get("data") or {}).get("audio")
    if not audio:
        sys.exit(f"返回里没有音频：{json.dumps(data)[:300]}")
    return bytes.fromhex(audio)


def line_hash(text: str, voice: dict) -> str:
    keys = ["model", "voice_id", "speed", "vol", "pitch", "emotion", "language_boost"]
    sig = json.dumps([text] + [voice.get(k) for k in keys], ensure_ascii=False)
    return hashlib.sha1(sig.encode()).hexdigest()[:12]


# ---------------------------------------------------------------------------
# 音频测量


def probe_speech(path: Path) -> tuple[float, float, float]:
    """返回（文件时长，开头静音，结尾静音）"""
    import numpy as np

    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    dur = len(x) / 16000
    win = 160
    rms = np.sqrt(np.convolve(x**2, np.ones(win) / win, mode="same"))
    loud = np.nonzero(rms > max(1e-4, rms.max() * 0.03))[0]
    if not len(loud):
        return dur, 0.0, 0.0
    return dur, loud[0] / 16000, dur - loud[-1] / 16000


def write_manifest(items: list[dict]) -> None:
    starts, total, fps = scene_starts()
    lines = []
    for c in items:
        f = VO_DIR / c["file"]
        dur, lead, tail = probe_speech(f)
        lines.append(
            {
                "id": c["id"],
                "file": f"{SLUG}/vo/{c['file']}",
                "frame": c["frame"],
                "lead": round(lead, 3),
                "speech": round(dur - lead - tail, 3),
                "duration": round(dur, 3),
                "text": c["text"],
                "hash": c.get("hash"),
            }
        )
    MANIFEST.write_text(
        json.dumps({"comment": "由 scripts/voiceover.py 生成，请勿手改。", "fps": fps, "lines": lines}, ensure_ascii=False, indent=1)
        + "\n"
    )
    print(f"→ {MANIFEST.relative_to(ROOT)}（{len(lines)} 句）")
    items = [{**c, "dur": l["speech"]} for c, l in zip(items, lines)]
    problems = report(items, total / fps)
    if problems:
        print(f"\n有 {problems} 句会压到下一句，见上方提示。")


# ---------------------------------------------------------------------------


def cmd_check() -> None:
    items = [{**c, "dur": estimate(c.get("say", c["text"]))} for c in cues()]
    _, total, fps = scene_starts()
    print(f"按 {CHARS_PER_SEC} 字/秒估算（实际以合成结果为准）：\n")
    problems = report(items, total / fps)
    chars = sum(len(c["text"]) for c in items)
    print(f"\n共 {len(items)} 句、{chars} 字；估计有 {problems} 处需要调整。")


def cmd_voices() -> None:
    data = minimax("/v1/get_voice", {"voice_type": "system"})
    for v in data.get("system_voice") or []:
        print(f"{v.get('voice_id'):<48} {v.get('voice_name')}  {', '.join(v.get('description') or [])}")


def cmd_samples() -> None:
    voice = load_json(NARRATION)["voice"]
    out = ROOT / "out/voice-samples"
    out.mkdir(parents=True, exist_ok=True)
    for vid in ARGS[1:] or SAMPLE_VOICES:
        try:
            audio = synth(SAMPLE_TEXT, {**voice, "voice_id": vid})
        except SystemExit as e:
            print(f"{vid}: 失败 {e}")
            continue
        p = out / f"{vid.replace(' ', '_').replace('(', '').replace(')', '')}.mp3"
        p.write_bytes(audio)
        print(f"→ {p.relative_to(ROOT)}")


def cmd_generate() -> None:
    nar = load_json(NARRATION)
    voice = nar["voice"]
    old = {l["id"]: l for l in load_json(MANIFEST).get("lines", [])} if MANIFEST.exists() else {}
    VO_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for c in cues():
        text = c.get("say", c["text"])
        h = line_hash(text, voice)
        file = f"{c['id']}.mp3"
        if not FLAGS.get("--force") and old.get(c["id"], {}).get("hash") == h and (VO_DIR / file).exists():
            print(f"缓存  {c['id']}")
        else:
            print(f"合成  {c['id']}  {text}")
            (VO_DIR / file).write_bytes(synth(text, voice))
        items.append({**c, "file": file, "hash": h})
    write_manifest(items)


def cmd_import() -> None:
    if len(ARGS) < 2:
        sys.exit("用法：voiceover.py import <目录>")
    src = Path(ARGS[1])
    VO_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for c in cues():
        found = next((p for ext in ("wav", "mp3", "m4a", "flac") if (p := src / f"{c['id']}.{ext}").exists()), None)
        if not found:
            sys.exit(f"缺少 {c['id']}.(wav|mp3|m4a|flac)")
        dst = VO_DIR / f"{c['id']}.mp3"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(found), "-ac", "1", "-ar", "44100", "-b:a", "256k", str(dst)], check=True)
        items.append({**c, "file": dst.name, "hash": "import"})
    write_manifest(items)


def main() -> None:
    cmd = ARGS[0] if ARGS else "check"
    {"check": cmd_check, "voices": cmd_voices, "samples": cmd_samples, "generate": cmd_generate, "import": cmd_import}.get(
        cmd, lambda: sys.exit(__doc__)
    )()


if __name__ == "__main__":
    if not shutil.which("ffmpeg"):
        sys.exit("需要 ffmpeg")
    main()
