/**
 * Инструменты модели `dept_*`: запуск задачи, статус, утверждение, гейты, фиксация.
 */
import { access, copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  addQuestion,
  isPaused,
  setPaused,
  setBudget,
  addCorrection,
  updateCorrection,
  addMemo,
  addRework,
  reviewMemo,
  advanceStage,
  amendDocument,
  answerQuestion,
  closeTask,
  isRepeatedFailure,
  listQuestions,
  addBug,
  addIdeas,
  addSection,
  critiqueIdea,
  listRoles,
  moduleConflicts,
  resetGatesForNextStage,
  appendEvent,
  approveDocument,
  createState,
  readState,
  recordReview,
  setModules,
  addWorktreeRecord,
  removeWorktreeRecord,
  setRole,
  recordTestGate,
  summarize,
  taskDir,
  writeState,
} from './store.js';
import { addWorktree, amendCommit, currentBranch, ensureBranch, commitAll, isRepo, listWorktrees, push, removeWorktree, runGit, tag } from './git.js';
import { isHumanApprover } from './roles.js';
import { runTestGate } from './gates.js';
import { encodePng } from './png.js';
import { runBrowse } from './browse.js';
import { runNative, runScreenshotCommand } from './gui.js';
import { pixelize } from './pixelize.js';
import { composeImage } from './compose.js';
import { assertRetryReady, failurePath, hasSection, writeFailureData } from './attempts.js';
import { formatReport, missingArtifacts, verifyChecklist } from './verify.js';

async function collectArtifacts(root, taskId) {
  const names = ['task.md', 'analysis.md', 'concept.md', 'spec.md', 'plan.md'];
  const files = {};
  for (const name of names) {
    try {
      await access(join(taskDir(root, taskId), name));
      files[name] = true;
    } catch {
      files[name] = false;
    }
  }
  return files;
}

function assertActive(state, action) {
  if (isPaused(state)) {
    throw new Error(`отдел на паузе (${state.paused?.reason || 'без причины'}); ${action} заблокировано — сними паузу dept_pause`);
  }
}

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
export function registerTools(ctx, activity) {
  if (!ctx.tools || typeof ctx.tools.register !== 'function') return [];
  const disposers = [];
  disposers.push(ctx.tools.register(startTool()));
  disposers.push(ctx.tools.register(statusTool()));
  disposers.push(ctx.tools.register(approveTool()));
  disposers.push(ctx.tools.register(gateTool()));
  disposers.push(ctx.tools.register(stageTool()));
  disposers.push(ctx.tools.register(verifyTool()));
  disposers.push(ctx.tools.register(amendTool()));
  disposers.push(ctx.tools.register(askTool()));
  disposers.push(ctx.tools.register(answerTool()));
  disposers.push(ctx.tools.register(reportTool(activity)));
  disposers.push(ctx.tools.register(rolesTool()));
  disposers.push(ctx.tools.register(healthTool(activity)));
  disposers.push(ctx.tools.register(modulesTool()));
  disposers.push(ctx.tools.register(artTool()));
  disposers.push(ctx.tools.register(pixelizeTool()));
  disposers.push(ctx.tools.register(composeTool()));
  disposers.push(ctx.tools.register(correctionTool()));
  disposers.push(ctx.tools.register(budgetTool()));
  disposers.push(ctx.tools.register(pauseTool()));
  disposers.push(ctx.tools.register(sectionTool()));
  disposers.push(ctx.tools.register(ideasTool()));
  disposers.push(ctx.tools.register(critiqueTool()));
  disposers.push(ctx.tools.register(bugTool()));
  disposers.push(ctx.tools.register(browseTool()));
  disposers.push(ctx.tools.register(guiTool()));
  disposers.push(ctx.tools.register(worktreeTool()));
  disposers.push(ctx.tools.register(proposeTool()));
  disposers.push(ctx.tools.register(memoTool()));
  disposers.push(ctx.tools.register(reviewMemoTool()));
  disposers.push(ctx.tools.register(reworkTool()));
  disposers.push(ctx.tools.register(commitTool(activity)));
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
        root: { type: 'string', description: 'Абсолютный путь к корню проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи, например game-01.' },
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
        additionalProperties: false,
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
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
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
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        doc: { type: 'string', enum: ['concept', 'spec'], description: 'Какой документ утверждается.' },
        by: { type: 'string', description: 'Кто утвердил (человек/идентификатор).' },
        via: { type: 'string', description: 'Канал утверждения (chat, page).' },
      },
      required: ['root', 'taskId', 'doc', 'by'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
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
      if (!isHumanApprover(by)) {
        throw new Error('approval must name the human approver, not a department role');
      }
      const docFile = doc === 'concept' ? 'concept.md' : 'spec.md';
      try {
        await access(join(taskDir(root, taskId), docFile));
      } catch {
        throw new Error(`cannot approve ${doc}: ${docFile} is missing`);
      }
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
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        kind: { type: 'string', enum: ['tests', 'review'], description: 'Тип гейта.' },
        pass: { type: 'boolean', description: 'Вердикт для kind=review (true=PASS).' },
        summary: { type: 'string', description: 'Краткий итог ревью/тестов.' },
      },
      required: ['root', 'taskId', 'kind'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
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
      assertActive(state, 'гейт');

      let next;
      const stageNo = (state.stageIndex ?? 0) + 1;
      if (kind === 'tests') {
        if (state.gates?.tests?.status === 'fail') {
          await assertRetryReady(root, taskId, stageNo);
        }
        const result = await runTestGate(root, state.testCommand);
        next = recordTestGate(state, result);
        if (!result.ok) {
          await writeFailureData(root, taskId, stageNo, result.summary ?? '');
          if (isRepeatedFailure(next, 'tests')) {
            next = closeTask(next, 'blocked', 'повторяющийся провал тестов: нужна смена подхода');
            next = addQuestion(next, {
              text: 'Повторяющийся провал тестов: сменить подход или принять ограничение?',
              context: String(result.summary ?? '').slice(0, 500),
            }).state;
          }
        }
      } else if (kind === 'review') {
        next = recordReview(state, { pass: Boolean(args?.pass), summary: args?.summary ?? '' });
        if (!args?.pass && isRepeatedFailure(next, 'review')) {
          next = closeTask(next, 'blocked', 'повторяющийся провал ревью: нужна смена подхода');
          next = addQuestion(next, {
            text: 'Ревьюер повторно нашёл то же: сменить подход или принять ограничение?',
            context: String(args?.summary ?? '').slice(0, 500),
          }).state;
        }
      } else {
        throw new Error(`unknown gate kind: ${kind}`);
      }
      next = await writeState(root, next);
      return summaryOutput(next);
    },
  };
}

