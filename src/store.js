/**
 * Состояние задач ИИ-отдела: схема, чтение/запись и переходы стадий.
 * Состояние лежит в репозитории проекта: `docs/department/<task-id>/state.json`,
 * поэтому оно версионируется вместе с артефактами и переживает падение хоста.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/** Каталог артефактов отдела внутри проекта. */
export const DEPARTMENT_DIR = 'docs/department';

/** Допустимые стадии задачи. */
export const STAGES = Object.freeze([
  'analysis',
  'concept',
  'concept_review',
  'spec',
  'spec_review',
  'executing',
  'done',
  'blocked',
]);

/** Документы, которые человек утверждает. */
const APPROVAL_TRANSITIONS = Object.freeze({
  concept: { from: ['concept_review'], to: 'spec' },
  spec: { from: ['spec_review'], to: 'executing' },
});

/**
 * Каталог задачи.
 *
 * @param {string} root Корень репозитория.
 * @param {string} taskId Идентификатор задачи.
 * @returns {string}
 */
export function taskDir(root, taskId) {
  return join(root, DEPARTMENT_DIR, taskId);
}

/**
 * Путь к файлу состояния.
 *
 * @param {string} root Корень репозитория.
 * @param {string} taskId Идентификатор задачи.
 * @returns {string}
 */
export function statePath(root, taskId) {
  return join(taskDir(root, taskId), 'state.json');
}

/**
 * Создаёт начальное состояние задачи.
 *
 * @param {object} input Параметры задачи.
 * @returns {object} Состояние.
 */
export function createState(input) {
  const now = new Date().toISOString();
  return {
    version: 1,
    taskId: input.taskId,
    project: input.project ?? input.root,
    root: input.root,
    title: input.title ?? input.taskId,
    branch: input.branch ?? `dept/${input.taskId}`,
    origin: input.origin ?? null,
    testCommand: input.testCommand ?? null,
    stage: 'analysis',
    stageIndex: 0,
    attempts: { current: 0, max: Number(input.maxAttempts ?? 4) },
    attemptsByGate: {
      tests: { current: 0, max: Number(input.maxAttempts ?? 4), signatures: [] },
      review: { current: 0, max: Number(input.maxAttempts ?? 4), signatures: [] },
    },
    stats: { testsRuns: 0, testsFails: 0, reviewRuns: 0, reviewFails: 0 },
    gates: {
      tests: { status: 'pending', last: null },
      review: { status: 'pending' },
      budget: { limitTokens: Number(input.budgetTokens ?? 60000), usedTokens: 0, status: 'ok' },
    },
    approvals: [],
    questions: [],
    roles: input.roles ?? {},
    policy: {
      // Руководитель решает тактические вопросы сам; человек — только продуктовые.
      autonomous: true,
      escalateOnly: ['scope', 'budget', 'ux', 'timeline'],
      maxAutonomousAmendments: 5,
    },
    createdAt: now,
    updatedAt: now,
    events: [
      {
        id: randomUUID(),
        ts: now,
        actor: input.actor ?? 'manager',
        action: 'task_created',
        detail: `stage=analysis, branch=${input.branch ?? `dept/${input.taskId}`}`,
      },
    ],
  };
}

/**
 * Читает состояние задачи.
 *
 * @param {string} root Корень репозитория.
 * @param {string} taskId Идентификатор задачи.
 * @returns {Promise<object|null>}
 */
export function normalizeState(state) {
  if (!state) return state;
  const max = Number(state.attempts?.max ?? 4);
  const next = { ...state };
  next.questions = state.questions ?? [];
  next.policy = state.policy ?? { autonomous: true, escalateOnly: ['scope', 'budget', 'ux', 'timeline'], maxAutonomousAmendments: 5 };
  next.stageIndex = state.stageIndex ?? 0;
  next.attemptsByGate = state.attemptsByGate ?? {
    tests: { current: 0, max, signatures: [] },
    review: { current: 0, max, signatures: [] },
  };
  next.stats = state.stats ?? { testsRuns: 0, testsFails: 0, reviewRuns: 0, reviewFails: 0 };
  // Старые состояния не имели статистики: восстанавливаем её из журнала событий.
  if ((next.stats.testsRuns ?? 0) === 0 && (next.stats.reviewRuns ?? 0) === 0) {
    const events = next.events ?? [];
    const count = (action) => events.filter((event) => event.action === action).length;
    next.stats = {
      testsRuns: count('tests_passed') + count('tests_failed'),
      testsFails: count('tests_failed'),
      reviewRuns: count('review_passed') + count('review_failed'),
      reviewFails: count('review_failed'),
    };
    next.attemptsByGate = next.attemptsByGate ?? {};
    next.attemptsByGate.tests = {
      ...(next.attemptsByGate.tests ?? { max }),
      current: next.stats.testsFails,
    };
    next.attemptsByGate.review = {
      ...(next.attemptsByGate.review ?? { max }),
      current: next.stats.reviewFails,
    };
  }
  return next;
}

