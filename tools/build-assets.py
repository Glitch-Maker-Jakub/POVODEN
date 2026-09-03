#!/usr/bin/env python3
"""Build the shipped game images from the canonical sources in assets/src/.

One idempotent pipeline (replaces the old resize-assets.py + sharpen-assets.py
pair): every output in assets/ is derived ONLY from assets/src/, so running the
script any number of times produces the same result — there is no in-place
re-encoding and therefore no generational quality loss.

    python3 tools/build-assets.py            # build everything
    python3 tools/build-assets.py --table    # also print a Markdown size table

Outputs (what the game actually loads — see src/ui/assets.js):

  title_bg[.jpg|.webp]        1280x720   menu/how-to/credits background, 1x
  title_bg@2x[.jpg|.webp]     2560x1440  ... for large/high-DPI displays
  map/valley[.jpg|.webp]      880x720    game-board backdrop, 1x
  map/valley@2x[.jpg|.webp]   1760x1440  ... for large/high-DPI displays
  news/<k>[.jpg|.webp]        768x432    newspaper photos (lazy-loaded in game)
  towns/<id>.png              256x256    town sprites, background pre-keyed to
                                         alpha and palette-quantised

WebP is served to browsers that decode it (runtime probe); the JPEG twin is the
fallback. Town sprites stay PNG so transparency is exact everywhere.

assets/src/tiles/ is kept as generator output but not shipped: no scene loads
the tile textures today.

Requires Pillow with WebP support: python3 -m pip install pillow
"""
import os
import sys

from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets"))
SRC = os.path.join(ROOT, "src")

# The flat-background key-out the game used to do per pixel at runtime
# (BootScene.keyOutBackground): sample the top-left pixel, zero the alpha of
# everything within this squared RGB distance. Kept identical here.
KEY_DIST_SQ = 1100

# (source, output base, sizes {suffix: (w, h)}, jpeg quality, webp quality,
#  unsharp (radius, percent, threshold) applied after downscales only)
PHOTOS = [
    ("title_bg.jpg", "title_bg",
     {"@2x": (2560, 1440), "": (1280, 720)}, 82, 80, (1.0, 60, 3)),
    ("map/valley.jpg", "map/valley",
     {"@2x": (1760, 1440), "": (880, 720)}, 84, 80, (1.0, 60, 3)),
]
NEWS_SIZE = (768, 432)
NEWS_JPEG_Q = 82
NEWS_WEBP_Q = 78
TOWN_SIZE = (256, 256)
TOWN_COLORS = 256


def out_path(rel):
    return os.path.join(ROOT, rel)


def save_report(path):
    rel = os.path.relpath(path, ROOT)
    print(f"  {rel}: {os.path.getsize(path) // 1024} KB")


def build_photo(src_rel, base, sizes, jpeg_q, webp_q, unsharp):
    src = Image.open(os.path.join(SRC, src_rel)).convert("RGB")
    for suffix, size in sizes.items():
        img = src
        if img.size != size:
            img = img.resize(size, Image.LANCZOS)
            radius, percent, threshold = unsharp
            img = img.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent,
                                                     threshold=threshold))
        jpg = out_path(f"{base}{suffix}.jpg")
        os.makedirs(os.path.dirname(jpg), exist_ok=True)
        img.save(jpg, "JPEG", quality=jpeg_q, optimize=True, progressive=True)
        save_report(jpg)
        webp = out_path(f"{base}{suffix}.webp")
        img.save(webp, "WEBP", quality=webp_q, method=6)
        save_report(webp)


def build_news():
    src_dir = os.path.join(SRC, "news")
    for fn in sorted(os.listdir(src_dir)):
        if not fn.lower().endswith((".jpg", ".png")):
            continue
        name = os.path.splitext(fn)[0]
        img = Image.open(os.path.join(src_dir, fn)).convert("RGB")
        if img.size != NEWS_SIZE:
            img = img.resize(NEWS_SIZE, Image.LANCZOS)
        jpg = out_path(f"news/{name}.jpg")
        os.makedirs(os.path.dirname(jpg), exist_ok=True)
        img.save(jpg, "JPEG", quality=NEWS_JPEG_Q, optimize=True, progressive=True)
        save_report(jpg)
        webp = out_path(f"news/{name}.webp")
        img.save(webp, "WEBP", quality=NEWS_WEBP_Q, method=6)
        save_report(webp)


def key_out_background(img):
    """Zero the alpha of every pixel close to the top-left corner colour."""
    img = img.convert("RGBA")
    px = img.load()
    br, bg, bb = px[0, 0][:3]
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            dr, dg, db = r - br, g - bg, b - bb
            if dr * dr + dg * dg + db * db < KEY_DIST_SQ:
                px[x, y] = (r, g, b, 0)
    return img


def build_towns():
    src_dir = os.path.join(SRC, "towns")
    for fn in sorted(os.listdir(src_dir)):
        if not fn.lower().endswith(".png"):
            continue
        img = Image.open(os.path.join(src_dir, fn)).convert("RGBA")
        if img.size != TOWN_SIZE:
            img = img.resize(TOWN_SIZE, Image.LANCZOS)
        img = key_out_background(img)
        # Palette-quantised PNG: visually identical at sprite scale, ~2-3x smaller.
        img = img.quantize(colors=TOWN_COLORS, method=Image.FASTOCTREE)
        out = out_path(f"towns/{fn}")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        img.save(out, "PNG", optimize=True)
        save_report(out)


def size_table():
    print("\n| File | KB |")
    print("|---|---:|")
    total = 0
    for dirpath, _dirnames, filenames in sorted(os.walk(ROOT)):
        if dirpath.startswith(SRC):
            continue
        for fn in sorted(filenames):
            p = os.path.join(dirpath, fn)
            kb = os.path.getsize(p) // 1024
            total += kb
            print(f"| {os.path.relpath(p, ROOT)} | {kb} |")
    print(f"| **total (shipped)** | **{total}** |")


def main():
    if not os.path.isdir(SRC):
        sys.exit(f"missing sources: {SRC}")
    print("Building shipped assets from assets/src/ ...")
    for args in PHOTOS:
        build_photo(*args)
    build_news()
    build_towns()
    if "--table" in sys.argv:
        size_table()
    print("Done.")


if __name__ == "__main__":
    main()
