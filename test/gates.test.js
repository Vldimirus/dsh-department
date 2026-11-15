import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCommand, runTestGate, tailLines } from '../src/gates.js';

async function tempDir(t) {
  const dir = await mkdtemp(join(tmpdir(), 'dept-gate-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('runCommand: успешная команда даёт код 0', async (t) => {
  const dir = await tempDir(t);
  const result = await runCommand(dir, 'echo hello');
  assert.equal(result.code, 0);
  assert.match(result.output, /hello/);
});

test('runCommand: падающая команда даёт ненулевой код', async (t) => {
  const dir = await tempDir(t);
  const result = await runCommand(dir, 'exit 3');
  assert.notEqual(result.code, 0);
});

test('tailLines: оставляет последние строки', () => {
  assert.equal(tailLines('a\nb\nc\nd', 2), 'c\nd');
  assert.equal(tailLines('', 2), '');
});

test('runTestGate: pass и fail по exit code', async (t) => {
  const dir = await tempDir(t);
  const pass = await runTestGate(dir, 'true');
  assert.equal(pass.ok, true);
  assert.equal(pass.exitCode, 0);
  const fail = await runTestGate(dir, 'false');
  assert.equal(fail.ok, false);
  assert.notEqual(fail.exitCode, 0);
});

test('runTestGate: без команды — ошибка', async (t) => {
  const dir = await tempDir(t);
  await assert.rejects(() => runTestGate(dir, ''), /not configured/);
});
