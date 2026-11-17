import { spawnSync } from 'node:child_process';
import { copyFileSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';

const file = process.argv[2];
const source = process.argv[3] ?? file;
if (!file) { console.error('usage: node repair-session2.mjs <target> [source]'); process.exit(1); }

const dec = spawnSync('zstd', ['-dc', source], { maxBuffer: 1 << 30 });
if (dec.status !== 0) { console.error('decompress failed', dec.stderr?.toString()); process.exit(1); }
const lines = dec.stdout.toString('utf8').split('\n').filter(Boolean);
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

const header = out[0] + '\n';
const rest = out.slice(1).join('\n') + '\n';
const tmpHeader = file + '.header.tmp';
const tmpRest = file + '.rest.tmp';
writeFileSync(tmpHeader, header);
writeFileSync(tmpRest, rest);
const frame1 = spawnSync('zstd', ['-q', '-c', tmpHeader], { maxBuffer: 1 << 30 });
const frame2 = spawnSync('zstd', ['-q', '-c', tmpRest], { maxBuffer: 1 << 30 });
unlinkSync(tmpHeader); unlinkSync(tmpRest);
if (frame1.status !== 0 || frame2.status !== 0) { console.error('compress failed'); process.exit(1); }
if (source === file) copyFileSync(file, file + '.broken-' + Date.now());
writeFileSync(file, Buffer.concat([frame1.stdout, frame2.stdout]));
console.log(`rebuilt ${file}: lines=${out.length}, fixed=${fixed}, frames=2`);
