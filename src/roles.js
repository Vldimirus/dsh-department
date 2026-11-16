/**
 * Конфигурация ролей ИИ-отдела по умолчанию.
 * Позже переопределяется на проект через `projects/<id>.json`.
 */
export const DEFAULT_ROLES = Object.freeze({
  manager: Object.freeze({
    title: 'Руководитель',
    model: null,
    reasoning: 'high',
    tools: ['dept_*', 'subagent', 'workflow', 'ask_user_question'],
    maxAttempts: 0,
  }),
  analyst: Object.freeze({
    title: 'Аналитик',
    model: null,
    reasoning: 'medium',
    tools: ['read', 'grep', 'glob', 'bash'],
    maxAttempts: 2,
  }),
  architect: Object.freeze({
    title: 'Архитектор',
    model: null,
    reasoning: 'high',
    tools: ['read', 'grep', 'glob', 'write', 'edit'],
    maxAttempts: 2,
  }),
  coder: Object.freeze({
    title: 'Кодер',
    model: null,
    reasoning: 'low',
    tools: ['read', 'grep', 'glob', 'write', 'edit', 'bash'],
    maxAttempts: 4,
  }),
  tester: Object.freeze({
    title: 'Тестер',
    model: null,
    reasoning: 'low',
    tools: ['bash', 'read'],
    maxAttempts: 3,
  }),
  instrumenter: Object.freeze({
    title: 'Инструментатор',
    model: null,
    reasoning: 'low',
    tools: ['read', 'write', 'edit', 'bash'],
    maxAttempts: 2,
  }),
  'test-author': Object.freeze({
    title: 'Автор тестов',
    model: null,
    reasoning: 'medium',
    tools: ['read', 'grep', 'glob', 'write', 'bash'],
    maxAttempts: 2,
  }),
  'peer-reviewer': Object.freeze({
    title: 'Пир-ревьюер',
    model: null,
    reasoning: 'medium',
    tools: ['read', 'grep', 'glob', 'bash'],
    maxAttempts: 2,
  }),
  researcher: Object.freeze({
    title: 'Исследователь',
    model: null,
    reasoning: 'medium',
    tools: ['web_search', 'web_fetch', 'read', 'write', 'bash'],
    maxAttempts: 2,
  }),
  designer: Object.freeze({
    title: 'Дизайнер',
    model: null,
    reasoning: 'medium',
    tools: ['web_search', 'web_fetch', 'read', 'write', 'bash'],
    maxAttempts: 2,
  }),
  artist: Object.freeze({
    title: 'Художник',
    model: null,
    reasoning: 'low',
    tools: ['dept_art', 'read', 'write', 'bash'],
    maxAttempts: 3,
  }),
  'senior-coder': Object.freeze({
    title: 'Сеньор-кодер',
    model: null,
    reasoning: 'high',
    tools: ['read', 'grep', 'glob', 'bash', 'edit', 'write'],
    maxAttempts: 2,
  }),
  supervisor: Object.freeze({
    title: 'Супервайзер',
    model: null,
    reasoning: 'high',
    tools: ['read', 'grep', 'dept_health', 'dept_report', 'dept_ask'],
    maxAttempts: 1,
  }),
  'beta-tester': Object.freeze({
    title: 'Бета-тестер',
    model: null,
    reasoning: 'medium',
    tools: ['bash', 'read', 'write', 'dept_bug', 'dept_browse', 'dept_report'],
    maxAttempts: 2,
  }),
  reviewer: Object.freeze({
    title: 'Ревьюер',
    model: null,
    reasoning: 'medium',
    tools: ['read', 'grep', 'glob', 'bash'],
    maxAttempts: 2,
  }),
  archivist: Object.freeze({
    title: 'Архивариус',
    model: null,
    reasoning: 'low',
    tools: ['bash', 'read', 'write'],
    maxAttempts: 2,
  }),
});

/**
 * Возвращает конфигурацию роли с учётом переопределений проекта.
 *
 * @param {string} name Имя роли.
 * @param {object} [overrides] Переопределения `{ [role]: partial }`.
 * @returns {object|null} Копия конфигурации или null для неизвестной роли.
 */
export function resolveRole(name, overrides = {}) {
  const base = DEFAULT_ROLES[name];
  if (!base) return null;
  return { ...base, ...(overrides?.[name] ?? {}), name };
}

/**
 * Список имён ролей в порядке конвейера.
 *
 * @returns {string[]}
 */
export function roleOrder() {
  return [
    'manager',
    'analyst',
    'architect',
    'coder',
    'instrumenter',
    'test-author',
    'peer-reviewer',
    'tester',
    'researcher',
    'designer',
    'artist',
    'senior-coder',
    'supervisor',
    'beta-tester',
    'reviewer',
    'archivist',
  ];
}

/**
 * Проверяет, что утверждение подписано человеком, а не ролью отдела.
 *
 * @param {string} name Имя утверждающего.
 * @returns {boolean}
 */
export function isHumanApprover(name) {
  const normalized = String(name ?? '').trim().toLowerCase();
  if (normalized === '') return false;
  return !Object.prototype.hasOwnProperty.call(DEFAULT_ROLES, normalized);
}
