/**
 * Цикл работы с провалом: данные → анализ → план → изменения → тесты.
 *
 * Плагин не даёт повторять прогон «вслепую»: после провала он пишет
 * stages/NN/failure.md с данными, а до следующего прогона требует, чтобы
 * в файле были заполнены разделы «Анализ» и «План».
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { taskDir } from './store.js';

const SEP = String.fromCharCode(10);

/**
 * Проверяет, что раздел заполнен (есть текст после заголовка).
 *
 * @param {string} text Markdown.
 * @param {string} title Название раздела.
 * @returns {boolean}
 */
export function hasSection(text, title) {
  const lines = String(text ?? '').split(SEP);
  const start = lines.findIndex((line) => new RegExp(`##\\s*${title}`, 'i').test(line));
  if (start < 0) return false;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line.startsWith('## ')) return false;
    if (line.length > 0) return true;
  }
  return false;
}

/**
 * Путь к файлу провала этапа.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Задача.
 * @param {number} stageNo Номер этапа.
 * @returns {string}
 */
export function failurePath(root, taskId, stageNo) {
  return join(taskDir(root, taskId), 'stages', String(stageNo).padStart(2, '0'), 'failure.md');
}

/**
 * Записывает данные провала, сохраняя уже написанные анализ и план.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Задача.
 * @param {number} stageNo Номер этапа.
 * @param {string} output Вывод тестов.
 * @returns {Promise<void>}
 */
export async function writeFailureData(root, taskId, stageNo, output) {
  const path = failurePath(root, taskId, stageNo);
  const current = await readFile(path, 'utf8').catch(() => '');
  const block = [
    `# stages/${String(stageNo).padStart(2, '0')} — failure`,
    '',
    '## Данные',
    '',
    ...String(output ?? '').split(SEP).map((line) => `    ${line}`),
    '',
    '## Лог (контрольные точки)',
    '',
    '_Приложи фрагмент debug-лога, если он есть._',
    '',
    '## Анализ',
    '',
    '',
    '## План',
    '',
    '',
  ].join(SEP);
  await mkdir(join(taskDir(root, taskId), 'stages', String(stageNo).padStart(2, '0')), { recursive: true });
  const merged = current.trim() ? `${current.trimEnd()}${SEP}${SEP}---${SEP}${SEP}${block}` : block;
  await writeFile(path, merged, 'utf8');
}

/**
 * Разрешает повторный прогон только после анализа и плана.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Задача.
 * @param {number} stageNo Номер этапа.
 * @returns {Promise<void>}
 */
export async function assertRetryReady(root, taskId, stageNo) {
  const text = await readFile(failurePath(root, taskId, stageNo), 'utf8').catch(() => '');
  if (!hasSection(text, 'Анализ') || !hasSection(text, 'План')) {
    throw new Error(
      'retry blocked: заполни в stages/NN/failure.md разделы «## Анализ» и «## План» (цикл: данные → анализ → план → изменения → тесты)',
    );
  }
}
