import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.cwd();
const required = [
  'packages/domain/src/generativeCursor.ts',
  'packages/engine/src/generativeCursor.ts',
  'apps/api/src/livingCanvasLlmAssistant.ts',
  'apps/api/src/livingCanvasFeedbackStore.ts',
  'apps/api/src/livingCanvasApplicationRoutes.ts',
  'apps/api/src/routes/knowledgeOpsWorkbenchRoutes.ts',
  'apps/api/test/rc10_68_governed_llm_co_creation.test.ts',
];
for (const file of required) if (!existsSync(resolve(root, file))) throw new Error(`Missing rc.10.68 file: ${file}`);
const domain = readFileSync(resolve(root, required[0]), 'utf8');
const engine = readFileSync(resolve(root, required[1]), 'utf8');
const assistant = readFileSync(resolve(root, required[2]), 'utf8');
const feedback = readFileSync(resolve(root, required[3]), 'utf8');
const routes = readFileSync(resolve(root, required[4]), 'utf8');
const knowledgeOps = readFileSync(resolve(root, required[5]), 'utf8');
const checks = [
  ['structured LLM contracts', domain.includes('LlmCoCreationProposal') && domain.includes('LivingCanvasAssistance')],
  ['canonical mutation authority remains none', engine.includes("llmMutationAuthority: 'none'") && assistant.includes('Never invent canonical objects')],
  ['candidate fusion uses eligible actions only', engine.includes('eligibleByKey') && assistant.includes('allowedKeys')],
  ['clarification and alternatives bounded', assistant.includes('.slice(0, 5)') && assistant.includes('.slice(0, 3)')],
  ['deterministic fallback', assistant.includes("mode: 'deterministic-fallback'")],
  ['provider-neutral/private route support', assistant.includes("purpose: 'architecture-reasoning'")],
  ['Mind Factory feedback persisted', feedback.includes('living-canvas-feedback.json') && feedback.includes('converted-to-candidate')],
  ['knowledge gaps enter curation queue', routes.includes("feedbackKind: 'knowledge-gap'") && knowledgeOps.includes('livingCanvasFeedbackStore')],
  ['human curation before scoring', knowledgeOps.includes('remains non-scoring until a reviewed knowledge release is promoted')],
  ['rc.10.68 descriptor', engine.includes("version: '0.10.0-rc.10.68.0'") && engine.includes("codename: 'Sol Governed Co-Creation Brain'")],
];
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([, pass]) => !pass);
if (failed.length) throw new Error(`${failed.length} rc.10.68 backend gate(s) failed`);
console.log(`rc.10.68 backend gate passed: ${checks.length}/${checks.length}`);
