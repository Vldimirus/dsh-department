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
 * Точка входа плагина.
 *
 * @param {object} ctx Контекст Cordis.
 * @param {object} [config] Конфигурация строки (пока не используется).
 */
export function apply(ctx, config) {
  void config;
  ctx.effect(() => registerTools(ctx), 'department: model tools');
  if (ctx.get('commands')) ctx.effect(() => registerCommands(ctx), 'department: slash command');
}
