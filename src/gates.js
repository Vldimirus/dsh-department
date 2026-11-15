/**
 * Гейты отдела: запуск команды проверки и оценка результата.
 */
import { exec } from 'node:child_process';

/**
 * Запускает shell-команду в каталоге проекта.
 *
 * @param {string} cwd Рабочий каталог.
 * @param {string} command Команда.
 * @param {number} [timeoutMs] Таймаут.
 * @returns {Promise<{ code: number, output: string }>}
 */
export function runCommand(cwd, command, timeoutMs = 600000) {
  return new Promise((resolve) => {
    exec(command, { cwd, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error ? Number(error.code ?? 1) : 0;
      resolve({ code, output: `${stdout ?? ''}${stderr ?? ''}` });
    });
  });
}

/**
 * Последние строки вывода.
 *
 * @param {string} text Текст.
 * @param {number} count Сколько строк оставить.
 * @returns {string}
 */
export function tailLines(text, count = 20) {
  const lines = String(text ?? '').trimEnd().split('\n');
  return lines.slice(Math.max(0, lines.length - count)).join('\n');
}

/**
 * Гейт тестов: команда должна завершиться с кодом 0.
 *
 * @param {string} root Корень проекта.
 * @param {string} command Команда тестов.
 * @returns {Promise<{ ok: boolean, exitCode: number, summary: string }>}
 */
export async function runTestGate(root, command) {
  if (typeof command !== 'string' || command.trim() === '') {
    throw new Error('testCommand is not configured for this task');
  }
  const result = await runCommand(root, command);
  return {
    ok: result.code === 0,
    exitCode: result.code,
    summary: tailLines(result.output),
  };
}