function commitTool(activity) {
  return {
    name: 'dept_commit',
    description: 'Зафиксировать этап: git add -A, коммит, необязательный тег и push ветки задачи.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        message: { type: 'string', description: 'Сообщение коммита.' },
        tagName: { type: 'string', description: 'Имя тега, например stage-1.' },
        remote: { type: 'string', description: 'Remote для push (по умолчанию origin).' },
      },
      required: ['root', 'taskId', 'message'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
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
      assertActive(state, 'коммит');
      if (state.stage === 'blocked') {
        throw new Error('commit blocked: этап заблокирован (повторяющийся провал); нужно решение человека');
      }
      if (state.stage === 'executing') {
        const blockers = [];
        if (state.gates?.tests?.status !== 'pass') blockers.push('тесты не пройдены');
        if (state.gates?.review?.status !== 'pass') blockers.push('ревью не пройдено');
        const stageNo = String((state.stageIndex ?? 0) + 1).padStart(2, '0');
        for (const name of ['review.md', 'report.md']) {
          try {
            await access(join(taskDir(root, taskId), 'stages', stageNo, name));
          } catch {
            blockers.push('нет stages/' + stageNo + '/' + name);
          }
        }
        if (blockers.length > 0) throw new Error('commit blocked: ' + blockers.join('; '));
      }

      const committed = await commitAll(root, requireString(args, 'message'));
      if (!committed.ok) throw new Error(`commit failed: ${committed.error ?? ''}`);
      const preAgents = activity ? activity.list([root]) : [];
      const preTokens = preAgents.reduce((sum, agent) => sum + (agent.usage?.inputTokens ?? 0) + (agent.usage?.outputTokens ?? 0), 0);
      const limitTokens = Number(state.gates?.budget?.limitTokens ?? 0);
      if (limitTokens > 0 && preTokens > limitTokens && state.gates?.budget?.override !== true) {
        throw new Error(`commit blocked: бюджет превышен (${preTokens}/${limitTokens}); нужно решение человека или поднять лимит`);
      }
      const agents = activity ? activity.list([root]) : [];
      const usage = agents.reduce((sum, agent) => ({
        inputTokens: sum.inputTokens + (agent.usage?.inputTokens ?? 0),
        outputTokens: sum.outputTokens + (agent.usage?.outputTokens ?? 0),
        cacheReadTokens: sum.cacheReadTokens + (agent.usage?.cacheReadTokens ?? 0),
        cacheWriteTokens: sum.cacheWriteTokens + (agent.usage?.cacheWriteTokens ?? 0),
        calls: sum.calls + (agent.usage?.calls ?? 0),
      }), { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, calls: 0 });
      const budget = state.gates?.budget ?? {};
      const prices = budget.prices ?? { inputTokens: 0.27, outputTokens: 1.1, cacheReadTokens: 0.07, cacheWriteTokens: 0.27 };
      const costUSD = (usage.inputTokens / 1e6) * prices.inputTokens
        + (usage.outputTokens / 1e6) * prices.outputTokens
        + (usage.cacheReadTokens / 1e6) * prices.cacheReadTokens
        + (usage.cacheWriteTokens / 1e6) * prices.cacheWriteTokens;
      const withBudget = {
        ...state,
        gates: {
          ...state.gates,
          budget: {
            ...budget,
            usedTokens: usage.inputTokens + usage.outputTokens,
            usage,
            costUSD,
            updatedAt: new Date().toISOString(),
            history: [...(budget.history ?? []), { stage: (state.stageIndex ?? 0) + 1, tokens: usage.inputTokens + usage.outputTokens, costUSD, ts: new Date().toISOString() }].slice(-20),
          },
        },
      };
      // Событие о коммите должно войти в тот же коммит, иначе дерево остаётся грязным.
      const nextState = await writeState(
        root,
        resetGatesForNextStage(
          appendEvent(withBudget, {
            actor: 'archivist',
            action: 'commit_pushed',
            detail: 'stage committed, state amended',
          }),
        ),
      );
      const amended = await amendCommit(root);
      const finalCommit = await runGit(root, ['rev-parse', '--short', 'HEAD']);
      const commitHash = finalCommit.code === 0 ? finalCommit.stdout.trim() : committed.commit;

      let tagResult = { ok: true };
      if (typeof args?.tagName === 'string' && args.tagName.trim() !== '') {
        tagResult = await tag(root, args.tagName.trim());
      }
      const remote = args?.remote ?? state.origin ?? 'origin';
      const pushed = await push(root, remote, state.branch, { tags: Boolean(args?.tagName) });

      return {
        commit: commitHash ?? '',
        tag: tagResult.ok ? String(args?.tagName ?? '') : '',
        pushed: pushed.ok,
        summary: `${summarize(nextState)} · commit=${commitHash ?? '?'} push=${pushed.ok ? 'ok' : 'failed'} amend=${amended.amended}`,
      };
    },
  };
}

function stageTool() {
  return {
    name: 'dept_stage',
    description: 'Перевести задачу на следующую стадию (analysis → concept → concept_review; spec → spec_review). Утверждения concept→spec и spec→executing делаются только через dept_approve.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        stage: { type: 'string', enum: ['analysis', 'concept', 'concept_review', 'spec', 'spec_review', 'executing', 'done', 'blocked'], description: 'Целевая стадия.' },
        reason: { type: 'string', description: 'Причина перехода.' },
      },
      required: ['root', 'taskId', 'stage'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { stage: { type: 'string' }, summary: { type: 'string' }, state: { type: 'object' } },
        required: ['stage', 'summary', 'state'],
      },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const target = requireString(args, 'stage');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      assertActive(state, 'переход стадии');

      // Переход разрешён только когда артефакты целевой стадии на месте.
      const files = await collectArtifacts(root, taskId);
      const missing = missingArtifacts(target, files);
      if (missing.length > 0) {
        throw new Error(`cannot move to ${target}: missing artifacts: ${missing.join(', ')}`);
      }

      const next = await writeState(root, advanceStage(state, target, args?.reason ?? ''));
      return summaryOutput(next);
    },
  };
}

function verifyTool() {
  return {
    name: 'dept_verify',
    description: 'Аудит задачи отдела: состояние ↔ артефакты ↔ git. Возвращает PASS/FAIL и список проверок. Используй перед коммитом этапа и для проверки, что процесс шёл через инструменты dept_*.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { ok: { type: 'boolean' }, summary: { type: 'string' }, checks: { type: 'array', items: { type: 'object' } } },
        required: ['ok', 'summary', 'checks'],
      },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);

      const names = ['task.md', 'analysis.md', 'concept.md', 'spec.md', 'plan.md'];
      const files = {};
      for (const name of names) {
        try {
          await access(join(taskDir(root, taskId), name));
          files[name] = true;
        } catch {
          files[name] = false;
        }
      }
      try {
        await access(join(root, 'README.md'));
        files['README.md'] = true;
      } catch {
        files['README.md'] = false;
      }
      const stageNo = String((state.stageIndex ?? 0) + 1).padStart(2, '0');
      for (const name of ['review.md', 'report.md']) {
        try {
          await access(join(taskDir(root, taskId), 'stages', stageNo, name));
          files['stage:' + name.replace('.md', '')] = true;
        } catch {
          files['stage:' + name.replace('.md', '')] = false;
        }
      }
      const branch = await currentBranch(root);
      const report = verifyChecklist({ state, files, currentBranch: branch });
      return { ok: report.ok, summary: formatReport(report), checks: report.checks };
    },
  };
}

