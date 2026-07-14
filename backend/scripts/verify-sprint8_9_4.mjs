#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => readFileSync(join(root, file), 'utf8');
const check = (label, ok) => {
  if (ok) console.log(`PASS ${label}`);
  else { console.error(`FAIL ${label}`); failures.push(label); }
};
const json = (file) => JSON.parse(read(file));

const requiredDocs = [
  'docs/intelligence/AIW_INTELLIGENCE_CONSTITUTION.md',
  'docs/intelligence/AIW_STAGE_INTELLIGENCE_MAP.md',
  'docs/intelligence/AIW_TIER_CAPABILITY_MATRIX.md',
  'docs/intelligence/AIW_OFFLINE_INTELLIGENCE_ARCHITECTURE.md',
  'docs/intelligence/AIW_KNOWLEDGE_PACK_SIGNING_SPEC.md',
  'docs/intelligence/AIW_ADMIN_MIND_OPERATIONS_MODEL.md',
  'docs/intelligence/AIW_SDD_REASONING_GRAMMAR.md',
  'SPRINT8_9_4_INTELLIGENCE_CONSTITUTION_TIERING_KNOWLEDGE_PACK.md',
  'CHANGE_SUMMARY_v0.10.0-rc.10.17.md',
  'BUILD_VERIFICATION_v0.10.0-rc.10.17.txt',
];
for (const doc of requiredDocs) check(`${doc} exists`, existsSync(join(root, doc)));

const constitution = read('docs/intelligence/AIW_INTELLIGENCE_CONSTITUTION.md');
check('constitution preserves kernel/release authority', constitution.includes('Authority lives in the deterministic kernel') && constitution.includes('active knowledge release'));
check('constitution preserves bounded language faculty', constitution.includes('The LLM is a language faculty') && constitution.includes('may not score'));
check('constitution requires governed knowledge mutation', constitution.includes('Knowledge mutates only through governance') && constitution.includes('named human'));
check('constitution requires reversible human-approved mutation', constitution.includes('previewable') && constitution.includes('human-approved'));
check('constitution makes honesty rendered', constitution.includes('Honesty is a rendered feature'));
check('constitution includes offline principle', constitution.includes('Offline AIW') && constitution.includes('signed knowledge pack'));
check('constitution includes tier non-forking rule', constitution.includes('Tiering must not fork the mind'));
check('constitution includes architecture reasoning grammar', constitution.includes('stakeholders') && constitution.includes('SDD/handoff pack'));

const stageDoc = read('docs/intelligence/AIW_STAGE_INTELLIGENCE_MAP.md');
for (const term of ['Brief', 'Quality Drivers', 'Patterns and Tactics', 'Canvas Modelling', 'Review Studio', 'Repository Conformance', 'Architecture Handoff']) {
  check(`stage map includes ${term}`, stageDoc.includes(term));
}
check('stage map requires receipts and approvals', stageDoc.includes('Evidence/approval') && stageDoc.includes('user-triggered'));

const tierDoc = read('docs/intelligence/AIW_TIER_CAPABILITY_MATRIX.md');
for (const term of ['Essential', 'Professional', 'Enterprise', 'Sovereign']) check(`tier matrix includes ${term}`, tierDoc.includes(term));
check('tier matrix states non-forking kernel rule', tierDoc.includes('must not fork the kernel') || tierDoc.includes('must not fork the mind'));
check('tier matrix keeps Essential intelligent offline', tierDoc.includes('Governed architecture judgment that works offline'));

const offline = read('docs/intelligence/AIW_OFFLINE_INTELLIGENCE_ARCHITECTURE.md');
check('offline architecture lists deterministic authority path', offline.includes('deterministic kernel') && offline.includes('signed knowledge release'));
check('offline architecture names disabled live capabilities', offline.includes('live GitHub') && offline.includes('hosted LLM'));
check('offline architecture requires honesty labels', offline.includes('offline mode') && offline.includes('release age'));

