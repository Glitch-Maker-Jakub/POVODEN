// Tiny dev-only receiver: the game page POSTs canvas snapshots here and they
// land in tools/video/build/gamecaps/<name>.png. Never ships to players.
import { createServer } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'build', 'gamecaps');
mkdirSync(DIR, { recursive: true });

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const name = new URL(req.url, 'http://x').searchParams.get('name');
  if (req.method !== 'POST' || !/^[a-z0-9_]+$/.test(name || '')) { res.statusCode = 400; res.end('bad'); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const b64 = body.replace(/^data:image\/png;base64,/, '');
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 10_000) { res.statusCode = 400; res.end('too small'); return; }
    writeFileSync(join(DIR, `${name}.png`), buf);
    console.log(`saved ${name}.png (${Math.round(buf.length / 1024)} KB)`);
    res.end('ok');
  });
}).listen(8125, '127.0.0.1', () => console.log('cap-server on :8125'));
