/**
 * Браузер для бета-тестера: открыть страницу, кликать, вводить, снимать скриншоты.
 * Требует playwright (chromium).
 */

/**
 * Разрешённые адреса: локальные и file://.
 *
 * @param {string} url Адрес.
 * @returns {boolean}
 */
export function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return true;
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Выполняет сценарий в браузере.
 *
 * @param {{ url?: string, actions?: object[], screenshotPath?: string, fullPage?: boolean }} input Сценарий.
 * @returns {Promise<{ screenshot: string|null, text: string, log: string[] }>}
 */
export async function runBrowse(input) {
  if (input.url && !isAllowedUrl(input.url)) throw new Error('browse: разрешены только localhost/127.0.0.1/file://');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const log = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    if (input.url) {
      await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      log.push('goto ' + input.url);
    }
    for (const action of input.actions ?? []) {
      const type = action?.type;
      if (type === 'goto') {
        if (!isAllowedUrl(action.url)) throw new Error('browse: недопустимый адрес ' + action.url);
        await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        log.push('goto ' + action.url);
      } else if (type === 'click') {
        if (action.selector) await page.click(action.selector, { timeout: 8000 });
        else await page.getByText(String(action.text ?? ''), { exact: false }).first().click({ timeout: 8000 });
        log.push('click ' + (action.selector ?? action.text));
      } else if (type === 'fill') {
        await page.fill(action.selector, String(action.value ?? ''), { timeout: 8000 });
        log.push('fill ' + action.selector);
      } else if (type === 'press') {
        await page.keyboard.press(String(action.key ?? 'Enter'));
        log.push('press ' + action.key);
      } else if (type === 'wait') {
        await page.waitForTimeout(Math.min(10000, Math.max(0, Number(action.ms ?? 500))));
        log.push('wait ' + action.ms);
      } else if (type === 'text') {
        const text = (await page.innerText('body')).slice(0, 1000);
        log.push('text: ' + text.replace(/\s+/g, ' ').slice(0, 200));
      } else if (type === 'screenshot') {
        log.push('screenshot ' + (action.path ?? ''));
      }
    }
    if (input.screenshotPath) {
      await page.screenshot({ path: input.screenshotPath, fullPage: Boolean(input.fullPage) });
    }
    const text = (await page.innerText('body')).slice(0, 3000);
    return { screenshot: input.screenshotPath ?? null, text, log };
  } finally {
    await browser.close();
  }
}
