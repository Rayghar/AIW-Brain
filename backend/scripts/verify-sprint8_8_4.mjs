#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const failures = [];
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const check = (label, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) failures.push(label); };

check('Pattern DNA routes exist', exists('apps/api/src/routes/patternDnaRoutes.ts'));
check('Pattern DNA migration exists', exists('database/migrations/013_sprint8_8_4_pattern_dna_operations.sql'));
const knowledge = read('packages/knowledge/src/index.ts');
for (const token of ['PatternDnaEditRecord','PatternDnaEditableField','createPatternDnaEdit','validatePatternDnaEditRecord','summarizePatternDnaOperations','applyPatternDnaEditsToLibrary','stagedPatternEdits']) check(`@aiw/knowledge exposes ${token}`, knowledge.includes(token));
const repo = read('apps/api/src/repositories/knowledgeOpsDurableRepository.ts');
for (const token of ['listPatternDnaEdits','savePatternDnaEdit','discardPatternDnaEdit','clearMaterializedPatternDnaEdits']) check(`durable repository supports ${token}`, repo.includes(token));
const adminRepo = read('apps/api/src/repositories/adminRepositories.ts');
check('Admin repository no longer owns patternEdits side-store', !/patternEdits/.test(adminRepo));
const route = read('apps/api/src/routes/patternDnaRoutes.ts');
for (const endpoint of ['/api/admin/pattern-dna','/api/admin/pattern-dna/pattern/:patternId','/api/admin/pattern-dna/:patternId/stage','/api/admin/pattern-dna/staged/:editId','/api/admin/pattern-dna/candidate']) check(`Pattern DNA API endpoint ${endpoint} exists`, route.includes(endpoint));
check('Pattern DNA routes use durable repository', /knowledgeOpsDurableRepository/.test(route));
check('Pattern DNA routes import operations from @aiw/knowledge, not engine helpers', /from '@aiw\/knowledge'/.test(route) && !/validatePatternDnaEdit,|applyStagedPatternEdits|stageCalibrationRatification/.test(route));
check('Pattern DNA routes do not use adminRepositories.patternEdits', !/adminRepositories\.patternEdits/.test(route));
check('Pattern DNA candidates use knowledge release candidate path', /createKnowledgeReleaseCandidate/.test(route) && /clearMaterializedPatternDnaEdits/.test(route));
const ui = read('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx');
check('Admin UI exposes Pattern DNA tab', /label: 'Pattern DNA'/.test(ui));
for (const token of ['Pattern DNA Operations','stagePatternEdit','discardPatternEdit','materializePatternCandidate','qualityAttributeImpact','pairsWellWith','conflictsWith','fitnessTestMappings']) check(`Admin UI includes ${token}`, ui.includes(token));
check('Admin Pattern DNA UI uses no window.prompt', !/window\.prompt/.test(ui));
const migration = read('database/migrations/013_sprint8_8_4_pattern_dna_operations.sql');
for (const token of ['pattern_dna_staged_edits_v2','ENABLE ROW LEVEL SECURITY','tenant_id','materialized_candidate_id']) check(`Pattern DNA migration includes ${token}`, migration.includes(token));
const rootPkg = JSON.parse(read('package.json'));
check('root version is rc.10.6 or later', /^0\.10\.0-rc\.10\.(?:6|7|8|9|[1-9][0-9]+)$/.test(rootPkg.version));
check('sprint8_8_4 verify script registered', Boolean(rootPkg.scripts?.['sprint8_8_4:verify']));
const coveragePath = 'generated/route-permission-coverage.json';
if (exists(coveragePath)) {
  const coverage = JSON.parse(read(coveragePath));
  check('route-permission coverage has no unguarded Admin/Knowledge mutations', coverage.adminKnowledgeMutationsUnguarded === 0);
} else {
  check('route-permission coverage report exists', false);
}
console.log(failures.length ? `\nSPRINT 8.8.4 GATE: ${failures.length} violation(s)` : '\nSPRINT 8.8.4 GATE: PASSED');
process.exit(failures.length ? 1 : 0);
