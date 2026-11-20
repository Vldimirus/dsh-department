/**
 * Просмотр каталогов для выбора корня проекта.
 */
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/**
 * Список подкаталогов.
 *
 * @param {string} [target] Каталог (по умолчанию домашний).
 * @returns {Promise<{ path: string, parent: string|null, dirs: string[] }>}
 */
export async function listDirectories(target) {
  const path = resolve(String(target ?? '').trim() || homedir());
  const info = await stat(path);
  if (!info.isDirectory()) throw new Error('not a directory');
  const entries = await readdir(path, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  const parent = dirname(path);
  return { path, parent: parent === path ? null : parent, dirs };
}

/**
 * Есть ли git-репозиторий в каталоге.
 *
 * @param {string} path Каталог.
 * @returns {Promise<boolean>}
 */
export async function isGitProject(path) {
  try {
    const info = await stat(join(path, '.git'));
    return info.isDirectory() || info.isFile();
  } catch {
    return false;
  }
}
