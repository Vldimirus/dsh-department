/**
 * Обсуждение задачи: структурированный документ до ТЗ.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { appendEvent, taskDir, writeState } from './store.js';

const list = (value) => (Array.isArray(value) ? value : []).filter((item) => String(item ?? '').trim() !== '');

/**
 * Пишет discussion.md и фиксирует событие.
 *
 * @param {string} root Корень.
 * @param {string} taskId Задача.
 * @param {object} state Состояние.
 * @param {object} input goals, nonGoals, users, constraints, risks, questions, decisions.
 * @returns {Promise<{ path: string }>}
 */
export async function writeDiscussion(root, taskId, state, input = {}) {
  const groups = [
    ['Цели', list(input.goals)],
    ['Не цели', list(input.nonGoals)],
    ['Пользователи', list(input.users)],
    ['Ограничения', list(input.constraints)],
    ['Риски', list(input.risks)],
    ['Открытые вопросы', list(input.questions)],
    ['Решения', list(input.decisions)],
  ];
  const lines = ['# Обсуждение задачи', ''];
  for (const [title, items] of groups) {
    lines.push(`## ${title}`, '');
    if (items.length === 0) lines.push('- _нет_');
    for (const item of items) lines.push(`- ${item}`);
    lines.push('');
  }
  lines.push('> Пока есть открытые вопросы, ТЗ нельзя утверждать.', '');
  const dir = taskDir(root, taskId);
  await mkdir(dir, { recursive: true });
  const path = join(dir, 'discussion.md');
  await writeFile(path, lines.join('\n'), 'utf8');
  const next = appendEvent(state, {
    actor: 'analyst',
    action: 'discussion_updated',
    detail: `цели=${list(input.goals).length} вопросы=${list(input.questions).length}`,
  });
  await writeState(root, next);
  return { path };
}
