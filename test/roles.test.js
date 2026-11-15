import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_ROLES, isHumanApprover, resolveRole, roleOrder } from '../src/roles.js';

test('DEFAULT_ROLES: все роли конвейера определены', () => {
  for (const name of roleOrder()) {
    assert.ok(DEFAULT_ROLES[name], `нет роли ${name}`);
    assert.equal(typeof DEFAULT_ROLES[name].title, 'string');
  }
});

test('resolveRole: пользовательские переопределения применяются', () => {
  const role = resolveRole('coder', { coder: { model: 'fast', reasoning: 'low' } });
  assert.equal(role.model, 'fast');
  assert.equal(role.name, 'coder');
});

test('resolveRole: неизвестная роль — null', () => {
  assert.equal(resolveRole('designer'), null);
});

test('roleOrder: руководитель первый, архивариус последний', () => {
  const order = roleOrder();
  assert.equal(order[0], 'manager');
  assert.equal(order.at(-1), 'archivist');
});

test('isHumanApprover: роль отдела не может подписать утверждение', () => {
  assert.equal(isHumanApprover('manager'), false);
  assert.equal(isHumanApprover('reviewer'), false);
  assert.equal(isHumanApprover(''), false);
  assert.equal(isHumanApprover('vladimir'), true);
  assert.equal(isHumanApprover('Владимир'), true);
});
