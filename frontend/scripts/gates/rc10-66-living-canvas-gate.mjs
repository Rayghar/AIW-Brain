import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const required = [
  'packages/domain/src/generativeCursor.ts',
  'packages/engine/src/generativeCursor.ts',
  'apps/web/src/features/living-canvas/GenerativeCursorController.tsx',
  'apps/web/src/features/living-canvas/living-canvas.css',
  'apps/web/src/features/canvas/ProCanvasViewSystem.tsx',
  'apps/web/src/store/workspaceStore.ts',
];
for (const relative of required) {
  if (!existsSync(resolve(root, relative))) throw new Error(`Missing rc.10.66 file: ${relative}`);
}
const domain = readFileSync(resolve(root, 'packages/domain/src/generativeCursor.ts'), 'utf8');
const engine = readFileSync(resolve(root, 'packages/engine/src/generativeCursor.ts'), 'utf8');
const cursor = readFileSync(resolve(root, 'apps/web/src/features/living-canvas/GenerativeCursorController.tsx'), 'utf8');
const canvas = readFileSync(resolve(root, 'apps/web/src/features/canvas/ProCanvasViewSystem.tsx'), 'utf8');
const store = readFileSync(resolve(root, 'apps/web/src/store/workspaceStore.ts'), 'utf8');
const checks = [
  ['DesignGestureEvent contract', domain.includes('export interface DesignGestureEvent')],
  ['GenerativeDesignContext contract', domain.includes('export interface GenerativeDesignContext')],
  ['ArchitectureMutationSet contract', domain.includes('export interface ArchitectureMutationSet')],
  ['StageDecompositionSession contract', domain.includes('export interface StageDecompositionSession')],
  ['StageTransformationGrammar contract', domain.includes('export interface StageTransformationGrammar')],
  ['two deterministic pilot grammars', engine.includes('qualityToLogicalPilotGrammar') && engine.includes('logicalToRealizationPilotGrammar')],
  ['bounded noise budget', engine.includes('const NOISE_BUDGET = 5') && engine.includes('slice(0, NOISE_BUDGET)')],
  ['human approved atomic mutation', engine.includes('requiresHumanApproval: true') && engine.includes('applyGenerativeAction')],
  ['stale proposal protection', engine.includes('proposalIsStale') && engine.includes('StaleGenerativeProposalError')],
  ['cursor controller', cursor.includes('data-testid="generative-cursor-controller"')],
  ['guide compose draft contracts', cursor.includes("'guide', 'compose', 'draft-stage'")],
  ['ghost preview on canvas', canvas.includes('living-canvas-ghost-node') && canvas.includes('livingCanvasPreviewAction?.preview.nodes')],
  ['scope focus highlighting', canvas.includes('livingCanvasActiveFocus') && canvas.includes('focusQueue.includes')],
  ['reversible store actions', store.includes('undoLastLivingCanvasAction') && store.includes('rollbackGenerativeMutation')],
  ['no direct UI provider invocation', !/openai|anthropic|gemini|modelProvider\.invoke|fetch\([^)]*llm/i.test(cursor)],
];
const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) throw new Error(`${failed.length} rc.10.66 Living Canvas gate(s) failed.`);
console.log(`rc.10.66 Living Canvas gate passed: ${checks.length}/${checks.length}`);