function amendTool() {
  return {
    name: 'dept_amend',
    description: 'Зафиксировать поправку к утверждённому документу (концепция/ТЗ/план) с подписью человека. Используй, когда требование противоречит фактам и его нужно заменить; решает человек.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        doc: { type: 'string', enum: ['concept', 'spec', 'plan'], description: 'Какой документ меняется.' },
        summary: { type: 'string', description: 'Что именно меняется, одной строкой.' },
        reason: { type: 'string', description: 'Почему: данные ревью или измерение.' },
        by: { type: 'string', description: 'Кто подписал: имя человека или manager для автономной поправки.' },
        autonomous: { type: 'boolean', description: 'true — руководитель решает тактический вопрос сам, по политике автономии.' },
      },
      required: ['root', 'taskId', 'doc', 'summary', 'by'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { stage: { type: 'string' }, summary: { type: 'string' }, state: { type: 'object' } },
        required: ['stage', 'summary', 'state'],
      },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const by = requireString(args, 'by');
      const autonomous = Boolean(args?.autonomous);
      if (!autonomous && !isHumanApprover(by)) {
        throw new Error('amendment must be signed by the human, or use autonomous=true for a tactical decision');
      }
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      assertActive(state, 'поправка');
      const next = await writeState(root, amendDocument(state, {
        doc: requireString(args, 'doc'),
        summary: requireString(args, 'summary'),
        reason: args?.reason ?? '',
        by,
        autonomous,
      }));
      return summaryOutput(next);
    },
  };
}

function askTool() {
  return {
    name: 'dept_ask',
    description: 'Записать вопрос к человеку, не останавливая работу: отдел решает сам, но вопрос копится и будет выдан, когда человек спросит статус. Не блокирует этап.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        text: { type: 'string', description: 'Вопрос одной строкой.' },
        options: { type: 'array', items: { type: 'string' }, description: 'Варианты ответа.' },
        recommended: { type: 'string', description: 'Что отдел выбрал сам, пока ждёт ответа.' },
        context: { type: 'string', description: 'Почему вопрос возник, какие данные.' },
      },
      required: ['root', 'taskId', 'text'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { stage: { type: 'string' }, summary: { type: 'string' }, state: { type: 'object' } }, required: ['stage', 'summary', 'state'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const { state: next, question } = addQuestion(state, {
        text: requireString(args, 'text'),
        options: args?.options,
        recommended: args?.recommended,
        context: args?.context,
      });
      const saved = await writeState(root, next);
      return { ...summaryOutput(saved), summary: `${summarize(saved)} · вопрос ${question.id} записан` };
    },
  };
}

function answerTool() {
  return {
    name: 'dept_answer',
    description: 'Ответ человека на накопленный вопрос отдела. После ответа руководитель может добавить задачи на доработку.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        questionId: { type: 'string', description: 'Идентификатор вопроса.' },
        answer: { type: 'string', description: 'Ответ человека.' },
        by: { type: 'string', description: 'Кто ответил (имя человека).' },
      },
      required: ['root', 'taskId', 'questionId', 'answer', 'by'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { stage: { type: 'string' }, summary: { type: 'string' }, state: { type: 'object' } }, required: ['stage', 'summary', 'state'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const by = requireString(args, 'by');
      if (!isHumanApprover(by)) throw new Error('answer must be signed by the human');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const next = await writeState(root, answerQuestion(state, {
        id: requireString(args, 'questionId'),
        answer: requireString(args, 'answer'),
        by,
      }));
      return summaryOutput(next);
    },
  };
}

function reportTool(activity) {
  return {
    name: 'dept_report',
    description: 'Отчёт о состоянии отдела для человека: что за задача, этап, гейты, кто из сотрудников занят и чем, открытые вопросы. Используй, когда человек спрашивает «как дела».',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { report: { type: 'string' }, openQuestions: { type: 'integer' } }, required: ['report', 'openQuestions'] },
      render: (_args, value) => text(value.report),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const open = listQuestions(state, { status: 'open' });
      const agents = activity ? activity.list([root]) : [];
      const lines = [
        `Задача: ${state.title} (${state.taskId})`,
        `Этап: ${state.stage} · ветка ${state.branch} · попытки ${state.attempts?.current ?? 0}/${state.attempts?.max ?? 0}`,
        `Гейты: тесты ${state.gates?.tests?.status ?? 'pending'}, ревью ${state.gates?.review?.status ?? 'pending'}`,
        `Бюджет: ${state.gates?.budget?.usedTokens ?? 0}/${state.gates?.budget?.limitTokens ?? 0}`,
      ];
      if (agents.length > 0) {
        lines.push('Сотрудники:');
        for (const agent of agents) {
          lines.push(`  - ${agent.kind}: ${agent.busy ? 'работает' : 'ждёт'} · ${agent.lastAction}${agent.tool ? ' · ' + agent.tool : ''}`);
        }
      } else {
        lines.push('Сотрудники: активных сессий нет');
      }
      lines.push(`Открытые вопросы: ${open.length}`);
      for (const question of open) {
        lines.push(`  - ${question.id}: ${question.text}${question.recommended ? ' (отдел выбрал: ' + question.recommended + ')' : ''}`);
      }
      const last = (state.events ?? []).slice(-3).map((event) => `  - ${event.ts} ${event.action}`);
      if (last.length) lines.push('Последние события:', ...last);
      return { report: lines.join('\n'), openQuestions: open.length };
    },
  };
}

function rolesTool() {
  return {
    name: 'dept_roles',
    description: 'Список ролей отдела и настройка модели/reasoning для роли. Используй перед делегированием, чтобы взять model из настроек.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        role: { type: 'string', description: 'Имя роли (coder, reviewer, ...). Пусто — только показать.' },
        model: { type: 'string', description: 'Модель для роли (пусто — по умолчанию).' },
        reasoning: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Уровень reasoning.' },
        enabled: { type: 'boolean', description: 'Включена ли роль (нельзя выключить manager/coder/tester).' },
        maxInstances: { type: 'integer', description: 'Сколько экземпляров роли можно запускать одновременно (1–10).' },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { roles: { type: 'array', items: { type: 'object' } }, summary: { type: 'string' } }, required: ['roles', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      let state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      if (typeof args?.role === 'string' && args.role.trim() !== '') {
        state = await writeState(root, setRole(state, {
          role: args.role.trim(),
          model: args?.model,
          reasoning: args?.reasoning,
          enabled: args?.enabled,
          maxInstances: args?.maxInstances,
        }));
      }
      const roles = listRoles(state);
      return { roles, summary: roles.map((role) => `${role.name}: ${role.enabled ? 'on' : 'OFF'} x${role.maxInstances} ${role.model ?? 'default'}/${role.reasoning ?? 'default'}`).join(' · ') };
    },
  };
}

