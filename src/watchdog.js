/**
 * Сторож входящих данных от человека.
 *
 * Раз в INTERVAL_MS проверяет задачи отделов: появились ли новые корректировки,
 * ответы на вопросы или замечания к запискам. Если да — собирает пакет и будит
 * руководителя через followup, один раз на набор новых данных.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readSettings } from './settings.js';

const INTERVAL_MS = 5 * 60 * 1000;
const IDLE_MINUTES = 5;
const WAKE_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * Читает состояние задачи из файла.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Задача.
 * @returns {Promise<object|null>}
 */
async function readTaskState(root, taskId) {
  try {
    return JSON.parse(await readFile(join(root, 'docs', 'department', taskId, 'state.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Задачи проекта.
 *
 * @param {string} root Корень.
 * @returns {Promise<string[]>}
 */
async function taskIds(root) {
  try {
    const entries = await readdir(join(root, 'docs', 'department'), { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Новые данные от человека по задаче.
 *
 * @param {object} state Состояние.
 * @returns {{ items: string[], signature: string }}
 */
export function pendingHumanInput(state) {
  const items = [];
  for (const correction of (state.corrections ?? []).filter((item) => item.status === 'new')) {
    items.push(`корректировка ${correction.id} (${correction.doc}): ${correction.subject || correction.text.slice(0, 80)}`);
  }
  for (const question of (state.questions ?? []).filter((item) => item.status === 'answered' || item.status === 'changes_requested')) {
    items.push(question.status === 'answered'
      ? `ответ на вопрос ${question.id}: ${question.answer}`
      : `замечания к записке ${question.id}: ${question.answer}`);
  }
  const signature = items.join('|');
  return { items, signature };
}

/**
 * Запускает сторож.
 *
 * @param {object} options Параметры.
 * @param {object} options.ctx Контекст плагина.
 * @param {number} [options.intervalMs] Интервал проверки.
 * @returns {{ dispose: () => void }}
 */
export function createWatchdog({ ctx, intervalMs = INTERVAL_MS }) {
  const seenItems = new Map();
  const lastWake = new Map();
  let timer = null;
  let running = false;

  const check = async () => {
    if (running) return;
    running = true;
    try {
      const settings = await readSettings();
      if (!settings.enabled) return;
      const registry = typeof ctx?.get === 'function' ? ctx.get('agents') : null;
      if (!registry || typeof registry.list !== 'function') return;
      const agents = registry.list();
      for (const agent of agents) {
        const cwd = agent?.session?.header?.cwd;
        if (!cwd || !agent?.followup) continue;
        if (agent.status && agent.status !== 'idle') continue;
        const ids = await taskIds(cwd);
        const messages = [];
        for (const taskId of ids) {
          const state = await readTaskState(cwd, taskId);
          if (!state || state.paused?.value) continue;
          const { items } = pendingHumanInput(state);
          if (items.length === 0) continue;
          const key = (agent.id ?? cwd) + ':' + taskId;
          if (!seenItems.has(key)) seenItems.set(key, new Set());
          const seen = seenItems.get(key);
          const fresh = items.filter((item) => !seen.has(item));
          if (fresh.length === 0) continue;
          for (const item of fresh) seen.add(item);
          messages.push(`Задача ${taskId}:\n- ` + fresh.join('\n- '));
        }
        if (messages.length > 0) {
          try {
            agent.followup({
              role: 'user',
              content: [{
                type: 'text',
                text: `Новые данные от человека:\n\n${messages.join('\n\n')}\n\nОбработай: dept_correction (новые корректировки), dept_status, примени решения инструментами (dept_budget, dept_roles, dept_amend), закрой корректировки с итогом.`,
              }],
              source: { kind: 'dsh-department' },
            });
          } catch {
            // агент мог закрыться — пропускаем
          }
        }

        // антизалипание: задача активна, но агент простаивает слишком долго
        if (!agent.status || agent.status === 'idle') {
          for (const taskId of ids) {
            const state = await readTaskState(cwd, taskId);
            if (!state || state.paused?.value) continue;
            if (state.stage === 'done' || state.stage === 'blocked') continue;
            const events = state.events ?? [];
            const last = events.at(-1);
            const idleMinutes = last ? (Date.now() - Date.parse(last.ts)) / 60000 : 999;
            if (idleMinutes < IDLE_MINUTES) continue;
            const key = (agent.id ?? cwd) + ':idle:' + taskId;
            const previous = lastWake.get(key) ?? 0;
            if (Date.now() - previous < WAKE_COOLDOWN_MS) continue;
            lastWake.set(key, Date.now());
            const ready = state.gates?.tests?.status === 'pass' && state.gates?.review?.status === 'pass';
            try {
              agent.followup({
                role: 'user',
                content: [{
                  type: 'text',
                  text: `Отдел простаивает ${Math.round(idleMinutes)} мин по задаче ${taskId} (стадия ${state.stage}).` +
                    (ready ? ' Гейты зелёные: dept_verify и dept_commit.' : ' Проверь dept_health и продолжи следующий шаг по плану или зафиксируй blocked с причиной.'),
                }],
                source: { kind: 'dsh-department' },
              });
            } catch {
              // агент закрылся
            }
          }
        }
      }
    } finally {
      running = false;
    }
  };

  timer = setInterval(() => { void check(); }, Math.max(30000, Number(intervalMs)));
  if (typeof timer.unref === 'function') timer.unref();
  return {
    dispose() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
