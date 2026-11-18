/**
 * Глобальные настройки отдела: включён ли отдел как процесс.
 *
 * Файл лежит вне проектов, чтобы одна кнопка управляла всеми задачами.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SETTINGS_FILE = join(homedir(), '.dsh', 'department-settings.json');

/**
 * Читает настройки (по умолчанию отдел включён).
 *
 * @returns {Promise<{ enabled: boolean }>}
 */
export async function readSettings() {
  try {
    const data = JSON.parse(await readFile(SETTINGS_FILE, 'utf8'));
    return { enabled: data.enabled !== false };
  } catch {
    return { enabled: true };
  }
}

/**
 * Сохраняет настройки.
 *
 * @param {{ enabled?: boolean }} patch Изменения.
 * @returns {Promise<{ enabled: boolean }>}
 */
export async function writeSettings(patch) {
  const current = await readSettings();
  const next = { ...current, ...(patch ?? {}) };
  next.enabled = next.enabled !== false;
  await mkdir(join(homedir(), '.dsh'), { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2) + '\n', 'utf8');
  return next;
}

/**
 * Бросает ошибку, если отдел выключен.
 *
 * @param {string} action Что пытались сделать.
 */
export async function assertDepartmentEnabled(action = 'работа отдела') {
  const settings = await readSettings();
  if (!settings.enabled) throw new Error(`отдел выключен человеком: ${action} недоступно (включи в панели «Отдел») `);
}
