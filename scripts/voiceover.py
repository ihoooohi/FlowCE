"""旁白配音：MiniMax 语音合成（或你自己的录音）→ 对齐到画面节拍。

旁白稿：src/videos/<slug>/narration.json（每句 = 场景 + 场景内帧号 + 文本）
产物：  public/<slug>/vo/<id>.mp3 与 src/videos/<slug>/data/voiceover.json（时长、起点）

用法：
  python3 -I scripts/voiceover.py check               按估算语速检查每句会不会压到下一句（不调用 API）
  python3 -I scripts/voiceover.py ping                检查网络与密钥是否可用（不计费）
  python3 -I scripts/voiceover.py voices              列出账号可用的系统音色
  python3 -I scripts/voiceover.py samples [音色...]   用同一句话给几个音色各生成一段试听 → out/voice-samples/
  python3 -I scripts/voiceover.py generate [--force]  逐句合成（有缓存，文本或音色不变就不重复计费）
  python3 -I scripts/voiceover.py import <目录>       用你自己的录音：目录里按句子 id 命名（01-peak.wav …）
  可选参数 --slug=tech-cycles

环境变量：MINIMAX_API_KEY（若以"网络密钥"方式由代理注入则可不设）；MINIMAX_API_HOST，
默认 https://api.minimaxi.com，国际站账号用 https://api.minimax.io（key 和 host 必须同一个站点）。
narration.json 里的音色在账号上不存在时，generate 会按 PREFERRED_VOICES 自动换一个可用的并写回。

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
# 纪录片 / 财经解说优先的音色顺序（generate 时配置的音色不可用就依次尝试）
PREFERRED_VOICES = [
    "Chinese (Mandarin)_Reliable_Executive",
    "Chinese (Mandarin)_Gentleman",
    "Chinese (Mandarin)_Male_Announcer",
    "Chinese (Mandarin)_Radio_Host",
    "presenter_male",
    "audiobook_male_1",
    "audiobook_male_2",
    "male-qn-jingying",
]
MODELS = ["speech-2.8-hd", "speech-2.6-hd", "speech-02-hd"]

SAMPLE_VOICES = [
    "Chinese (Mandarin)_Reliable_Executive",
    "Chinese (Mandarin)_Gentleman",
    "Chinese (Mandarin)_Male_Announcer",
    "Chinese (Mandarin)_Radio_Host",
    "Chinese (Mandarin)_Lyrical_Voice",
    "Chinese (Mandarin)_News_Anchor",
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


class MiniMaxError(Exception):
    pass


HINTS = {
    1004: "API key 无效，或 key 与 host 不是同一个站点（国内站 api.minimaxi.com / 国际站 api.minimax.io）",
    1008: "账户余额不足，请在开放平台充值",
    2038: "需要先在开放平台完成实名认证",
}


def minimax(path: str, payload: dict) -> dict:
    key = os.environ.get("MINIMAX_API_KEY")
    host = os.environ.get("MINIMAX_API_HOST", "https://api.minimaxi.com").rstrip("/")
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"
    req = urllib.request.Request(host + path, data=json.dumps(payload).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise MiniMaxError(f"HTTP {e.code}: {e.read()[:300]!r}" + ("" if key else "（未设置 MINIMAX_API_KEY）"))
    except urllib.error.URLError as e:
        raise MiniMaxError(f"连不上 {host}：{e.reason}。请在云端环境设置里放行该域名（新会话生效）")
    base = data.get("base_resp", {})
    code = base.get("status_code", 0)
    if code != 0:
        raise MiniMaxError(f"错误 {code}: {base.get('status_msg')}  {HINTS.get(code, '')}".rstrip())
    return data


def system_voices() -> dict[str, str]:
    data = minimax("/v1/get_voice", {"voice_type": "all"})
    out = {}
    for group in ("system_voice", "voice_cloning", "voice_generation"):
        for v in data.get(group) or []:
            out[v.get("voice_id")] = v.get("voice_name") or ""
    return out


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
        raise MiniMaxError(f"返回里没有音频：{json.dumps(data)[:300]}")
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


def cmd_ping() -> None:
    host = os.environ.get("MINIMAX_API_HOST", "https://api.minimaxi.com")
    print(f"host: {host}  key: {'已设置' if os.environ.get('MINIMAX_API_KEY') else '未设置（若用网络密钥注入可忽略）'}")
    voices = system_voices()
    print(f"OK：账号可用音色 {len(voices)} 个")


def cmd_voices() -> None:
    for vid, name in system_voices().items():
        print(f"{vid:<48} {name}")


def resolve_voice(nar: dict) -> dict:
    """确认音色与模型在账号上可用；不可用就按偏好顺序替换，并写回 narration.json"""
    voice = dict(nar["voice"])
    want = os.environ.get("MINIMAX_VOICE_ID") or voice["voice_id"]
    available = system_voices()
    if want not in available:
        pick = next((v for v in PREFERRED_VOICES if v in available), None)
        if not pick:
            raise MiniMaxError(f"音色 {want} 不可用，偏好列表里的也都没有；运行 voices 查看后改 narration.json")
        print(f"音色 {want} 不可用，改用 {pick}（{available[pick]}）")
        want = pick
    voice["voice_id"] = want
    # 模型：从配置的开始，依次试到能用为止
    models = [voice["model"]] + [m for m in MODELS if m != voice["model"]]
    for m in models:
        try:
            synth("测试。", {**voice, "model": m})
            voice["model"] = m
            break
        except MiniMaxError as e:
            print(f"模型 {m} 不可用：{e}")
    else:
        raise MiniMaxError("没有可用的语音模型")
    if voice != nar["voice"]:
        nar["voice"] = voice
        NARRATION.write_text(json.dumps(nar, ensure_ascii=False, indent=2) + "\n")
        print(f"已写回 narration.json：{voice['model']} · {voice['voice_id']}")
    return voice


def cmd_samples() -> None:
    voice = load_json(NARRATION)["voice"]
    out = ROOT / "out/voice-samples"
    out.mkdir(parents=True, exist_ok=True)
    wanted = ARGS[1:]
    if not wanted:
        available = system_voices()
        wanted = [v for v in PREFERRED_VOICES + SAMPLE_VOICES if v in available]
        wanted = list(dict.fromkeys(wanted))[:6]
    for vid in wanted:
        try:
            audio = synth(SAMPLE_TEXT, {**voice, "voice_id": vid})
        except MiniMaxError as e:
            print(f"{vid}: 失败 {e}")
            continue
        p = out / f"{vid.replace(' ', '_').replace('(', '').replace(')', '')}.mp3"
        p.write_bytes(audio)
        print(f"→ {p.relative_to(ROOT)}")


def cmd_generate() -> None:
    nar = load_json(NARRATION)
    voice = resolve_voice(nar)
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
    fn = {
        "check": cmd_check,
        "ping": cmd_ping,
        "voices": cmd_voices,
        "samples": cmd_samples,
        "generate": cmd_generate,
        "import": cmd_import,
    }.get(cmd)
    if not fn:
        sys.exit(__doc__)
    try:
        fn()
    except MiniMaxError as e:
        sys.exit(f"MiniMax：{e}")


if __name__ == "__main__":
    if not shutil.which("ffmpeg"):
        sys.exit("需要 ffmpeg")
    main()