function healthTool(activity) {
  return {
    name: 'dept_health',
    description: 'Проверка «жив ли отдел»: работает, стоит, ждёт человека, готов к коммиту. Возвращает вердикт и рекомендованное действие. Вызывай регулярно, чтобы не стоять без дела.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { verdict: { type: 'string' }, recommended: { type: 'string' }, summary: { type: 'string' } }, required: ['verdict', 'recommended', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const agents = activity ? activity.list([root]) : [];
      const busy = agents.filter((agent) => agent.busy).length;
      const open = listQuestions(state, { status: 'open' });
      const events = state.events ?? [];
      const last = events.at(-1);
      const ageMinutes = last ? Math.round((Date.now() - Date.parse(last.ts)) / 60000) : 999;
      const stage = state.stage;
      const gatesPass = state.gates?.tests?.status === 'pass' && state.gates?.review?.status === 'pass';
      let verdict = 'idle';
      if (stage === 'done') verdict = 'done';
      else if (stage === 'blocked') verdict = 'blocked';
      else if (busy > 0) verdict = 'working';
      else if (open.length > 0 && ageMinutes >= 10) verdict = 'waiting_human';
      else if (stage === 'executing' && gatesPass) verdict = 'ready_to_commit';
      else if (ageMinutes >= 15) verdict = 'stalled';
      const recommended = {
        done: 'задача завершена; начни следующую через dept_start',
        blocked: 'нужно решение человека: задай вопрос dept_ask и жди ответа',
        working: 'работа идёт: не создавай дублирующих задач, дождись результата',
        waiting_human: 'ответов нет: реши тактически сам по политике, вопрос оставь открытым, продолжай',
        ready_to_commit: 'гейты зелёные: dept_verify → dept_commit с тегом этапа',
        stalled: 'нет активности: продолжи следующий шаг по plan.md; если нужны данные — researcher, дизайн — designer, изображения — artist; модули можно распараллелить через dept_modules',
        idle: 'сделай следующий шаг по плану и зафиксируй событие',
      }[verdict];
      const summary = `health: ${verdict} · активных: ${busy} · вопросов: ${open.length} · простоя: ${ageMinutes} мин\nРекомендация: ${recommended}`;
      return { verdict, recommended, summary };
    },
  };
}

function modulesTool() {
  return {
    name: 'dept_modules',
    description: 'План модулей для параллельной работы: кто владеет какими файлами. Проверяет конфликты. Используй, чтобы разделить этап на независимые модули и запустить нескольких кодеров.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        modules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              files: { type: 'array', items: { type: 'string' } },
              owner: { type: 'string' },
              status: { type: 'string' },
            },
            required: ['id'],
          },
          description: 'Модули: id, files, owner. Если не передан — только показать текущий план.',
        },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { modules: { type: 'array', items: { type: 'object' } }, conflicts: { type: 'array', items: { type: 'object' } }, summary: { type: 'string' } }, required: ['modules', 'conflicts', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      let state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      if (Array.isArray(args?.modules)) {
        state = await writeState(root, setModules(state, args.modules));
      }
      const modules = state.modules ?? [];
      const conflicts = moduleConflicts(modules);
      const lines = modules.map((module) => `${module.id}: ${module.files.length} файлов, владелец ${module.owner ?? '—'}`);
      if (conflicts.length > 0) lines.push('КОНФЛИКТЫ: ' + conflicts.map((item) => item.file + ' (' + item.modules.join(', ') + ')').join('; '));
      return { modules, conflicts, summary: lines.join('\n') || 'модули не заданы' };
    },
  };
}

function artTool() {
  return {
    name: 'dept_art',
    description: 'Нарисовать пиксельный спрайт и сохранить PNG. rows — строки, palette — цвет на символ (#rrggbb или #rrggbbaa, точка — прозрачность).',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        path: { type: 'string', description: 'Путь PNG относительно корня, например assets/ship.png.' },
        palette: { type: 'object', additionalProperties: { type: 'string' }, description: 'Цвета: символ → #rrggbb.' },
        rows: { type: 'array', items: { type: 'string' }, description: 'Строки пикселей.' },
        scale: { type: 'integer', description: 'Масштаб (1–16).' },
      },
      required: ['root', 'taskId', 'path', 'palette', 'rows'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { path: { type: 'string' }, width: { type: 'integer' }, height: { type: 'integer' }, summary: { type: 'string' } }, required: ['path', 'width', 'height', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      requireString(args, 'taskId');
      const rel = requireString(args, 'path');
      const rows = Array.isArray(args?.rows) ? args.rows.map(String) : [];
      if (rows.length === 0) throw new Error('rows required');
      const palette = args?.palette ?? {};
      const scale = Math.min(16, Math.max(1, Number(args?.scale ?? 1)));
      const width = Math.max(...rows.map((row) => row.length));
      const height = rows.length;
      if (width * height > 65536) throw new Error(`grid too large: ${width}x${height} (max 256x256 = 65536 pixels)`);
      const parse = (value) => {
        const text = String(value ?? '').replace('#', '');
        if (text.length !== 6 && text.length !== 8) throw new Error('bad color: ' + value);
        return {
          r: parseInt(text.slice(0, 2), 16),
          g: parseInt(text.slice(2, 4), 16),
          b: parseInt(text.slice(4, 6), 16),
          a: text.length === 8 ? parseInt(text.slice(6, 8), 16) : 255,
        };
      };
      const colors = new Map();
      for (const [key, value] of Object.entries(palette)) colors.set(key, parse(value));
      const rgba = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const symbol = rows[y][x] ?? '.';
          const color = colors.get(symbol);
          if (!color) continue;
          const offset = (y * width + x) * 4;
          rgba[offset] = color.r;
          rgba[offset + 1] = color.g;
          rgba[offset + 2] = color.b;
          rgba[offset + 3] = color.a;
        }
      }
      let output = rgba;
      let outWidth = width;
      let outHeight = height;
      if (scale > 1) {
        outWidth = width * scale;
        outHeight = height * scale;
        output = new Uint8Array(outWidth * outHeight * 4);
        for (let y = 0; y < outHeight; y += 1) {
          for (let x = 0; x < outWidth; x += 1) {
            const src = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 4;
            const dst = (y * outWidth + x) * 4;
            output[dst] = rgba[src];
            output[dst + 1] = rgba[src + 1];
            output[dst + 2] = rgba[src + 2];
            output[dst + 3] = rgba[src + 3];
          }
        }
      }
      const target = resolve(root, rel);
      if (!target.startsWith(resolve(root))) throw new Error('path must be inside the project');
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, encodePng(outWidth, outHeight, output));
      return { path: rel, width: outWidth, height: outHeight, summary: `нарисовано: ${rel} ${outWidth}x${outHeight}` };
    },
  };
}

