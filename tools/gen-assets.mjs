#!/usr/bin/env node
// =============================================================================
// POVODEŇ — build-time asset generator (OpenRouter)
// -----------------------------------------------------------------------------
// Generates pixel-art image assets via OpenRouter and writes them as PNG files
// into ../assets/. This runs on YOUR machine only — the API key never ships
// inside the static game. Hosted players only ever load the produced PNGs.
//
// Usage:
//   1. Put your key in tools/.env.local  (gitignored):
//        OPENROUTER_API_KEY=sk-or-v1-...
//   2. node tools/gen-assets.mjs              # generate everything
//      node tools/gen-assets.mjs title_bg     # generate one/some by id
//      node tools/gen-assets.mjs --list       # list asset ids
//
// Requires Node 18+ (uses global fetch). No npm dependencies.
// =============================================================================

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = resolve(__dirname, '..', 'assets');

// OpenRouter image model. Alternatives that also output images:
//   google/gemini-3.1-flash-image-preview, google/gemini-3-pro-image-preview,
//   openai/gpt-5-image, openai/gpt-5-image-mini
const MODEL = 'google/gemini-2.5-flash-image';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Shared style prefix — keeps all assets visually coherent (old-school look).
const STYLE =
  '16-bit SNES-era pixel art, top-down three-quarter view, cohesive limited ' +
  'palette of muted blues, teals and earthy tones, crisp pixels, clean dark ' +
  'outlines, no text, no watermark, no UI, centered subject';

// The hero assets. `file` is relative to assets/.
const ASSETS = [
  { id: 'title_bg', file: 'title_bg.png',
    prompt: `${STYLE}. Wide cinematic title-screen scene: a small Central-European riverside town at night, partially flooded — water filling the streets, a few red rooftops and a church spire above the waterline, one tiny rescue boat, soft moonlight reflecting on calm water. Somber and serious, not gory. Establishing shot.` },

  { id: 'town_delta', file: 'towns/delta.png',
    prompt: `${STYLE}. A small headwaters river outpost with a wooden watchtower and a warning bell beside a narrow stream. Isolated on a flat dark background.` },
  { id: 'town_millington', file: 'towns/millington.png',
    prompt: `${STYLE}. A dense small-town residential block: red-roofed houses and one apartment building packed together. Isolated on a flat dark background.` },
  { id: 'town_greenhaven', file: 'towns/greenhaven.png',
    prompt: `${STYLE}. An agricultural village: a farmhouse, a barn and tilled green floodplain fields. Isolated on a flat dark background.` },
  { id: 'town_traders', file: 'towns/traders.png',
    prompt: `${STYLE}. A commercial market town: warehouses, market stalls and a loading dock. Isolated on a flat dark background.` },
  { id: 'town_bayview', file: 'towns/bayview.png',
    prompt: `${STYLE}. An industrial riverside district: a chemical plant with storage tanks and smokestacks. Isolated on a flat dark background.` },
  { id: 'town_oceana', file: 'towns/oceana.png',
    prompt: `${STYLE}. A high-tech research campus: sleek low buildings with antennae and server-farm cooling units. Isolated on a flat dark background.` },
  { id: 'town_finalpoint', file: 'towns/finalpoint.png',
    prompt: `${STYLE}. A small estuary harbor town where the river meets the sea: a lighthouse, docks and moored boats. Isolated on a flat dark background.` },

  { id: 'water', file: 'tiles/water.png',
    prompt: `${STYLE}. A seamless tileable river-water texture with gentle ripples, blue and teal. Flat top-down, edges must tile.` },
  { id: 'flood', file: 'tiles/flood.png',
    prompt: `${STYLE}. A seamless tileable murky flood-water texture with debris and brown-grey muddy tones. Flat top-down, edges must tile.` },

  // --- Illustrated restyle: the river-valley game-board map (mockup direction) ---
  { id: 'map_valley', file: 'map/valley.png',
    prompt: 'Illustrated top-down strategy-game map of a Central-European (North Bohemian) river valley, 16:9. A SINGLE river winds diagonally from forested mountains in the TOP-LEFT (the headwaters) down to a sea estuary in the BOTTOM-RIGHT, with gentle bends. The river is a moderate ribbon — NOT too much water, plenty of land. Surrounded by green farmland, tilled fields, forests, low rolling hills, hedgerows, country roads and a couple of small stone bridges. Warm painterly hand-illustrated style, soft daytime light, rich but slightly muted colours, clean and uncluttered so town markers can be placed along the river. No text, no labels, no icons, no UI, no people.' },

  // --- Realistic newspaper photos (documentary register, serious not gory) ---
  { id: 'news_calm', file: 'news/calm.png',
    prompt: 'Realistic documentary photograph for a newspaper: a calm European river flowing peacefully past a small riverside town on a clear bright day, reflections on the water, gentle and reassuring. Photojournalistic, natural colours, landscape 16:9.' },
  { id: 'news_minor', file: 'news/minor.png',
    prompt: 'Realistic documentary newspaper photograph: a European town street with shallow flood water a few centimetres deep, a line of sandbags, residents in rubber boots, overcast sky. Mild nuisance flooding, calm, not dramatic. Photojournalistic, landscape 16:9.' },
  { id: 'news_rescue', file: 'news/rescue.png',
    prompt: 'Realistic documentary newspaper photograph: emergency rescue workers in an orange inflatable boat helping residents along a flooded European street, serious and purposeful, hopeful. Not gory, no visible injuries. Photojournalistic, overcast, landscape 16:9.' },
  { id: 'news_disaster', file: 'news/disaster.png',
    prompt: 'Realistic documentary newspaper photograph: a European town severely flooded, rooftops and a church spire rising above wide brown floodwater, dramatic grey sky. Sombre and serious, NOT gory, no bodies, no visible injuries. Photojournalistic, landscape 16:9.' },
  { id: 'news_cooperation', file: 'news/cooperation.png',
    prompt: 'Realistic documentary newspaper photograph: volunteers and neighbours of all ages filling and passing sandbags together along a riverbank under a moody sky, community solidarity, hopeful and determined. Photojournalistic, landscape 16:9.' },
  { id: 'news_ruin', file: 'news/ruin.png',
    prompt: 'Realistic documentary newspaper photograph: the muddy aftermath of a flood in a small European town, debris and waterlines on damaged building fronts, residents surveying the mess, sombre but not gory. Photojournalistic, overcast, landscape 16:9.' },
];

