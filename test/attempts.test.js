import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertRetryReady, hasSection, writeFailureData } from '../src/attempts.js';
import { createState } from '../src/store.js';

async function tempRoot(t) {
  const root = await mkdtemp(join(tmpdir(), 'dept-attempt-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('hasSection: отличает заполненный раздел от пустого', () => {
  assert.equal(hasSection('## Анализ\n\nпричина', 'Анализ'), true);
  assert.equal(hasSection('## Анализ\n\n## План\n', 'Анализ'), false);
  assert.equal(hasSection('## План\n\nменять X', 'План'), true);
});

test('writeFailureData: пишет данные и сохраняет прежний анализ', async (t) => {
  const root = await tempRoot(t);
  const state = createState({ root, taskId: 'att-1' });
  void state;
  await writeFailureData(root, 'att-1', 2, 'tests 3, fail 1');
  const path = join(root, 'docs/department/att-1/stages/02/failure.md');
  const first = await readFile(path, 'utf8');
  assert.match(first, /## Данные/);
  assert.match(first, /fail 1/);
  await writeFailureData(root, 'att-1', 2, 'tests 4, fail 2');
  const second = await readFile(path, 'utf8');
  assert.match(second, /fail 1/);
  assert.match(second, /fail 2/);
});

test('assertRetryReady: без анализа повтор запрещён', async (t) => {
  const root = await tempRoot(t);
  await writeFailureData(root, 'att-2', 1, 'fail');
  await assert.rejects(() => assertRetryReady(root, 'att-2', 1), /retry blocked/);
});
