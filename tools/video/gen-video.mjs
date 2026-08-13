#!/usr/bin/env node
// =============================================================================
// POVODEŇ — video production pipeline (stills → voiceover → Ken-Burns MP4s).
// -----------------------------------------------------------------------------
// Consumes tools/video/script.mjs; produces assets/video/{intro,calm,loss}_{en,cs}.mp4
//
//   node tools/video/gen-video.mjs --images            # generate all stills (cached)
//   node tools/video/gen-video.mjs --tts --lang=en     # generate voice lines (cached)
//   node tools/video/gen-video.mjs --assemble --lang=en # build the MP4s
//   node tools/video/gen-video.mjs --all               # everything, both languages
//
// Requirements: Node 18+, ffmpeg (auto-detected in ../_tools), GEMINI_API_KEY in
// tools/.env.local. Runs on the developer machine only — nothing here ships to
// players except the final MP4 files. Every step caches to tools/video/build/,
// so re-runs only do missing work.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { VIDEOS, VOICES } from './script.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const BUILD = join(__dirname, 'build');
const OUT = join(ROOT, 'assets', 'video');

const IMG_MODEL = 'gemini-3-pro-image';
const TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const TTS_FALLBACK = 'gemini-2.5-pro-preview-tts';
const FPS = 30, W = 1280, H = 720;
const LEAD_S = 0.5, GAP_S = 0.55, TAIL_S = 1.0;

// --- key ---------------------------------------------------------------------
function apiKey() {
  const env = readFileSync(join(ROOT, 'tools', '.env.local'), 'utf8');
  const m = env.match(/^GEMINI_API_KEY=(.+)$/m);
  if (!m) { console.error('GEMINI_API_KEY missing from tools/.env.local'); process.exit(1); }
  return m[1].trim();
}
const KEY = apiKey();

// --- ffmpeg ------------------------------------------------------------------
function findFfmpeg() {
  const toolsDir = resolve(ROOT, '..', '_tools');
  if (existsSync(toolsDir)) {
    for (const d of readdirSync(toolsDir)) {
      const p = join(toolsDir, d, 'bin', 'ffmpeg.exe');
      if (d.startsWith('ffmpeg') && existsSync(p)) return p;
    }
  }
  return 'ffmpeg'; // hope it's on PATH
}
const FFMPEG = findFfmpeg();

function ffmpeg(args) {
  execFileSync(FFMPEG, ['-hidden_banner', '-loglevel', 'error', '-y', ...args].filter((a) => a !== '-hidden_banner'), { stdio: ['ignore', 'inherit', 'inherit'] });
}

