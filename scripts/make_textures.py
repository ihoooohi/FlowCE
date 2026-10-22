"""生成画面质感贴图（可平铺）：胶片颗粒 grain.png、雾 fog.png。

用法：python3 -I scripts/make_textures.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public/textures"


def tileable_noise(size: int, beta: float, seed: int) -> np.ndarray:
    """1/f^beta 频谱噪声；FFT 天然周期，因此可无缝平铺。"""
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((size, size))
    f = np.fft.fft2(white)
    fy = np.fft.fftfreq(size)[:, None]
    fx = np.fft.fftfreq(size)[None, :]
    r = np.sqrt(fx**2 + fy**2)
    r[0, 0] = 1
    out = np.real(np.fft.ifft2(f / r**beta))
    out -= out.min()
    return out / out.max()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(7)
    grain = np.clip(rng.normal(128, 46, (512, 512)), 0, 255).astype(np.uint8)
    Image.fromarray(grain, "L").save(OUT / "grain.png", optimize=True)

    fog = tileable_noise(512, 1.6, 11)
    fog = np.clip((fog - 0.35) / 0.5, 0, 1) ** 1.4
    rgba = np.zeros((512, 512, 4), dtype=np.uint8)
    rgba[..., 0] = 120
    rgba[..., 1] = 150
    rgba[..., 2] = 150
    rgba[..., 3] = (fog * 200).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(OUT / "fog.png", optimize=True)
    print("wrote", [p.name for p in OUT.iterdir()])


if __name__ == "__main__":
    main()
