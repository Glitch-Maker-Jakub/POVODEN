#!/usr/bin/env python
"""Pre-render image assets at the exact pixel size they occupy on the canvas.

The game renders into a 2560x1440 backing buffer (camera zoom 2 over a 1280x720
design space). Any image authored smaller than its on-buffer footprint gets
UPSCALED by the browser at draw time with cheap bilinear filtering -> soft/blurry
(this is what made the map look fuzzy while crisp vector text sat sharp on top).

Fix: resample each image up to its on-buffer footprint with high-quality LANCZOS
plus an unsharp mask, so the GPU draws it ~1:1 (net texture scale = object_scale x
camera_zoom = 1.0) and only the final FIT down-scale to the window remains — and
down-scaling is always sharp. Run after resize-assets.py (operates on the JPGs).
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets")

# (relative path, on-buffer target px, jpeg quality, unsharp(radius, percent, thr))
JOBS = [
    ("title_bg.jpg",      (2560, 1440), 90, (1.6, 150, 2)),  # design 1280x720 x2
    ("map/valley.jpg",    (1760, 1440), 92, (1.6, 160, 2)),  # design  880x720 x2
    # Realistic photos: lighter sharpening so they don't look crunchy.
    ("news/calm.jpg",        (768, 432), 88, (1.1, 90, 3)),
    ("news/minor.jpg",       (768, 432), 88, (1.1, 90, 3)),
    ("news/rescue.jpg",      (768, 432), 88, (1.1, 90, 3)),
    ("news/disaster.jpg",    (768, 432), 88, (1.1, 90, 3)),
    ("news/cooperation.jpg", (768, 432), 88, (1.1, 90, 3)),
    ("news/ruin.jpg",        (768, 432), 88, (1.1, 90, 3)),
]


def process(rel, size, quality, unsharp):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        print(f"  skip (missing): {rel}")
        return
    img = Image.open(path).convert("RGB")
    before_px, before_kb = img.size, os.path.getsize(path) // 1024
    if img.size != size:
        img = img.resize(size, Image.LANCZOS)
    radius, percent, threshold = unsharp
    img = img.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold))
    img.save(path, "JPEG", quality=quality, optimize=True)
    print(f"  {rel}: {before_px} {before_kb} KB -> {img.size} {os.path.getsize(path)//1024} KB")


def main():
    print("Sharpening assets to on-buffer pixel sizes...")
    for rel, size, quality, unsharp in JOBS:
        process(rel, size, quality, unsharp)
    print("Done.")


if __name__ == "__main__":
    main()
