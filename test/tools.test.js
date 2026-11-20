import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { registerTools } from '../src/tools.js';
import { runGit } from '../src/git.js';
import { readState, writeState } from '../src/store.js';
import { writeSettings } from '../src/settings.js';

async function tempRepo(t) {
  const root = await mkdtemp(join(tmpdir(), 'dept-tools-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await runGit(root, ['init', '-q']);
  await runGit(root, ['config', 'user.name', 'Tools Test']);
  await runGit(root, ['config', 'user.email', 'tools@test.local']);
  await runGit(root, ['commit', '--allow-empty', '-qm', 'init']);
  return root;
}

function collectTools() {
  const tools = new Map();
  const ctx = {
    tools: { register: (tool) => { tools.set(tool.name, tool); return () => {}; } },
    logger: { warn: () => {} },
  };
  registerTools(ctx, null);
  return tools;
}

test('dept_start + dept_commit: сквозной путь через инструменты', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  const started = await tools.get('dept_start').execute({ root, taskId: 't1', testCommand: 'true', branch: 'dept/t1' });
  assert.equal(started.stage, 'analysis');

  const committed = await tools.get('dept_commit').execute({ root, taskId: 't1', message: 'dept(t1): stage-1', tagName: 'stage-1' });
  assert.ok(committed.commit, 'коммит должен быть создан');
  assert.equal(committed.tag, 'stage-1');

  const log = await runGit(root, ['log', '--oneline', '-1']);
  assert.match(log.stdout, /dept\(t1\): stage-1/);
  const tags = await runGit(root, ['tag', '-l']);
  assert.match(tags.stdout, /stage-1/);
  const status = await runGit(root, ['status', '--porcelain']);
  assert.equal(status.stdout.trim(), '', 'дерево должно быть чистым после amend');
});

test('dept_gate tests: провал пишет failure.md и блокирует повтор без анализа', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  await tools.get('dept_start').execute({ root, taskId: 't2', testCommand: 'false', branch: 'dept/t2' });

  const failed = await tools.get('dept_gate').execute({ root, taskId: 't2', kind: 'tests' });
  assert.equal(failed.stage, 'analysis');
  assert.equal(failed.state.gates.tests.status, 'fail');

  const path = join(root, 'docs/department/t2/stages/01/failure.md');
  const failure = await readFile(path, 'utf8');
  assert.match(failure, /## Данные/);
  assert.match(failure, /## Анализ/);
  assert.match(failure, /## План/);

  await assert.rejects(
    () => tools.get('dept_gate').execute({ root, taskId: 't2', kind: 'tests' }),
    /retry blocked/,
  );
});

test('dept_art: пишет PNG с заданным масштабом', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  await tools.get('dept_start').execute({ root, taskId: 'art1', testCommand: 'true', branch: 'dept/art1' });
  const result = await tools.get('dept_art').execute({
    root, taskId: 'art1', path: 'assets/pixel.png',
    palette: { r: '#ff0000' },
    rows: ['rr', 'rr'],
    scale: 3,
  });
  assert.equal(result.width, 6);
  assert.equal(result.height, 6);
  const buffer = await readFile(join(root, 'assets/pixel.png'));
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
  assert.equal(buffer.readUInt32BE(16), 6);
  assert.equal(buffer.readUInt32BE(20), 6);
});

test('dept_modules: находит конфликты владения файлами', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  await tools.get('dept_start').execute({ root, taskId: 'mod1', testCommand: 'true', branch: 'dept/mod1' });
  const planned = await tools.get('dept_modules').execute({
    root, taskId: 'mod1',
    modules: [
      { id: 'a', files: ['src/x.js', 'src/shared.js'], owner: 'coder-1' },
      { id: 'b', files: ['src/y.js', 'src/shared.js'], owner: 'coder-2' },
    ],
  });
  assert.equal(planned.conflicts.length, 1);
  assert.equal(planned.conflicts[0].file, 'src/shared.js');
});

test('dept_bug: пишет файл багрепорта и фиксирует баг', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  await tools.get('dept_start').execute({ root, taskId: 'b1', testCommand: 'true', branch: 'dept/b1' });
  const result = await tools.get('dept_bug').execute({
    root, taskId: 'b1', title: 'карта не открывается', steps: 'нажать M', expected: 'карта', actual: 'ничего', severity: 'high',
  });
  assert.equal(result.id, 'bug-1');
  assert.equal(result.bugs.length, 1);
  const text = await readFile(join(root, 'docs/department/b1/bugs/bug-1.md'), 'utf8');
  assert.match(text, /карта не открывается/);
});

