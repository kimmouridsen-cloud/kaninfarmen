// Dump the runtime-generated placeholder textures as PNG files (for the Godot port).
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
const outDir = process.argv[2] ?? '.';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:8731/?canvas=1', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
const dump = await page.evaluate(() => {
  const g = window.__phaser;
  const out = {};
  for (const key of ['tiles', 'bunny', 'farmer', 'farmhand', 'animals', 'items']) {
    const src = g.textures.get(key).getSourceImage();
    out[key] = src.toDataURL('image/png');
  }
  return out;
});
for (const [k, v] of Object.entries(dump)) writeFileSync(`${outDir}/${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
console.log('wrote', Object.keys(dump).join(' '));
await browser.close();
