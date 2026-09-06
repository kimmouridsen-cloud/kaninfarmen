// Drive the game in headless Chrome.
//   node tools/shot.mjs <url> <outPng> [steps...]
// steps: click | shot | wait:<ms> | key:<Key> | until:<jsExpr on state s> (times out after 20s)
//   e.g. "until:s.bunny.tile.y<=19" then "key:ArrowLeft"
import puppeteer from 'puppeteer-core';

const [url, out, ...steps] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1280,720', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 600));
const state = () => page.evaluate(() => (window.__game ? window.__game() : null));
let n = 0;
for (const step of steps) {
  const [cmd, ...rest] = step.split(':');
  const arg = rest.join(':');
  if (cmd === 'click') await page.mouse.click(640, 360);
  else if (cmd === 'shot') await page.screenshot({ path: out.replace('.png', `-${n++}.png`) });
  else if (cmd === 'wait') await new Promise((r) => setTimeout(r, Number(arg)));
  else if (cmd === 'key') await page.keyboard.press(arg);
  else if (cmd === 'cmd') await page.evaluate((c) => window.__cmd(c), arg);
  else if (cmd === 'log') console.log(arg, JSON.stringify(await state()));
  else if (cmd === 'until') {
    const t0 = Date.now();
    const fn = new Function('s', `return (${arg});`);
    for (;;) {
      const s = await state();
      if (s && fn(s)) break;
      if (Date.now() - t0 > 20000) {
        console.log('TIMEOUT waiting for', arg, JSON.stringify(s));
        break;
      }
      await new Promise((r) => setTimeout(r, 40));
    }
  }
}
await page.screenshot({ path: out });
console.log('final', JSON.stringify(await state()));
const bad = logs.filter((l) => !/Download the|Phaser v|GL Driver|\[vite\]|404/.test(l));
if (bad.length) console.log(bad.join('\n'));
await browser.close();
