import assert from 'node:assert/strict';
import test from 'node:test';
import { progressOf, taskSummary } from '../src/panel-api.js';
import { createState } from '../src/store.js';

test('progressOf: стадии дают монотонный прогресс', () => {
  assert.equal(progressOf('analysis'), 0);
  assert.equal(progressOf('done'), 100);
  assert.ok(progressOf('spec_review') > progressOf('concept'));
  assert.equal(progressOf('blocked'), 0);
  assert.equal(progressOf('unknown'), 0);
});

test('taskSummary: собирает карточку из состояния', () => {
  const state = { ...createState({ root: '/tmp/p', taskId: 't1' }), stage: 'executing' };
  const card = taskSummary('/tmp/p', 't1', state);
  assert.equal(card.taskId, 't1');
  assert.equal(card.stage, 'executing');
  assert.equal(card.tests, 'pending');
  assert.ok(card.progress > 0);
  assert.equal(card.lastEvent.action, 'task_created');
});
