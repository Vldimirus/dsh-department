/**
 * Инструменты модели `dept_*`: запуск задачи, статус, утверждение, гейты, фиксация.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  addQuestion,
  advanceStage,
  amendDocument,
  answerQuestion,
  closeTask,
  isRepeatedFailure,
  listQuestions,
  resetGatesForNextStage,
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
import { amendCommit, currentBranch, ensureBranch, commitAll, isRepo, push, tag } from './git.js';
import { isHumanApprover } from './roles.js';
import { runTestGate } from './gates.js';
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

function commitTool() {
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
      if (state.stage === 'blocked') {
        throw new Error('commit blocked: этап заблокирован (повторяющийся провал); нужно решение человека');
      }

      const committed = await commitAll(root, requireString(args, 'message'));
      if (!committed.ok) throw new Error(`commit failed: ${committed.error ?? ''}`);
      // Событие о коммите должно войти в тот же коммит, иначе дерево остаётся грязным.
      const nextState = await writeState(
        root,
        resetGatesForNextStage(
          appendEvent(state, {
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
      const pushed = await push(root, remote, state.branch);

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
