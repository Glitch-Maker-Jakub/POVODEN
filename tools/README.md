# Asset generation (OpenRouter)

Build-time pixel-art generation. **Runs on your machine only.** The API key
never enters the shipped game — hosted players just load the produced PNG files
from `../assets/`.

## Why build-time, not in the game

POVODEŇ is a static site anyone can view-source. An API key embedded in
client JS would be visible to (and abusable by) every visitor. So we generate
assets here, commit the PNGs, and the game loads plain images. The key stays in
`tools/.env.local`, which is gitignored.

## Setup

1. Get an OpenRouter API key: https://openrouter.ai/keys
2. Copy `.env.local.example` → `.env.local` and paste your key:
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   ```
   (Do this yourself so the key never appears in a chat transcript.)

## Use

```bash
node tools/gen-assets.mjs --list        # see asset ids
node tools/gen-assets.mjs                # generate everything
node tools/gen-assets.mjs title_bg      # generate one (cheap to iterate)
```

Generated art lands in `assets/src/` — the canonical pipeline **sources**. The
game never loads these directly; run the build step to produce what ships:

```bash
python3 -m pip install pillow           # once (WebP support included)
python3 tools/build-assets.py           # assets/src/ -> assets/
python3 tools/build-assets.py --table   # ... plus a Markdown size table
```

`build-assets.py` is the single, idempotent image pipeline (it replaced the old
`resize-assets.py` + `sharpen-assets.py` pair). Every shipped file is derived
only from `assets/src/`, so re-running it never re-encodes its own output. It
produces, per the manifest at the top of the script:

- 1x and `@2x` variants of the two large backgrounds (`title_bg`, `map/valley`),
  each as WebP + JPEG (the game probes WebP support at boot and falls back);
- the six newspaper photos as WebP + JPEG;
- town sprites as palette-quantised PNGs with the flat background pre-keyed to
  transparency (the runtime key-out in `BootScene` is gone).

Which file the game requests for which display is decided in
`src/ui/assets.js`; `tests/assetBudget.test.js` fails if the shipped files and
that manifest drift apart or blow the download/decoded-memory budgets.

## Model / cost

Uses `google/gemini-2.5-flash-image-preview` (a.k.a. "nano banana") via
OpenRouter. Each image is a few US cents. Edit the `STYLE` string or individual
prompts in `gen-assets.mjs` to retune the look — regenerate just that one id
while iterating to keep spend low.

## Division of labour with PixelLab

OpenRouter/Gemini is best for the larger illustrative pieces (title background,
per-town illustrations). For tight, tiny, palette-perfect tiles and icons,
PixelLab (the MCP) tends to look crisper — keep those there.
