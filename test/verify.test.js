import assert from 'node:assert/strict';
import test from 'node:test';
import { formatReport, missingArtifacts, requiredArtifacts, verifyChecklist } from '../src/verify.js';
import { createState } from '../src/store.js';

function stateAt(stage, extra = {}) {
  return { ...createState({ root: '/tmp/x', taskId: 'v1' }), stage, ...extra };
}

test('verify: стадия analysis требует task.md и ветку', () => {
  const report = verifyChecklist({ state: stateAt('analysis'), files: { 'task.md': true }, currentBranch: 'dept/v1' });
  assert.equal(report.ok, true);
});

test('verify: отсутствие task.md — FAIL', () => {
  const report = verifyChecklist({ state: stateAt('analysis'), files: {}, currentBranch: 'dept/v1' });
  assert.equal(report.ok, false);
  assert.ok(report.checks.some((item) => item.id === 'artifact:task.md' && !item.ok));
});

test('verify: concept_review без concept.md — FAIL', () => {
  const report = verifyChecklist({
    state: stateAt('concept_review'),
    files: { 'task.md': true, 'analysis.md': true },
    currentBranch: 'dept/v1',
  });
  assert.equal(report.ok, false);
});

test('verify: executing требует approvals и pass-гейт', () => {
  const state = stateAt('executing', {
    approvals: [{ doc: 'concept', by: 'h' }, { doc: 'spec', by: 'h' }],
    gates: { ...stateAt('executing').gates, tests: { status: 'pass', last: { ok: true, exitCode: 0 } } },
  });
  const files = { 'task.md': true, 'concept.md': true, 'spec.md': true, 'plan.md': true };
  assert.equal(verifyChecklist({ state, files, currentBranch: 'dept/v1' }).ok, true);
  const noTests = { ...state, gates: { ...state.gates, tests: { status: 'pending' } } };
  assert.equal(verifyChecklist({ state: noTests, files, currentBranch: 'dept/v1' }).ok, false);
});

test('verify: несовпадение ветки — FAIL', () => {
  const report = verifyChecklist({ state: stateAt('analysis'), files: { 'task.md': true }, currentBranch: 'master' });
  assert.equal(report.ok, false);
});

test('formatReport: содержит PASS/FAIL и проверки', () => {
  const text = formatReport({ ok: true, checks: [{ id: 'x', ok: true, detail: 'd' }] });
  assert.match(text, /PASS/);
  assert.match(text, /OK   x/);
});

test('requiredArtifacts: стадии требуют свои документы', () => {
  assert.deepEqual(requiredArtifacts('concept'), ['task.md', 'analysis.md']);
  assert.deepEqual(requiredArtifacts('concept_review'), ['task.md', 'analysis.md', 'concept.md']);
  assert.deepEqual(requiredArtifacts('executing'), ['task.md', 'concept.md', 'spec.md', 'plan.md']);
});

test('missingArtifacts: перехват отсутствующего analysis.md', () => {
  assert.deepEqual(missingArtifacts('concept', { 'task.md': true }), ['analysis.md']);
  assert.deepEqual(missingArtifacts('concept', { 'task.md': true, 'analysis.md': true }), []);
});