test('dept_worktree: создаёт, показывает и удаляет worktree', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  await tools.get('dept_start').execute({ root, taskId: 'w1', testCommand: 'true', branch: 'dept/w1' });
  const created = await tools.get('dept_worktree').execute({ root, taskId: 'w1', action: 'create', name: 'module-a' });
  assert.equal(created.worktrees.length, 1);
  assert.equal(created.worktrees[0].branch, 'dept/w1-module-a');
  const listed = await tools.get('dept_worktree').execute({ root, taskId: 'w1', action: 'list' });
  assert.equal(listed.worktrees.length, 1);
  const removed = await tools.get('dept_worktree').execute({ root, taskId: 'w1', action: 'remove', name: 'module-a' });
  assert.equal(removed.worktrees.length, 0);
});

test('dept_pause: блокирует гейты и снимается', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  await tools.get('dept_start').execute({ root, taskId: 'p1', testCommand: 'true', branch: 'dept/p1' });
  await tools.get('dept_pause').execute({ root, taskId: 'p1', paused: true, reason: 'выключение сервера', by: 'vladimir' });
  await assert.rejects(() => tools.get('dept_gate').execute({ root, taskId: 'p1', kind: 'tests' }), /паузе/);
  await tools.get('dept_pause').execute({ root, taskId: 'p1', paused: false, by: 'vladimir' });
  const gated = await tools.get('dept_gate').execute({ root, taskId: 'p1', kind: 'tests' });
  assert.equal(gated.state.gates.tests.status, 'pass');
});

test('dept_pause: руководитель не может снять паузу сам', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  await tools.get('dept_start').execute({ root, taskId: 'p2', testCommand: 'true', branch: 'dept/p2' });
  await tools.get('dept_pause').execute({ root, taskId: 'p2', paused: true, reason: 'человек', by: 'vladimir' });
  await assert.rejects(
    () => tools.get('dept_pause').execute({ root, taskId: 'p2', paused: false, by: 'manager' }),
    /только человек/,
  );
  await tools.get('dept_pause').execute({ root, taskId: 'p2', paused: false, by: 'vladimir' });
  const state = await readState(root, 'p2');
  assert.equal(state.paused.value, false);
});

test('dept_start release=true добавляет шаблон релиза в бриф', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  await tools.get('dept_start').execute({
    root, taskId: 'rel-1', testCommand: 'true', branch: 'dept/rel-1', release: true,
    title: 'Релиз 1.0.0', brief: 'Выпустить продукт.',
  });
  const task = await readFile(join(root, 'docs', 'department', 'rel-1', 'task.md'), 'utf8');
  assert.match(task, /Подготовка к релизу/);
  assert.match(task, /MANUAL-QA/);
});


test('dept_start блокируется, когда отдел выключен', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  await writeSettings({ enabled: false });
  t.after(() => writeSettings({ enabled: true }));
  await assert.rejects(
    () => tools.get('dept_start').execute({ root, taskId: 'off-1', testCommand: 'true', branch: 'dept/off-1' }),
    /выключен/,
  );
  await writeSettings({ enabled: true });
  const state = await tools.get('dept_start').execute({ root, taskId: 'off-2', testCommand: 'true', branch: 'dept/off-2' });
  assert.equal(state.state.stage, 'analysis');
});


test('dept_handover: собирает пакет и открывает путь к done', async (t) => {
  const root = await tempRepo(t);
  const tools = collectTools();
  await tools.get('dept_start').execute({ root, taskId: 'ship-1', testCommand: 'true', branch: 'dept/ship-1' });
  const dir = join(root, 'docs', 'department', 'ship-1');
  for (const name of ['analysis.md', 'discussion.md', 'spec.md', 'concept.md', 'plan.md']) {
    await (await import('node:fs/promises')).writeFile(join(dir, name), '# ' + name + '\n', 'utf8');
  }
  let state = await readState(root, 'ship-1');
  state = await writeState(root, { ...state, stage: 'release' });
  await assert.rejects(() => tools.get('dept_stage').execute({ root, taskId: 'ship-1', stage: 'done' }), /dept_handover/);
  const result = await tools.get('dept_handover').execute({ root, taskId: 'ship-1', version: '1.0.0', run: 'python3 -m http.server 8000' });
  assert.equal(result.version, '1.0.0');
  const task = await readFile(join(root, 'docs', 'department', 'ship-1', 'delivery', 'RUN.md'), 'utf8');
  assert.match(task, /http.server/);
  const done = await tools.get('dept_stage').execute({ root, taskId: 'ship-1', stage: 'done' });
  assert.equal(done.state.stage, 'done');
});

test('dept_health: не считает руководителя активной работой', async (t) => {
  const root = await tempRepo(t);
  const tools = new Map();
  const activity = {
    list: () => [{ sessionId: 'm1', kind: 'менеджер', busy: true }],
  };
  const ctx = {
    tools: { register: (tool) => { tools.set(tool.name, tool); return () => {}; } },
    logger: { warn: () => {} },
  };
  registerTools(ctx, activity);
  await tools.get('dept_start').execute({ root, taskId: 'h1', testCommand: 'true', branch: 'dept/h1' });
  const health = await tools.get('dept_health').execute({ root, taskId: 'h1' });
  assert.notEqual(health.verdict, 'working');
});
