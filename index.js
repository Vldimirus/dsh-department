/**
 * Плагин «ИИ-отдел разработки» (dsh-department).
 *
 * Даёт модели инструменты dept_* и человеку команду /dept,
 * а Web-панели — доску задач и карточку задачи.
 */
import { registerCommands } from './src/commands.js';
import { registerTools } from './src/tools.js';
import { registerDepartmentRoutes } from './src/routes.js';
import { createActivityTracker } from './src/activity.js';

/** Имя плагина в композиции. */
export const name = 'department';

/** Сервисы, без которых плагин не работает. */
export const inject = ['tools', 'commands', 'workspaceRegistry', 'agents'];

/**
 * Оборачивает список диспозеров в один Cordis-диспозер.
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
 * @param {object} [config] Конфигурация строки.
 */
export function apply(ctx, config) {
  void config;
  const activity = createActivityTracker(ctx);
  ctx.effect(() => () => activity.dispose(), 'department: activity tracker');
  ctx.effect(() => combine(registerTools(ctx)), 'department: model tools');
  ctx.effect(() => combine(registerCommands(ctx)), 'department: slash command');

  // Панель: маршруты появляются, когда поднимается сервис соединений.
  ctx.inject(['connection'], (connectionCtx) => {
    ctx.effect(() => {
      const { dispose } = registerDepartmentRoutes(connectionCtx, activity);
      return dispose;
    }, 'department: panel routes');
  });
}
