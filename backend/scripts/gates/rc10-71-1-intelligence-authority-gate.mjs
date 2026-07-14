import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '../../..');
const checks = [];
const assert = (name, condition, detail = '') => {
  checks.push({ name, pass: Boolean(condition), detail });
  if (!condition) process.exitCode = 1;
};
const text = (rel) => readFileSync(resolve(root, rel), 'utf8');
const exists = (rel) => existsSync(resolve(root, rel));

const orchestrator = text('backend/apps/api/src/architectureBrainOrchestrator.ts');
const brainRoutes = text('backend/apps/api/src/architectureBrainApplicationRoutes.ts');
const store = text('frontend/apps/web/src/store/workspaceStore.ts');
const stagePanel = text('frontend/apps/web/src/components/StageCoAuthorPanel.tsx');
const briefStudio = text('frontend/apps/web/src/components/DesignBriefStudio.tsx');
const coArchitectPanel = text('frontend/apps/web/src/components/CoArchitectPanel.tsx');
const systemContextStudio = text('frontend/apps/web/src/components/SystemContextStudio.tsx');
const synthesisWorkspace = text('frontend/apps/web/src/components/ArchitectureSynthesisWorkspace.tsx');
const projectRoutes = text('backend/apps/api/src/projectIdentityApplicationRoutes.ts');
const synthesisRoutes = text('backend/apps/api/src/synthesisApplicationRoutes.ts');
const brainHook = text('frontend/apps/web/src/brain/useBrainAliveSignals.ts');
const brainRuntimeIndex = text('frontend/packages/brain-runtime/src/index.ts');
const intelligence = text('backend/packages/intelligence/src/orchestrator/index.ts');
const routeFiles = [
  'backend/apps/api/src/requirementsGenesisApplicationRoutes.ts',
  'backend/apps/api/src/livingCanvasApplicationRoutes.ts',
  'backend/apps/api/src/projectIdentityApplicationRoutes.ts',
  'backend/apps/api/src/synthesisApplicationRoutes.ts',
].map((rel) => ({ rel, body: text(rel) }));

