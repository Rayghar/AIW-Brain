import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.cwd();
const required = [
  'packages/domain/src/generativeCursor.ts',
  'packages/engine/src/generativeCursor.ts',
  'apps/web/src/features/living-canvas/GenerativeCursorController.tsx',
  'apps/web/src/store/workspaceStore.ts',
  'apps/web/src/features/knowledge-ops/KnowledgeOpsWorkbench.tsx',
  'apps/web/src/styles/rc10_68_llm_nav_polish.css',
];
for (const file of required) if (!existsSync(resolve(root, file))) throw new Error(`Missing rc.10.68 file: ${file}`);
const domain = readFileSync(resolve(root, required[0]), 'utf8');
const engine = readFileSync(resolve(root, required[1]), 'utf8');
const cursor = readFileSync(resolve(root, required[2]), 'utf8');
const store = readFileSync(resolve(root, required[3]), 'utf8');
const curator = readFileSync(resolve(root, required[4]), 'utf8');
const css = readFileSync(resolve(root, required[5]), 'utf8');
const checks = [
  ['Ask Sol is explicit and user invoked', cursor.includes('Ask Sol') && store.includes('requestLivingCanvasLlmAssist')],
  ['authority boundary visible', cursor.includes('cannot write directly to the canonical model')],
  ['clarification and knowledge-gap UI', cursor.includes('clarifications') && cursor.includes('knowledgeGapSignals')],
  ['feedback captured on outcomes', store.includes("action.authorityClass !== 'llm-proposed'") && store.includes('/living-canvas/feedback')],
  ['curator feedback queue', curator.includes("id: 'canvasFeedback'") && curator.includes('Stage candidate')],
  ['non-scoring feedback posture', curator.includes('non-scoring')],
  ['no direct provider call from canvas UI', !/openai|anthropic|gemini|qwen|deepseek/i.test(cursor)],
  ['deterministic fallback status', store.includes('deterministic-fallback')],
  ['governed contracts mirrored', domain.includes('MindFactoryFeedbackReceipt') && engine.includes('compileGovernedLlmAlternatives')],
  ['responsive LLM surfaces', css.includes('generative-cursor__knowledge-gaps') && css.includes('knowledge-ops-workbench')],
];
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([, pass]) => !pass);
if (failed.length) throw new Error(`${failed.length} rc.10.68 frontend gate(s) failed`);
console.log(`rc.10.68 frontend gate passed: ${checks.length}/${checks.length}`);
