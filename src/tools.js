/**
 * Инструменты модели `dept_*`: запуск задачи, статус, утверждение, гейты, фиксация.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  appendEvent,
  approveDocument,
  createState,
  readState,
  recordReview,
  recordTestGate,
  summarize,
  taskDir,
  writeState,
} from './store.js';
import { ensureBranch, commitAll, isRepo, push, tag } from './git.js';
import { runTestGate } from './gates.js';

function requireString(args, key) {
  const value = args?.[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`invalid arguments: "${key}" must be a non-empty string`);
  }
  return value.trim();
}

function text(value) {
  return [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }];
}

function summaryOutput(state) {
  return { stage: state.stage, summary: summarize(state), state };
}

/**
 * Регистрирует инструменты отдела.
 *
 * @param {object} ctx Контекст плагина.
 * @returns {Array<() => void>} Диспозеры.
 */
export function registerTools(ctx) {
  if (!ctx.tools || typeof ctx.tools.register !== 'function') return [];
  const disposers = [];
  disposers.push(ctx.tools.register(startTool()));
  disposers.push(ctx.tools.register(statusTool()));
  disposers.push(ctx.tools.register(approveTool()));
  disposers.push(ctx.tools.register(gateTool()));
  disposers.push(ctx.tools.register(commitTool()));
  return disposers;
}

function startTool() {
  return {
    name: 'dept_start',
    description:
      'Создать задачу ИИ-отдела в репозитории: состояние в docs/department/<taskId>/state.json, ветка задачи, черновик task.md. Используй перед стадией анализа.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Абсолютный путь к корню проекта.', required: true },
        taskId: { type: 'string', description: 'Идентификатор задачи, например game-01.', required: true },
        title: { type: 'string', description: 'Человеческое название задачи.' },
        brief: { type: 'string', description: 'Текст брифа задачи (попадёт в task.md).' },
        testCommand: { type: 'string', description: 'Команда гейта тестов, например "npm test".' },
        branch: { type: 'string', description: 'Ветка задачи (по умолчанию dept/<taskId>).' },
        origin: { type: 'string', description: 'Имя remote для push (по умолчанию origin).' },
        maxAttempts: { type: 'integer', description: 'Максимум попыток на этап (по умолчанию 4).' },
        budgetTokens: { type: 'integer', description: 'Лимит токенов на задачу (по умолчанию 60000).' },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: { stage: { type: 'string' }, summary: { type: 'string' }, state: { type: 'object' } },
        required: ['stage', 'summary', 'state'],
      },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      if (!(await isRepo(root))) throw new Error(`not a git repository: ${root}`);
      const existing = await readState(root, taskId);
      if (existing) throw new Error(`task already exists: ${taskId}`);

      let state = createState({
        root,
        taskId,
        title: args?.title,
        branch: args?.branch,
        origin: args?.origin ?? null,
        testCommand: args?.testCommand ?? null,
        maxAttempts: args?.maxAttempts,
        budgetTokens: args?.budgetTokens,
      });
      const branch = await ensureBranch(root, state.branch);
      if (!branch.ok) throw new Error(`cannot create branch ${state.branch}: ${branch.error ?? ''}`);
      state = appendEvent(state, { actor: 'manager', action: 'branch_ready', detail: branch.branch });

      await mkdir(taskDir(root, taskId), { recursive: true });
      if (typeof args?.brief === 'string' && args.brief.trim() !== '') {
        await writeFile(join(taskDir(root, taskId), 'task.md'), `${args.brief.trim()}\n`, 'utf8');
      }
      state = await writeState(root, state);
      return summaryOutput(state);
    },
  };
}

function statusTool() {
  return {
    name: 'dept_status',
    description: 'Показать состояние задачи ИИ-отдела: стадия, гейты, попытки, бюджет, последние события.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.', required: true },
        taskId: { type: 'string', description: 'Идентификатор задачи.', required: true },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: { stage: { type: 'string' }, summary: { type: 'string' }, state: { type: 'object' } },
        required: ['stage', 'summary', 'state'],
      },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      return summaryOutput(state);
    },
  };
}

