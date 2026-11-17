import { spawnSync } from 'node:child_process';
import { copyFileSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: node repair-session.mjs <session.v4.jsonl.zstd>'); process.exit(1); }

const backup = file + '.bak-' + Date.now();
copyFileSync(file, backup);

const decompress = spawnSync('zstd', ['-dc', file], { maxBuffer: 1 << 30 });
if (decompress.status !== 0) { console.error('zstd decompress failed', decompress.stderr?.toString()); process.exit(1); }
const lines = decompress.stdout.toString('utf8').split('\n').filter(Boolean);
let fixed = 0;
const out = lines.map((line) => {
  let event;
  try { event = JSON.parse(line); } catch { return line; }
  const data = event?.data ?? {};
  if (event.type === 'user/message' && !data.role) {
    data.role = 'user';
    if (!data.id) data.id = 'repaired-' + (event.seq ?? Date.now());
    fixed += 1;
  }
  if (event.type === 'agent/inbox/spliced' && Array.isArray(data.inserted)) {
    for (const message of data.inserted) {
      if (!message.role) { message.role = 'user'; fixed += 1; }
      if (!message.id) message.id = 'repaired-insert-' + (event.seq ?? Date.now()) + '-' + Math.random().toString(36).slice(2, 6);
    }
  }
  return JSON.stringify(event);
});

if (fixed === 0) { console.log('nothing to fix in', file); process.exit(0); }
const tmp = file + '.tmp.jsonl';
writeFileSync(tmp, out.join('\n') + '\n');
const compress = spawnSync('zstd', ['-q', '-f', tmp, '-o', file], { maxBuffer: 1 << 30 });
unlinkSync(tmp);
if (compress.status !== 0) { console.error('zstd compress failed'); process.exit(1); }

const check = spawnSync('zstd', ['-dc', file], { maxBuffer: 1 << 30 });
const bad = check.stdout.toString('utf8').split('\n').filter(Boolean).filter((line) => {
  try { const event = JSON.parse(line); return event.type === 'user/message' && !event.data?.role; } catch { return false; }
});
console.log(`fixed ${fixed} message(s) in ${file}; backup: ${backup}; remaining bad: ${bad.length}`);
