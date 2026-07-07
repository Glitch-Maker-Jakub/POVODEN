#!/usr/bin/env python
"""Downscale generated assets to web-/VRAM-friendly sizes (run after gen-assets).

The OpenRouter model returns ~1024x1024 PNGs (~1-1.7 MB each). For a pixel-art
game shown at small sizes that's wasteful: heavy downloads and lots of VRAM.
This resizes them in place to sensible targets and re-saves optimised PNGs.
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets")

TARGETS = {
    "title_bg.png": (1280, 720),
    "towns": (256, 256),   # every PNG in assets/towns/
    "tiles": (256, 256),   # every PNG in assets/tiles/
}


def resize_file(path, size):
    img = Image.open(path).convert("RGBA")
    before = os.path.getsize(path)
    img = img.resize(size, Image.LANCZOS)
    img.save(path, "PNG", optimize=True)
    after = os.path.getsize(path)
    print(f"  {os.path.relpath(path, ROOT)}: {img.size}  "
          f"{before//1024} KB -> {after//1024} KB")


def main():
    # title background: resize and re-encode as JPEG (much smaller than PNG for
    # a detailed scene; no transparency needed for a full-screen background).
    title = os.path.join(ROOT, "title_bg.png")
    if os.path.exists(title):
        img = Image.open(title).convert("RGB").resize(TARGETS["title_bg.png"], Image.LANCZOS)
        jpg = os.path.join(ROOT, "title_bg.jpg")
        img.save(jpg, "JPEG", quality=85, optimize=True)
        os.remove(title)
        print(f"  title_bg.png -> title_bg.jpg ({os.path.getsize(jpg)//1024} KB)")
    # folders (transparent pixel sprites stay PNG)
    for folder in ("towns", "tiles"):
        d = os.path.join(ROOT, folder)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if fn.lower().endswith(".png"):
                resize_file(os.path.join(d, fn), TARGETS[folder])

    # Illustrated map background -> JPEG, cropped (not stretched) to the board's
    # map-area aspect ratio (880:720 ≈ 1.222), then sized 1056x864 for crispness.
    mp = os.path.join(ROOT, "map", "valley.png")
    if os.path.exists(mp):
        img = Image.open(mp).convert("RGB")
        w, h = img.size
        target = 880 / 720
        if w / h > target:                 # too wide: crop sides
            nw = int(h * target); x0 = (w - nw) // 2
            img = img.crop((x0, 0, x0 + nw, h))
        else:                               # too tall: crop top/bottom
            nh = int(w / target); y0 = (h - nh) // 2
            img = img.crop((0, y0, w, y0 + nh))
        img = img.resize((1056, 864), Image.LANCZOS)
        out = os.path.join(ROOT, "map", "valley.jpg")
        img.save(out, "JPEG", quality=86, optimize=True)
        os.remove(mp)
        print(f"  map/valley.png -> valley.jpg ({os.path.getsize(out)//1024} KB)")

    # Realistic newspaper photos -> JPEG 640x360.
    nd = os.path.join(ROOT, "news")
    if os.path.isdir(nd):
        for fn in sorted(os.listdir(nd)):
            if fn.lower().endswith(".png"):
                p = os.path.join(nd, fn)
                img = Image.open(p).convert("RGB").resize((640, 360), Image.LANCZOS)
                out = os.path.splitext(p)[0] + ".jpg"
                img.save(out, "JPEG", quality=84, optimize=True)
                os.remove(p)
                print(f"  news/{fn} -> {os.path.basename(out)} ({os.path.getsize(out)//1024} KB)")

    print("Done.")


if __name__ == "__main__":
    main()
