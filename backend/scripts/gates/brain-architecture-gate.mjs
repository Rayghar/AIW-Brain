#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredDocs = [
  'docs/architecture/AIW_TARGET_SOFTWARE_ARCHITECTURE.md',
  'docs/architecture/AIW_LLM_GATEWAY_ARCHITECTURE.md',
  'docs/architecture/AIW_BRAIN_SIGNAL_ENGINE_ARCHITECTURE.md',
  'docs/architecture/AIW_PRODUCTION_DEPLOYMENT_ARCHITECTURE.md',
  'docs/architecture/AIW_COST_GOVERNANCE_ARCHITECTURE.md',
];
const forbiddenDirectProviderCalls = [
  /fetch\s*\(\s*['"]https:\/\/api\.openai\.com/i,
  /axios\.\w+\s*\(\s*['"]https:\/\/api\.openai\.com/i,
  /new\s+OpenAI\s*\(/,
  /from\s+['"]openai['"]/,
  /from\s+['"]@anthropic-ai\/sdk['"]/, 
];
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) out.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}
let failed = false;
for (const doc of requiredDocs) {
  if (!fs.existsSync(path.join(root, doc))) {
    console.error(`Missing required architecture doc: ${doc}`);
    failed = true;
  }
}
for (const file of walk(path.join(root, 'apps/web/src'))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of forbiddenDirectProviderCalls) {
    if (pattern.test(text)) {
      console.error(`Frontend must not call LLM providers directly. Use backend LLM Gateway.\n  ${path.relative(root, file)}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log('Brain architecture gate passed.');
