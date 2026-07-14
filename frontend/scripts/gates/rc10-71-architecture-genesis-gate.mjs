import { readFileSync, existsSync } from 'node:fs';

const checks = [];
function file(path) {
  if (!existsSync(path)) throw new Error(`Missing required file: ${path}`);
  return readFileSync(path, 'utf8');
}
function check(label, condition) { checks.push({ label, passed: Boolean(condition) }); }

const domain = file('packages/domain/src/requirementsGenesis.ts');
const engine = file('packages/engine/src/requirementsGenesis.ts');
const brief = file('apps/web/src/components/DesignBriefStudio.tsx');
const journey = file('apps/web/src/components/requirements/JourneySequenceDiagram.tsx');
const context = file('apps/web/src/components/SystemContextStudio.tsx');
const systemContextEngine = file('../backend/packages/engine/src/systemContext.ts');
const brainRoutes = file('../backend/apps/api/src/architectureBrainApplicationRoutes.ts');
const stages = file('apps/web/src/lib/guidedDeliveryStages.ts');
const router = file('apps/web/src/components/WorkspaceRouter.tsx');
const outputs = file('apps/web/src/components/guided-delivery/StageOutputEvidence.tsx');
const cambridge = JSON.parse(file('../data/CAMBRIDGE-SA-1.0.json'));

check('Canonical requirements intelligence state', /RequirementsIntelligenceState/.test(domain));
check('Source and evidence records', /RequirementSourceRecord/.test(domain) && /RequirementEvidenceReference/.test(domain));
check('Semantic journey model', /SolutionJourney/.test(domain) && /JourneyInteraction/.test(domain));
check('Stage-specific context packages', /ArchitectureContextPackage/.test(domain));
check('Deterministic requirements distillation', /distillRequirementsDeterministically/.test(engine));
check('Atomic reviewed proposal merge', /STALE_REQUIREMENTS_PROPOSAL/.test(engine) && /mergeRequirementsProposal/.test(engine));
check('No unsupported target invention contract', /Unmeasured qualitative target/.test(engine) && /measurable latency, throughput, availability and recovery/.test(engine));
check('Idea intake', /Describe the solution/.test(brief) && /Add idea as source/.test(brief));
check('Paste intake', /Paste existing content/.test(brief) && /Add pasted source/.test(brief));
check('Document upload intake', /Upload source documents/.test(brief) && /\.docx,.pdf/.test(brief));
check('Governed compiler action', /Generate requirements & journeys/.test(brief) && /Architecture Context Compiler/.test(brief));
check('Selective human acceptance', /Accept selected model/.test(brief));
check('Requirements health', /Requirements health/.test(brief) && /Journey coverage/.test(brief));
check('Interactive semantic sequence', /journey-sequence/.test(journey) && /pathId/.test(journey) && /selectedId/.test(journey));
check('Happy, alternate and failure paths supported', /happy/.test(journey) && /failure/.test(journey));
check('First-class System Context stage', /id: "context"/.test(stages) && /System Context & Journeys/.test(stages));
check('System Context routed as distinct workspace', /SystemContextStudio/.test(router) && /activeLifecycleStep === "context"/.test(router));
check('Context model explicit acceptance', /Accept context model/.test(context) && /system-context\/apply/.test(context) && /STALE_SYSTEM_CONTEXT_PROPOSAL/.test(brainRoutes));
check('Journey lineage preserved into context', /journeyRefs/.test(systemContextEngine) && /requirementRefs/.test(systemContextEngine) && /interactionRefs/.test(systemContextEngine));
check('Requirements outputs show actual canonical records', /actual-stage-output-\$\{stageId\}/.test(outputs) && /Major Journey Atlas preview/.test(outputs) && /RequirementsOutput/.test(outputs));
check('System Context outputs show participants and interactions', /ContextOutput/.test(outputs) && /stageId === \"context\"/.test(outputs));
check('Cambridge executable knowledge release', cambridge.releaseId === 'CAMBRIDGE-SA-1.0' && Array.isArray(cambridge.requirementQualityRules) && Array.isArray(cambridge.journeyToArchitectureRules));
check('Cambridge authority boundary is explicit', Boolean(cambridge.authority?.limitations?.length));

const failed = checks.filter((item) => !item.passed);
for (const item of checks) console.log(`${item.passed ? 'PASS' : 'FAIL'}  ${item.label}`);
console.log(`\n${checks.length - failed.length}/${checks.length} architecture-genesis checks passed.`);
if (failed.length) process.exit(1);