function sectionTool() {
  return {
    name: 'dept_section',
    description: 'Раздел специалиста в документе (концепция/ТЗ/план): дизайнер — стиль, художник — что рисуем, исследователь — данные и т.п. Пишет файл и фиксирует раздел в состоянии.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        doc: { type: 'string', enum: ['concept', 'spec', 'plan'], description: 'Документ.' },
        role: { type: 'string', description: 'Роль автора раздела.' },
        title: { type: 'string', description: 'Заголовок раздела.' },
        content: { type: 'string', description: 'Текст раздела в markdown.' },
      },
      required: ['root', 'taskId', 'doc', 'role', 'title', 'content'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { path: { type: 'string' }, summary: { type: 'string' } }, required: ['path', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const doc = requireString(args, 'doc');
      const role = requireString(args, 'role');
      const title = requireString(args, 'title');
      const content = requireString(args, 'content');
      let state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const rel = join('docs/department', taskId, 'sections', doc, role + '.md');
      const target = join(root, rel);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, `# ${title}\n\n${content}\n`, 'utf8');
      state = await writeState(root, addSection(state, { doc, role, title, content }));
      return { path: rel, summary: `раздел ${doc}/${role}: ${title} (${content.length} символов)` };
    },
  };
}

function ideasTool() {
  return {
    name: 'dept_ideas',
    description: 'Идеи архитектора на рецензию специалистам. Идея не идёт в работу, пока её не одобрили специалисты (минимум два) и нет жёсткой критики.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        problem: { type: 'string', description: 'Какую проблему решаем.' },
        ideas: {
          type: 'array',
          items: {
            type: 'object',
            properties: { title: { type: 'string' }, description: { type: 'string' }, risks: { type: 'string' } },
            required: ['title'],
          },
          description: 'Идеи. Если не переданы — вернуть список и статусы.',
        },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { ideas: { type: 'array', items: { type: 'object' } }, summary: { type: 'string' } }, required: ['ideas', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      let state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      if (Array.isArray(args?.ideas) && args.ideas.length > 0) {
        const result = addIdeas(state, { problem: args?.problem ?? '', ideas: args.ideas });
        state = await writeState(root, result.state);
      }
      const ideas = state.ideas ?? [];
      const lines = ideas.map((idea) => `${idea.id} [${idea.status}] ${idea.title} (рецензий: ${idea.critiques.length})`);
      return { ideas, summary: lines.join('\n') || 'идей нет' };
    },
  };
}

function critiqueTool() {
  return {
    name: 'dept_critique',
    description: 'Рецензия специалиста на идею архитектора: approve/reject и severity. Жёсткое отклонение (high) убивает идею, два одобрения без жёсткой критики — принимают.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        ideaId: { type: 'string', description: 'Идентификатор идеи.' },
        role: { type: 'string', description: 'Кто рецензирует.' },
        verdict: { type: 'string', enum: ['approve', 'reject'], description: 'Вердикт.' },
        comment: { type: 'string', description: 'Замечания.' },
        severity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Насколько критично.' },
      },
      required: ['root', 'taskId', 'ideaId', 'role', 'verdict'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { status: { type: 'string' }, summary: { type: 'string' } }, required: ['status', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const next = await writeState(root, critiqueIdea(state, {
        ideaId: requireString(args, 'ideaId'),
        role: requireString(args, 'role'),
        verdict: requireString(args, 'verdict'),
        comment: args?.comment ?? '',
        severity: args?.severity,
      }));
      const idea = (next.ideas ?? []).find((item) => item.id === args.ideaId);
      return { status: idea?.status ?? 'unknown', summary: `${args.ideaId}: ${idea?.status}` };
    },
  };
}

function bugTool() {
  return {
    name: 'dept_bug',
    description: 'Баг-репорт бета-тестера: что сломалось, как повторить, что ожидалось. Пишет файл и фиксирует баг в состоянии.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        title: { type: 'string', description: 'Короткое описание бага. Без title — только список багов.' },
        steps: { type: 'string', description: 'Шаги воспроизведения.' },
        expected: { type: 'string', description: 'Ожидаемое поведение.' },
        actual: { type: 'string', description: 'Фактическое поведение.' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Критичность.' },
        evidence: { type: 'string', description: 'Путь к скриншоту/логу.' },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { bugs: { type: 'array', items: { type: 'object' } }, id: { type: 'string' }, summary: { type: 'string' } }, required: ['bugs', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      let state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      let id = '';
      if (typeof args?.title === 'string' && args.title.trim() !== '') {
        const result = addBug(state, {
          title: args.title.trim(),
          steps: args?.steps,
          expected: args?.expected,
          actual: args?.actual,
          severity: args?.severity,
          evidence: args?.evidence,
        });
        state = await writeState(root, result.state);
        id = result.bug.id;
        const dir = join(taskDir(root, taskId), 'bugs');
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, id + '.md'), `# ${result.bug.title}\n\n- критичность: ${result.bug.severity}\n- шаги:\n${result.bug.steps}\n- ожидалось: ${result.bug.expected}\n- факт: ${result.bug.actual}\n- доказательство: ${result.bug.evidence}\n`, 'utf8');
      }
      const bugs = state.bugs ?? [];
      const summary = bugs.map((bug) => `${bug.id} [${bug.severity}/${bug.status}] ${bug.title}`).join('\n') || 'багов нет';
      return { bugs, id, summary };
    },
  };
}

