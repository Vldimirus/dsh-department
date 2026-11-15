/**
 * Аудит задачи отдела: состояние ↔ артефакты ↔ git.
 * Нужен, чтобы тестировать плагин по следам, а не по тексту в чате.
 */

/** Артефакты, обязательные для стадии. */
const REQUIRED_ARTIFACTS = Object.freeze({
  analysis: ['task.md'],
  concept: ['task.md', 'analysis.md'],
  concept_review: ['task.md', 'analysis.md', 'concept.md'],
  spec: ['task.md', 'concept.md'],
  spec_review: ['task.md', 'concept.md', 'spec.md'],
  executing: ['task.md', 'concept.md', 'spec.md', 'plan.md'],
  done: ['task.md', 'concept.md', 'spec.md', 'plan.md'],
  blocked: ['task.md'],
});

/**
 * Проверяет задачу по чек-листу.
 *
 * @param {object} input Вход.
 * @param {object} input.state Состояние.
 * @param {Record<string, boolean>} input.files Наличие артефактов по имени.
 * @param {string|null} input.currentBranch Текущая ветка git.
 * @returns {{ ok: boolean, checks: Array<{ id: string, ok: boolean, detail: string }> }}
 */
export function verifyChecklist({ state, files, currentBranch }) {
  const checks = [];
  const check = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail });

  check('state_version', state.version === 1, `version=${state.version}`);
  check('events', Array.isArray(state.events) && state.events.length > 0, `events=${state.events?.length ?? 0}`);
  check('branch', currentBranch === state.branch, `expected=${state.branch} actual=${currentBranch ?? 'none'}`);

  const required = REQUIRED_ARTIFACTS[state.stage] ?? [];
  for (const name of required) {
    check(`artifact:${name}`, files[name] === true, files[name] ? 'present' : 'missing');
  }

  const approved = new Set((state.approvals ?? []).map((item) => item.doc));
  if (['spec', 'spec_review', 'executing', 'done'].includes(state.stage)) {
    check('approval:concept', approved.has('concept'), approved.has('concept') ? 'approved' : 'not approved');
  }
  if (['executing', 'done'].includes(state.stage)) {
    check('approval:spec', approved.has('spec'), approved.has('spec') ? 'approved' : 'not approved');
  }

  if (state.stage === 'executing') {
    check('gate:tests', state.gates?.tests?.status === 'pass', `status=${state.gates?.tests?.status ?? 'pending'}`);
  }

  return { ok: checks.every((item) => item.ok), checks };
}

/**
 * Человекочитаемый отчёт аудита.
 *
 * @param {{ ok: boolean, checks: Array<{ id: string, ok: boolean, detail: string }> }} report Отчёт.
 * @returns {string}
 */
export function formatReport(report) {
  const lines = report.checks.map((item) => `${item.ok ? 'OK  ' : 'FAIL'} ${item.id}: ${item.detail}`);
  return [`Аудит: ${report.ok ? 'PASS' : 'FAIL'}`, ...lines].join('\n');
}

/**
 * Обязательные артефакты для стадии.
 *
 * @param {string} stage Стадия.
 * @returns {string[]}
 */
export function requiredArtifacts(stage) {
  return REQUIRED_ARTIFACTS[stage] ?? [];
}

/**
 * Каких артефактов не хватает для стадии.
 *
 * @param {string} stage Стадия.
 * @param {Record<string, boolean>} files Наличие файлов.
 * @returns {string[]}
 */
export function missingArtifacts(stage, files) {
  return requiredArtifacts(stage).filter((name) => files[name] !== true);
}