assert('Brain orchestrator exists', exists('backend/apps/api/src/architectureBrainOrchestrator.ts'));
assert('Typed Architecture Context Graph exists', exists('backend/packages/engine/src/architectureContextGraph.ts'));
assert('Canonical Brain contracts exist', exists('backend/packages/domain/src/architectureBrain.ts'));
assert('Workspace projection route exists', brainRoutes.includes('/api/architecture-brain/workspace-projection'));
assert('Workspace projection is orchestrated', orchestrator.includes('async workspaceProjection('));
assert('Workspace projection reads the canonical repository revision', brainRoutes.includes('expectedRevision') && brainRoutes.includes('repository.getProject') && !brainRoutes.includes('project: architectureProjectSchema'));
assert('Browser synchronizes before requesting canonical intelligence', store.includes('saveProjectToServer()') && store.includes('expectedRevision: revision'));
assert('Requirements distillation is orchestrated', orchestrator.includes('async distillRequirements('));
assert('System Context composition is orchestrated', orchestrator.includes('systemContextCandidate(input:') && brainRoutes.includes('/system-context/preview') && brainRoutes.includes('/system-context/apply'));
assert('System Context topology is server compiled', exists('backend/packages/engine/src/systemContext.ts') && systemContextStudio.includes('/system-context/preview') && !systemContextStudio.includes('function buildCandidate'));
assert('System Context acceptance is stale-safe and human controlled', brainRoutes.includes('STALE_SYSTEM_CONTEXT_PROPOSAL') && brainRoutes.includes('contextFingerprint') && systemContextStudio.includes('Accept context model'));
assert('Stage Co-Author is orchestrated', orchestrator.includes('async stageCoAuthor('));
assert('Living Canvas is orchestrated', orchestrator.includes('async livingCanvasActions('));
assert('Synthesis is orchestrated', orchestrator.includes('async synthesize('));
assert('Assisted audit is orchestrated', orchestrator.includes('async assistedAudit('));
assert('Authority audit exposes one controlling principle', intelligence.includes('One Brain, one canonical model, one governed knowledge manifest, one proposal receipt'));
assert('Knowledge supply chain is isolated by design', intelligence.includes('knowledge-supply-chain') && intelligence.includes('isolated-by-design'));
assert('Architecture route files do not call gateway directly', routeFiles.every(({ body }) => !/llmRuntimeConfigurations\.gateway|new LlmGateway\s*\(/.test(body)), routeFiles.filter(({ body }) => /llmRuntimeConfigurations\.gateway|new LlmGateway\s*\(/.test(body)).map(({ rel }) => rel).join(', '));
assert('Browser no longer generates Living Canvas candidates locally', !store.includes('orchestrateDeterministicDesignActions'));
assert('Browser no longer runs a competing deterministic audit', !store.includes('runDeterministicAudit'));
assert('Browser no longer computes architecture style recommendations', !store.includes('recommendArchitectureStyles') && !store.includes('recommendInContext'));
assert('Browser no longer evaluates architecture events locally', !store.includes('evaluateArchitectureEvent'));
assert('Browser Brain Signal hook is projection-only', !brainHook.includes('deriveBrainSignals') && brainHook.includes('adaptKernelIntelligenceToSignals'));
assert('Legacy browser signal engines were removed', !exists('frontend/packages/brain-runtime/src/brainSignalEngine.ts') && !brainRuntimeIndex.includes('driverWeightSignals') && !brainRuntimeIndex.includes('interfaceCritiqueSignals'));
assert('System Context maps to a distinct signal stage', text('frontend/apps/web/src/brain/adaptWorkspaceToBrainContext.ts').includes("case 'systemContext'") && text('frontend/packages/brain-runtime/src/types.ts').includes("'system-context'"));
assert('Browser calls the Brain workspace projection', store.includes('/api/architecture-brain/workspace-projection'));
assert('Browser calls the governed Living Canvas endpoint', store.includes('/living-canvas/actions'));
assert('Living Canvas omits absent decomposition sessions instead of sending null', store.includes('currentSnapshot.livingCanvasSession') && !store.includes('session: currentSnapshot.livingCanvasSession,'));
assert('Ask Sol uses a canonical project reference and exposes a receipt', coArchitectPanel.includes('expectedRevision: project.revision') && !coArchitectPanel.includes('project,\n        question') && coArchitectPanel.includes('Governance receipt') && projectRoutes.includes('STALE_ARCHITECTURE_BRAIN_CONTEXT'));
assert('Architecture helper routes load canonical repository state', projectRoutes.includes('loadCanonicalBrainProject') && projectRoutes.includes('repository.getProject'));
assert('Synthesis loads canonical repository state', synthesisRoutes.includes('loadCanonicalSynthesisProject') && !synthesisRoutes.includes('project: architectureProjectSchema'));
assert('Browser synthesis has no competing generation or apply fallback', !synthesisWorkspace.includes('synthesizeArchitectureAlternatives') && !synthesisWorkspace.includes('runArchitectureSimulationSuite') && !synthesisWorkspace.includes('applyArchitectureAlternative'));
assert('Synthesis exposes the shared Brain receipt', synthesisWorkspace.includes('Architecture Brain governance receipt') && synthesisWorkspace.includes('brainReceipt.manifest.kernelVersion'));
assert('Stage Co-Author does not import a local proposal builder', !stagePanel.includes('buildStageCoAuthorProposal'));
assert('Requirements Studio does not run a local compiler fallback', !briefStudio.includes('distillRequirementsDeterministically') && !briefStudio.includes('mergeRequirementsProposal'));
assert('Architecture helper functions require injected LLM gateways', !text('backend/apps/api/src/designBriefAssistant.ts').includes('gateway = new LlmGateway') && !text('backend/apps/api/src/coArchitect.ts').includes('gateway = new LlmGateway') && !text('backend/apps/api/src/aiAudit.ts').includes('gateway = new LlmGateway') && !text('backend/apps/api/src/architectureSynthesisService.ts').includes('gateway = new LlmGateway'));
assert('Semantic staleness implementation exists', text('backend/packages/engine/src/architectureContextGraph.ts').includes('applyArchitectureSemanticStaleness'));
assert('Semantic staleness targets durable downstream records only', text('backend/packages/engine/src/architectureContextGraph.ts').includes('staleEligibleKinds') && !text('backend/packages/engine/src/architectureContextGraph.ts').includes("item.kind === 'context-package' && item.stageRefs"));
assert('Legacy migration has an explicit canonical authority receipt', text('backend/packages/engine/src/requirementsGenesis.ts').includes("canonicalAuthority: 'requirements-intelligence'"));

const passed = checks.filter((item) => item.pass).length;
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'}: ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nrc.10.71.1 intelligence authority gate: ${passed}/${checks.length} passed`);
if (process.exitCode) process.exit(process.exitCode);
