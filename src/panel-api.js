/**
 * Данные для Web-панели отдела: список задач и карточка одной задачи.
 * Только чтение: панель ничего не меняет, все действия — через инструменты.
 */
import { access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readState, summarize, DEPARTMENT_DIR } from './store.js';
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
export function progressOf(stage) {
  if (stage === 'blocked') return 0;
  if (stage === 'done') return 100;
  const index = STAGE_ORDER.indexOf(stage);
  if (index < 0) return 0;
  return Math.round((index / (STAGE_ORDER.length - 1)) * 100);
}

/**
 * Собирает краткую карточку задачи из состояния.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Идентификатор.
 * @param {object} state Состояние.
 * @returns {object}
 */
export function taskSummary(root, taskId, state) {
  const last = state.events?.[state.events.length - 1];
  return {
    root,
    taskId,
    title: state.title ?? taskId,
    stage: state.stage,
    progress: progressOf(state.stage),
    branch: state.branch,
    tests: state.gates?.tests?.status ?? 'pending',
    review: state.gates?.review?.status ?? 'pending',
    attempts: state.attempts?.current ?? 0,
    budget: state.gates?.budget ?? { usedTokens: 0, limitTokens: 0 },
    approvals: (state.approvals ?? []).map((item) => item.doc),
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
      tasks.push(taskSummary(root, entry.name, state));
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

  const names = ['task.md', 'analysis.md', 'concept.md', 'spec.md', 'plan.md', 'backlog.md'];
  const files = {};
  for (const name of names) {
    files[name] = await fileExists(join(root, DEPARTMENT_DIR, taskId, name));
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
