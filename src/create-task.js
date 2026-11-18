/**
 * Создание задачи отдела — общая логика для инструмента и HTTP-маршрута.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { appendEvent, createState, readState, taskDir, writeState } from './store.js';
import { ensureBranch, isRepo } from './git.js';

/**
 * Создаёт задачу: состояние, ветка, task.md.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Идентификатор.
 * @param {object} [options] Параметры.
 * @returns {Promise<object>} Состояние.
 */
export async function createDepartmentTask(root, taskId, options = {}) {
  if (!(await isRepo(root))) throw new Error(`not a git repository: ${root}`);
  const existing = await readState(root, taskId);
  if (existing) throw new Error(`task already exists: ${taskId}`);

  let brief = typeof options.brief === 'string' ? options.brief.trim() : '';
  if (options.release === true) {
    const template = await readFile(new URL('../templates/release.md', import.meta.url), 'utf8');
    brief = (brief ? brief + '\n\n' : '') + 'Подготовка к релизу (шаблон):\n\n' + template;
  }

  let state = createState({
    root,
    taskId,
    title: options.title,
    branch: options.branch,
    origin: options.origin ?? null,
    testCommand: options.testCommand ?? null,
    maxAttempts: options.maxAttempts,
    budgetTokens: options.budgetTokens,
  });
  const branch = await ensureBranch(root, state.branch);
  if (!branch.ok) throw new Error(`cannot create branch ${state.branch}: ${branch.error ?? ''}`);
  state = appendEvent(state, { actor: 'manager', action: 'branch_ready', detail: branch.branch });

  const process = [
    '## Порядок работы отдела',
    '',
    '1. **Обсуждение** (`analysis`): вопросы, требования, ограничения. Код не пишется.',
    '2. **ТЗ и концепция** — в любом порядке, итеративно:',
    '   - ТЗ (`spec.md`) — требования; человек утверждает на `spec_review`;',
    '   - концепция (`concept.md`) — варианты архитектора, критика специалистов, вопросы человеку;',
    '     человек утверждает на `concept_review`;',
    '   - после утверждения первого документа отдел переходит к другому и уточняет его.',
    '3. Проект запускается (`executing`) только когда утверждены **оба**: ТЗ и концепция.',
    '4. **План** (`plan.md`): первый документ исполнения; затем этапы, тесты, ревью, коммиты.',
    '',
    'Три главных документа — `spec.md`, `concept.md`, `plan.md` — всегда актуальны:',
    'правки через `dept_amend`/`dept_section`, в панели они закреплены сверху.',
  ].join('\n');
  const fullBrief = brief !== '' ? `${brief}\n\n${process}\n` : `${process}\n`;
  await mkdir(taskDir(root, taskId), { recursive: true });
  await writeFile(join(taskDir(root, taskId), 'task.md'), fullBrief, 'utf8');
  return writeState(root, state);
}
