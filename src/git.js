/**
 * Git-операции отдела: ветка задачи, коммит, тег, push.
 * Выполняются в корне проекта через `git` из PATH.
 */
import { execFile } from 'node:child_process';

/**
 * Запускает git и возвращает результат.
 *
 * @param {string} root Рабочий каталог.
 * @param {string[]} args Аргументы git.
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
export function runGit(root, args) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd: root, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        code: error?.code === undefined ? 0 : Number(error.code ?? 1),
        stdout: String(stdout ?? ''),
        stderr: String(stderr ?? ''),
      });
    });
  });
}

/**
 * Проверяет, что каталог — git-репозиторий.
 *
 * @param {string} root Рабочий каталог.
 * @returns {Promise<boolean>}
 */
export async function isRepo(root) {
  const result = await runGit(root, ['rev-parse', '--is-inside-work-tree']);
  return result.code === 0 && result.stdout.trim() === 'true';
}

/**
 * Текущая ветка.
 *
 * @param {string} root Рабочий каталог.
 * @returns {Promise<string|null>}
 */
export async function currentBranch(root) {
  const result = await runGit(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const name = result.code === 0 ? result.stdout.trim() : '';
  if (name && name !== 'HEAD') return name;
  // В репозитории без коммитов HEAD ещё не рождён: rev-parse не работает.
  const symbolic = await runGit(root, ['symbolic-ref', '--short', 'HEAD']);
  return symbolic.code === 0 ? symbolic.stdout.trim() : null;
}

/**
 * Создаёт ветку, если её ещё нет, и переключается на неё.
 *
 * @param {string} root Рабочий каталог.
 * @param {string} branch Имя ветки.
 * @returns {Promise<{ ok: boolean, branch: string, created: boolean, error?: string }>}
 */
export async function ensureBranch(root, branch) {
  const current = await currentBranch(root);
  if (current === branch) return { ok: true, branch, created: false };
  const exists = await runGit(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
  if (exists.code === 0) {
    const checkout = await runGit(root, ['checkout', branch]);
    return { ok: checkout.code === 0, branch, created: false, error: checkout.stderr };
  }
  const create = await runGit(root, ['checkout', '-b', branch]);
  return { ok: create.code === 0, branch, created: true, error: create.stderr };
}

/**
 * Коммитит все изменения.
 *
 * @param {string} root Рабочий каталог.
 * @param {string} message Сообщение коммита.
 * @returns {Promise<{ ok: boolean, commit: string|null, error?: string }>}
 */
export async function commitAll(root, message) {
  const add = await runGit(root, ['add', '-A']);
  if (add.code !== 0) return { ok: false, commit: null, error: add.stderr };
  // Текст git локализован, поэтому «нечего коммитить» определяем по status, а не по сообщению.
  const status = await runGit(root, ['status', '--porcelain']);
  if (status.code !== 0) return { ok: false, commit: null, error: status.stderr };
  const head = await runGit(root, ['rev-parse', '--short', 'HEAD']);
  if (status.stdout.trim() === '') {
    return { ok: true, commit: head.code === 0 ? head.stdout.trim() : null };
  }
  const commit = await runGit(root, ['commit', '-m', message]);
  if (commit.code !== 0) return { ok: false, commit: null, error: commit.stderr || commit.stdout };
  const created = await runGit(root, ['rev-parse', '--short', 'HEAD']);
  return { ok: true, commit: created.stdout.trim() };
}

/**
 * Ставит тег.
 *
 * @param {string} root Рабочий каталог.
 * @param {string} name Имя тега.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function tag(root, name) {
  // Существование тега проверяем списком: сообщение git может быть локализовано.
  const existing = await runGit(root, ['tag', '-l', name]);
  if (existing.code === 0 && existing.stdout.trim() === name) {
    return { ok: true, error: 'tag already exists' };
  }
  const result = await runGit(root, ['tag', name]);
  if (result.code === 0) return { ok: true };
  return { ok: false, error: result.stderr };
}

/**
 * Пуш ветки и тегов в удалённый репозиторий.
 *
 * @param {string} root Рабочий каталог.
 * @param {string} remote Имя remote.
 * @param {string} branch Имя ветки.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function push(root, remote, branch) {
  const result = await runGit(root, ['push', remote, branch, '--follow-tags']);
  return { ok: result.code === 0, error: result.code === 0 ? undefined : result.stderr };
}
