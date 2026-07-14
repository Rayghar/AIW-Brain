import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

const runtimePath = resolve(backend, 'apps/api/src/architectureBrainRuntime.ts');
const orchestratorPath = resolve(backend, 'apps/api/src/architectureBrainOrchestrator.ts');
const boundaryPath = resolve(backend, 'apps/api/src/architectureBrainRouteBoundary.ts');
const runtime = existsSync(runtimePath) ? read(runtimePath) : '';
const orchestrator = existsSync(orchestratorPath) ? read(orchestratorPath) : '';
const boundary = existsSync(boundaryPath) ? read(boundaryPath) : '';
const projectRoutes = read(resolve(backend, 'apps/api/src/projectIdentityApplicationRoutes.ts'));
const governanceRoutes = read(resolve(backend, 'apps/api/src/governanceCollaborationApplicationRoutes.ts'));
const deliveryRoutes = read(resolve(backend, 'apps/api/src/runtimeDeliveryApplicationRoutes.ts'));
const synthesisRoutes = read(resolve(backend, 'apps/api/src/synthesisApplicationRoutes.ts'));
const intelligenceRoutes = read(resolve(backend, 'apps/api/src/routes/intelligenceRoutes.ts'));
const reviewRoutes = read(resolve(backend, 'apps/api/src/routes/reviewStudioRoutes.ts'));
const authority = read(resolve(backend, 'packages/intelligence/src/orchestrator/index.ts'));
const frontendAuthority = read(resolve(frontend, 'packages/intelligence/src/orchestrator/index.ts'));
const backendPackage = JSON.parse(read(resolve(backend, 'package.json')));
const frontendPackage = JSON.parse(read(resolve(frontend, 'package.json')));
const manifest = JSON.parse(read(resolve(root, 'RELEASE_MANIFEST.json')));
const capability = JSON.parse(read(resolve(root, 'CAPABILITY_STATE.json')));
const routeSources = [projectRoutes, governanceRoutes, deliveryRoutes, synthesisRoutes, intelligenceRoutes, reviewRoutes].join('\n');
const bannedDirectCalls = [
  'recommendArchitectureStyles(', 'recommendInContext(', 'validateProject(',
  'runDeterministicAudit(', 'evaluateArchitectureEvent(',
  'evaluateGovernanceRulePacks(', 'approvalReadiness(',
  'evaluateArchitecturePolicyGate(', 'assessArchitectureDesignBrief(',
  'runArchitectureReview('
];

