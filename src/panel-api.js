/**
 * Данные для Web-панели отдела: список задач и карточка одной задачи.
 * Только чтение: панель ничего не меняет, все действия — через инструменты.
 */
import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listQuestions, readState, summarize, DEPARTMENT_DIR } from './store.js';
import { missingArtifacts, verifyChecklist } from './verify.js';
import { currentBranch, runGit } from './git.js';

/** Стадии в порядке конвейера — для прогресса. */
export const STAGE_ORDER = [
  'analysis',
  'concept',
  'concept_review',
  'spec',
  'spec_review',
  'executing',
  'done',
];

/**
 * Прогресс задачи в процентах: доля пройденных стадий.
 *
 * @param {string} stage Текущая стадия.
 * @returns {number} 0..100
 */
export function progressOf(stage, stageIndex = 0, planStages = 0) {
  if (stage === 'done') return 100;
  if (stage === 'blocked') return 0;
  if (stage === 'executing') {
    const total = Math.max(1, Number(planStages) || 8);
    const done = Math.min(total, Math.max(0, Number(stageIndex) || 0));
    return Math.min(95, 50 + Math.round((done / total) * 45));
  }
  const index = STAGE_ORDER.indexOf(stage);
  if (index < 0) return 0;
  return Math.round((index / (STAGE_ORDER.length - 1)) * 50);
}

/**
 * Сколько этапов в плане (по тегам stage-N).
 *
 * @param {string} root Корень.
 * @param {string} taskId Задача.
 * @returns {Promise<number>}
 */
export async function planStagesOf(root, taskId) {
  try {
    const text = await readFile(join(root, DEPARTMENT_DIR, taskId, 'plan.md'), 'utf8');
    const tags = new Set(text.match(/stage-\d+/g) ?? []);
    return Math.max(1, tags.size);
  } catch {
    return 8;
  }
}

/**
 * Собирает краткую карточку задачи из состояния.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Идентификатор.
 * @param {object} state Состояние.
 * @returns {object}
 */
export function taskSummary(root, taskId, state, planStages = 0) {
  const last = state.events?.[state.events.length - 1];
  return {
    root,
    taskId,
    title: state.title ?? taskId,
    stage: state.stage,
    paused: Boolean(state.paused?.value),
    pauseReason: state.paused?.reason ?? '',
    progress: progressOf(state.stage, state.stageIndex, planStages),
    branch: state.branch,
    tests: state.gates?.tests?.status ?? 'pending',
    review: state.gates?.review?.status ?? 'pending',
    attempts: state.attempts?.current ?? 0,
    budget: state.gates?.budget ?? { usedTokens: 0, limitTokens: 0 },
    approvals: (state.approvals ?? []).map((item) => item.doc),
    openQuestions: listQuestions(state, { status: 'open' }).length,
    memos: listQuestions(state, { status: 'memo' }).length,
    memoPaths: listQuestions(state, { status: 'memo' }).map((question) => question.memoPath).filter(Boolean),
    events: state.events?.length ?? 0,
    updatedAt: state.updatedAt,
    lastEvent: last ? { action: last.action, ts: last.ts, detail: last.detail } : null,
    summary: summarize(state),
  };
}

/**
 * Список задач по нескольким корням.
 *
 * @param {string[]} roots Корни проектов.
 * @returns {Promise<object[]>}
 */
