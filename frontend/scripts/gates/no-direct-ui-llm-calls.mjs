import fs from 'node:fs';
import path from 'node:path';

const roots = ['frontend/apps/web/src'];
const forbidden = [
  /openai/i,
  /anthropic/i,
  /gemini/i,
  /chat\.completions/i,
  /responses\.create/i,
  /api\.openai\.com/i,
];

const allowedFiles = [
  'llm',
  'gateway',
  'README',
  'test',
  'spec',
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const violations = [];
for (const root of roots) {
  for (const file of walk(root)) {
    const rel = file.replace(/\\/g, '/');
    if (allowedFiles.some((token) => rel.toLowerCase().includes(token.toLowerCase()))) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (forbidden.some((rx) => rx.test(text))) violations.push(rel);
  }
}

if (violations.length) {
  console.error('Direct UI LLM/provider references are not allowed. Use AIW LLM Gateway.');
  for (const file of violations) console.error(` - ${file}`);
  process.exit(1);
}

console.log('PASS: no direct UI LLM/provider calls detected.');
