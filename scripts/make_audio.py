"""程序化生成《市场的长镜头》的配乐与音效，并与旁白混音。

完全由代码合成（无采样、无版权素材），节拍点读取
src/videos/tech-cycles/timeline.json，与画面帧级对齐。

用法：python3 -I scripts/make_audio.py
  → public/tech-cycles/score.m4a   纯配乐
  → public/tech-cycles/mix.m4a     配乐 + 旁白（有旁白时；配乐在说话处自动让位）
依赖：numpy、scipy、ffmpeg
"""

import json
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
TIMELINE = ROOT / "src/videos/tech-cycles/timeline.json"
OUT_WAV = ROOT / "out/score.wav"
OUT = ROOT / "public/tech-cycles/score.m4a"
VO_MANIFEST = ROOT / "src/videos/tech-cycles/data/voiceover.json"
OUT_MIX_WAV = ROOT / "out/mix.wav"
OUT_MIX = ROOT / "public/tech-cycles/mix.m4a"

SR = 48000
RNG = np.random.default_rng(2026)

# --------------------------------------------------------------------------
# 时间轴
# --------------------------------------------------------------------------

tl = json.loads(TIMELINE.read_text())
FPS = tl["fps"]
SCENE = {}
cursor = 0
for i, s in enumerate(tl["scenes"]):
    start = 0 if i == 0 else cursor - s["overlap"]
    cursor = start + s["dur"]
    SCENE[s["id"]] = {"start": start / FPS, "dur": s["dur"] / FPS, "beats": s["beats"]}
TOTAL = cursor / FPS


def at(scene: str, beat: str | float) -> float:
    """场景内节拍 → 绝对秒数"""
    s = SCENE[scene]
    f = beat if isinstance(beat, (int, float)) else s["beats"][beat]
    return s["start"] + f / FPS


def start(scene: str) -> float:
    return SCENE[scene]["start"]


def end(scene: str) -> float:
    return SCENE[scene]["start"] + SCENE[scene]["dur"]


# --------------------------------------------------------------------------
# 基础
# --------------------------------------------------------------------------

N = int((TOTAL + 4) * SR)
DRY = np.zeros((2, N))  # 直接声
WET = np.zeros((2, N))  # 送混响


