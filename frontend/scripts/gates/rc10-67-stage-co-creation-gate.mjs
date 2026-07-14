import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const required = [
  'packages/domain/src/generativeCursor.ts',
  'packages/engine/src/generativeCursor.ts',
  'apps/web/src/features/living-canvas/GenerativeCursorController.tsx',
  'apps/web/src/features/living-canvas/living-canvas.css',
  'apps/web/src/features/canvas/ProCanvasViewSystem.tsx',
  'apps/web/src/store/workspaceStore.ts',
];
for (const relative of required) if (!existsSync(resolve(root, relative))) throw new Error(`Missing rc.10.67 file: ${relative}`);
const domain = readFileSync(resolve(root, 'packages/domain/src/generativeCursor.ts'), 'utf8');
const engine = readFileSync(resolve(root, 'packages/engine/src/generativeCursor.ts'), 'utf8');
const cursor = readFileSync(resolve(root, 'apps/web/src/features/living-canvas/GenerativeCursorController.tsx'), 'utf8');
const canvas = readFileSync(resolve(root, 'apps/web/src/features/canvas/ProCanvasViewSystem.tsx'), 'utf8');
const store = readFileSync(resolve(root, 'apps/web/src/store/workspaceStore.ts'), 'utf8');
const css = readFileSync(resolve(root, 'apps/web/src/features/living-canvas/living-canvas.css'), 'utf8');
const checks = [
  ['four lifecycle grammars', ['realizationToLogicalTechnologyGrammar', 'logicalTechnologyToPhysicalTechnologyGrammar'].every((name) => engine.includes(name))],
  ['C4 context-container-component contract', engine.includes("c4Journey: ['system-context', 'container', 'component']") && engine.includes('c4-component-decomposition:')],
  ['relationship and interface propagation', engine.includes('propagate-relationship:') && engine.includes('deterministicEventInterface')],
  ['executable Pattern DNA kits', engine.includes('EXECUTABLE_PATTERN_KITS') && engine.includes('apply-pattern-kit:')],
  ['quality-driver tactic trace', engine.includes('qualityDriverTacticChain: true') && cursor.includes('Quality chain')],
  ['Guide Compose Draft semantics', cursor.includes('One governed decision at a time') && cursor.includes('One coherent topology for the selected scope') && cursor.includes('One bounded stage draft across unresolved scopes')],
  ['keyboard co-creation', cursor.includes("event.altKey && event.key === 'ArrowRight'") && cursor.includes("/^[1-5]$/.test(event.key)") && cursor.includes("event.key === 'Enter'")],
  ['ghost topology preview', canvas.includes('living-canvas-ghost-node') && canvas.includes('livingCanvasPreviewAction?.preview.nodes')],
  ['pattern and obligation explanation', cursor.includes('Pattern DNA') && cursor.includes('obligation(s)') && cursor.includes('Alternatives considered')],
  ['component/deployment level context', store.includes("? 'component' : 'container'") && store.includes("? 'deployment'")],
  ['accessible reduced motion', css.includes('@media (prefers-reduced-motion:reduce)')],
  ['no direct UI LLM invocation', !/openai|anthropic|gemini|modelProvider\.invoke|fetch\([^)]*llm/i.test(cursor)],
  ['reversible findings contract', domain.includes("type: 'remove-finding'") && store.includes('rollbackGenerativeMutation')],
];
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([, pass]) => !pass);
if (failed.length) throw new Error(`${failed.length} rc.10.67 frontend gate(s) failed`);
console.log(`rc.10.67 frontend gate passed: ${checks.length}/${checks.length}`);
