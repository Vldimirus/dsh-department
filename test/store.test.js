import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  addIdeas,
  addQuestion,
  addSection,
  amendDocument,
  answerQuestion,
  critiqueIdea,
  listRoles,
  setRole,
  listQuestions,
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

test('amendDocument: автономная поправка подписывается manager и помечается', () => {
  const state = createState({ root: '/tmp/x', taskId: 'a2' });
  const amended = amendDocument(state, { doc: 'spec', summary: 'кап длины', by: 'manager', autonomous: true, reason: 'измерения' });
  assert.equal(amended.amendments[0].autonomous, true);
  assert.equal(amended.events.at(-1).actor, 'manager');
  assert.match(amended.events.at(-1).detail, /автономно/);
});

test('amendDocument: лимит автономных поправок', () => {
  let state = createState({ root: '/tmp/x', taskId: 'a3' });
  state = { ...state, policy: { ...state.policy, maxAutonomousAmendments: 1 } };
  state = amendDocument(state, { doc: 'spec', summary: 'первая', by: 'manager', autonomous: true });
  assert.throws(
    () => amendDocument(state, { doc: 'spec', summary: 'вторая', by: 'manager', autonomous: true }),
    /limit reached/,
  );
});

test('addQuestion/answerQuestion: вопрос копится и закрывается ответом', () => {
  const state = createState({ root: '/tmp/x', taskId: 'q1' });
  const { state: asked, question } = addQuestion(state, {
    text: 'Кап длины?',
    options: ['1200', '3700'],
    recommended: '3700',
  });
  assert.equal(question.status, 'open');
  assert.equal(listQuestions(asked, { status: 'open' }).length, 1);
  const answered = answerQuestion(asked, { id: question.id, answer: '3700', by: 'vladimir' });
  assert.equal(listQuestions(answered, { status: 'open' }).length, 0);
  assert.equal(answered.questions[0].answer, '3700');
  assert.equal(answered.events.at(-1).action, 'question_answered');
});

test('answerQuestion: повторный ответ — ошибка', () => {
  const state = createState({ root: '/tmp/x', taskId: 'q2' });
  const { state: asked, question } = addQuestion(state, { text: 'x' });
  const answered = answerQuestion(asked, { id: question.id, answer: 'y', by: 'vladimir' });
  assert.throws(() => answerQuestion(answered, { id: question.id, answer: 'z', by: 'vladimir' }), /already answered/);
});

test('addSection: раздел специалиста пишется в состояние', () => {
  const state = createState({ root: '/tmp/x', taskId: 's1' });
  const next = addSection(state, { doc: 'concept', role: 'designer', title: 'Стиль', content: 'минимализм' });
  assert.equal(next.sections.length, 1);
  assert.equal(next.events.at(-1).action, 'section_added');
});

test('addIdeas + critiqueIdea: две похвалы принимают, жёсткая критика отклоняет', () => {
  let state = createState({ root: '/tmp/x', taskId: 'i1' });
  const proposed = addIdeas(state, { problem: 'граф', ideas: [{ title: 'A' }, { title: 'B' }] });
  state = proposed.state;
  const [first, second] = proposed.ideas;
  state = critiqueIdea(state, { ideaId: first.id, role: 'tester', verdict: 'approve' });
  state = critiqueIdea(state, { ideaId: first.id, role: 'reviewer', verdict: 'approve' });
  assert.equal(state.ideas.find((idea) => idea.id === first.id).status, 'accepted');
  state = critiqueIdea(state, { ideaId: second.id, role: 'tester', verdict: 'reject', severity: 'high' });
  assert.equal(state.ideas.find((idea) => idea.id === second.id).status, 'rejected');
});

test('listRoles: beta-tester выключен по умолчанию, основные нельзя выключить', () => {
  const state = createState({ root: '/tmp/x', taskId: 'r1' });
  const roles = listRoles(state);
  const beta = roles.find((role) => role.name === 'beta-tester');
  const coder = roles.find((role) => role.name === 'coder');
  assert.equal(beta.enabled, false);
  assert.equal(coder.core, true);
  assert.throws(() => setRole(state, { role: 'coder', enabled: false }), /core role/);
  const enabled = setRole(state, { role: 'beta-tester', enabled: true });
  assert.equal(listRoles(enabled).find((role) => role.name === 'beta-tester').enabled, true);
});