export async function readState(root, taskId) {
  try {
    const text = await readFile(statePath(root, taskId), 'utf8');
    return normalizeState(JSON.parse(text));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Записывает состояние задачи, обновляя `updatedAt`.
 *
 * @param {string} root Корень репозитория.
 * @param {object} state Состояние.
 * @returns {Promise<object>} Записанное состояние.
 */
export async function writeState(root, state) {
  const next = { ...normalizeState(state), updatedAt: new Date().toISOString() };
  await mkdir(taskDir(root, state.taskId), { recursive: true });
  await writeFile(statePath(root, state.taskId), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

/**
 * Добавляет событие в журнал (без записи на диск).
 *
 * @param {object} state Состояние.
 * @param {{ actor: string, action: string, detail?: string }} event Событие.
 * @returns {object} Новое состояние.
 */
export function appendEvent(state, event) {
  const now = new Date().toISOString();
  return {
    ...state,
    updatedAt: now,
    events: [
      ...state.events,
      { id: randomUUID(), ts: now, actor: event.actor ?? 'system', action: event.action, detail: event.detail ?? '' },
    ],
  };
}

/**
 * Утверждение документа человеком с переходом стадии.
 *
 * @param {object} state Состояние.
 * @param {{ doc: 'concept'|'spec', by: string, via?: string }} input Утверждение.
 * @returns {object} Новое состояние.
 */
export function approveDocument(state, input) {
  const transition = APPROVAL_TRANSITIONS[input.doc];
  if (!transition) throw new Error(`unknown document: ${input.doc}`);
  if (!transition.from.includes(state.stage)) {
    throw new Error(`cannot approve ${input.doc} in stage ${state.stage}`);
  }
  const now = new Date().toISOString();
  const approved = {
    ...state,
    stage: transition.to,
    updatedAt: now,
    approvals: [
      ...state.approvals,
      { doc: input.doc, by: input.by, via: input.via ?? 'chat', ts: now },
    ],
  };
  return appendEvent(approved, {
    actor: input.by,
    action: `approved_${input.doc}`,
    detail: `stage=${transition.to}`,
  });
}

/**
 * Записывает результат гейта тестов.
 *
 * @param {object} state Состояние.
 * @param {{ ok: boolean, exitCode: number, summary?: string }} result Результат.
 * @returns {object} Новое состояние.
 */
export function recordTestGate(state, result) {
  const status = result.ok ? 'pass' : 'fail';
  const previous = state.attemptsByGate?.tests ?? { current: 0, max: state.attempts?.max ?? 4, signatures: [] };
  const signature = result.ok ? previous.signatures.at(-1) ?? null : signatureOf(result.summary ?? '');
  const signatures = result.ok ? previous.signatures : [...previous.signatures, signature].slice(-8);
  const next = {
    ...state,
    gates: {
      ...state.gates,
      tests: {
        ...state.gates.tests,
        status,
        last: { ok: Boolean(result.ok), exitCode: result.exitCode, summary: result.summary ?? '', signature, ts: new Date().toISOString() },
      },
    },
    attemptsByGate: {
      ...(state.attemptsByGate ?? {}),
      tests: {
        current: result.ok ? previous.current : previous.current + 1,
        max: previous.max,
        signatures,
      },
    },
    stats: {
      ...(state.stats ?? {}),
      testsRuns: (state.stats?.testsRuns ?? 0) + 1,
      testsFails: (state.stats?.testsFails ?? 0) + (result.ok ? 0 : 1),
    },
    attempts: result.ok
      ? state.attempts
      : { ...state.attempts, current: state.attempts.current + 1 },
  };
  return appendEvent(next, {
    actor: 'tester',
    action: result.ok ? 'tests_passed' : 'tests_failed',
    detail: result.summary ?? `exit=${result.exitCode}`,
  });
}

/**
 * Записывает вердикт независимого ревьюера.
 *
 * @param {object} state Состояние.
 * @param {{ pass: boolean, summary?: string }} verdict Вердикт.
 * @returns {object} Новое состояние.
 */
export function recordReview(state, verdict) {
  const previous = state.attemptsByGate?.review ?? { current: 0, max: state.attempts?.max ?? 4, signatures: [] };
  const signature = verdict.pass ? previous.signatures.at(-1) ?? null : signatureOf(verdict.summary ?? '');
  const signatures = verdict.pass ? previous.signatures : [...previous.signatures, signature].slice(-8);
  const next = {
    ...state,
    gates: {
      ...state.gates,
      review: { status: verdict.pass ? 'pass' : 'fail', summary: verdict.summary ?? '', signature, ts: new Date().toISOString() },
    },
    attemptsByGate: {
      ...(state.attemptsByGate ?? {}),
      review: {
        current: verdict.pass ? previous.current : previous.current + 1,
        max: previous.max,
        signatures,
      },
    },
    stats: {
      ...(state.stats ?? {}),
      reviewRuns: (state.stats?.reviewRuns ?? 0) + 1,
      reviewFails: (state.stats?.reviewFails ?? 0) + (verdict.pass ? 0 : 1),
    },
  };
  return appendEvent(next, {
    actor: 'reviewer',
    action: verdict.pass ? 'review_passed' : 'review_failed',
    detail: verdict.summary ?? '',
  });
}

/**
 * Переводит задачу в done/blocked.
 *
 * @param {object} state Состояние.
 * @param {'done'|'blocked'} stage Целевая стадия.
 * @param {string} reason Причина.
 * @returns {object}
 */
export function closeTask(state, stage, reason) {
  if (stage !== 'done' && stage !== 'blocked') throw new Error(`invalid closing stage: ${stage}`);
  return appendEvent({ ...state, stage }, { actor: 'manager', action: `task_${stage}`, detail: reason ?? '' });
}

/**
 * Человекочитаемая сводка состояния.
 *
 * @param {object} state Состояние.
 * @returns {string}
 */
export function summarize(state) {
  const tests = state.gates?.tests;
  const review = state.gates?.review;
  return [
    `task ${state.taskId} (${state.title})`,
    `stage: ${state.stage}`,
    `branch: ${state.branch}`,
    `tests: ${tests?.status ?? 'pending'}${tests?.last ? ` (exit=${tests.last.exitCode})` : ''}`,
    `review: ${review?.status ?? 'pending'}`,
    `провалы: ${state.attempts?.current ?? 0}/${state.attempts?.max ?? 0}`,
    `budget: ${state.gates?.budget?.usedTokens ?? 0}/${state.gates?.budget?.limitTokens ?? 0}`,
    `events: ${state.events?.length ?? 0}`,
    `stats: tests ${state.stats?.testsRuns ?? 0}/${state.stats?.testsFails ?? 0} fail, review ${state.stats?.reviewRuns ?? 0}/${state.stats?.reviewFails ?? 0} fail`,
  ].join(' · ');
}

/** Разрешённые переходы стадий без утверждения человеком. */
const STAGE_FLOW = Object.freeze({
  analysis: ['concept'],
  concept: ['concept_review', 'analysis'],
  concept_review: ['concept', 'spec'],
  spec: ['spec_review', 'concept'],
  spec_review: ['spec', 'executing'],
  executing: ['done', 'blocked', 'spec'],
  done: [],
  blocked: ['analysis', 'executing'],
});

/**
 * Переводит задачу на следующую стадию с проверкой допустимости перехода.
 * Утверждения (concept→spec, spec→executing) выполняются только через
 * `approveDocument`, чтобы нельзя было проскочить человеческий гейт.
 *
 * @param {object} state Состояние.
 * @param {string} target Целевая стадия.
 * @param {string} [reason] Причина.
 * @returns {object} Новое состояние.
 */
export function advanceStage(state, target, reason = '') {
  const allowed = STAGE_FLOW[state.stage] ?? [];
  if (!allowed.includes(target)) {
    throw new Error(`cannot move ${state.stage} -> ${target}; allowed: ${allowed.join(', ') || 'none'}`);
  }
  if (target === 'spec' || target === 'executing') {
    throw new Error(`${target} requires a human approval, use dept_approve`);
  }
  return appendEvent({ ...state, stage: target }, { actor: 'manager', action: `stage_${target}`, detail: reason });
}

/**
 * Фиксирует изменение утверждённого документа (поправку к ТЗ/концепции/плану).
 * Требует подписи человека: правку утверждённого документа не может
 * санкционировать роль отдела.
 *
 * @param {object} state Состояние.
 * @param {{ doc: string, summary: string, by: string, reason?: string }} input Поправка.
 * @returns {object} Новое состояние.
 */
export function amendDocument(state, input) {
  const now = new Date().toISOString();
  const autonomous = Boolean(input.autonomous);
  const policy = state.policy ?? {};
  if (autonomous) {
    if (policy.autonomous === false) throw new Error('autonomous amendments are disabled by policy');
    const used = (state.amendments ?? []).filter((item) => item.autonomous).length;
    const limit = Number(policy.maxAutonomousAmendments ?? 5);
    if (used >= limit) {
      throw new Error(`autonomous amendment limit reached (${used}/${limit}); escalate to the human`);
    }
  }
  const amendment = {
    doc: input.doc,
    summary: input.summary,
    reason: input.reason ?? '',
    by: input.by,
    autonomous,
    ts: now,
  };
  const next = {
    ...state,
    amendments: [...(state.amendments ?? []), amendment],
    updatedAt: now,
  };
  return appendEvent(next, {
    actor: autonomous ? 'manager' : input.by,
    action: 'amended_document',
    detail: `${autonomous ? '[автономно] ' : ''}${input.doc}: ${input.summary}`,
  });
}

/**
 * Сбрасывает гейты перед следующим этапом и увеличивает счётчик этапов.
 * Без этого pass-ревью предыдущего этапа «переезжает» на следующий.
 *
 * @param {object} state Состояние.
 * @returns {object} Новое состояние.
 */
export function resetGatesForNextStage(state) {
  return {
    ...state,
    stageIndex: (state.stageIndex ?? 0) + 1,
    gates: {
      ...state.gates,
      tests: { status: 'pending', last: null },
      review: { status: 'pending' },
    },
  };
}

/**
 * Добавляет вопрос руководителя к человеку.
 * Отдел не останавливается: вопрос копится, решение принимается по политике.
 *
 * @param {object} state Состояние.
 * @param {{ text: string, options?: string[], recommended?: string, context?: string }} input Вопрос.
 * @returns {{ state: object, question: object }}
 */
export function addQuestion(state, input) {
  const now = new Date().toISOString();
  const question = {
    id: `q${(state.questions ?? []).length + 1}-${Date.now().toString(36)}`,
    ts: now,
    text: String(input.text ?? ''),
    options: Array.isArray(input.options) ? input.options.map(String) : [],
    recommended: input.recommended ? String(input.recommended) : '',
    context: input.context ? String(input.context) : '',
    status: 'open',
    answer: null,
    answeredBy: null,
    answeredAt: null,
  };
  const next = { ...state, questions: [...(state.questions ?? []), question], updatedAt: now };
  return {
    state: appendEvent(next, { actor: 'manager', action: 'question_asked', detail: question.text.slice(0, 140) }),
    question,
  };
}

/**
 * Отвечает на вопрос от имени человека.
 *
 * @param {object} state Состояние.
 * @param {{ id: string, answer: string, by: string }} input Ответ.
 * @returns {object} Новое состояние.
 */
export function answerQuestion(state, input) {
  const now = new Date().toISOString();
  const questions = state.questions ?? [];
  const index = questions.findIndex((question) => question.id === input.id);
  if (index < 0) throw new Error(`question not found: ${input.id}`);
  if (questions[index].status === 'answered') throw new Error(`question already answered: ${input.id}`);
  const updated = { ...questions[index], status: 'answered', answer: String(input.answer), answeredBy: input.by, answeredAt: now };
  const next = { ...state, questions: questions.map((question, position) => (position === index ? updated : question)), updatedAt: now };
  return appendEvent(next, { actor: input.by, action: 'question_answered', detail: `${input.id}: ${String(input.answer).slice(0, 100)}` });
}

/**
 * Открытые и отвеченные вопросы задачи.
 *
 * @param {object} state Состояние.
 * @param {{ status?: 'open'|'answered' }} [filter] Фильтр.
 * @returns {object[]}
 */
export function listQuestions(state, filter = {}) {
  const questions = state.questions ?? [];
  return filter.status ? questions.filter((question) => question.status === filter.status) : questions;
}

import { createHash } from 'node:crypto';

/**
 * Подпись провала: нормализованный хвост вывода.
 *
 * @param {string} text Вывод теста/ревью.
 * @returns {string}
 */
export function signatureOf(text) {
  const normalized = String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^ℹ (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)/.test(line))
    .slice(-6)
    .join('\n');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

/**
 * Провал повторяется (та же подпись уже была).
 *
 * @param {object} state Состояние.
 * @param {'tests'|'review'} gate Гейт.
 * @returns {boolean}
 */
export function isRepeatedFailure(state, gate) {
  const signatures = state.attemptsByGate?.[gate]?.signatures ?? [];
  if (signatures.length < 2) return false;
  return signatures.at(-1) === signatures.at(-2);
}
