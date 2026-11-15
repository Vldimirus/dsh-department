import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1320, height: 1000 }, deviceScaleFactor: 1 });
await page.goto('file:///tmp/preview/index.html');
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/preview-shot.png', fullPage: true });
await browser.close();
console.log('shot done');
