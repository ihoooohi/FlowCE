"""从原始图表反推纳斯达克综合指数月末收盘序列。

素材里只有渲染好的 PNG 图表、没有原始数据表，而视频需要逐月重绘曲线，
所以这里对「一张图看 45 年」那张对数坐标图做像素级数字化：

1. 用图中的网格线 / 刻度线标定坐标轴（x 为年份，y 为 log10 点位）；
2. 在每个月末对应的像素列上，找出曲线颜色的像素并取中心；
3. 被事件圆点遮住的月份做对数线性插值；
4. 用素材里明确写出的关键数值（以及与之相符的公开收盘价）做锚点校正。

对数刻度下 1 像素约等于 0.74% 的误差，用于动画足够；图中出现的关键数字
全部来自锚点，而不是数字化结果。

用法：python3 -I scripts/digitize_nasdaq.py
"""

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "materials/tech-cycles/source/assets/nasdaq_history_1981_2026.png"
OUT = ROOT / "src/videos/tech-cycles/data/nasdaq-monthly.json"

# --- 坐标轴标定（像素坐标取自原图 2520x1170 的网格线与刻度线） ---
X_1981 = 266.0  # 1981-01-01 刻度
X_2026 = 2392.0  # 2026-01-01 刻度
PX_PER_YEAR = (X_2026 - X_1981) / 45.0
GRID_Y = {30000: 208.5, 10000: 357.5, 3000: 520.5, 1000: 669.5, 300: 833.5, 100: 982.5}

_logs = np.log10(list(GRID_Y.keys()))
_ys = np.array(list(GRID_Y.values()))
SLOPE, INTERCEPT = np.polyfit(_logs, _ys, 1)

LINE_RGB = np.array([53, 77, 105])

# 锚点：素材明确给出的数值（★）与能互相印证的公开月末收盘价。
# ★ 1996-01 → 1999-12 = +284%；2022-11 → 2026-10-20 = +130%；2000-02 月末为互联网泡沫顶部。
# 另外几处被事件圆点遮住的月份，也用公开月末收盘价补上。
ANCHORS = {
    "1985-07": 296.42,  # ★ PC 前 48 个月 +54%（相对数字化的 1981-08 起点 192.48）
    "1987-07": 434.93,
    "1987-08": 454.57,  # 1987 股灾前月末高点（-33% 的基准）
    "1987-09": 444.29,
    "1987-10": 323.30,
    "1987-11": 305.16,  # ★ 1987 年 11 月 约 -33%（月末）
    "1996-01": 1059.79,  # ★ 互联网革命起点
    "1999-12": 4069.31,  # ★ +284%
    "2000-02": 4696.69,  # ★ 泡沫顶部（月末）
    "2000-03": 4572.83,
    "2002-09": 1172.06,  # ★ 2002 年 10 月 9 日见底前后
    "2002-10": 1329.75,
    "2015-03": 4900.88,
    "2015-04": 4941.42,  # ★ 2015-04-23 收复 2000 年高点
    "2015-05": 5070.03,
    "2015-06": 4986.87,
    "2022-11": 11468.00,  # ★ AI 革命起点
    "2026-10": 26424.82,  # ★ 2026-10-20 当前
}


def x_of(year: int, month: int) -> float:
    """月度点对应的像素横坐标。

    原图沿用 FRED 月度序列的标注方式：数值是月末收盘，但画在当月 1 日。
    （1987-11、2009-02 两个月末低点的位置可以印证这一点。）
    """
    t = year + (month - 1) / 12.0
    return X_1981 + PX_PER_YEAR * (t - 1981)


def value_of(y: float) -> float:
    return 10 ** ((y - INTERCEPT) / SLOPE)


HALF_STROKE = 3.0  # 曲线线宽约 6 像素


def extent(img: np.ndarray, x: float) -> tuple[float, float] | None:
    """该列曲线像素的上下边缘。"""
    col = img[150:990, int(round(x)), :]
    dist = np.sqrt(((col - LINE_RGB) ** 2).sum(axis=1))
    hit = np.nonzero(dist < 60)[0]
    if not len(hit):
        return None
    return float(hit.min() + 150), float(hit.max() + 150)


def refine(ext: list[tuple[float, float] | None]) -> list[float | None]:
    """把每列的像素范围还原成折线顶点。

    折线在顶点处向两侧延伸，所以局部高点取上边缘、局部低点取下边缘，
    其余取中心。
    """
    centers = [None if e is None else (e[0] + e[1]) / 2 for e in ext]
    out: list[float | None] = []
    for i, e in enumerate(ext):
        if e is None:
            out.append(None)
            continue
        prev = centers[i - 1] if i > 0 else None
        nxt = centers[i + 1] if i + 1 < len(centers) else None
        c = centers[i]
        if prev is not None and nxt is not None and c < prev and c < nxt:
            out.append(e[0] + HALF_STROKE)  # 屏幕坐标更小 = 局部高点
        elif prev is not None and nxt is not None and c > prev and c > nxt:
            out.append(e[1] - HALF_STROKE)
        else:
            out.append(c)
    return out


def main() -> None:
    img = np.array(Image.open(SRC).convert("RGB")).astype(int)
    months = []
    for year in range(1981, 2027):
        for month in range(1, 13):
            if year == 2026 and month > 10:
                break
            months.append((year, month))

    ys = refine([extent(img, x_of(year, month)) for year, month in months])
    raw = [None if y is None else value_of(y) for y in ys]

    # 被圆点遮住的月份：在 log 空间线性插值
    logs = np.array([math.log10(v) if v else np.nan for v in raw])
    idx = np.arange(len(logs))
    ok = ~np.isnan(logs)
    missing = [f"{y}-{m:02d}" for (y, m), good in zip(months, ok) if not good]
    logs[~ok] = np.interp(idx[~ok], idx[ok], logs[ok])
    values = 10**logs

    keys = [f"{y}-{m:02d}" for y, m in months]

    # 锚点校正：锚点月份取精确值，偏差在前后 SPREAD 个月内线性衰减，避免出现折角
    SPREAD = 3
    anchor_idx = sorted(keys.index(k) for k in ANCHORS)
    anchor_corr = {i: math.log10(ANCHORS[keys[i]]) - math.log10(values[i]) for i in anchor_idx}
    corr = np.zeros(len(values))
    weight = np.zeros(len(values))
    for a, c in anchor_corr.items():
        for i in range(max(0, a - SPREAD), min(len(values), a + SPREAD + 1)):
            w = 1 - abs(i - a) / (SPREAD + 1)
            if w > weight[i]:
                corr[i], weight[i] = c * w, w
    values = values * 10**corr
    for i in anchor_idx:
        values[i] = ANCHORS[keys[i]]

    print(f"锚点偏差（数字化 vs 锚点）：", file=sys.stderr)
    for i in anchor_idx:
        print(f"  {keys[i]}: {anchor_corr[i] * 100 / math.log10(math.e) / 100:+.2%}", file=sys.stderr)
    print(f"插值月份：{missing}", file=sys.stderr)

    series = [{"m": k, "v": round(float(v), 2)} for k, v in zip(keys, values)]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "source": "FRED NASDAQCOM 月末收盘；由 materials/tech-cycles/source/assets/nasdaq_history_1981_2026.png 数字化并按锚点校正",
                "asOf": "2026-10-20",
                "series": series,
            },
            ensure_ascii=False,
            indent=1,
        )
        + "\n"
    )
    print(f"wrote {OUT.relative_to(ROOT)} ({len(series)} months)", file=sys.stderr)


if __name__ == "__main__":
    main()
