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
    connection: { fetch: { register: () => () => {} } },
    workspaceRegistry: { list: () => [] },
    agents: { list: () => [] },
    get(service) {
      if (service === 'commands') return ctx.commands;
      if (service === 'connection') return ctx.connection;
      if (service === 'workspaceRegistry') return ctx.workspaceRegistry;
      if (service === 'agents') return ctx.agents;
      return undefined;
    },
    inject(_services, callback) {
      return callback(ctx);
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

test('apply: регистрирует двадцать шесть инструментов и команду', () => {
  const { ctx, registered } = fakeContext();
  apply(ctx, {});
  assert.deepEqual(
    registered.tools.map((tool) => tool.name).sort(),
    ['dept_start', 'dept_status', 'dept_approve', 'dept_gate', 'dept_stage', 'dept_commit', 'dept_verify', 'dept_amend', 'dept_ask', 'dept_answer', 'dept_report', 'dept_roles', 'dept_health', 'dept_modules', 'dept_art', 'dept_section', 'dept_ideas', 'dept_critique', 'dept_bug', 'dept_browse', 'dept_gui', 'dept_worktree', 'dept_propose', 'dept_memo', 'dept_review', 'dept_rework'].sort(),
  );
  assert.equal(registered.commands.length, 1);
  assert.equal(registered.commands[0].name, 'dept');
});

test('plugin: имя и обязательный сервис', () => {
  assert.equal(name, 'department');
  assert.deepEqual(inject, ['tools', 'commands', 'workspaceRegistry', 'agents']);
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
