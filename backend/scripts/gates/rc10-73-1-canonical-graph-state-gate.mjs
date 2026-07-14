import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '../..');
const root = resolve(backend, '..');
const frontend = resolve(root, 'frontend');
const read = (path) => readFileSync(path, 'utf8');
const checks = [];
function check(id, passed, detail) {
  checks.push({ id, passed: Boolean(passed), detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${id}: ${detail}`);
}

const statePath = resolve(backend, 'packages/domain/src/architectureDesignGraphState.ts');
const state = existsSync(statePath) ? read(statePath) : '';
const graph = read(resolve(backend, 'packages/domain/src/architectureDesignGraph.ts'));
const repository = read(resolve(backend, 'apps/api/src/repository.ts'));
const routes = read(resolve(backend, 'apps/api/src/architectureBrainApplicationRoutes.ts'));
const orchestrator = read(resolve(backend, 'apps/api/src/architectureBrainOrchestrator.ts'));
const receipt = read(resolve(backend, 'packages/intelligence/src/orchestrator/index.ts'));
const brainContract = read(resolve(backend, 'packages/domain/src/architectureBrain.ts'));
const frontendPanel = read(resolve(frontend, 'apps/web/src/components/CoArchitectPanel.tsx'));
const backendPackage = JSON.parse(read(resolve(backend, 'package.json')));
const frontendPackage = JSON.parse(read(resolve(frontend, 'package.json')));
const manifest = JSON.parse(read(resolve(root, 'RELEASE_MANIFEST.json')));
const capability = JSON.parse(read(resolve(root, 'CAPABILITY_STATE.json')));

check('state-contract', state.includes('ArchitectureDesignGraphStateAuthority') && state.includes("mode: 'graph-primary'"), 'Typed graph-primary authority contract exists');
check('canonical-kinds', ['requirements','evidence','interfaces','decisions','findings','risks'].every((item) => state.includes(`'${item}'`)), 'All rc.10.73.1 canonical state kinds are declared');
check('migration-command', state.includes('migrateArchitectureProjectStateToDesignGraph') && state.includes('humanApprovalRequired: true'), 'Explicit architect-approved migration command exists');
check('native-state-command', state.includes('applyArchitectureDesignGraphCanonicalState') && state.includes("lastWritePath: 'graph-command'"), 'Fingerprint-pinned native canonical state command exists');
check('empty-aggregate-replacement', ['interfaces', 'decisions', 'findings'].every((item) => state.includes(`input.patch.${item} !== undefined`)), 'Native commands can explicitly replace a canonical aggregate with an empty list');
check('compatibility-adapter', state.includes('synchronizeArchitectureProjectDesignGraphState') && state.includes("lastWritePath: 'compatibility-adapter'"), 'Legacy writes are translated through a compatibility adapter');
check('canonical-values', graph.includes('canonicalValue: requirement') && graph.includes('canonicalValue: architectureInterface') && graph.includes('canonicalValue: decision') && graph.includes('canonicalValue: finding'), 'Graph records preserve complete canonical values');
check('requirements-metadata', graph.includes('requirementsIntelligenceMetadata'), 'Requirements aggregate metadata is carried by the project graph record');
check('authority-preservation', graph.includes("sourceRef === 'canonical-state-authority'"), 'Graph rebuild preserves graph-primary authority marker');
check('repository-boundary', repository.includes('synchronizeArchitectureProjectDesignGraphState') && !repository.includes('synchronizeArchitectureProjectDesignGraph('), 'All repository adapters use graph-primary persistence synchronization');
check('migration-route', routes.includes('/design-graph/migrate-state') && routes.includes('migrate-canonical-state-to-design-graph'), 'Governed state migration API and audit event exist');
check('state-route', routes.includes('/design-graph/state"') && routes.includes('apply-canonical-design-graph-state'), 'Graph-native state API and audit event exist');
check('authority-route', routes.includes('/design-graph/state-authority'), 'State authority inspection API exists');
check('orchestrator-only', orchestrator.includes('migrateDesignGraphState') && orchestrator.includes('applyDesignGraphCanonicalState'), 'Production routes delegate through the Brain orchestrator');
check('receipt-authority', receipt.includes('designGraphStateAuthorityMode') && receipt.includes('canonicalStateKinds'), 'Brain manifest and proposal receipts disclose state authority');
check('receipt-contract', brainContract.includes('stateAuthorityMode') && brainContract.includes('canonicalStateKinds'), 'Frontend/backend receipt contract carries graph-primary posture');
check('sol-migration-action', frontendPanel.includes('Promote architecture state to graph-primary') && frontendPanel.includes('migrateDesignGraphState'), 'Sol exposes explicit human migration action');
check('sol-authority-posture', frontendPanel.includes('State authority') && frontendPanel.includes('Canonical state'), 'Sol governance receipt makes authority and migrated domains visible');
check('backend-version', backendPackage.version === '0.10.0-rc.10.73.1', 'Backend release identity is rc.10.73.1');
check('frontend-version', frontendPackage.version === '0.10.0-rc.10.73.1', 'Frontend release identity is rc.10.73.1');
check('release-manifest', manifest.version === '0.10.0-rc.10.73.1' && manifest.canonicalDesignGraphStateMigrationImplemented === true && manifest.productionAccepted === false, 'Release manifest declares bounded graph-state migration without production overclaim');
check('capability-state', capability.release === manifest.version && capability.canonicalDesignGraph?.stateAuthorityMode === 'graph-primary' && capability.canonicalDesignGraph?.fullGraphPrimaryMigration === 'not-complete', 'Capability register exposes graph-primary authority and incomplete whole-product migration');
check('release-evidence', existsSync(resolve(root, 'AIW_RC10_73_1_RELEASE_REPORT.md')) && existsSync(resolve(root, 'AIW_RC10_73_1_IMPLEMENTATION_TRACEABILITY.md')) && existsSync(resolve(root, 'AIW_RC10_73_1_KNOWN_LIMITATIONS.md')) && existsSync(resolve(root, 'release-evidence/rc10.73.1/CANONICAL_GRAPH_STATE_MIGRATION_ACCEPTANCE.json')), 'Current release evidence is included');
check('state-test', existsSync(resolve(backend, 'apps/api/test/rc10_73_1_canonical_graph_state_migration.test.ts')), 'Executable graph migration and command tests are included');

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ release: '0.10.0-rc.10.73.1', passed: checks.length - failed.length, total: checks.length, failed: failed.map((item) => item.id) }, null, 2));
if (failed.length) process.exit(1);