function browseTool() {
  return {
    name: 'dept_browse',
    description: 'Браузер для бета-тестера: открыть localhost/file, кликать, вводить, снимать скриншот в evidence. Возвращает текст страницы и лог действий.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        url: { type: 'string', description: 'Адрес (localhost, 127.0.0.1 или file://).' },
        name: { type: 'string', description: 'Имя скриншота, например map-open.png.' },
        fullPage: { type: 'boolean', description: 'Скриншот всей страницы.' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['goto', 'click', 'fill', 'press', 'wait', 'text', 'screenshot'] },
              url: { type: 'string' },
              selector: { type: 'string' },
              text: { type: 'string' },
              value: { type: 'string' },
              key: { type: 'string' },
              ms: { type: 'integer' },
            },
            required: ['type'],
          },
          description: 'Сценарий действий по порядку.',
        },
      },
      required: ['root', 'taskId', 'url'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { screenshot: { type: 'string' }, text: { type: 'string' }, summary: { type: 'string' } }, required: ['screenshot', 'text', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const name = String(args?.name ?? 'screen.png').replace(/[^a-z0-9._-]/gi, '-');
      const shot = join(taskDir(root, taskId), 'evidence', name);
      await mkdir(dirname(shot), { recursive: true });
      const result = await runBrowse({
        url: requireString(args, 'url'),
        actions: Array.isArray(args?.actions) ? args.actions : [],
        screenshotPath: shot,
        fullPage: Boolean(args?.fullPage),
      });
      const rel = join('docs/department', taskId, 'evidence', name);
      return {
        screenshot: rel,
        text: result.text,
        summary: `browse: ${result.log.length} действий · скриншот ${rel}\nТекст: ${result.text.replace(/\s+/g, ' ').slice(0, 300)}`,
      };
    },
  };
}

function guiTool() {
  return {
    name: 'dept_gui',
    description: 'Запуск нативной программы (C++/Qt и др.) для бета-теста: команда, аргументы, env, таймаут, перехват вывода, скриншот через хук приложения или внешнюю команду.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        command: { type: 'string', description: 'Команда, например ./build/app.' },
        args: { type: 'array', items: { type: 'string' }, description: 'Аргументы.' },
        env: { type: 'object', additionalProperties: { type: 'string' }, description: 'Переменные окружения (например, QT_QPA_PLATFORM=offscreen).' },
        timeoutMs: { type: 'integer', description: 'Таймаут, мс (по умолчанию 60000).' },
        screenshotFile: { type: 'string', description: 'Путь к файлу, который приложение создаст само (например, shot.png).' },
        screenshotCommand: { type: 'string', description: 'Команда скриншота после запуска (например, import -window root shot.png).' },
        name: { type: 'string', description: 'Имя скриншота в evidence.' },
      },
      required: ['root', 'taskId', 'command'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { code: { type: 'integer' }, screenshot: { type: 'string' }, stdout: { type: 'string' }, summary: { type: 'string' } }, required: ['code', 'screenshot', 'stdout', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const result = await runNative(root, {
        command: requireString(args, 'command'),
        args: Array.isArray(args?.args) ? args.args.map(String) : [],
        env: args?.env && typeof args.env === 'object' ? args.env : {},
        timeoutMs: args?.timeoutMs,
      });
      let screenshot = '';
      const name = String(args?.name ?? 'native.png').replace(/[^a-z0-9._-]/gi, '-');
      const evidence = join(taskDir(root, taskId), 'evidence', name);
      await mkdir(dirname(evidence), { recursive: true });
      if (typeof args?.screenshotCommand === 'string' && args.screenshotCommand.trim() !== '') {
        await runScreenshotCommand(root, args.screenshotCommand, args?.env);
      }
      const produced = args?.screenshotFile ? join(root, String(args.screenshotFile)) : null;
      if (produced) {
        try {
          await copyFile(produced, evidence);
          screenshot = join('docs/department', taskId, 'evidence', name);
        } catch {
          // приложение не создало скриншот — не ошибка
        }
      }
      const stdout = result.stdout.trim();
      const summary = `gui: ${args.command} → код ${result.code ?? 'нет'}` + (result.timedOut ? ' (таймаут)' : '') + (screenshot ? ' · скриншот ' + screenshot : '') + '\nstdout: ' + stdout.replace(/\s+/g, ' ').slice(0, 400);
      return { code: Number(result.code ?? -1), screenshot, stdout: stdout.slice(0, 4000), summary };
    },
  };
}

function worktreeTool() {
  return {
    name: 'dept_worktree',
    description: 'git worktree для параллельной работы: create/list/remove. Позволяет нескольким кодерам работать в изолированных каталогах, не конфликтуя по файлам.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        action: { type: 'string', enum: ['create', 'list', 'remove'], description: 'Действие.' },
        name: { type: 'string', description: 'Имя worktree (например, module-a).' },
        branch: { type: 'string', description: 'Ветка (по умолчанию dept/<taskId>-<name>).' },
      },
      required: ['root', 'taskId', 'action'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { worktrees: { type: 'array', items: { type: 'object' } }, summary: { type: 'string' } }, required: ['worktrees', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const action = requireString(args, 'action');
      let state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      if (action === 'create') {
        const name = requireString(args, 'name');
        const path = join(root, '.worktrees', name);
        const branch = typeof args?.branch === 'string' && args.branch.trim() !== '' ? args.branch.trim() : `dept/${taskId}-${name}`;
        const ignorePath = join(root, '.gitignore');
        try {
          const current = await readFile(ignorePath, 'utf8');
          if (!current.split(String.fromCharCode(10)).includes('.worktrees/')) {
            await writeFile(ignorePath, current.replace(/\s*$/, String.fromCharCode(10)) + '.worktrees/' + String.fromCharCode(10), 'utf8');
          }
        } catch {
          await writeFile(ignorePath, '.worktrees/' + String.fromCharCode(10), 'utf8');
        }
        const created = await addWorktree(root, path, branch);
        if (!created.ok) throw new Error('worktree failed: ' + (created.error ?? ''));
        state = await writeState(root, addWorktreeRecord(state, { name, path, branch }));
      } else if (action === 'remove') {
        const name = requireString(args, 'name');
        const record = (state.worktrees ?? []).find((item) => item.name === name);
        if (!record) throw new Error(`worktree not found: ${name}`);
        const removed = await removeWorktree(root, record.path);
        if (!removed.ok) throw new Error('worktree remove failed: ' + (removed.error ?? ''));
        state = await writeState(root, removeWorktreeRecord(state, name));
      }
      const worktrees = state.worktrees ?? [];
      const raw = await listWorktrees(root);
      const summary = worktrees.length > 0
        ? worktrees.map((item) => `${item.name}: ${item.branch} → ${item.path}`).join('\n')
        : 'worktree нет\n' + raw.split(String.fromCharCode(10)).filter(Boolean).join('\n');
      return { worktrees, summary };
    },
  };
}

function proposeTool() {
  return {
    name: 'dept_propose',
    description: 'Супервайзер предлагает решение по вопросу к человеку, не останавливая работу. Предложения идут на критику специалистов (dept_critique).',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        questionId: { type: 'string', description: 'Идентификатор вопроса.' },
        problem: { type: 'string', description: 'Формулировка проблемы.' },
        ideas: {
          type: 'array',
          items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, risks: { type: 'string' } }, required: ['title'] },
          description: 'Варианты решения.',
        },
      },
      required: ['root', 'taskId', 'questionId', 'ideas'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { ideas: { type: 'array', items: { type: 'object' } }, summary: { type: 'string' } }, required: ['ideas', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const question = (state.questions ?? []).find((item) => item.id === args.questionId);
      if (!question) throw new Error(`question not found: ${args.questionId}`);
      const result = addIdeas(state, { questionId: question.id, problem: args?.problem ?? question.text, ideas: args.ideas });
      const next = await writeState(root, result.state);
      return { ideas: result.ideas, summary: `предложения по ${question.id}: ` + result.ideas.map((idea) => idea.id + ' ' + idea.title).join('; ') };
    },
  };
}

