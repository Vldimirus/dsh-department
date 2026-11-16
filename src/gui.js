/**
 * Запуск нативных приложений (C++/Qt и др.) для бета-теста:
 * headless-команда, перехват вывода, необязательный скриншот.
 */
import { spawn } from 'node:child_process';

/**
 * Запускает команду с таймаутом и собирает вывод.
 *
 * @param {string} root Рабочий каталог.
 * @param {{ command: string, args?: string[], env?: Record<string, string>, timeoutMs?: number }} input Параметры.
 * @returns {Promise<{ code: number|null, stdout: string, stderr: string, timedOut: boolean }>}
 */
export async function runNative(root, input) {
  const timeout = Math.min(300000, Math.max(1000, Number(input.timeoutMs ?? 60000)));
  return await new Promise((resolve) => {
    const child = spawn(input.command, input.args ?? [], {
      cwd: root,
      env: { ...process.env, ...(input.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeout);
    child.stdout.on('data', (chunk) => {
      if (stdout.length < 20000) stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 20000) stderr += chunk.toString();
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: stderr + '\n' + error.message, timedOut });
    });
  });
}

/**
 * Запускает команду-скриншот (например, 'import -window root shot.png').
 *
 * @param {string} root Рабочий каталог.
 * @param {string} command Команда.
 * @param {Record<string, string>} [env] Переменные.
 * @returns {Promise<{ code: number|null, stderr: string }>}
 */
export async function runScreenshotCommand(root, command, env) {
  return await new Promise((resolve) => {
    const child = spawn('/bin/sh', ['-c', command], {
      cwd: root,
      env: { ...process.env, ...(env ?? {}) },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 4000) stderr += chunk.toString();
    });
    child.on('close', (code) => resolve({ code, stderr }));
    child.on('error', (error) => resolve({ code: null, stderr: error.message }));
  });
}