function approveTool() {
  return {
    name: 'dept_approve',
    description:
      'Зафиксировать утверждение человека: concept переводит задачу в spec, spec — в executing. Вызывай только по явному подтверждению человека.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.', required: true },
        taskId: { type: 'string', description: 'Идентификатор задачи.', required: true },
        doc: { type: 'string', enum: ['concept', 'spec'], description: 'Какой документ утверждается.', required: true },
        by: { type: 'string', description: 'Кто утвердил (человек/идентификатор).', required: true },
        via: { type: 'string', description: 'Канал утверждения (chat, page).' },
      },
      required: ['root', 'taskId', 'doc', 'by'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: { stage: { type: 'string' }, summary: { type: 'string' }, state: { type: 'object' } },
        required: ['stage', 'summary', 'state'],
      },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const doc = requireString(args, 'doc');
      const by = requireString(args, 'by');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const next = await writeState(root, approveDocument(state, { doc, by, via: args?.via }));
      return summaryOutput(next);
    },
  };
}

function gateTool() {
  return {
    name: 'dept_gate',
    description:
      'Записать результат гейта. kind=tests запускает testCommand задачи и фиксирует exit code; kind=review записывает вердикт независимого ревьюера.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.', required: true },
        taskId: { type: 'string', description: 'Идентификатор задачи.', required: true },
        kind: { type: 'string', enum: ['tests', 'review'], description: 'Тип гейта.', required: true },
        pass: { type: 'boolean', description: 'Вердикт для kind=review (true=PASS).' },
        summary: { type: 'string', description: 'Краткий итог ревью/тестов.' },
      },
      required: ['root', 'taskId', 'kind'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: { stage: { type: 'string' }, summary: { type: 'string' }, state: { type: 'object' } },
        required: ['stage', 'summary', 'state'],
      },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const kind = requireString(args, 'kind');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);

      let next;
      if (kind === 'tests') {
        const result = await runTestGate(root, state.testCommand);
        next = recordTestGate(state, result);
      } else if (kind === 'review') {
        next = recordReview(state, { pass: Boolean(args?.pass), summary: args?.summary ?? '' });
      } else {
        throw new Error(`unknown gate kind: ${kind}`);
      }
      next = await writeState(root, next);
      return summaryOutput(next);
    },
  };
}

function commitTool() {
  return {
    name: 'dept_commit',
    description: 'Зафиксировать этап: git add -A, коммит, необязательный тег и push ветки задачи.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.', required: true },
        taskId: { type: 'string', description: 'Идентификатор задачи.', required: true },
        message: { type: 'string', description: 'Сообщение коммита.', required: true },
        tagName: { type: 'string', description: 'Имя тега, например stage-1.' },
        remote: { type: 'string', description: 'Remote для push (по умолчанию origin).' },
      },
      required: ['root', 'taskId', 'message'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: { commit: { type: 'string' }, tag: { type: 'string' }, pushed: { type: 'boolean' }, summary: { type: 'string' } },
        required: ['commit', 'pushed', 'summary'],
      },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);

      const committed = await commitAll(root, requireString(args, 'message'));
      if (!committed.ok) throw new Error(`commit failed: ${committed.error ?? ''}`);
      let tagResult = { ok: true };
      if (typeof args?.tagName === 'string' && args.tagName.trim() !== '') {
        tagResult = await tag(root, args.tagName.trim());
      }
      const remote = args?.remote ?? state.origin ?? 'origin';
      const pushed = await push(root, remote, state.branch);
      const next = await writeState(
        root,
        appendEvent(state, {
          actor: 'archivist',
          action: 'commit_pushed',
          detail: `${committed.commit ?? '?'} ${pushed.ok ? 'pushed' : 'push-failed'}`,
        }),
      );

      return {
        commit: committed.commit ?? '',
        tag: tagResult.ok ? String(args?.tagName ?? '') : '',
        pushed: pushed.ok,
        summary: `${summarize(next)} · commit=${committed.commit ?? '?'} push=${pushed.ok ? 'ok' : 'failed'}`,
      };
    },
  };
}
