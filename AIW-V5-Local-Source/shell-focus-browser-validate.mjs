// Keyboard focus after in-place chapter and tab navigation.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(resolve => { const socket = net.createServer().listen(0, '127.0.0.1', () => { const p = socket.address().port; socket.close(() => resolve(p)); }); });
const db = `.aiw-local/shell-focus-${port}.sqlite`;
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
const ready = new Promise((resolve, reject) => { server.stdout.on('data', data => { if (String(data).includes('ready')) resolve(); }); server.on('exit', code => reject(Error(`Server exited ${code}`))); });
let browser;
try {
  await ready;
  browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?chapter=1&tab=work`);
  await page.waitForSelector('.chapter-item[data-chapter="4"]');

  await page.focus('.chapter-item[data-chapter="4"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => new URLSearchParams(location.search).get('chapter') === '4' && document.activeElement?.matches('.heading-row h1'));
  assert.match(await page.locator('.heading-row h1').textContent(), /logical application/i);

  await page.focus('.tabs [data-tab="validate"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.body.dataset.workspaceTab === 'validate' && document.activeElement?.matches('.tabs [data-tab="validate"]'));
  await page.evaluate(() => window.aiwRoute(location.href));
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.tab), 'validate', 'an ordinary redraw preserves tab focus');

  await page.evaluate(() => { const link = document.createElement('a'); link.href = '/?chapter=3&tab=model'; link.textContent = 'Open decision model'; link.id = 'focus-route'; document.querySelector('.stage').prepend(link); });
  await page.focus('#focus-route'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => new URLSearchParams(location.search).get('chapter') === '3' && document.activeElement?.matches('.heading-row h1'));
  await page.goBack();
  await page.waitForFunction(() => new URLSearchParams(location.search).get('chapter') === '4' && document.activeElement?.matches('.heading-row h1'));

  const phone = await browser.newPage({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  phone.on('pageerror', error => errors.push(error.message));
  await phone.goto(`http://127.0.0.1:${port}/?chapter=1&tab=work`);
  await phone.click('.workspace-bar [data-action="layers-menu"]');
  await phone.waitForSelector('.sidebar[role="dialog"]');
  await phone.focus('.sidebar .chapter-item[data-chapter="3"]'); await phone.keyboard.press('Enter');
  await phone.waitForFunction(() => new URLSearchParams(location.search).get('chapter') === '3' && document.activeElement?.matches('.heading-row h1'));
  assert.equal(await phone.locator('.sidebar').getAttribute('role'), null, 'the chapter drawer closes at the destination');
  assert.deepEqual(errors, [], 'no page errors');
  console.log('Shell keyboard focus: chapter, tab, redraw, deep link, Back, and phone drawer passed.');
} finally {
  await browser?.close(); server.kill('SIGKILL');
  for (const suffix of ['', '-shm', '-wal']) try { rmSync(db + suffix); } catch { /* no file */ }
}
