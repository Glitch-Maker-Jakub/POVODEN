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

Output lands in `assets/` (e.g. `assets/title_bg.png`, `assets/towns/*.png`,
`assets/tiles/*.png`). Review them, then we load them in the scenes.

## Model / cost

Uses `google/gemini-2.5-flash-image-preview` (a.k.a. "nano banana") via
OpenRouter. Each image is a few US cents. Edit the `STYLE` string or individual
prompts in `gen-assets.mjs` to retune the look — regenerate just that one id
while iterating to keep spend low.

## Division of labour with PixelLab

OpenRouter/Gemini is best for the larger illustrative pieces (title background,
per-town illustrations). For tight, tiny, palette-perfect tiles and icons,
PixelLab (the MCP) tends to look crisper — keep those there.
