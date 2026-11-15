/**
 * Плагин «ИИ-отдел разработки» (dsh-department).
 *
 * Даёт модели инструменты dept_* и человеку команду /dept:
 * состояние задачи, утверждения, гейты, фиксация этапов в git.
 */
import { registerCommands } from './src/commands.js';
import { registerTools } from './src/tools.js';

/** Имя плагина в композиции. */
export const name = 'department';

/** Сервисы, без которых плагин не работает. */
export const inject = ['tools', 'commands'];

/**
 * Оборачивает список диспозеров в один Cordis-диспозер.
 * `ctx.effect` требует функцию, а регистрации возвращают массив функций.
 *
 * @param {Array<() => void>} disposers Диспозеры.
 * @returns {() => void}
 */
function combine(disposers) {
  return () => {
    for (const dispose of disposers) {
      if (typeof dispose === 'function') dispose();
    }
  };
}

/**
 * Точка входа плагина.
 *
 * @param {object} ctx Контекст Cordis.
 * @param {object} [config] Конфигурация строки (пока не используется).
 */
export function apply(ctx, config) {
  void config;
  ctx.effect(() => combine(registerTools(ctx)), 'department: model tools');

  ctx.effect(() => combine(registerCommands(ctx)), 'department: slash command');
}
