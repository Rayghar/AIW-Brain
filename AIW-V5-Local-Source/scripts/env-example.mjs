// Render .env.example from the settings table (settings.js), or with --check report whether the file is current.
import {readFile, writeFile} from 'node:fs/promises';
import {renderEnvExample} from '../settings.js';
const rendered = renderEnvExample();
if (process.argv.includes('--check')) {
  const current = await readFile('.env.example', 'utf8').catch(() => '');
  if (current !== rendered) { console.error('.env.example is out of date: run node scripts/env-example.mjs'); process.exit(1); }
  console.log('.env.example matches settings.js');
} else {
  await writeFile('.env.example', rendered);
  console.log('.env.example rendered from settings.js');
}
