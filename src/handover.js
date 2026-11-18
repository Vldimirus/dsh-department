/**
 * Подготовка к продакшену: пакет документации для передачи.
 */
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { appendEvent, readState, taskDir, writeState } from './store.js';
import { runGit } from './git.js';

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

/**
 * Собирает delivery/: RUN.md, MANUAL-QA.md, CHANGELOG.md, RELEASE.md и копии главных документов.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Задача.
 * @param {object} [options] version, run, port, notes.
 * @returns {Promise<{ dir: string, files: string[], version: string }>}
 */
export async function buildHandover(root, taskId, options = {}) {
  const state = await readState(root, taskId);
  if (!state) throw new Error(`task not found: ${taskId}`);
  const dir = join(taskDir(root, taskId), 'delivery');
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, 'docs'), { recursive: true });

  const branch = await runGit(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const commit = await runGit(root, ['rev-parse', '--short', 'HEAD']);
  const version = String(options.version ?? '1.0.0');
  const run = String(options.run ?? 'укажите команду запуска');
  const port = String(options.port ?? '');
  const notes = String(options.notes ?? '');
  const branchName = branch.code === 0 ? branch.stdout.trim() : state.branch;
  const commitHash = commit.code === 0 ? commit.stdout.trim() : '—';

  const runDoc = [
    `# Запуск: ${state.title ?? taskId}`,
    '',
    `- Версия: **${version}**`,
    `- Ветка: \`${branchName}\``,
    `- Коммит: \`${commitHash}\``,
    '',
    '## Требования',
    '',
    '- окружение и зависимости продукта (см. README продукта);',
    '- свободные порты и доступ к локальной сети, если нужно.',
    '',
    '## Запуск',
    '',
    '```bash',
    run,
    '```',
    '',
    port ? `Открыть: \`${port}\`` : '',
    notes ? `\n## Заметки\n\n${notes}` : '',
    '',
    '## Проверка после запуска',
    '',
    '1. Продукт открывается/стартует без ошибок.',
    '2. Основной сценарий работает.',
    '3. Данные сохраняются и восстанавливаются.',
    '4. Ошибки не ломают интерфейс.',
    '',
    '## Известные ограничения',
    '',
    'См. README продукта и `docs/releases/`.',
  ].filter((line) => line !== '').join('\n') + '\n';
  await writeFile(join(dir, 'RUN.md'), runDoc, 'utf8');

  const qa = [
    `# Ручное тестирование: ${state.title ?? taskId} ${version}`,
    '',
    'Отмечай: ✅ работает / ⚠️ странно / ❌ сломано. Для багов — шаги, ожидаемое, фактическое.',
    '',
    '## 1. Запуск',
    '- [ ] Продукт запускается по инструкции RUN.md.',
    '- [ ] Нет ошибок в консоли при старте.',
    '',
    '## 2. Основные сценарии',
    '- [ ] Главный сценарий проходит от начала до конца.',
    '- [ ] Второстепенные сценарии не ломаются.',
    '',
    '## 3. Данные',
    '- [ ] Сохранение и загрузка работают.',
    '- [ ] Некорректные данные обрабатываются без падения.',
    '',
    '## 4. Интерфейс',
    '- [ ] Все элементы управления доступны.',
    '- [ ] Тексты понятны, без обрезаний.',
    '',
    '## 5. Ограничения',
    '- [ ] Известные ограничения подтверждены и не мешают работе.',
  ].join('\n') + '\n';
  await writeFile(join(dir, 'MANUAL-QA.md'), qa, 'utf8');

  // CHANGELOG: копия корневого, иначе из событий задачи.
  const rootChangelog = join(root, 'CHANGELOG.md');
  if (await exists(rootChangelog)) {
    await copyFile(rootChangelog, join(dir, 'CHANGELOG.md'));
  } else {
    const lines = ['# Changelog', '', `## ${version}`, ''];
    for (const event of (state.events ?? []).slice(-20)) {
      lines.push(`- ${event.action}${event.detail ? ': ' + String(event.detail).slice(0, 120) : ''}`);
    }
    await writeFile(join(dir, 'CHANGELOG.md'), lines.join('\n') + '\n', 'utf8');
  }

  const docs = ['spec.md', 'concept.md', 'plan.md'];
  for (const name of docs) {
    const source = join(taskDir(root, taskId), name);
    if (await exists(source)) await copyFile(source, join(dir, 'docs', name));
  }

  const release = [
    `# Передача в продакшен: ${state.title ?? taskId}`,
    '',
    `- Версия: **${version}**`,
    `- Ветка: \`${branchName}\``,
    `- Коммит: \`${commitHash}\``,
    '',
    '## Состав пакета',
    '',
    '- `RUN.md` — как запустить и проверить;',
    '- `MANUAL-QA.md` — чек-лист ручного тестирования;',
    '- `CHANGELOG.md` — что вошло в версию;',
    '- `docs/spec.md`, `docs/concept.md`, `docs/plan.md` — главные документы проекта.',
    '',
    '## Статус',
    '',
    `Стадия: \`${state.stage}\`. Тесты: \`${state.gates?.tests?.status ?? 'pending'}\`.`,
  ].join('\n') + '\n';
  await writeFile(join(dir, 'RELEASE.md'), release, 'utf8');

  const next = appendEvent(state, { actor: 'manager', action: 'handover_ready', detail: `version=${version} branch=${branchName} commit=${commitHash}` });
  await writeState(root, next);
  return { dir, files: ['RUN.md', 'MANUAL-QA.md', 'CHANGELOG.md', 'RELEASE.md'], version };
}
