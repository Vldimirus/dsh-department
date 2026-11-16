/**
 * Библиотека документов отдела: список файлов задачи с типами и содержимым.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { taskDir } from './store.js';

const TYPE_BY_PATTERN = [
  [/memos?[/\\]/, 'служебная записка'],
  [/rework[/\\]/, 'план переработки'],
  [/sections[/\\]/, 'раздел специалиста'],
  [/bugs?[/\\]/, 'баг-репорт'],
  [/stages[/\\]\d+[/\\]report\.md$/, 'отчёт этапа'],
  [/stages[/\\]\d+[/\\]review\.md$/, 'ревью этапа'],
  [/stages[/\\]\d+[/\\]failure\.md$/, 'анализ провала'],
  [/stages[/\\]\d+[/\\]approach\.md$/, 'смена подхода'],
  [/backlog\.md$/, 'бэклог'],
  [/plan\.md$/, 'план'],
  [/spec\.md$/, 'ТЗ'],
  [/concept\.md$/, 'концепция'],
  [/analysis\.md$/, 'анализ'],
  [/task\.md$/, 'задача'],
];

/**
 * Классифицирует документ по пути.
 *
 * @param {string} path Относительный путь.
 * @returns {string}
 */
export function documentType(path) {
  const normalized = String(path).split(sep).join('/');
  for (const [pattern, type] of TYPE_BY_PATTERN) {
    if (pattern.test(normalized)) return type;
  }
  return 'документ';
}

/**
 * Читает заголовок документа (первая строка `# ...`).
 *
 * @param {string} text Текст.
 * @returns {string}
 */
function titleOf(text) {
  const line = String(text).split('\n').find((row) => row.trim().startsWith('#'));
  return line ? line.replace(/^#+\s*/, '').trim().slice(0, 120) : '';
}

/**
 * Список документов задачи.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Задача.
 * @returns {Promise<Array<object>>}
 */
export async function listDocuments(root, taskId) {
  const base = taskDir(root, taskId);
  const documents = [];
  await walk(base, base, documents);
  documents.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  return documents;
}

async function walk(base, dir, out) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(base, full, out);
      continue;
    }
    if (!entry.name.endsWith('.md')) continue;
    try {
      const info = await stat(full);
      const text = await readFile(full, 'utf8');
      out.push({
        path: relative(base, full).split(sep).join('/'),
        type: documentType(relative(base, full)),
        title: titleOf(text),
        size: info.size,
        ts: info.mtime.toISOString(),
      });
    } catch {
      // пропускаем нечитаемые
    }
  }
}

/**
 * Читает документ задачи с проверкой пути.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Задача.
 * @param {string} path Путь относительно каталога задачи.
 * @returns {Promise<string>}
 */
export async function readDocument(root, taskId, path) {
  const base = taskDir(root, taskId);
  const target = join(base, path);
  if (!target.startsWith(base)) throw new Error('document path must be inside the task');
  return await readFile(target, 'utf8');
}
