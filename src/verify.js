/**
 * Аудит задачи отдела: состояние ↔ артефакты ↔ git.
 * Нужен, чтобы тестировать плагин по следам, а не по тексту в чате.
 */

/** Артефакты, обязательные для стадии. */
const REQUIRED_ARTIFACTS = Object.freeze({
  analysis: ['task.md'],
  spec: ['task.md', 'analysis.md', 'discussion.md'],
  spec_review: ['task.md', 'analysis.md', 'discussion.md', 'spec.md'],
  concept: ['task.md', 'analysis.md', 'discussion.md', 'spec.md'],
  concept_review: ['task.md', 'analysis.md', 'discussion.md', 'spec.md', 'concept.md'],
  executing: ['task.md', 'analysis.md', 'discussion.md', 'spec.md', 'concept.md', 'plan.md', 'README.md'],
  release: ['task.md', 'analysis.md', 'discussion.md', 'spec.md', 'concept.md', 'plan.md', 'delivery/RUN.md', 'delivery/MANUAL-QA.md', 'delivery/CHANGELOG.md'],
  done: ['task.md', 'analysis.md', 'discussion.md', 'spec.md', 'concept.md', 'plan.md', 'delivery/RUN.md', 'delivery/MANUAL-QA.md', 'delivery/CHANGELOG.md'],
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
  if (['executing', 'done'].includes(state.stage)) {
    check('approval:spec', approved.has('spec'), approved.has('spec') ? 'approved' : 'not approved');
    check('approval:concept', approved.has('concept'), approved.has('concept') ? 'approved' : 'not approved');
  }

  if (state.stage === 'executing') {
    // Сразу после коммита гейты сброшены: этап закрыт, ждём старта следующего.
    const events = state.events ?? [];
    const lastAction = events.at(-1)?.action ?? '';
    const stageClosed = lastAction === 'commit_pushed';
    check('gate:tests', stageClosed || state.gates?.tests?.status === 'pass', stageClosed ? 'этап закрыт коммитом' : `status=${state.gates?.tests?.status ?? 'pending'}`);
    if (stageClosed) {
      check('gate:review', true, 'этап закрыт коммитом');
      return { ok: checks.every((item) => item.ok), checks };
    }

    // Гейты должны быть получены после последнего коммита этапа, иначе pass
    // предыдущего этапа «переезжает» на текущий.
    check('stage:review', files['stage:review'] === true, files['stage:review'] ? 'present' : 'missing');
    check('stage:report', files['stage:report'] === true, files['stage:report'] ? 'present' : 'missing');
    const lastCommit = lastEventTime(state, 'commit_pushed');
    const lastTests = lastEventTime(state, 'tests_passed');
    const lastReview = lastEventTime(state, 'review_passed');
    check('gate:tests:fresh', lastTests !== null && (lastCommit === null || lastTests >= lastCommit), `tests=${lastTests ?? 'none'} commit=${lastCommit ?? 'none'}`);
    check('gate:review:fresh', lastReview !== null && (lastCommit === null || lastReview >= lastCommit), `review=${lastReview ?? 'none'} commit=${lastCommit ?? 'none'}`);
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

/**
 * Время последнего события с указанным действием.
 *
 * @param {object} state Состояние.
 * @param {string} action Действие.
 * @returns {number|null} Метка времени в мс.
 */
function lastEventTime(state, action) {
  const events = state.events ?? [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]?.action === action) {
      const time = Date.parse(events[index].ts);
      return Number.isFinite(time) ? time : null;
    }
  }
  return null;
}