const signing = read('docs/intelligence/AIW_KNOWLEDGE_PACK_SIGNING_SPEC.md');
for (const term of ['manifest.json', 'checksums.sha256', 'signature.json', 'Activation rules', 'Rejection rules']) check(`knowledge-pack spec includes ${term}`, signing.includes(term));
check('knowledge-pack spec blocks unsigned packs', signing.includes('unsigned') && signing.includes('signature validates'));

const admin = read('docs/intelligence/AIW_ADMIN_MIND_OPERATIONS_MODEL.md');
for (const term of ['Register source', 'capture pinned snapshot', 'extract candidate claims', 'Contradiction queue', 'promote signed release', 'rollback']) check(`admin mind model includes ${term}`, admin.includes(term));
check('admin mind model requires audit events', admin.includes('Every operation must emit an audit event'));

const sdd = read('docs/intelligence/AIW_SDD_REASONING_GRAMMAR.md');
for (const term of ['Stakeholder persona', 'Driver', 'Decision', 'Architecture solution', 'Component', 'Documentation minimization rule']) check(`SDD grammar includes ${term}`, sdd.includes(term));

const stageJson = json('data/intelligence/aiw-stage-intelligence-map.json');
check('stage intelligence JSON has at least seven stages', Array.isArray(stageJson.stages) && stageJson.stages.length >= 7);
check('stage intelligence JSON has offline Review Studio', stageJson.stages.some((s) => s.id === 'review-studio' && s.offline === true));
check('stage intelligence JSON keeps repository conformance online', stageJson.stages.some((s) => s.id === 'repository-conformance' && s.offline === false));

const tierJson = json('data/intelligence/aiw-tier-capability-matrix.json');
check('tier JSON has four tiers', Array.isArray(tierJson.tiers) && tierJson.tiers.length === 4);
check('tier JSON includes non-forking rule', typeof tierJson.nonForkingRule === 'string' && tierJson.nonForkingRule.includes('same deterministic kernel'));

const packJson = json('data/intelligence/aiw-knowledge-pack-signing-spec.json');
check('knowledge-pack JSON requires signature', packJson.packFiles.includes('signature.json') && packJson.activationRules.includes('signature-valid'));
check('knowledge-pack JSON rejects unsigned/candidate packs', packJson.rejectionRules.includes('unsigned') && packJson.rejectionRules.includes('candidate-only'));

const grammarJson = json('data/intelligence/aiw-sdd-reasoning-grammar.json');
check('SDD grammar JSON includes decision and component records', grammarJson.records?.decision?.includes('rationale') && grammarJson.records?.component?.includes('interfaces'));

const domain = read('packages/domain/src/intelligenceArchitecture.ts');
check('domain exports intelligence layers', domain.includes('AIW_INTELLIGENCE_LAYERS') && domain.includes('language-faculty'));
check('domain exports stage contracts', domain.includes('AIW_STAGE_INTELLIGENCE_CONTRACTS') && domain.includes('repository-conformance'));
check('domain exports tier contracts', domain.includes('AIW_TIER_CAPABILITY_CONTRACTS') && domain.includes('sovereign'));
check('domain exports knowledge-pack activation rules', domain.includes('AIW_KNOWLEDGE_PACK_ACTIVATION_RULES') && domain.includes('signature-valid'));
const domainIndex = read('packages/domain/src/index.ts');
check('domain index exports intelligence architecture contracts', domainIndex.includes("./intelligenceArchitecture.js"));

const pkg = json('package.json');
check('package version bumped to rc.10.17', pkg.version === '0.10.0-rc.10.17');
check('sprint8_9_4 verify script registered', pkg.scripts?.['sprint8_9_4:verify']?.includes('verify-sprint8_9_4.mjs'));

if (failures.length) {
  console.error(`Sprint 8.9.4 verification failed with ${failures.length} issue(s).`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}
console.log('Sprint 8.9.4 Intelligence Constitution, Tiering and Knowledge-Pack Architecture verification passed.');