check('runtime-boundary', runtime.includes('export class ArchitectureBrainRuntime') && runtime.includes('createArchitectureBrainRuntime'), 'Dedicated Architecture Brain domain-execution runtime exists');
check('runtime-domain-capabilities', ['recommendations(', 'contextualRecommendations(', 'validate(', 'deterministicAudit(', 'review(', 'evaluateEvent(', 'evaluateGovernance(', 'governanceApprovalReadiness(', 'evaluatePolicyGate(', 'synthesisAssessment('].every((item) => runtime.includes(item)), 'Runtime owns the migrated architecture judgement capabilities');
check('orchestrator-type-only-engine-import', /import type \{[\s\S]*?\} from "@aiw\/engine";/.test(orchestrator) && !/import \{[\s\S]*?\} from "@aiw\/engine";/.test(orchestrator), 'Orchestrator imports engine contracts only, not engine implementations');
check('orchestrator-no-domain-services', !['./aiAudit.js','./architectureSynthesisService.js','./designBriefAssistant.js','./designAssist.js','./livingCanvasLlmAssistant.js','./stageCoAuthorAssistant.js'].some((item) => orchestrator.includes(item)), 'Orchestrator has no direct task-service imports');
check('orchestrator-delegates-runtime', ['this.runtime.recommendations', 'this.runtime.contextualRecommendations', 'this.runtime.validate', 'this.runtime.deterministicAudit', 'this.runtime.review', 'this.runtime.evaluateEvent', 'this.runtime.evaluateGovernance', 'this.runtime.governanceApprovalReadiness', 'this.runtime.evaluatePolicyGate', 'this.runtime.synthesisAssessment'].every((item) => orchestrator.includes(item)), 'Orchestrator delegates migrated judgement to the runtime boundary');
check('compatibility-boundary', boundary.includes('markArchitectureBrainCompatibilityAlias') && boundary.includes('x-aiw-brain-authority') && boundary.includes('x-aiw-brain-boundary-version') && boundary.includes('successor-version'), 'Legacy route boundary is explicit, discoverable and versioned');
check('compatibility-boundary-version', boundary.includes('0.10.0-rc.10.73.2'), 'Compatibility boundary reports rc.10.73.2');
check('recommendation-aliases', projectRoutes.includes('architectureBrain.recommendations') && projectRoutes.includes('architectureBrain.contextualRecommendations'), 'Legacy recommendation routes delegate to the Brain');
check('validation-aliases', projectRoutes.includes('architectureBrain.validate') && projectRoutes.includes('architectureBrain.deterministicAudit'), 'Legacy validation and deterministic-audit routes delegate to the Brain');
check('intelligence-alias', intelligenceRoutes.includes('architectureBrain.evaluateEvent') && intelligenceRoutes.includes('markArchitectureBrainCompatibilityAlias'), 'Legacy intelligence evaluation delegates through the Brain boundary');
check('governance-aliases', governanceRoutes.includes('architectureBrain.evaluateGovernance') && governanceRoutes.includes('architectureBrain.governanceApprovalReadiness'), 'Governance evaluation and readiness delegate to the Brain');
check('policy-gate-alias', deliveryRoutes.includes('architectureBrain.evaluatePolicyGate') && deliveryRoutes.includes('markArchitectureBrainCompatibilityAlias'), 'Policy-gate evaluation delegates to the Brain');
check('delivery-recommendations', deliveryRoutes.includes('await architectureBrain.recommendations'), 'Delivery compilation obtains recommendations from the Brain');
check('synthesis-alias', synthesisRoutes.includes('architectureBrain.synthesisAssessment') && synthesisRoutes.includes('markArchitectureBrainCompatibilityAlias'), 'Legacy synthesis assessment delegates to the Brain');
check('review-studio', reviewRoutes.includes('architectureBrain.review') && !reviewRoutes.includes('runArchitectureReview'), 'Review Studio uses the Brain and has no direct review engine call');
check('no-direct-route-judgement', bannedDirectCalls.every((call) => !routeSources.includes(call)), 'Migrated route modules contain no direct architecture judgement calls');
check('authority-audit-version', authority.includes('1.4.0-rc10.73.2') && authority.includes('0.10.0-rc.10.73.2'), 'Authority audit and orchestrator contract are versioned for rc.10.73.2');
check('authority-audit-paths', authority.includes('legacy-project-intelligence-aliases') && authority.includes('review-studio'), 'Authority audit covers compatibility aliases and Review Studio');
check('authority-owner', authority.includes('owner: "AIW Brain Orchestrator"') && authority.includes('status: "consolidated"'), 'Architecture-runtime paths declare the Brain as consolidated owner');
check('authority-mirror', authority === frontendAuthority, 'Frontend/backend intelligence authority contracts match');
check('backend-version', backendPackage.version === '0.10.0-rc.10.73.2', 'Backend release identity is rc.10.73.2');
check('frontend-version', frontendPackage.version === '0.10.0-rc.10.73.2', 'Frontend release identity is rc.10.73.2');
check('release-manifest', manifest.version === '0.10.0-rc.10.73.2' && manifest.thinBrainOrchestratorImplemented === true && manifest.architectureBrainRuntimeBoundaryImplemented === true && manifest.productionAccepted === false, 'Release manifest declares bounded authority consolidation without production overclaim');
check('capability-state', capability.release === manifest.version && capability.brainOrchestration?.runtimeBoundary === 'implemented' && capability.brainOrchestration?.parallelArchitectureRuntimeAuthority === 'retired', 'Capability register exposes the new runtime boundary and authority retirement');
check('release-evidence', existsSync(resolve(root, 'AIW_RC10_73_2_RELEASE_REPORT.md')) && existsSync(resolve(root, 'AIW_RC10_73_2_IMPLEMENTATION_TRACEABILITY.md')) && existsSync(resolve(root, 'AIW_RC10_73_2_KNOWN_LIMITATIONS.md')) && existsSync(resolve(root, 'release-evidence/rc10.73.2/THIN_BRAIN_ORCHESTRATOR_ACCEPTANCE.json')), 'Current release evidence is included');
check('api-test', existsSync(resolve(backend, 'apps/api/test/rc10_73_2_thin_brain_orchestrator.test.ts')), 'Executable compatibility and authority-audit tests are included');

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ release: '0.10.0-rc.10.73.2', passed: checks.length - failed.length, total: checks.length, failed: failed.map((item) => item.id) }, null, 2));
if (failed.length) process.exit(1);
