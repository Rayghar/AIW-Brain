#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = process.cwd();
const failures = [];
const read = (file) => readFileSync(join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const check = (label, ok) => ok ? console.log(`PASS ${label}`) : (console.error(`FAIL ${label}`), failures.push(label));

const required = [
  'docs/intelligence/AIW_MIND_FACTORY_IMPLEMENTATION.md',
  'data/intelligence/aiw-mind-factory-reference.json',
  'packages/domain/src/mindFactory.ts',
  'packages/knowledge/src/mindFactory.ts',
  'apps/api/src/routes/mindFactoryRoutes.ts',
  'apps/api/test/sprint8_9_5.test.ts',
  'SPRINT8_9_5_MIND_ADMINISTRATION_KNOWLEDGE_INGESTION_FACTORY.md',
  'CHANGE_SUMMARY_v0.10.0-rc.10.18.md',
  'BUILD_VERIFICATION_v0.10.0-rc.10.18.txt'
];
for (const file of required) check(`${file} exists`, existsSync(join(root, file)));

const domain = read('packages/domain/src/mindFactory.ts');
for (const term of ['SourceQuarantineSnapshot', 'QuarantinedCandidateClaim', 'ReleaseImpactPreview', 'SignedKnowledgePackManifest', 'StageKnowledgeTraceabilityRecord', 'candidate-claims-are-non-scoring']) check(`domain includes ${term}`, domain.includes(term));
check('domain index exports mind factory', read('packages/domain/src/index.ts').includes("./mindFactory.js"));

const knowledge = read('packages/knowledge/src/mindFactory.ts');
for (const term of ['captureSourceSnapshot', 'extractCandidateClaimsFromSnapshot', 'normalizeMindFactoryClaims', 'buildReleaseImpactPreview', 'buildStageKnowledgeTraceability', 'createSignedKnowledgePackManifest', 'verifyKnowledgePackActivation']) check(`knowledge package includes ${term}`, knowledge.includes(term));
check('knowledge package blocks candidate scoring', knowledge.includes('nonScoring: true') && knowledge.includes('reviewerRequired: true'));
check('knowledge index exports mind factory', read('packages/knowledge/src/index.ts').includes("./mindFactory.js"));

const route = read('apps/api/src/routes/mindFactoryRoutes.ts');
for (const endpoint of ['/api/admin/mind-factory', '/snapshot', '/extract-claims', '/claims/normalize', '/release-impact-preview', '/stage-traceability', '/knowledge-pack/export', '/knowledge-pack/import']) check(`route includes ${endpoint}`, route.includes(endpoint));
for (const perm of ['mind-factory.snapshot', 'mind-factory.extract', 'mind-factory.normalize', 'mind-factory.release-impact', 'knowledge-pack.export', 'knowledge-pack.import']) check(`route checks ${perm}`, route.includes(perm));
check('app registers mind factory routes', read('apps/api/src/app.ts').includes('mindFactoryRoutes'));
check('admin repository has mind factory arrays', read('apps/api/src/repositories/adminRepositories.ts').includes('sourceQuarantineSnapshots') && read('apps/api/src/repositories/adminRepositories.ts').includes('knowledgePackImports'));

const rbac = read('packages/engine/src/rbac.ts');
for (const perm of ['mind-factory.snapshot', 'mind-factory.extract', 'mind-factory.normalize', 'mind-factory.release-impact', 'knowledge-pack.export', 'knowledge-pack.import']) check(`RBAC matrix includes ${perm}`, rbac.includes(`'${perm}'`));

const ref = json('data/intelligence/aiw-mind-factory-reference.json');
check('reference JSON has pipeline', Array.isArray(ref.pipeline) && ref.pipeline.includes('capture-pinned-snapshot') && ref.pipeline.includes('release-impact-preview'));
check('reference JSON has hard rules', Array.isArray(ref.hardRules) && ref.hardRules.includes('candidate-claims-are-non-scoring'));
check('reference JSON has stage traceability', ref.stageTraceability.includes('review-studio') && ref.stageTraceability.includes('repository-conformance'));

const doc = read('docs/intelligence/AIW_MIND_FACTORY_IMPLEMENTATION.md');
for (const term of ['quarantine', 'candidate claims are non-scoring', 'release-impact preview', 'signed knowledge packs', 'Cambridge/SDD']) check(`mind factory doc includes ${term}`, doc.includes(term));

const pkg = json('package.json');
check('package version is rc.10.18', pkg.version === '0.10.0-rc.10.18');
check('sprint8_9_5 verify script registered', pkg.scripts?.['sprint8_9_5:verify']?.includes('verify-sprint8_9_5.mjs'));

if (failures.length) {
  console.error(`Sprint 8.9.5 verification failed with ${failures.length} issue(s).`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.5 Mind Administration and Knowledge Ingestion Factory verification passed.');