// --- Gemini calls (retry on 429/5xx) ----------------------------------------
async function gemini(model, body, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const txt = await res.text();
    if ((res.status === 429 || res.status >= 500) && i < tries - 1) {
      const wait = Math.min(60_000, 4000 * 2 ** i);
      console.log(`  ${model} ${res.status} — retrying in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    throw new Error(`${model} HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
}

// --- WAV helpers (24 kHz mono s16le) ----------------------------------------
function wavWrite(path, pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(path, Buffer.concat([h, pcm]));
}
function wavReadPcm(path) {
  const b = readFileSync(path);
  const i = b.indexOf('data');            // find the data chunk
  const size = b.readUInt32LE(i + 4);
  return b.subarray(i + 8, i + 8 + size);
}
const silence = (sec) => Buffer.alloc(Math.round(sec * 24000) * 2);

// --- stills ------------------------------------------------------------------
// Every shot with a `prompt` defines a still; later shots may reference the
// same name without a prompt (reuse). Game captures (`cap`) come from
// build/gamecaps/ and are produced live via cap-server.mjs, never generated.
function uniqueStills() {
  const seen = new Map();
  for (const v of VIDEOS) for (const sc of v.scenes) for (const sh of sc.shots) {
    if (sh.still && sh.prompt && !seen.has(sh.still)) seen.set(sh.still, sh.prompt);
  }
  return seen;
}

function shotFile(sh) {
  if (sh.cap) return join(BUILD, 'gamecaps', `${sh.cap}.png`);
  return join(BUILD, 'stills', `${sh.still}.png`);
}

async function genImages() {
  const dir = join(BUILD, 'stills'); mkdirSync(dir, { recursive: true });
  for (const [file, prompt] of uniqueStills()) {
    const out = join(dir, `${file}.png`);
    if (existsSync(out) && statSync(out).size > 10_000) { console.log(`still cached: ${file}`); continue; }
    process.stdout.write(`still ${file} … `);
    const d = await gemini(IMG_MODEL, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
    });
    const part = (d.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
    if (!part) throw new Error(`no image for ${file}`);
    writeFileSync(out, Buffer.from(part.inlineData.data, 'base64'));
    console.log(`ok (${Math.round(part.inlineData.data.length * 0.75 / 1024)} KB)`);
  }
}

// --- TTS ---------------------------------------------------------------------
async function genTts(lang) {
  const dir = join(BUILD, 'tts', lang); mkdirSync(dir, { recursive: true });
  for (const v of VIDEOS) {
    for (const sc of v.scenes) {
      for (let i = 0; i < sc.lines.length; i++) {
        const line = sc.lines[i];
        const out = join(dir, `${v.id}_${sc.id}_${String(i).padStart(2, '0')}_${line.sp}.wav`);
        if (existsSync(out) && statSync(out).size > 4000) continue;
        const voice = VOICES[line.sp];
        process.stdout.write(`tts ${lang} ${v.id}/${sc.id}#${i} (${line.sp}) … `);
        // TTS models occasionally return EMPTY candidates, and each model has
        // its own quota bucket — so rotate across all three on failures of
        // either kind (empty part, or a 429 that outlived gemini()'s retries).
        const MODELS = [TTS_MODEL, TTS_FALLBACK, 'gemini-2.5-flash-preview-tts'];
        let part = null;
        for (let attempt = 0; attempt < 9 && !part; attempt++) {
          const model = MODELS[Math.floor(attempt / 3) % MODELS.length];
          try {
            const d = await gemini(model, {
              contents: [{ parts: [{ text: voice.style[lang] + line[lang] }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.voice } } },
              },
            }, 3);
            part = (d.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
            if (!part) process.stdout.write(`(empty #${attempt + 1} ${model}) `);
          } catch (e) {
            process.stdout.write(`(${e.message.slice(0, 40)}… #${attempt + 1} ${model}) `);
          }
          if (!part) await new Promise((r) => setTimeout(r, 15_000));
        }
        if (!part) throw new Error(`no audio for ${v.id}/${sc.id}#${i} — all TTS models exhausted (quota?)`);
        const pcm = Buffer.from(part.inlineData.data, 'base64');
        wavWrite(out, pcm);
        console.log(`ok (${(pcm.length / 2 / 24000).toFixed(1)}s)`);
        await new Promise((r) => setTimeout(r, 2500)); // stay under TTS rate limits
      }
    }
  }
}

// --- assembly ----------------------------------------------------------------
function sceneAudio(v, sc, lang, outPath) {
  const dir = join(BUILD, 'tts', lang);
  const parts = [silence(LEAD_S)];
  sc.lines.forEach((line, i) => {
    const wav = join(dir, `${v.id}_${sc.id}_${String(i).padStart(2, '0')}_${line.sp}.wav`);
    parts.push(wavReadPcm(wav));
    parts.push(silence(i === sc.lines.length - 1 ? TAIL_S : GAP_S));
  });
  const pcm = Buffer.concat(parts);
  wavWrite(outPath, pcm);
  return pcm.length / 2 / 24000; // seconds
}

function kenBurns(idx, sh, frames) {
  // Per-shot camera move. `focus: [fx,fy]` pushes toward that fractional point
  // (map-town shots); zoom 'close' starts tight; 'in'/'out' force direction;
  // otherwise shots alternate push-in / pull-out. Nearest-neighbour upscale
  // keeps the pixel art (and game-UI text) crisp under the move.
  const mode = sh.zoom;
  let z, x = `(iw-iw/zoom)/2`, y = `(ih-ih/zoom)/2`;
  if (sh.focus) {
    const [fx, fy] = sh.focus;
    z = `1.06+0.55*on/${frames}`;
    x = `max(0,min(iw-iw/zoom,iw*${fx}-(iw/zoom)/2))`;
    y = `max(0,min(ih-ih/zoom,ih*${fy}-(ih/zoom)/2))`;
  } else if (mode === 'close') z = `1.18+0.10*on/${frames}`;
  else if (mode === 'in') z = `1.02+0.14*on/${frames}`;
  else if (mode === 'out') z = `1.16-0.14*on/${frames}`;
  else if (idx % 2 === 0) z = `1.02+0.12*on/${frames}`;
  else z = `1.14-0.12*on/${frames}`;
  return `scale=2752:1548:flags=neighbor,zoompan=z='${z}':x='${x}':y='${y}':d=${frames}:s=${W}x${H}:fps=${FPS}`;
}

function assemble(lang) {
  mkdirSync(OUT, { recursive: true });
  const segDir = join(BUILD, 'seg', lang); mkdirSync(segDir, { recursive: true });
  const FONT = 'C\\:/Windows/Fonts/arial.ttf';

  for (const v of VIDEOS) {
    const segs = [];
    v.scenes.forEach((sc, idx) => {
      const seg = join(segDir, `${v.id}_${idx}.mp4`);
      const aud = join(segDir, `${v.id}_${idx}.wav`);
      const dur = sceneAudio(v, sc, lang, aud);
      const total = Math.round(dur * FPS);

      // Caption (burned into every sub-clip of the scene, so it persists).
      let capDraw = '';
      if (sc.caption) {
        const capFile = join(segDir, `${v.id}_${idx}.txt`);
        writeFileSync(capFile, sc.caption[lang], 'utf8');
        const cap = capFile.replace(/\\/g, '/').replace(':', '\\:');
        capDraw = `,drawtext=fontfile='${FONT}':textfile='${cap}':fontsize=26:fontcolor=white:borderw=2:bordercolor=black@0.8:x=(w-text_w)/2:y=h-58`;
      }

      // The scene's audio duration is split evenly across its shots; each shot
      // becomes a silent sub-clip, concatenated, then muxed with the audio.
      const base = Math.floor(total / sc.shots.length);
      const subs = [];
      sc.shots.forEach((sh, si) => {
        const frames = si === sc.shots.length - 1 ? total - base * si : base;
        const sub = join(segDir, `${v.id}_${idx}_${si}.mp4`);
        const vf = kenBurns(si, sh, frames) + capDraw;
        ffmpeg(['-i', shotFile(sh),
          '-filter_complex', `[0:v]${vf}[v]`, '-map', '[v]', '-an',
          '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-pix_fmt', 'yuv420p', sub]);
        subs.push(sub);
      });
      const subList = join(segDir, `${v.id}_${idx}_subs.txt`);
      writeFileSync(subList, subs.map((s) => `file '${s.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
      ffmpeg(['-f', 'concat', '-safe', '0', '-i', subList, '-i', aud,
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-shortest', seg]);
      segs.push(seg);
      console.log(`seg ${lang} ${v.id} ${idx + 1}/${v.scenes.length} (${dur.toFixed(1)}s, ${sc.shots.length} shots)`);
    });
    // Concat segments (same codecs → stream copy).
    const list = join(segDir, `${v.id}_list.txt`);
    writeFileSync(list, segs.map((s) => `file '${s.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
    const final = join(OUT, `${v.id}_${lang}.mp4`);
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', final]);
    console.log(`FINAL: assets/video/${v.id}_${lang}.mp4 (${Math.round(statSync(final).size / 1024 / 1024 * 10) / 10} MB)`);
  }
}

// --- main --------------------------------------------------------------------
const args = process.argv.slice(2);
const langArg = (args.find((a) => a.startsWith('--lang=')) || '--lang=en').split('=')[1];
const langs = langArg === 'both' ? ['en', 'cs'] : [langArg];

(async () => {
  console.log(`ffmpeg: ${FFMPEG}`);
  if (args.includes('--images') || args.includes('--all')) await genImages();
  for (const lang of (args.includes('--all') ? ['en', 'cs'] : langs)) {
    if (args.includes('--tts') || args.includes('--all')) await genTts(lang);
    if (args.includes('--assemble') || args.includes('--all')) assemble(lang);
  }
  if (!args.some((a) => ['--images', '--tts', '--assemble', '--all'].includes(a))) {
    console.log('usage: node gen-video.mjs [--images] [--tts] [--assemble] [--all] [--lang=en|cs|both]');
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
