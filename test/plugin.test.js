import assert from 'node:assert/strict';
import test from 'node:test';
import { apply, inject, name } from '../index.js';

function fakeContext() {
  const registered = { tools: [], commands: [] };
  const ctx = {
    tools: {
      register(tool) {
        registered.tools.push(tool);
        return () => {};
      },
    },
    commands: {
      register(command) {
        registered.commands.push(command);
        return () => {};
      },
    },
    get(service) {
      return service === 'commands' ? ctx.commands : undefined;
    },
    effect(callback) {
      const disposer = callback();
      // Cordis требует функцию-диспозер: именно на массиве плагин падал при загрузке.
      assert.equal(typeof disposer, 'function', 'effect callback must return a disposer function');
      return disposer;
    },
  };
  return { ctx, registered };
}

test('apply: регистрирует семь инструментов и команду', () => {
  const { ctx, registered } = fakeContext();
  apply(ctx, {});
  assert.deepEqual(
    registered.tools.map((tool) => tool.name).sort(),
    ['dept_start', 'dept_status', 'dept_approve', 'dept_gate', 'dept_stage', 'dept_commit', 'dept_verify'].sort(),
  );
  assert.equal(registered.commands.length, 1);
  assert.equal(registered.commands[0].name, 'dept');
});

test('plugin: имя и обязательный сервис', () => {
  assert.equal(name, 'department');
  assert.deepEqual(inject, ['tools', 'commands']);
});

test('инструменты: схемы параметров валидны по форме', () => {
  const { ctx, registered } = fakeContext();
  apply(ctx, {});
  for (const tool of registered.tools) {
    assert.equal(tool.parameters.type, 'object');
    assert.ok(tool.parameters.properties, `${tool.name}: нет properties`);
    assert.ok(Array.isArray(tool.parameters.required), `${tool.name}: required должен быть массивом`);
    for (const [key, value] of Object.entries(tool.parameters.properties)) {
      assert.notEqual(value.required, true, `${tool.name}.${key}: required не должен быть boolean`);
    }
    assert.equal(tool.output.schema.additionalProperties, false, `${tool.name}: additionalProperties`);
  }
});
