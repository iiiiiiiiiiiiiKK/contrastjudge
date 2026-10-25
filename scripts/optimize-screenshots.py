"""Downscale and convert Playwright screenshots to WebP so the repo stays small.

Playwright captures full-page screenshots at the device pixel ratio (3x on the iPhone 14
profile), which produces multi-megabyte PNGs. Docs only need something crisp at 1x-ish, so each
image is capped to a sensible width and encoded as WebP.

Usage: python scripts/optimize-screenshots.py
"""

from __future__ import annotations

import pathlib

from PIL import Image

SHOTS = pathlib.Path(__file__).resolve().parent.parent / "docs" / "screenshots"
# Long screenshots get a taller cap; phone shots are narrow and very tall.
MAX_WIDTH = {"desktop": 1440, "iphone": 780, "android": 720}
QUALITY = 82


def target_width(name: str) -> int:
    for key, width in MAX_WIDTH.items():
        if key in name:
            return width
    return 1200


def convert(path: pathlib.Path) -> tuple[int, int, int]:
    with Image.open(path) as image:
        original = path.stat().st_size
        width = target_width(path.stem)
        if image.width > width:
            height = round(image.height * width / image.width)
            image = image.resize((width, height), Image.LANCZOS)
        out = path.with_suffix(".webp")
        image.convert("RGB").save(out, "WEBP", quality=QUALITY, method=6)
        new_size = out.stat().st_size
        return original, new_size, image.width


def main() -> None:
    total_before = 0
    total_after = 0
    for png in sorted(SHOTS.glob("*.png")):
        before, after, width = convert(png)
        total_before += before
        total_after += after
        print(f"{png.name:42s} {before / 1024:8.0f} KB -> {png.with_suffix('.webp').name:40s} "
              f"{after / 1024:7.0f} KB @ {width}px")
        png.unlink()
    print(f"\ntotal: {total_before / 1024:.0f} KB -> {total_after / 1024:.0f} KB")


if __name__ == "__main__":
    main()
