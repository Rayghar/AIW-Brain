import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const required = [
  'packages/domain/src/generativeCursor.ts',
  'packages/engine/src/generativeCursor.ts',
  'packages/engine/test/rc10_67_stage_co_creation.test.ts',
  'apps/api/src/livingCanvasApplicationRoutes.ts',
  'apps/api/test/rc10_67_stage_co_creation_api.test.ts',
];
for (const relative of required) if (!existsSync(resolve(root, relative))) throw new Error(`Missing rc.10.67 file: ${relative}`);
const domain = readFileSync(resolve(root, 'packages/domain/src/generativeCursor.ts'), 'utf8');
const engine = readFileSync(resolve(root, 'packages/engine/src/generativeCursor.ts'), 'utf8');
const route = readFileSync(resolve(root, 'apps/api/src/livingCanvasApplicationRoutes.ts'), 'utf8');
const checks = [
  ['four stage grammars', ['qualityToLogicalPilotGrammar', 'logicalToRealizationPilotGrammar', 'realizationToLogicalTechnologyGrammar', 'logicalTechnologyToPhysicalTechnologyGrammar'].every((name) => engine.includes(name))],
  ['C4 component decomposition', engine.includes('c4-component-decomposition:') && engine.includes("c4Level: 'component'")],
  ['relationship propagation', engine.includes('propagate-relationship:') && engine.includes('deterministicEventInterface')],
  ['quality tactic chain', engine.includes('quality-driver') && engine.includes('qualityDriverTacticChain: true')],
  ['provider-neutral technology', engine.includes('providerNeutral: true') && engine.includes('LogicalTechnologyCapability')],
  ['physical deployment defaults', engine.includes('availabilityZones') && engine.includes('networkSegmentation')],
  ['executable Pattern DNA kits', engine.includes('EXECUTABLE_PATTERN_KITS') && engine.includes('PAT-OUTBOX') && engine.includes('create-fitness-test')],
  ['three materially distinct modes', engine.includes('compose-scope:') && engine.includes('draft-stage:') && engine.includes("actionType: 'compose-local-topology'")],
  ['reversible generated findings', domain.includes("type: 'remove-finding'") && engine.includes("operation.type === 'remove-finding'")],
  ['human approval and revision protection', route.includes('expectedRevision') && route.includes('REVISION_CONFLICT') && engine.includes('requiresHumanApproval: true')],
  ['release descriptor', engine.includes("version: '0.10.0-rc.10.68.0'") && engine.includes("codename: 'Sol Generative Architecture Cursor'")],
];
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([, pass]) => !pass);
if (failed.length) throw new Error(`${failed.length} rc.10.67 backend gate(s) failed`);
console.log(`rc.10.67 backend gate passed: ${checks.length}/${checks.length}`);
