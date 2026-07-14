import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const checks = [];
function source(path) { return readFileSync(resolve(root, path), 'utf8'); }
function check(name, condition, detail) { checks.push({ name, passed: Boolean(condition), detail }); }

const panel = source('apps/web/src/components/CoArchitectPanel.tsx');
const capture = source('apps/web/src/components/RecommendationOutcomeCapture.tsx');
const main = source('apps/web/src/main.tsx');
const css = source('apps/web/src/styles/rc10_72_3_sol_calibration.css');
const domain = source('packages/domain/src/architectureBrain.ts');

check('single Sol panel retained', panel.includes('Sol · Architecture Brain'), 'The recovered Sol experience remains one contextual panel.');
check('quality badge visible', panel.includes('sol-quality-badge') && panel.includes('answer.qualityReceipt.score'), 'Architect sees quality status.');
check('eight quality gates visible', panel.includes('answer.qualityReceipt.gates.map'), 'All quality dimensions can be inspected.');
check('context and reasoning visible', panel.includes('Context, reasoning and lineage') && panel.includes('reasoningReceipt'), 'Answer inputs and authority are observable.');
check('lineage visible', panel.includes('answer.lineagePaths.slice'), 'Answer lineage is inspectable.');
check('LLM rejection visible', panel.includes('qualityGateRejected') && panel.includes('was rejected'), 'Quality-gate fallback is explicit.');
check('Sol feedback supported', panel.includes('recommendationType="sol-response"') && capture.includes("'sol-response'"), 'Human outcomes are captured without auto-learning.');
check('quality CSS exists', existsSync(resolve(root, 'apps/web/src/styles/rc10_72_3_sol_calibration.css')) && css.includes('.sol-quality-gates'), 'Quality disclosure is styled within the existing panel.');
check('quality CSS loaded', main.includes("rc10_72_3_sol_calibration.css"), 'Release stylesheet is loaded after recovery styles.');
check('shared receipt contract mirrored', domain.includes('SolResponseQualityReceipt') && domain.includes('ArchitectureBrainContextReceipt'), 'Frontend uses the shared governed receipt.');
check('no direct model mutation copy', panel.includes('No direct model mutation') && panel.includes('Human approval required'), 'Authority boundary remains visible.');
check('no new permanent side panel', !panel.includes('SolCalibrationPanel') && !panel.includes('QualityGatePanel'), 'Calibration stays inside one Sol disclosure.');

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ release: '0.10.0-rc.10.72.3', passed: checks.length - failed.length, total: checks.length, checks }, null, 2));
if (failed.length) process.exit(1);
