/**
 * Создание задачи отдела — общая логика для инструмента и HTTP-маршрута.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { appendEvent, createState, readState, taskDir, writeState } from './store.js';
import { ensureBranch, isRepo, runGit } from './git.js';

/**
 * Создаёт задачу: состояние, ветка, task.md.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Идентификатор.
 * @param {object} [options] Параметры.
 * @returns {Promise<object>} Состояние.
 */
export async function createDepartmentTask(root, taskId, options = {}) {
  if (!(await isRepo(root))) {
    // Удобство: пустая папка автоматически становится git-репозиторием.
    const init = await runGit(root, ['init', '-q']);
    if (init.code !== 0) throw new Error(`cannot init git repository: ${init.stderr ?? ''}`);
    await runGit(root, ['config', 'user.name', 'Department Bot']);
    await runGit(root, ['config', 'user.email', 'dept@pilot.local']);
    await runGit(root, ['add', '-A']);
    const commit = await runGit(root, ['commit', '--allow-empty', '-qm', 'init: project created by department']);
    if (commit.code !== 0) throw new Error(`cannot create initial commit: ${commit.stderr ?? ''}`);
  }
  const existing = await readState(root, taskId);
  if (existing) throw new Error(`task already exists: ${taskId}`);
  if (options.force !== true) {
    try {
      const entries = await readdir(join(root, 'docs', 'department'), { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const other = await readState(root, entry.name);
        if (other && ['done', 'release'].includes(other.stage)) {
          throw new Error(`в проекте уже есть завершённая задача ${entry.name} (${other.stage}). ` +
            'Для замечаний используй dept_reopen — не создавай новую задачу. ' +
            'Если нужна действительно новая версия — dept_start с force=true');
        }
      }
    } catch (error) {
      if (String(error.message).includes('завершённая задача')) throw error;
    }
  }

  let brief = typeof options.brief === 'string' ? options.brief.trim() : '';
  let testCommand = options.testCommand ?? null;
  if (!testCommand) {
    try {
      const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
      if (pkg?.scripts?.test) testCommand = 'npm test';
    } catch {
      // package.json может отсутствовать
    }
  }
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
    testCommand,
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
    '3. **Дизайн** (`design.md`): дизайнер собирает 3+ референса со ссылками, палитру,',
    '   типографику, сетку и макет главного экрана; человек утверждает на `design_review`.',
    '4. Проект запускается (`executing`) только когда утверждены **ТЗ, концепция и дизайн**.',
    '5. **План** (`plan.md`): первый документ исполнения; затем этапы, тесты, ревью, коммиты.',
    '',
    'Если по готовому проекту пришли замечания — НЕ создавай новую задачу (v2):',
    'используй `dept_reopen` для этой же задачи. Новая версия — только с force=true.',
    '',
    'Три главных документа — `spec.md`, `concept.md`, `plan.md` — всегда актуальны:',
    'правки через `dept_amend`/`dept_section`, в панели они закреплены сверху.',
  ].join('\n');
  const fullBrief = brief !== '' ? `${brief}\n\n${process}\n` : `${process}\n`;
  await mkdir(taskDir(root, taskId), { recursive: true });
  await writeFile(join(taskDir(root, taskId), 'task.md'), fullBrief, 'utf8');
  return writeState(root, state);
}
