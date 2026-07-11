// Architectural guarantees for the split domain model (TASK-004):
// no cyclic imports inside src/model, the view/AI layers import the model only
// through the gameState.js façade, and the model emits typed events instead of
// user-facing sentences.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { EVENT } from '../src/model/gameState.js';
import { runCampaign } from './helpers/campaign.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_DIR = join(ROOT, 'src', 'model');

const localImports = (file) => {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/from\s+'\.\/([\w-]+)\.js'/g)].map((m) => m[1]);
};

test('the model import graph is a DAG (no cyclic imports)', () => {
  const graph = {};
  for (const f of readdirSync(MODEL_DIR).filter((f) => f.endsWith('.js'))) {
    graph[f.replace(/\.js$/, '')] = localImports(join(MODEL_DIR, f));
  }
  const visiting = new Set();
  const done = new Set();
  const visit = (node, path) => {
    if (done.has(node)) return;
    assert.ok(!visiting.has(node), `import cycle: ${[...path, node].join(' -> ')}`);
    visiting.add(node);
    for (const dep of graph[node] || []) visit(dep, [...path, node]);
    visiting.delete(node);
    done.add(node);
  };
  for (const node of Object.keys(graph)) visit(node, []);
});

test('scenes, AI and UI reach the model only through the gameState façade', () => {
  const layers = ['src/scenes', 'src/ai', 'src/ui', 'src/net'];
  for (const layer of layers) {
    for (const f of readdirSync(join(ROOT, layer)).filter((f) => f.endsWith('.js'))) {
      const src = readFileSync(join(ROOT, layer, f), 'utf8');
      for (const m of src.matchAll(/from\s+'[./]*\/model\/([\w-]+)\.js'/g)) {
        assert.equal(m[1], 'gameState',
          `${layer}/${f} imports model internal '${m[1]}.js' — import from gameState.js instead`);
      }
    }
  }
});

test('every notification the model emits is a typed domain event', () => {
  const known = new Set(Object.values(EVENT));
  for (const seed of [1, 4, 7]) {
    runCampaign({
      seed,
      onRound: (gs) => {
        for (const n of gs.notifications) {
          assert.equal(typeof n, 'object', `notification is not structured: ${JSON.stringify(n)}`);
          assert.ok(known.has(n.type), `unknown event type '${n.type}'`);
        }
      },
    });
  }
});
