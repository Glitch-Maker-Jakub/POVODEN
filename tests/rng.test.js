import test from 'node:test';
import assert from 'node:assert/strict';

import { createSeededRng, hashSeed } from '../src/model/rng.js';

test('same seed produces the identical sequence', () => {
  const a = createSeededRng(42);
  const b = createSeededRng(42);
  for (let i = 0; i < 1000; i++) {
    assert.equal(a(), b(), `sequences diverged at draw ${i}`);
  }
});

test('different seeds produce different sequences', () => {
  const a = createSeededRng(1);
  const b = createSeededRng(2);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  assert.notDeepEqual(seqA, seqB);
});

test('values stay in [0, 1)', () => {
  const rng = createSeededRng(7);
  for (let i = 0; i < 10000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `draw ${i} out of range: ${v}`);
  }
});

test('string seeds hash deterministically and differ from each other', () => {
  assert.equal(hashSeed('campaign-1'), hashSeed('campaign-1'));
  assert.notEqual(hashSeed('campaign-1'), hashSeed('campaign-2'));
  const a = createSeededRng('campaign-1');
  const b = createSeededRng('campaign-1');
  assert.equal(a(), b());
});
