import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertApprovalReady } from '../src/approval.js';
import { addQuestion, createState } from '../src/store.js';

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'dept-approval-'));
  const taskId = 'a1';
  const dir = join(root, 'docs', 'department', taskId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'discussion.md'), '# Обсуждение\n', 'utf8');
  return { root, taskId, dir, state: createState({ root, taskId }) };
}

test('spec: без обсуждения утвердить нельзя', async (t) => {
  const { root, taskId, dir } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const state = createState({ root, taskId });
  await rm(join(dir, 'discussion.md'));
  await assert.rejects(() => assertApprovalReady(root, taskId, 'spec', state), /discussion\.md/);
});

test('spec: открытые вопросы блокируют утверждение', async (t) => {
  const { root, taskId, state } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const asked = addQuestion(state, { text: 'Какой стиль?' }).state;
  await assert.rejects(() => assertApprovalReady(root, taskId, 'spec', asked), /открытых вопросов/);
});

test('concept: нужно минимум два варианта', async (t) => {
  const { root, taskId, dir, state } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(dir, 'concept.md'), '# Концепция\n\n## Вариант 1\n', 'utf8');
  await assert.rejects(() => assertApprovalReady(root, taskId, 'concept', state), /минимум 2 варианта/);
  await writeFile(join(dir, 'concept.md'), '# Концепция\n\n## Вариант 1\n\n## Вариант 2\n', 'utf8');
  await assert.doesNotReject(() => assertApprovalReady(root, taskId, 'concept', state));
});