function memoTool() {
  return {
    name: 'dept_memo',
    description: 'Сформировать служебную записку по вопросу: суть вопроса, варианты, критика, решение команды. Человек читает и утверждает или пишет замечания.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        questionId: { type: 'string', description: 'Идентификатор вопроса.' },
      },
      required: ['root', 'taskId', 'questionId'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { path: { type: 'string' }, summary: { type: 'string' } }, required: ['path', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      let state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const question = (state.questions ?? []).find((item) => item.id === args.questionId);
      if (!question) throw new Error(`question not found: ${args.questionId}`);
      const ideas = (state.ideas ?? []).filter((idea) => idea.questionId === question.id);
      const accepted = ideas.find((idea) => idea.status === 'accepted');
      const lines = [
        `# Служебная записка: ${question.text}`,
        '',
        `- вопрос: ${question.id}`,
        `- статус: ${question.status}`,
        '',
        '## Суть вопроса',
        question.text,
        '',
        '## Предложения',
      ];
      for (const idea of ideas) {
        lines.push(`### ${idea.id} — ${idea.title} (${idea.status})`);
        if (idea.description) lines.push(idea.description);
        if (idea.risks) lines.push('Риски: ' + idea.risks);
        for (const critique of idea.critiques) lines.push(`- ${critique.role}: ${critique.verdict}/${critique.severity}${critique.comment ? ' — ' + critique.comment : ''}`);
        lines.push('');
      }
      lines.push('## Решение команды', accepted ? `${accepted.id}: ${accepted.title}${accepted.description ? ' — ' + accepted.description : ''}` : 'решение ещё не принято', '');
      lines.push('## Что нужно от человека', 'Утвердить решение или написать замечания (verdict=approve|changes).');
      const rel = join('docs/department', taskId, 'memos', question.id + '.md');
      const target = join(root, rel);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, lines.join(String.fromCharCode(10)), 'utf8');
      state = await writeState(root, addMemo(state, { questionId: question.id, path: rel }));
      return { path: rel, summary: `служебная записка: ${rel} (предложений: ${ideas.length})` };
    },
  };
}

function reviewMemoTool() {
  return {
    name: 'dept_review',
    description: 'Решение человека по служебной записке: approve (утвердить) или changes (замечания).',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        questionId: { type: 'string', description: 'Идентификатор вопроса.' },
        verdict: { type: 'string', enum: ['approve', 'changes'], description: 'Утвердить или замечания.' },
        remarks: { type: 'string', description: 'Замечания (обязательны при changes).' },
        by: { type: 'string', description: 'Кто решил.' },
      },
      required: ['root', 'taskId', 'questionId', 'verdict', 'by'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { status: { type: 'string' }, summary: { type: 'string' } }, required: ['status', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const by = requireString(args, 'by');
      if (!isHumanApprover(by)) throw new Error('review must be signed by the human');
      const verdict = requireString(args, 'verdict');
      if (verdict === 'changes' && !String(args?.remarks ?? '').trim()) throw new Error('remarks required for changes');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const next = await writeState(root, reviewMemo(state, { questionId: requireString(args, 'questionId'), verdict, remarks: args?.remarks ?? '', by }));
      const question = (next.questions ?? []).find((item) => item.id === args.questionId);
      return { status: question?.status ?? 'unknown', summary: `${args.questionId}: ${question?.status}` };
    },
  };
}

function reworkTool() {
  return {
    name: 'dept_rework',
    description: 'Архитектор готовит план переработки по замечаниям человека: что менять в коде/концепции/данных и в каком порядке.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        questionId: { type: 'string', description: 'Идентификатор вопроса.' },
        summary: { type: 'string', description: 'Суть переработки.' },
        steps: { type: 'array', items: { type: 'string' }, description: 'Шаги.' },
      },
      required: ['root', 'taskId', 'questionId', 'summary', 'steps'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { path: { type: 'string' }, summary: { type: 'string' } }, required: ['path', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      let state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const question = (state.questions ?? []).find((item) => item.id === args.questionId);
      if (!question) throw new Error(`question not found: ${args.questionId}`);
      const steps = Array.isArray(args?.steps) ? args.steps.map(String) : [];
      const rel = join('docs/department', taskId, 'rework', question.id + '.md');
      const target = join(root, rel);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, `# Переработка по ${question.id}\n\n${args.summary}\n\n` + steps.map((step, index) => `${index + 1}. ${step}`).join(String.fromCharCode(10)) + String.fromCharCode(10), 'utf8');
      state = await writeState(root, addRework(state, { questionId: question.id, summary: args.summary, steps, path: rel }));
      return { path: rel, summary: `план переработки: ${rel}` };
    },
  };
}

function pixelizeTool() {
  return {
    name: 'dept_pixelize',
    description: 'Превратить PNG/JPEG в пиксельную сетку и спрайт: уменьшает, квантует в палитру, возвращает rows+palette для ручной правки (dept_art) и сохраняет PNG.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        source: { type: 'string', description: 'Путь к исходному изображению относительно корня.' },
        path: { type: 'string', description: 'Куда сохранить PNG-спрайт относительно корня.' },
        width: { type: 'integer', description: 'Ширина сетки (4–96, по умолчанию 32).' },
        height: { type: 'integer', description: 'Высота сетки (4–96, по пропорции).' },
        colors: { type: 'integer', description: 'Число цветов (2–64).' },
        scale: { type: 'integer', description: 'Масштаб выходного PNG (1–16).' },
        palette: { type: 'object', additionalProperties: { type: 'string' }, description: 'Принудительная палитра: символ → #rrggbb.' },
      },
      required: ['root', 'taskId', 'source', 'path'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { path: { type: 'string' }, width: { type: 'integer' }, height: { type: 'integer' }, rows: { type: 'array', items: { type: 'string' } }, palette: { type: 'object' }, summary: { type: 'string' } }, required: ['path', 'width', 'height', 'rows', 'palette', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      requireString(args, 'taskId');
      const source = resolve(root, requireString(args, 'source'));
      const output = resolve(root, requireString(args, 'path'));
      if (!source.startsWith(resolve(root)) || !output.startsWith(resolve(root))) throw new Error('paths must be inside the project');
      const result = await pixelize({
        source,
        outputPath: output,
        width: args?.width,
        height: args?.height,
        colors: args?.colors,
        scale: args?.scale,
        palette: args?.palette,
      });
      return {
        path: requireString(args, 'path'),
        width: result.width,
        height: result.height,
        rows: result.rows,
        palette: result.palette,
        summary: `пикселизация: ${args.path} ${result.width}x${result.height}, цветов ${Object.keys(result.palette).length}`,
      };
    },
  };
}