def mtof(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def place(buf: np.ndarray, t0: float, sig: np.ndarray, pan: float = 0.0, gain: float = 1.0) -> None:
    """把单声道或立体声信号放到时间 t0（秒）"""
    i0 = int(round(t0 * SR))
    if sig.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        sig = np.vstack([sig * l * np.sqrt(2), sig * r * np.sqrt(2)])
    n = min(sig.shape[1], N - i0)
    if n <= 0 or i0 < 0:
        return
    buf[:, i0 : i0 + n] += sig[:, :n] * gain


def add(t0: float, sig: np.ndarray, pan: float = 0.0, gain: float = 1.0, send: float = 0.3) -> None:
    place(DRY, t0, sig, pan, gain)
    if send > 0:
        place(WET, t0, sig, pan, gain * send)


def env_adsr(n: int, a: float, r: float, curve: float = 2.0) -> np.ndarray:
    t = np.arange(n) / SR
    dur = n / SR
    e = np.minimum(1.0, t / max(a, 1e-4)) ** curve
    rel = np.clip((dur - t) / max(r, 1e-4), 0, 1) ** curve
    return e * rel


def lowpass(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, min(fc, SR / 2 * 0.95), "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def highpass(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, fc, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, [lo, min(hi, SR / 2 * 0.95)], "band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def sweep_lowpass(x: np.ndarray, f0: float, f1: float, block: int = 512) -> np.ndarray:
    """截止频率随时间指数变化的低通（分块，保持滤波器状态）"""
    out = np.zeros_like(x)
    nblocks = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nblocks):
        p = b / max(1, nblocks - 1)
        fc = f0 * (f1 / f0) ** p
        sos = signal.butter(2, min(fc, SR / 2 * 0.95), "low", fs=SR, output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        seg = x[b * block : (b + 1) * block]
        y, zi = signal.sosfilt(sos, seg, zi=zi)
        out[b * block : b * block + len(seg)] = y
    return out


# --------------------------------------------------------------------------
# 乐器
# --------------------------------------------------------------------------


def pad_voice(freq: float, dur: float, bright: float, attack: float, release: float) -> np.ndarray:
    """柔和的合成垫音：3 个微失谐声部的加法锯齿波"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for v, (cents, pan) in enumerate([(-7, -0.6), (0, 0.0), (7, 0.6)]):
        f = freq * 2 ** (cents / 1200)
        voice = np.zeros(n)
        k = 1
        while k * f < 7000 and k <= 14:
            amp = (1 / k) * np.exp(-(k - 1) / bright)
            voice += amp * np.sin(2 * np.pi * k * f * t + RNG.uniform(0, 2 * np.pi))
            k += 1
        # 缓慢颤动
        voice *= 1 + 0.05 * np.sin(2 * np.pi * (0.13 + 0.05 * v) * t + v)
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        out[0] += voice * l
        out[1] += voice * r
    return out * env_adsr(n, attack, release, 1.6) / 3


def pad(t0: float, notes: list[int], dur: float, gain: float = 0.06, bright: float = 2.2, attack: float = 1.2, release: float = 1.6, send: float = 0.55) -> None:
    for m in notes:
        add(t0, pad_voice(mtof(m), dur, bright, attack, release), gain=gain, send=send)


def piano(freq: float, dur: float = 3.5, decay: float = 1.6) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    B = 0.00035
    for k in range(1, 9):
        fk = k * freq * np.sqrt(1 + B * k * k)
        if fk > 16000:
            break
        tau = decay / (1 + 0.55 * (k - 1))
        sig += (1 / k**1.15) * np.exp(-t / tau) * np.sin(2 * np.pi * fk * t + RNG.uniform(0, 6.28))
    hammer = lowpass(RNG.standard_normal(n) * np.exp(-t / 0.004), 3000) * 0.15
    sig = sig + hammer
    sig *= np.minimum(1, t / 0.004)
    sig *= np.clip((dur - t) / 0.3, 0, 1)
    return sig / 2.2


def bell(freq: float, dur: float = 4.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for ratio, amp, tau in [(1, 1.0, 2.2), (2.76, 0.45, 1.1), (5.4, 0.25, 0.6), (8.93, 0.12, 0.35)]:
        sig += amp * np.exp(-t / tau) * np.sin(2 * np.pi * freq * ratio * t)
    sig *= np.minimum(1, t / 0.002)
    return sig / 1.8


def sub_boom(dur: float = 2.6, f0: float = 95, f1: float = 32) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.18)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t / 0.9)
    click = lowpass(RNG.standard_normal(n) * np.exp(-t / 0.03), 900) * 0.6
    return np.tanh((body + click) * 1.4)


def thump(dur: float = 0.6) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 45 + 50 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)


def tick(high: bool = True) -> np.ndarray:
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    f = 3400 if high else 2600
    tone = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012)
    noise = highpass(RNG.standard_normal(n), 2500) * np.exp(-t / 0.004)
    return (tone * 0.6 + noise * 0.5) * 0.7


def noise_swell(dur: float, f0: float, f1: float, rise: bool = True) -> np.ndarray:
    n = int(dur * SR)
    x = sweep_lowpass(RNG.standard_normal(n), f0, f1)
    t = np.arange(n) / SR
    e = (t / dur) ** 2.2 if rise else np.exp(-t / (dur / 4))
    return x * e


def whoosh(dur: float = 2.2, peak: float = 0.55) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    x = RNG.standard_normal(n)
    x = sweep_lowpass(x, 400, 4500)
    e = np.where(p < peak, (p / peak) ** 2, np.exp(-(p - peak) / 0.12))
    return x * e


def riser(dur: float, f0: float = 180, f1: float = 1400) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    f = f0 * (f1 / f0) ** (p**1.5)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    tone += np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.15
    nz = sweep_lowpass(RNG.standard_normal(n), 300, 9000) * 0.6
    return (tone + nz) * p**2.4


def fall(dur: float, f0: float = 900, f1: float = 40) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    f = f0 * (f1 / f0) ** (p**0.7)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4
    rumble = lowpass(RNG.standard_normal(n), 220) * 1.6
    e = np.minimum(1, t / 0.05) * (1 - p) ** 0.6
    return (tone + rumble) * e


# --------------------------------------------------------------------------
# 和声
# --------------------------------------------------------------------------

CH = {
    "Dm": [38, 50, 53, 57, 62],
    "Dm9": [38, 50, 57, 60, 64, 65],
    "Bb": [34, 46, 53, 58, 62],
    "Bbmaj7": [34, 46, 53, 57, 62],
    "F": [41, 48, 53, 57, 60],
    "F/A": [45, 48, 53, 57, 60, 65],
    "C": [36, 48, 52, 55, 60],
    "Gm": [31, 43, 50, 55, 58],
    "A": [33, 45, 52, 57, 61],
    "Asus4": [33, 45, 52, 57, 62],
    "Dark": [26, 38, 45, 51],  # D + 降 E 的不协和
}


def progression(t0: float, t1: float, chords: list[str], **kw) -> None:
    step = (t1 - t0) / len(chords)
    for i, c in enumerate(chords):
        pad(t0 + i * step, CH[c], step + 1.4, **kw)


def arpeggio(t0: float, t1: float, chords: list[str], rate: float, gain: float = 0.05, octave: int = 12, pattern=(1, 2, 3, 4, 3, 2)) -> None:
    step = (t1 - t0) / len(chords)
    for i, c in enumerate(chords):
        notes = CH[c]
        n_hits = int(step / rate)
        for j in range(n_hits):
            m = notes[pattern[j % len(pattern)] % len(notes)] + octave
            pan = 0.35 * np.sin(j * 1.3)
            add(t0 + i * step + j * rate, piano(mtof(m), 2.0, 0.9), pan=pan, gain=gain, send=0.35)


# --------------------------------------------------------------------------
# 编排
# --------------------------------------------------------------------------


def score() -> None:
    # 1. 开场：钟表声 + 低频持续音 → 冲击
    s = "cold-open"
    impact = at(s, "impact")
    pad(start(s), [26, 38, 45], impact - start(s) + 0.6, gain=0.07, bright=1.2, attack=2.5, release=0.4, send=0.3)
    t = start(s) + 0.4
    k = 0
    while t < impact - 0.3:
        add(t, tick(k % 2 == 0), pan=0.15 if k % 2 else -0.15, gain=0.32, send=0.15)
        t += 1.0
        k += 1
    add(at(s, "count"), riser(at(s, "countEnd") - at(s, "count"), 140, 900), gain=0.10, send=0.4)
    add(at(s, "countEnd"), bell(mtof(81), 3.5), gain=0.10, send=0.6)
    add(impact - 1.6, riser(1.6, 120, 2400), gain=0.16, send=0.3)
    add(impact, sub_boom(3.2), gain=0.55, send=0.25)
    add(impact, noise_swell(2.4, 3000, 200, rise=False), gain=0.12, send=0.6)
    pad(impact, CH["Dm"], end(s) - impact + 1.0, gain=0.055, bright=1.8, attack=0.05, release=2.4, send=0.7)
    add(at(s, "after"), piano(mtof(62), 4, 2.2), gain=0.12, send=0.6)

    # 2. 标题：拉远镜头的风声 + 开阔和弦
    s = "title"
    add(start(s) + 0.1, whoosh(at(s, "zoomEnd") - start(s) + 0.6, 0.78), gain=0.22, send=0.4)
    progression(at(s, "title") - 0.6, end(s) + 0.5, ["Bb", "F"], gain=0.05, bright=2.6, send=0.6)
    add(at(s, "title"), bell(mtof(77), 4.5), gain=0.09, send=0.7)
    add(at(s, "title") + 0.4, piano(mtof(65), 4, 2.4), gain=0.12, send=0.6)

    # 3. 三次革命：轻柔分解和弦，三个钟声对应三次革命
    s = "three"
    progression(start(s), end(s), ["F", "C", "Dm", "Bb"], gain=0.042, bright=2.2)
    arpeggio(start(s) + 0.5, end(s), ["F", "C", "Dm", "Bb"], rate=0.42, gain=0.045)
    for i, (b, m) in enumerate([("m1", 81), ("m2", 84), ("m3", 88)]):
        add(at(s, b), bell(mtof(m), 4), pan=[-0.5, 0, 0.5][i], gain=0.10, send=0.7)

    # 4. 赛跑：推进的节奏，结尾上扬
    s = "race"
    t0, t1 = at(s, "drawStart"), at(s, "drawEnd")
    progression(start(s), t1, ["Dm", "Bb", "F", "C", "Dm", "Bb", "F", "A"], gain=0.04, bright=2.4)
    arpeggio(t0, t1, ["Dm", "Bb", "F", "C", "Dm", "Bb", "F", "A"], rate=0.21, gain=0.042, pattern=(1, 3, 2, 4, 3, 2, 4, 3))
    beat = 0.42
    t = t0
    i = 0
    while t < t1:
        add(t, thump(), gain=0.20 + 0.15 * (t - t0) / (t1 - t0), send=0.05)
        if i % 2 == 1:
            add(t, highpass(RNG.standard_normal(int(0.05 * SR)), 6000) * np.exp(-np.arange(int(0.05 * SR)) / SR / 0.01), gain=0.05, send=0.1)
        t += beat
        i += 1
    add(t1 - 3.4, riser(3.4, 200, 2000), gain=0.12, send=0.35)
    add(t1, sub_boom(2.0, 120, 40), gain=0.35, send=0.3)
    add(t1, bell(mtof(86), 4), gain=0.08, send=0.7)
    pad(t1, CH["F/A"], end(s) - t1 + 0.4, gain=0.05, bright=3.0, attack=0.1, release=0.6, send=0.7)

    # 5. 崩盘：心跳 → 峰值的一声钟 → 下坠 → 低沉
    s = "crash"
    pad(start(s), [45, 57, 62, 64], at(s, "peak") - start(s) + 0.3, gain=0.045, bright=2.5, attack=1.0, release=0.2)
    t = at(s, "approach")
    while t < at(s, "peak") - 0.3:
        add(t, thump(), gain=0.32, send=0.05)
        add(t + 0.22, thump(), gain=0.20, send=0.05)
        t += 0.9
    add(at(s, "peak"), bell(mtof(93), 5), gain=0.12, send=0.8)
    cs, ce = at(s, "crashStart"), at(s, "crashEnd")
    add(cs, sub_boom(3.0, 110, 30), gain=0.5, send=0.2)
    add(cs, fall(ce - cs + 0.6), gain=0.30, send=0.35)
    pad(cs, CH["Dark"], end(s) - cs + 1.0, gain=0.05, bright=1.3, attack=0.4, release=2.0, send=0.5)
    add(ce, sub_boom(2.4, 70, 28), gain=0.35, send=0.4)
    st = at(s, "statement")
    for i, m in enumerate([62, 65, 69, 62]):
        add(st + i * 0.75, piano(mtof(m), 4, 2.4), gain=0.10, send=0.6)

    # 6. 漫长等待：慢钟摆 + 稀疏的钢琴；收复时和声转明亮
    s = "wait"
    ds, rec = at(s, "drawStart"), at(s, "recover")
    progression(start(s), rec, ["Dm", "Bb", "Gm", "A", "Dm", "Bb", "Gm", "A"], gain=0.042, bright=1.8, attack=1.5)
    t = ds
    k = 0
    while t < rec - 0.2:
        add(t, tick(k % 2 == 0), pan=0.2 if k % 2 else -0.2, gain=0.16, send=0.25)
        t += 1.2
        k += 1
    scale = [62, 64, 65, 69, 72]
    for i, my in enumerate(SCENE[s]["beats"]["milestoneYears"]):
        tm = ds + my / 15.12 * (rec - ds)
        add(tm, piano(mtof(scale[i]), 4, 2.0), pan=-0.3 + 0.15 * i, gain=0.13, send=0.6)
    add(rec - 2.4, riser(2.4, 220, 1800), gain=0.08, send=0.4)
    progression(rec, at(s, "g1987"), ["F"], gain=0.055, bright=3.2, attack=0.15)
    add(rec, bell(mtof(84), 5), gain=0.12, send=0.8)
    add(rec + 0.15, bell(mtof(89), 5), gain=0.08, send=0.8)
    add(at(s, "g1987") - 0.2, whoosh(1.6, 0.4), gain=0.14, send=0.3)
    add(at(s, "g1987") + 1.4, bell(mtof(88), 4), gain=0.09, send=0.7)
    progression(at(s, "g1987"), end(s) + 0.4, ["C", "Bb", "F"], gain=0.045, bright=2.4)
    add(at(s, "cap"), piano(mtof(57), 4, 2.2), gain=0.1, send=0.6)

    # 7. 拉远：温暖开阔
    s = "long"
    progression(start(s), at(s, "underwater"), ["F", "C", "Dm", "Bb"], gain=0.045, bright=2.6)
    arpeggio(at(s, "drawStart"), at(s, "drawEnd"), ["F", "C", "Dm", "Bb"], rate=0.3, gain=0.04)
    ds, de = at(s, "drawStart"), at(s, "drawEnd")
    for i, ey in enumerate(SCENE[s]["beats"]["eventYears"]):
        te = ds + (ey - 1981) / (2026.75 - 1981) * (de - ds)
        add(te, bell(mtof([79, 84, 76, 74, 84, 88][i]), 3.5), pan=-0.6 + 0.24 * i, gain=0.08, send=0.7)
    progression(at(s, "underwater"), end(s) + 0.4, ["Dm9", "Bbmaj7"], gain=0.048, bright=2.0)
    add(at(s, "underwater"), sub_boom(2.0, 70, 32), gain=0.2, send=0.4)

    # 8. 现在：悬而未决
    s = "ai"
    progression(start(s), at(s, "aiEnd"), ["Bb", "Gm", "Bb", "Gm"], gain=0.042, bright=2.3)
    arpeggio(at(s, "aiStart"), at(s, "aiEnd"), ["Bb", "Gm"], rate=0.36, gain=0.035)
    add(at(s, "aiEnd"), bell(mtof(81), 5), gain=0.11, send=0.8)
    pad(at(s, "aiEnd"), CH["Asus4"], end(s) - at(s, "aiEnd") + 1.2, gain=0.05, bright=1.6, attack=0.8, release=2.0, send=0.8)
    add(at(s, "fog"), noise_swell(4.0, 200, 1200, rise=False) * 0.6, gain=0.10, send=0.8)
    pad(at(s, "fog"), [81, 86, 88], end(s) - at(s, "fog") + 1.0, gain=0.02, bright=1.0, attack=2.5, release=2.0, send=0.9)

    # 9. 两道题 + 核心金句
    s = "two"
    progression(start(s), at(s, "quote"), ["Dm", "Bb", "F", "C"], gain=0.04, bright=2.0)
    add(at(s, "a") + 0.2, piano(mtof(62), 4, 2.4), pan=-0.4, gain=0.12, send=0.6)
    add(at(s, "b") + 0.2, piano(mtof(69), 4, 2.4), pan=0.4, gain=0.12, send=0.6)
    add(at(s, "mid"), sub_boom(1.6, 90, 40), gain=0.22, send=0.4)
    add(at(s, "mid"), bell(mtof(81), 4), gain=0.08, send=0.7)
    q = at(s, "quote")
    progression(q - 0.4, end(s) + 0.5, ["Bb", "F/A"], gain=0.055, bright=2.8)
    for i, m in enumerate([65, 69, 72, 77]):
        add(q + 0.2 + i * 0.5, piano(mtof(m), 4, 2.6), gain=0.09, send=0.6)

    # 10. 结尾：回到 F 大调
    s = "outro"
    progression(start(s), at(s, "end"), ["Bb", "C"], gain=0.042, bright=2.4)
    arpeggio(start(s) + 0.4, at(s, "end"), ["Bb", "C"], rate=0.4, gain=0.035)
    e = at(s, "end")
    pad(e, CH["F"] + [65, 69], end(s) - e + 3.0, gain=0.055, bright=2.8, attack=0.3, release=4.0, send=0.9)
    add(e, sub_boom(2.0, 80, 35), gain=0.25, send=0.5)
    add(e + 0.9, bell(mtof(77), 6), gain=0.1, send=0.8)
    add(e + 1.3, bell(mtof(84), 6), gain=0.07, send=0.8)


# --------------------------------------------------------------------------
# 混音
# --------------------------------------------------------------------------


def reverb_ir(seconds: float = 3.2) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for c in range(2):
        x = RNG.standard_normal(n) * np.exp(-t / (seconds / 6.5))
        x = lowpass(x, 5200)
        x[: int(0.012 * SR)] = 0  # 预延迟
        ir[c] = x / np.sqrt(np.sum(x**2))
    return ir


def write_wav(path: Path, mix: np.ndarray) -> None:
    import wave

    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(mix, -1, 1).T * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def measure_lufs(mix: np.ndarray) -> float:
    """ITU-R BS.1770 积分响度（K 加权 + 门限）"""
    # K 加权：高架 +4 dB @ ~1.7 kHz，再高通 ~38 Hz（48 kHz 标准系数）
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    k = signal.lfilter(b2, a2, signal.lfilter(b1, a1, mix, axis=1), axis=1)
    block, hop = int(0.4 * SR), int(0.1 * SR)
    power = np.array([np.sum(np.mean(k[:, i : i + block] ** 2, axis=1)) for i in range(0, k.shape[1] - block, hop)])
    loud = -0.691 + 10 * np.log10(power + 1e-12)
    gated = power[loud > -70]
    rel = -0.691 + 10 * np.log10(np.mean(gated)) - 10
    gated = power[(loud > -70) & (loud > rel)]
    return float(-0.691 + 10 * np.log10(np.mean(gated)))


def limit(mix: np.ndarray, ceiling: float) -> np.ndarray:
    """前瞻峰值限幅：5 ms 前瞻、约 80 ms 释放"""
    from scipy.ndimage import minimum_filter1d

    peak = np.max(np.abs(mix), axis=0)
    gain = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    hold = int(0.08 * SR)
    gain = minimum_filter1d(gain, size=hold, origin=-(hold // 2) + int(0.005 * SR))
    win = np.hanning(int(0.01 * SR))
    win /= win.sum()
    gain = np.minimum(gain, np.convolve(gain, win, mode="same"))
    return mix * gain


def master(mix: np.ndarray, target_lufs: float, ceiling_db: float) -> np.ndarray:
    ceiling = 10 ** (ceiling_db / 20)
    mix = mix / np.max(np.abs(mix)) * ceiling
    out = mix
    for _ in range(4):
        out = limit(mix, ceiling)
        diff = target_lufs - measure_lufs(out)
        if abs(diff) < 0.2:
            break
        mix = mix * 10 ** (diff / 20)
    return np.clip(out, -ceiling, ceiling)


def load_voiceover() -> tuple[np.ndarray, list[tuple[float, float]]] | None:
    """按 voiceover.json 把每句旁白放到它的帧位置（开头静音对齐到节拍点）"""
    if not VO_MANIFEST.exists():
        return None
    lines = json.loads(VO_MANIFEST.read_text()).get("lines") or []
    if not lines:
        return None
    vo = np.zeros(N)
    spans = []
    for l in lines:
        raw = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", str(ROOT / "public" / l["file"]), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
            check=True,
            capture_output=True,
        ).stdout
        x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
        cue = l["frame"] / FPS
        i0 = max(0, int(round((cue - l["lead"]) * SR)))
        n = min(len(x), N - i0)
        vo[i0 : i0 + n] += x[:n]
        spans.append((cue, cue + l["speech"]))
    return vo, spans


def duck(spans: list[tuple[float, float]], depth_db: float = -8.0, pre: float = 0.3, post: float = 0.7) -> np.ndarray:
    """旁白期间把配乐压低 depth_db，前后平滑过渡"""
    active = np.zeros(N)
    for a, b in spans:
        active[max(0, int((a - pre) * SR)) : int((b + post) * SR)] = 1.0
    win = np.hanning(int(0.35 * SR))
    active = np.clip(signal.fftconvolve(active, win / win.sum(), mode="same"), 0, 1)
    return 10 ** (depth_db * active / 20)


def encode(wav: Path, out: Path, mix: np.ndarray) -> None:
    write_wav(wav, mix)
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "aac", "-b:a", "192k", str(out)], check=True)
    print(f"{out.relative_to(ROOT)}：响度 {measure_lufs(mix):.1f} LUFS，峰值 {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")


def main() -> None:
    score()
    ir = reverb_ir()
    wet = np.vstack([signal.fftconvolve(WET[c], ir[c])[:N] for c in range(2)])
    music = highpass(DRY + wet * 0.9, 28)

    # 片尾淡出
    fade = np.clip((TOTAL + 0.5 - np.arange(N) / SR) / 3.0, 0, 1)
    music *= fade
    keep = int((TOTAL + 0.5) * SR)

    # 纯配乐：响度统一到 -16 LUFS（网络视频常用），整体增益 + 前瞻限幅，保留动态
    encode(OUT_WAV, OUT, master(music[:, :keep], target_lufs=-16.0, ceiling_db=-2.0))

    # 有旁白时：旁白 -16 LUFS 为主，配乐降到 -24 LUFS 做底并在说话处再让 8 dB
    vo = load_voiceover()
    if vo is None:
        print("（还没有旁白：运行 scripts/voiceover.py generate 之后再跑一次本脚本）")
        return
    voice, spans = vo
    voice2 = np.vstack([voice, voice])
    voice2 *= 10 ** ((-16.0 - measure_lufs(voice2[:, :keep])) / 20)
    bed = music * 10 ** ((-24.0 - measure_lufs(music[:, :keep])) / 20)
    mix = bed * duck(spans) + voice2
    encode(OUT_MIX_WAV, OUT_MIX, master(mix[:, :keep], target_lufs=-16.0, ceiling_db=-2.0))
    print(f"{TOTAL:.1f}s · 旁白 {len(spans)} 句")


if __name__ == "__main__":
    main()
