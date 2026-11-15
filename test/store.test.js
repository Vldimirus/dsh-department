import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  amendDocument,
  resetGatesForNextStage,
  approveDocument,
  createState,
  readState,
  recordReview,
  recordTestGate,
  statePath,
  summarize,
  writeState,
} from '../src/store.js';

async function tempRoot(t) {
  const root = await mkdtemp(join(tmpdir(), 'dept-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('createState: стадия analysis и базовые поля', () => {
  const state = createState({ root: '/tmp/x', taskId: 'game-01', title: 'Игра' });
  assert.equal(state.stage, 'analysis');
  assert.equal(state.branch, 'dept/game-01');
  assert.equal(state.gates.tests.status, 'pending');
  assert.equal(state.events.length, 1);
});

test('writeState/readState: круговой обход', async (t) => {
  const root = await tempRoot(t);
  const state = createState({ root, taskId: 't1' });
  await writeState(root, state);
  const loaded = await readState(root, 't1');
  assert.equal(loaded.taskId, 't1');
  assert.ok(statePath(root, 't1').startsWith(root));
});

test('readState: отсутствующая задача — null', async (t) => {
  const root = await tempRoot(t);
  assert.equal(await readState(root, 'nope'), null);
});

test('approveDocument: concept переводит в spec, spec — в executing', () => {
  let state = createState({ root: '/tmp/x', taskId: 't2' });
  state = { ...state, stage: 'concept_review' };
  const afterConcept = approveDocument(state, { doc: 'concept', by: 'human' });
  assert.equal(afterConcept.stage, 'spec');
  assert.equal(afterConcept.approvals.length, 1);

  const afterSpec = approveDocument({ ...afterConcept, stage: 'spec_review' }, { doc: 'spec', by: 'human' });
  assert.equal(afterSpec.stage, 'executing');
});

test('approveDocument: неверная стадия — ошибка', () => {
  const state = createState({ root: '/tmp/x', taskId: 't3' });
  assert.throws(() => approveDocument(state, { doc: 'concept', by: 'human' }), /cannot approve/);
  assert.throws(() => approveDocument(state, { doc: 'unknown', by: 'human' }), /unknown document/);
});

test('recordTestGate: pass не растит попытки, fail растит', () => {
  const state = createState({ root: '/tmp/x', taskId: 't4' });
  const passed = recordTestGate(state, { ok: true, exitCode: 0, summary: 'ok' });
  assert.equal(passed.gates.tests.status, 'pass');
  assert.equal(passed.attempts.current, 0);
  const failed = recordTestGate(state, { ok: false, exitCode: 1, summary: 'fail' });
  assert.equal(failed.gates.tests.status, 'fail');
  assert.equal(failed.attempts.current, 1);
});

test('recordReview: фиксирует вердикт', () => {
  const state = createState({ root: '/tmp/x', taskId: 't5' });
  const reviewed = recordReview(state, { pass: false, summary: 'Esc не работает' });
  assert.equal(reviewed.gates.review.status, 'fail');
  assert.match(reviewed.gates.review.summary, /Esc/);
});

test('summarize: содержит стадию и бюджет', () => {
  const text = summarize(createState({ root: '/tmp/x', taskId: 't6' }));
  assert.match(text, /stage: analysis/);
  assert.match(text, /budget: 0\/60000/);
});

test('amendDocument: поправка пишется в состояние и событие', async () => {
  const state = createState({ root: '/tmp/x', taskId: 'a1' });
  const amended = amendDocument(state, { doc: 'spec', summary: 'заменить требование к рёбрам', by: 'vladimir', reason: 'ревью 3000 seed' });
  assert.equal(amended.amendments.length, 1);
  assert.equal(amended.amendments[0].by, 'vladimir');
  assert.equal(amended.events.at(-1).action, 'amended_document');
});

test('resetGatesForNextStage: гейты не переезжают на следующий этап', () => {
  const state = createState({ root: '/tmp/x', taskId: 'g1' });
  const passed = recordTestGate(recordReview(state, { pass: true, summary: 'ok' }), { ok: true, exitCode: 0 });
  const next = resetGatesForNextStage(passed);
  assert.equal(next.gates.tests.status, 'pending');
  assert.equal(next.gates.review.status, 'pending');
  assert.equal(next.stageIndex, 1);
});