export async function listTasks(roots) {
  const tasks = [];
  for (const root of roots) {
    let entries = [];
    try {
      entries = await readdir(join(root, DEPARTMENT_DIR), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const state = await readState(root, entry.name);
      if (!state) continue;
      const planStages = await planStagesOf(root, entry.name);
      tasks.push(taskSummary(root, entry.name, state, planStages));
    }
  }
  tasks.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
  return tasks;
}

/**
 * Полная карточка задачи: состояние, артефакты, аудит, git.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Идентификатор.
 * @returns {Promise<object>}
 */
export async function taskPayload(root, taskId) {
  const state = await readState(root, taskId);
  if (!state) return null;
  const planStages = await planStagesOf(root, taskId);

  const names = ['task.md', 'analysis.md', 'concept.md', 'spec.md', 'plan.md', 'backlog.md'];
  const files = {};
  for (const name of names) {
    files[name] = await fileExists(join(root, DEPARTMENT_DIR, taskId, name));
  }
  files['README.md'] = await fileExists(join(root, 'README.md'));
  const stageNo = String((state.stageIndex ?? 0) + 1).padStart(2, '0');
  for (const name of ['review.md', 'report.md']) {
    files['stage:' + name.replace('.md', '')] = await fileExists(join(root, DEPARTMENT_DIR, taskId, 'stages', stageNo, name));
  }
  const branch = await currentBranch(root);
  const audit = verifyChecklist({ state, files, currentBranch: branch });

  const log = await runGit(root, ['log', '--oneline', '-8']);
  const tags = await runGit(root, ['tag', '-l']);

  return {
    ...taskSummary(root, taskId, state),
    files,
    missing: missingArtifacts(state.stage, files),
    audit,
    recentCommits: log.code === 0 ? log.stdout.trim().split('\n').filter(Boolean) : [],
    tags: tags.code === 0 ? tags.stdout.trim().split('\n').filter(Boolean) : [],
    events: (state.events ?? []).slice(-30).reverse(),
    questions: (state.questions ?? []).slice(-20).reverse(),
    corrections: (state.corrections ?? []).slice(-30).reverse(),
    history: stageHistory(state),
    currentBranch: branch,
  };
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Корни для доски: явный root, иначе все зарегистрированные workspace'ы.
 *
 * @param {object} ctx Контекст плагина.
 * @param {string|null} explicit Явный корень из запроса.
 * @returns {string[]}
 */
export function resolveRoots(ctx, explicit) {
  if (typeof explicit === 'string' && explicit.trim() !== '') return [explicit.trim()];
  const roots = [];
  try {
    const registry = typeof ctx?.get === 'function' ? ctx.get('workspaceRegistry') : null;
    if (registry && typeof registry.list === 'function') {
      for (const workspace of registry.list()) {
        const path = workspace?.path ?? workspace?.root ?? workspace?.directory;
        if (typeof path === 'string' && path) roots.push(path);
      }
    }
  } catch {
    // без реестра доска просто пустая
  }
  return roots;
}

/**
 * Оставляет только корни, где есть задачи отдела.
 *
 * @param {string[]} roots Корни.
 * @returns {Promise<string[]>}
 */
export async function rootsWithTasks(roots) {
  const result = [];
  for (const root of roots) {
    try {
      const entries = await readdir(join(root, DEPARTMENT_DIR), { withFileTypes: true });
      if (entries.some((entry) => entry.isDirectory())) result.push(root);
    } catch {
      // нет каталога — нет задач
    }
  }
  return result;
}

/**
 * История этапов: длительность, стоимость и гейты по каждому коммиту.
 *
 * @param {object} state Состояние задачи.
 * @returns {object[]}
 */
export function stageHistory(state) {
  const events = state.events ?? [];
  const commits = events.filter((event) => event.action === 'commit_pushed');
  const budgetHistory = state.gates?.budget?.history ?? [];
  let previous = events.length > 0 ? Date.parse(events[0].ts) : Date.now();
  return commits.map((commit, index) => {
    const time = Date.parse(commit.ts);
    const before = events.filter((event) => Date.parse(event.ts) <= time);
    const lastTests = [...before].reverse().find((event) => event.action === 'tests_passed' || event.action === 'tests_failed');
    const lastReview = [...before].reverse().find((event) => event.action === 'review_passed' || event.action === 'review_failed');
    const budget = budgetHistory.find((item) => item.stage === index + 1) ?? {};
    const row = {
      stage: index + 1,
      ts: commit.ts,
      durationMs: Math.max(0, time - previous),
      tokens: budget.tokens ?? 0,
      costUSD: budget.costUSD ?? 0,
      tests: lastTests ? (lastTests.action === 'tests_passed' ? 'pass' : 'fail') : 'none',
      review: lastReview ? (lastReview.action === 'review_passed' ? 'pass' : 'fail') : 'none',
    };
    previous = time;
    return row;
  });
}

/**
 * Агрегирует проекты по корням: сколько задач, на каких стадиях, бюджет.
 *
 * @param {string[]} roots Корни.
 * @returns {Promise<object[]>}
 */
export async function listProjects(roots) {
  const tasks = await listTasks(roots);
  const byRoot = new Map();
  for (const task of tasks) {
    if (!byRoot.has(task.root)) {
      byRoot.set(task.root, {
        root: task.root,
        name: task.root.split('/').filter(Boolean).pop() ?? task.root,
        tasks: [],
        stages: {},
        budgetUsed: 0,
        budgetLimit: 0,
        lastEvent: null,
      });
    }
    const project = byRoot.get(task.root);
    project.tasks.push(task);
    project.stages[task.stage] = (project.stages[task.stage] ?? 0) + 1;
    project.budgetUsed += Number(task.budget?.usedTokens ?? 0);
    project.budgetLimit += Number(task.budget?.limitTokens ?? 0);
    if (!project.lastEvent || String(task.lastEvent?.ts ?? '') > String(project.lastEvent.ts ?? '')) project.lastEvent = task.lastEvent ?? null;
  }
  return [...byRoot.values()].map((project) => ({
    ...project,
    taskCount: project.tasks.length,
    active: project.tasks.filter((task) => task.stage === 'executing').length,
  }));
}
