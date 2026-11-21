/**
 * Референсы для дизайнера: скачать картинку или снять скриншот страницы.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { taskDir } from './store.js';

/**
 * Имя файла из URL.
 *
 * @param {string} url Ссылка.
 * @returns {string}
 */
function slug(url) {
  const parsed = new URL(url);
  const base = (parsed.hostname + parsed.pathname).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${base || 'reference'}-${Date.now().toString(36)}`;
}

/**
 * Забирает референс: картинку — как есть, страницу — скриншотом.
 *
 * @param {string} root Корень.
 * @param {string} taskId Задача.
 * @param {string} url http(s) ссылка.
 * @returns {Promise<{ path: string, kind: 'image'|'screenshot' }>}
 */
export async function captureReference(root, taskId, url) {
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('only http(s) urls are allowed');
  const dir = join(taskDir(root, taskId), 'references');
  await mkdir(dir, { recursive: true });
  const name = slug(url);

  const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'dsh-department/1.0' } });
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
  const type = response.headers.get('content-type') ?? '';
  if (type.startsWith('image/')) {
    const bytes = Buffer.from(await response.arrayBuffer());
    const ext = type.includes('jpeg') ? 'jpg' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'png';
    const file = `${name}.${ext}`;
    await writeFile(join(dir, file), bytes);
    return { path: `references/${file}`, kind: 'image' };
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => page.goto(url, { timeout: 30000 }));
    await page.waitForTimeout(800);
    const file = `${name}.png`;
    await page.screenshot({ path: join(dir, file), fullPage: false });
    return { path: `references/${file}`, kind: 'screenshot' };
  } finally {
    await browser.close();
  }
}
