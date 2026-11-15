/**
 * Слэш-команда `/dept` для человека: быстрый статус и действия без модели.
 */
import { approveDocument, readState, summarize, writeState } from './store.js';

function usage() {
  return [
    'Команды ИИ-отдела:',
    '- `/dept status <root> <taskId>` — состояние задачи',
    '- `/dept approve <root> <taskId> concept|spec <by>` — зафиксировать утверждение',
  ].join('\n');
}

/**
 * Регистрирует команду `/dept`.
 *
 * @param {object} ctx Контекст плагина.
 * @returns {Array<() => void>} Диспозеры.
 */
export function registerCommands(ctx) {
  if (!ctx.commands || typeof ctx.commands.register !== 'function') return [];
  return [
    ctx.commands.register({
      name: 'dept',
      description: 'ИИ-отдел: статус задачи и утверждение документов',
      input: { hint: '<status|approve> <root> <taskId> ...' },
      async handler({ rawInput }) {
        const tokens = String(rawInput ?? '').trim().split(/\s+/).filter(Boolean);
        const [action, root, taskId, ...rest] = tokens;
        if (!action || !root || !taskId) return { kind: 'error', text: usage() };
        try {
          const state = await readState(root, taskId);
          if (!state) return { kind: 'error', text: `Задача не найдена: ${taskId}` };
          if (action === 'status') return { kind: 'text', text: summarize(state) };
          if (action === 'approve') {
            const [doc, by] = rest;
            if (!doc || !by) return { kind: 'error', text: usage() };
            const next = await writeState(root, approveDocument(state, { doc, by, via: 'command' }));
            return { kind: 'text', text: summarize(next) };
          }
          return { kind: 'error', text: `Неизвестное действие: ${action}\n${usage()}` };
        } catch (error) {
          return { kind: 'error', text: `Ошибка: ${error instanceof Error ? error.message : String(error)}` };
        }
      },
    }),
  ];
}