function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  const envPath = join(__dirname, '.env.local');
  if (existsSync(envPath)) {
    const txt = readFileSync(envPath, 'utf8');
    const m = txt.match(/^\s*OPENROUTER_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  }
  return null;
}

async function generate(asset, key) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/povoden',
      'X-Title': 'POVODEN asset generation',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: asset.prompt }],
      modalities: ['image', 'text'],
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) {
    throw new Error(`no image in response: ${JSON.stringify(data).slice(0, 300)}`);
  }
  const base64 = url.split(',')[1] ?? url;
  const buf = Buffer.from(base64, 'base64');
  const outPath = join(ASSET_DIR, asset.file);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  return { outPath, bytes: buf.length };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--list')) {
    console.log('Asset ids:\n' + ASSETS.map((a) => `  ${a.id}  -> assets/${a.file}`).join('\n'));
    return;
  }
  const key = loadKey();
  if (!key) {
    console.error(
      'No API key. Create tools/.env.local with:\n  OPENROUTER_API_KEY=sk-or-v1-...\n' +
      'or set the OPENROUTER_API_KEY environment variable.'
    );
    process.exit(1);
  }

  const wanted = args.length ? ASSETS.filter((a) => args.includes(a.id)) : ASSETS;
  if (!wanted.length) {
    console.error(`No matching asset ids. Try --list.`);
    process.exit(1);
  }

  console.log(`Generating ${wanted.length} asset(s) with ${MODEL}…\n`);
  for (const asset of wanted) {
    process.stdout.write(`  ${asset.id} … `);
    try {
      const { outPath, bytes } = await generate(asset, key);
      console.log(`ok (${(bytes / 1024).toFixed(0)} KB) -> ${outPath}`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }
  console.log('\nDone. Review assets/, then we wire them into the scenes.');
}

main();
