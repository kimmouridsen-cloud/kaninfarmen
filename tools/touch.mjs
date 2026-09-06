// Touch smoke test: emulate a phone-ish touch device, tap to start, swipe left, verify the turn.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1280,720'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, hasTouch: true, isMobile: true });
await page.goto(process.argv[2] ?? 'http://localhost:8731/?seed=kanin-42&canvas=1', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
const state = () => page.evaluate(() => (window.__game ? window.__game() : null));
await page.touchscreen.tap(640, 360);
await new Promise((r) => setTimeout(r, 1500));
console.log('running', JSON.stringify(await state()));
// swipe left
await page.touchscreen.touchStart(700, 400);
await page.touchscreen.touchMove(600, 400);
await page.touchscreen.touchEnd();
const t0 = Date.now();
let s;
while (Date.now() - t0 < 8000) {
  s = await state();
  if (s && s.bunny.dir.x === -1) break;
  await new Promise((r) => setTimeout(r, 50));
}
console.log('after swipe', JSON.stringify(s));
await page.screenshot({ path: process.argv[3] ?? 'touch.png' });
await browser.close();
