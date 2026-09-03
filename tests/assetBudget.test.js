// Asset budget & manifest integrity. Guards the TASK-002 acceptance criteria:
// cold start to the menu stays under the image budget, the 1x decoded memory
// stays sane, and every file the runtime manifest references actually exists
// in the shipped format/variant matrix produced by tools/build-assets.py.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { menuImages, gameImages, newsImages, assetVariant, NEWS_KEYS } from '../src/ui/assets.js';
import { MUNICIPALITIES } from '../src/data/gameData.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const KB = 1024;
const BUDGET = {
  menuBytes: 1.5 * 1024 * KB,   // cold start to menu (per format/variant)
  gameBytes: 1.0 * 1024 * KB,   // board art fetched on campaign start
  newsBytes: 600 * KB,          // lazy newspaper photos
  decodedMenu1x: 20 * 1024 * KB // decoded RGBA of the boot-critical group at 1x
};

// --- tiny header-only dimension parsers (no dependencies) ---------------------

function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('no JPEG SOF marker found');
}

function webpSize(buf) {
  const fourcc = buf.toString('ascii', 12, 16);
  if (fourcc === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (fourcc === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  if (fourcc === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
  }
  throw new Error(`unknown WebP chunk ${fourcc}`);
}

function imageInfo(relUrl) {
  const path = join(ROOT, relUrl);
  const bytes = statSync(path).size;
  const buf = readFileSync(path);
  const size = relUrl.endsWith('.png') ? pngSize(buf)
    : relUrl.endsWith('.webp') ? webpSize(buf)
      : jpegSize(buf);
  return { bytes, ...size, decoded: size.w * size.h * 4 };
}

const groupBytes = (images) => images.reduce((a, i) => a + imageInfo(i.url).bytes, 0);

const COMBOS = [];
for (const ext of ['jpg', 'webp']) {
  for (const variant of ['', '@2x']) COMBOS.push({ ext, variant });
}

// --- manifest integrity ---------------------------------------------------------

test('every manifest URL exists in every shipped format/variant combination', () => {
  for (const { ext, variant } of COMBOS) {
    const all = [...menuImages(ext, variant), ...gameImages(ext, variant), ...newsImages(ext)];
    for (const { key, url } of all) {
      assert.doesNotThrow(() => imageInfo(url), `${key}: missing or unreadable ${url}`);
      assert.ok(!url.includes('assets/src/'), `${key}: ${url} points at pipeline sources`);
    }
  }
});

test('backgrounds ship at the documented 1x and @2x resolutions', () => {
  for (const ext of ['jpg', 'webp']) {
    const title1 = imageInfo(menuImages(ext, '')[0].url);
    const title2 = imageInfo(menuImages(ext, '@2x')[0].url);
    assert.deepEqual({ w: title1.w, h: title1.h }, { w: 1280, h: 720 }, `title 1x ${ext}`);
    assert.deepEqual({ w: title2.w, h: title2.h }, { w: 2560, h: 1440 }, `title 2x ${ext}`);
    const valley1 = imageInfo(gameImages(ext, '')[0].url);
    const valley2 = imageInfo(gameImages(ext, '@2x')[0].url);
    assert.deepEqual({ w: valley1.w, h: valley1.h }, { w: 880, h: 720 }, `valley 1x ${ext}`);
    assert.deepEqual({ w: valley2.w, h: valley2.h }, { w: 1760, h: 1440 }, `valley 2x ${ext}`);
  }
});

test('town sprites are 256x256 PNGs; news photos are 768x432', () => {
  for (const m of MUNICIPALITIES) {
    const info = imageInfo(`assets/towns/${m.id}.png`);
    assert.deepEqual({ w: info.w, h: info.h }, { w: 256, h: 256 }, `town ${m.id}`);
  }
  for (const k of NEWS_KEYS) {
    for (const ext of ['jpg', 'webp']) {
      const info = imageInfo(`assets/news/${k}.${ext}`);
      assert.deepEqual({ w: info.w, h: info.h }, { w: 768, h: 432 }, `news ${k}.${ext}`);
    }
  }
});

// --- budgets ----------------------------------------------------------------------

test('cold start to the menu stays within the image budget', () => {
  for (const { ext, variant } of COMBOS) {
    const bytes = groupBytes(menuImages(ext, variant));
    assert.ok(bytes <= BUDGET.menuBytes,
      `menu group (${ext}${variant || '@1x'}) is ${Math.round(bytes / KB)} KB, budget ${BUDGET.menuBytes / KB} KB`);
  }
});

test('decoded memory of the boot-critical group stays under 20 MB at 1x', () => {
  const decoded = menuImages('jpg', '').reduce((a, i) => a + imageInfo(i.url).decoded, 0);
  assert.ok(decoded <= BUDGET.decodedMenu1x,
    `menu decodes to ${Math.round(decoded / KB / KB)} MB, budget ${BUDGET.decodedMenu1x / KB / KB} MB`);
});

test('board art and newspaper groups stay within their budgets', () => {
  for (const { ext, variant } of COMBOS) {
    const bytes = groupBytes(gameImages(ext, variant));
    assert.ok(bytes <= BUDGET.gameBytes,
      `game group (${ext}${variant || '@1x'}) is ${Math.round(bytes / KB)} KB, budget ${BUDGET.gameBytes / KB} KB`);
  }
  for (const ext of ['jpg', 'webp']) {
    const bytes = groupBytes(newsImages(ext));
    assert.ok(bytes <= BUDGET.newsBytes,
      `news group (${ext}) is ${Math.round(bytes / KB)} KB, budget ${BUDGET.newsBytes / KB} KB`);
  }
});

// --- variant selection --------------------------------------------------------------

test('small and 1x displays get 1x art; large or high-DPI displays get @2x', () => {
  assert.equal(assetVariant({ width: 1280, height: 720, dpr: 1 }), '');
  assert.equal(assetVariant({ width: 1000, height: 700, dpr: 1 }), '');
  assert.equal(assetVariant({ width: 1600, height: 900, dpr: 1 }), '', 'FIT keeps this at 1x');
  assert.equal(assetVariant({ width: 2560, height: 1440, dpr: 1 }), '@2x');
  assert.equal(assetVariant({ width: 1440, height: 900, dpr: 2 }), '@2x');
  assert.equal(assetVariant({ width: 900, height: 700, dpr: 2 }), '@2x');
  assert.equal(assetVariant({ width: 700, height: 500, dpr: 2 }), '', 'small phone stays 1x even at DPR 2');
});

test('the manifest never mixes variants into fixed-size art', () => {
  for (const { key, url } of [...gameImages('jpg', '@2x')]) {
    if (key.startsWith('town_')) assert.ok(!url.includes('@2x'), `${key} has no @2x variant`);
  }
  for (const { url } of newsImages('jpg')) assert.ok(!url.includes('@2x'));
});
