/**
 * Гейты утверждения документов: нельзя утвердить ТЗ/концепцию, если обсуждение не закрыто.
 */
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listQuestions, taskDir } from './store.js';

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

/**
 * Проверяет готовность документа к утверждению человеком.
 *
 * @param {string} root Корень проекта.
 * @param {string} taskId Задача.
 * @param {'spec'|'concept'} doc Документ.
 * @param {object} state Состояние.
 */
export async function assertApprovalReady(root, taskId, doc, state) {
  const dir = taskDir(root, taskId);
  if (doc === 'spec') {
    if (!(await exists(join(dir, 'discussion.md')))) {
      throw new Error('нельзя утвердить ТЗ: нет discussion.md — сначала обсудите задачу (dept_discussion)');
    }
    const open = listQuestions(state, { status: 'open' });
    if (open.length > 0) {
      throw new Error(`нельзя утвердить ТЗ: открытых вопросов ${open.length}; получите ответы или закройте их`);
    }
  }
  if (doc === 'design') {
    const path = join(dir, 'design.md');
    if (!(await exists(path))) throw new Error('нельзя утвердить дизайн: нет design.md');
    const text = await readFile(path, 'utf8');
    const urls = [...new Set(text.match(/https?:\/\/[^\s)]+/g) ?? [])];
    if (urls.length < 3) throw new Error('нельзя утвердить дизайн: нужно минимум 3 референса со ссылками');
    if (!/^#{2,3}\s*Референс/im.test(text)) throw new Error('в design.md нужен раздел «Референсы»');
    if (!/^#{2,3}\s*(Макет|Палитра|Типографика)/im.test(text)) throw new Error('в design.md нужны разделы макета/палитры/типографики');
  }
  if (doc === 'concept') {
    const path = join(dir, 'concept.md');
    if (!(await exists(path))) throw new Error('нельзя утвердить концепцию: нет concept.md');
    const text = await readFile(path, 'utf8');
    const variants = (text.match(/^#{2,3}\s*(?:\d+[.)]\s*)?Вариант/gim) ?? []).length;
    if (variants < 2) {
      throw new Error('нельзя утвердить концепцию: нужно минимум 2 варианта (## Вариант) с плюсами/минусами и выбором');
    }
  }
}
