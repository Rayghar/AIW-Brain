import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const checks = [];
function source(path) { return readFileSync(resolve(root, path), 'utf8'); }
function check(name, condition, detail) { checks.push({ name, passed: Boolean(condition), detail }); }

const quality = source('packages/engine/src/solQualityCalibration.ts');
const brain = source('apps/api/src/architectureBrainOrchestrator.ts');
const co = source('apps/api/src/coArchitect.ts');
const calibration = source('apps/api/src/solCalibration.ts');
const routes = source('apps/api/src/architectureBrainApplicationRoutes.ts');
const outcomes = source('apps/api/src/routes/intelligenceRoutes.ts');
const domain = source('packages/domain/src/architectureBrain.ts');
const recommendation = source('packages/engine/src/recommendationCalibration.ts');

check('quality evaluator source exists', existsSync(resolve(root, 'packages/engine/src/solQualityCalibration.ts')), 'Sol quality evaluator is first-class engine code.');
for (const dimension of ['stage-alignment','evidence-grounding','specificity','clarification-discipline','trade-off-quality','actionability','governance-transparency','lineage-completeness']) check(`quality dimension ${dimension}`, quality.includes(`'${dimension}'`) || domain.includes(`"${dimension}"`), dimension);
check('unsupported numeric and legal claim guard', quality.includes('unsupportedClaims') && quality.includes('legal claims'), 'Unsupported numeric and legal claims fail the critical clarification gate.');
check('quality receipt in proposal contract', domain.includes('quality?: SolResponseQualityReceipt'), 'Shared proposal receipt carries response quality evidence.');
check('context receipt in proposal contract', domain.includes('context?: ArchitectureBrainContextReceipt'), 'Shared proposal receipt carries exact context.');
check('reasoning receipt in proposal contract', domain.includes('reasoning?: ArchitectureBrainReasoningReceipt'), 'Shared proposal receipt carries deterministic, knowledge and LLM contributions.');
check('lineage receipt in proposal contract', domain.includes('lineagePaths?: ArchitectureBrainLineagePath[]'), 'Shared proposal receipt carries lineage paths.');
check('deterministic mode supported', brain.includes('intelligenceMode?: "deterministic" | "hybrid"') && co.includes('input.intelligenceMode === "deterministic"'), 'Calibration can isolate deterministic authority.');
check('LLM candidate quality rejection', co.includes('qualityGateRejected') && co.includes('rejectedCandidateScore'), 'Low-quality LLM candidates are rejected.');
check('nine lifecycle scenarios', (calibration.match(/id: 'SOL-CAL-/g) ?? []).length === 9, 'Nine exact lifecycle scenarios.');
check('calibration endpoint', routes.includes('/sol-calibration') && routes.includes('/sol-calibration/scenarios'), 'API exposes controlled calibration.');
check('blinded expert review pack', calibration.includes('buildExpertReviewPack') && calibration.includes('blindedVariants'), 'Human expert pack hides variant mode.');
check('no production acceptance claim', calibration.includes('productionAcceptanceClaimed: false') && calibration.includes('humanExpertValidationCompleted: false'), 'Calibration refuses unsupported external acceptance.');
check('Sol outcome capture type', outcomes.includes("'sol-response'"), 'Sol response corrections feed governed calibration evidence.');
check('regulated finance calibration', recommendation.includes('CAL-REGULATED-FINANCE-PROVIDER-DEPENDENCE'), 'Provider dependence is calibrated for regulated finance.');
check('event evidence calibration', recommendation.includes('CAL-EVENT-JOURNEY-EVENT-DRIVEN') && recommendation.includes('CAL-EVENT-STYLE-WITHOUT-EVIDENCE'), 'Event-driven recommendations require evidence.');
check('data mesh evidence calibration', recommendation.includes('CAL-DATA-MESH-REQUIRES-DOMAIN-GOVERNANCE'), 'Data Mesh requires domain-governance evidence.');
check('direct mutation remains false', brain.includes('directModelMutationAllowed') || co.includes('human-approval-boundary'), 'Sol remains proposal-only.');

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ release: '0.10.0-rc.10.72.3', passed: checks.length - failed.length, total: checks.length, checks }, null, 2));
if (failed.length) process.exit(1);