function composeTool() {
  return {
    name: 'dept_compose',
    description: 'Собрать большое PNG из маленьких спрайтов: холст, фон, слои с координатами. Художник рисует по частям, композиция собирает результат.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        path: { type: 'string', description: 'Куда сохранить PNG относительно корня.' },
        width: { type: 'integer', description: 'Ширина холста.' },
        height: { type: 'integer', description: 'Высота холста.' },
        background: { type: 'string', description: 'Цвет фона #rrggbb (пусто — прозрачно).' },
        layers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              x: { type: 'integer' },
              y: { type: 'integer' },
              width: { type: 'integer' },
              height: { type: 'integer' },
            },
            required: ['source', 'x', 'y'],
          },
          description: 'Слои: путь к PNG, позиция, размер.',
        },
      },
      required: ['root', 'taskId', 'path', 'width', 'height', 'layers'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { path: { type: 'string' }, width: { type: 'integer' }, height: { type: 'integer' }, layers: { type: 'integer' }, summary: { type: 'string' } }, required: ['path', 'width', 'height', 'layers', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      requireString(args, 'taskId');
      const output = resolve(root, requireString(args, 'path'));
      if (!output.startsWith(resolve(root))) throw new Error('path must be inside the project');
      const layers = (Array.isArray(args?.layers) ? args.layers : []).map((layer) => {
        const source = resolve(root, String(layer.source));
        if (!source.startsWith(resolve(root))) throw new Error('layer must be inside the project');
        return { source, x: layer.x, y: layer.y, width: layer.width, height: layer.height };
      });
      const result = await composeImage({
        width: args.width,
        height: args.height,
        background: args?.background,
        layers,
        outputPath: output,
      });
      return { ...result, path: requireString(args, 'path'), summary: `композиция: ${args.path} ${result.width}x${result.height}, слоёв ${result.layers}` };
    },
  };
}

function correctionTool() {
  return {
    name: 'dept_correction',
    description: 'Корректировки от человека: список или обновление статуса (new/in_progress/done) с итогом. По корректировке руководитель запускает доработку концепции/ТЗ/плана/кода.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        id: { type: 'string', description: 'Идентификатор корректировки. Пусто — только список.' },
        status: { type: 'string', enum: ['new', 'in_progress', 'done'], description: 'Новый статус.' },
        summary: { type: 'string', description: 'Что сделано по корректировке.' },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { corrections: { type: 'array', items: { type: 'object' } }, summary: { type: 'string' } }, required: ['corrections', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      let state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      if (typeof args?.id === 'string' && args.id.trim() !== '') {
        state = await writeState(root, updateCorrection(state, {
          id: args.id.trim(),
          status: requireString(args, 'status'),
          summary: args?.summary ?? '',
          by: 'manager',
        }));
      }
      const corrections = state.corrections ?? [];
      return { corrections, summary: corrections.map((item) => `${item.id} [${item.status}] ${item.doc}: ${item.subject || item.text.slice(0, 60)}`).join('\n') || 'корректировок нет' };
    },
  };
}

function budgetTool() {
  return {
    name: 'dept_budget',
    description: 'Посмотреть или изменить бюджет задачи: лимит токенов, цены за 1M, курс, разрешение превышения. Применяй значение, которое назвал человек, и записывай причину.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        limitTokens: { type: 'integer', description: 'Новый лимит токенов.' },
        rateRUB: { type: 'integer', description: 'Курс рубля за доллар.' },
        override: { type: 'boolean', description: 'Разрешить коммит при превышении лимита.' },
        reason: { type: 'string', description: 'Почему меняем (например, решение человека).' },
        prices: {
          type: 'object',
          properties: {
            inputTokens: { type: 'number' },
            outputTokens: { type: 'number' },
            cacheReadTokens: { type: 'number' },
            cacheWriteTokens: { type: 'number' },
          },
          description: 'Цены за 1M токенов в долларах.',
        },
      },
      required: ['root', 'taskId'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { budget: { type: 'object' }, summary: { type: 'string' } }, required: ['budget', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      let state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      if (args?.limitTokens !== undefined || args?.rateRUB !== undefined || args?.override !== undefined || args?.prices !== undefined) {
        const currentLimit = Number(state.gates?.budget?.limitTokens ?? 0);
        if (state.gates?.budget?.humanSet === true && args?.limitTokens !== undefined && Number(args.limitTokens) < currentLimit) {
          throw new Error(`бюджет установлен человеком (${currentLimit}); руководитель не может понизить его — спроси человека`);
        }
        state = await writeState(root, setBudget(state, {
          limitTokens: args?.limitTokens,
          rateRUB: args?.rateRUB,
          override: args?.override,
          prices: args?.prices,
          reason: args?.reason,
          by: 'manager',
        }));
      }
      const budget = state.gates?.budget ?? {};
      return { budget, summary: `бюджет: лимит ${budget.limitTokens ?? '—'}, использовано ${budget.usedTokens ?? 0}, override=${Boolean(budget.override)}, курс ${budget.rateRUB ?? '—'}` };
    },
  };
}

function pauseTool() {
  return {
    name: 'dept_pause',
    description: 'Пауза/возобновление задачи: работа останавливается, токены не тратятся, состояние сохраняется. После resume отдел продолжает с того же места.',
    parameters: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Корень проекта.' },
        taskId: { type: 'string', description: 'Идентификатор задачи.' },
        paused: { type: 'boolean', description: 'true — пауза, false — продолжить.' },
        reason: { type: 'string', description: 'Причина.' },
        by: { type: 'string', description: 'Кто поставил (человек или manager).' },
      },
      required: ['root', 'taskId', 'paused'],
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { paused: { type: 'boolean' }, summary: { type: 'string' } }, required: ['paused', 'summary'] },
      render: (_args, value) => text(value.summary),
    },
    async execute(args) {
      const root = requireString(args, 'root');
      const taskId = requireString(args, 'taskId');
      const paused = Boolean(args?.paused);
      const by = String(args?.by ?? 'manager');
      if (!paused && by !== 'manager' && !isHumanApprover(by)) throw new Error('resume must be signed by the human');
      const state = await readState(root, taskId);
      if (!state) throw new Error(`task not found: ${taskId}`);
      const next = await writeState(root, setPaused(state, { paused, reason: args?.reason ?? '', by }));
      return { paused: Boolean(next.paused?.value), summary: paused ? `задача на паузе: ${args?.reason ?? ''}` : 'работа продолжена' };
    },
  };
}
