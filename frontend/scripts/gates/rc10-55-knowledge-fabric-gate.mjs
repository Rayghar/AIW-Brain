#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const distributionRoot = path.resolve(root, '..');
const RELEASE_VERSION = '0.10.0-rc.10.55.0';
const RELEASE_ID = 'AKR-0.10.55';
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const packageJson = readJson('package.json');
const releaseManifest = JSON.parse(fs.readFileSync(path.join(distributionRoot, 'RELEASE_MANIFEST.json'), 'utf8'));
const patternPack = readJson('data/rc10_55-pattern-dna2.json');
const sourceMap = readJson('data/rc10_55-global-architecture-intelligence-source-map.json');
const cambridgePack = readJson('data/rc10_55-cambridge-knowledge-pack.json');
const stageKits = readJson('data/rc10_55-stage-intelligence-kits.json');
const generatedReport = readJson('generated/rc10-55/rc10_55-knowledge-fabric-report.json');

const checks = [];
const check = (id, condition, actual, expected) => checks.push({ id, passed: Boolean(condition), actual, expected });

const records = patternPack.records ?? [];
const dossiers = sourceMap.dossiers ?? [];
const stages = stageKits.stages ?? [];
const deepEditorial = records.filter((record) => record.editorialReview?.depth === 'deep');
const promoted = records.filter((record) => record.lifecycle?.status === 'approved' || record.lifecycle?.status === 'active');
const all = (predicate) => records.every(predicate);

check('release.package-version', packageJson.version === RELEASE_VERSION, packageJson.version, RELEASE_VERSION);
check('release.manifest-version', releaseManifest.version === RELEASE_VERSION, releaseManifest.version, RELEASE_VERSION);
check('release.knowledge-release-id', patternPack.releaseId === RELEASE_ID, patternPack.releaseId, RELEASE_ID);
check('corpus.minimum-records', records.length >= 328, records.length, '>=328');
check('corpus.pattern-dna-2', all((record) => record.dnaVersion === '2.0'), records.filter((record) => record.dnaVersion === '2.0').length, records.length);
check('corpus.top-50-deep-editorial', deepEditorial.length === 50, deepEditorial.length, 50);
check('corpus.provenance', all((record) => Array.isArray(record.evidence) && record.evidence.length > 0), records.filter((record) => Array.isArray(record.evidence) && record.evidence.length > 0).length, records.length);
check('corpus.no-extraction-only-promotion', promoted.every((record) => record.editorialReview?.reviewedBy && record.editorialReview?.approvalBasis !== 'extraction-only'), promoted.filter((record) => record.editorialReview?.reviewedBy && record.editorialReview?.approvalBasis !== 'extraction-only').length, promoted.length);
check('corpus.component-kit', all((record) => Array.isArray(record.componentKit) && record.componentKit.length > 0), records.filter((record) => record.componentKit?.length > 0).length, records.length);
check('corpus.interface-kit', all((record) => Array.isArray(record.interfaceKit) && record.interfaceKit.length > 0), records.filter((record) => record.interfaceKit?.length > 0).length, records.length);
check('corpus.generation-contract', all((record) => record.generationContract && Object.values(record.generationContract).some(Boolean)), records.filter((record) => record.generationContract && Object.values(record.generationContract).some(Boolean)).length, records.length);
check('corpus.counterfactuals', all((record) => typeof record.counterfactualExplanation === 'string' && record.counterfactualExplanation.trim().length > 0), records.filter((record) => record.counterfactualExplanation?.trim()).length, records.length);
check('corpus.lifecycle-use', all((record) => Array.isArray(record.sourceLifecycleUses) && record.sourceLifecycleUses.length > 0), records.filter((record) => record.sourceLifecycleUses?.length > 0).length, records.length);
check('corpus.conflicts-visible', all((record) => Array.isArray(record.conflicts)), records.filter((record) => Array.isArray(record.conflicts)).length, records.length);
check('source-map.repository-dossiers', dossiers.length === 47, dossiers.length, 47);
check('source-map.classification-two-dimensional', Boolean(sourceMap.classificationDimensions?.lifecycleState && sourceMap.classificationDimensions?.usagePosture), sourceMap.classificationDimensions, 'knowledge lifecycle + AIW usage posture');
check('source-map.required-reviewers', dossiers.every((dossier) => typeof dossier.requiredHumanReviewer === 'string' && dossier.requiredHumanReviewer.trim().length > 0), dossiers.filter((dossier) => dossier.requiredHumanReviewer?.trim()).length, dossiers.length);
check('source-map.exact-ingestion-config', dossiers.every((dossier) => dossier.exactIngestionConfiguration && Object.keys(dossier.exactIngestionConfiguration).length > 0), dossiers.filter((dossier) => dossier.exactIngestionConfiguration && Object.keys(dossier.exactIngestionConfiguration).length > 0).length, dossiers.length);
check('source-map.lifecycle-mapping', dossiers.every((dossier) => Array.isArray(dossier.lifecycleStagesAffected) && dossier.lifecycleStagesAffected.length > 0), dossiers.filter((dossier) => dossier.lifecycleStagesAffected?.length > 0).length, dossiers.length);
check('source-map.non-scoring-boundary', dossiers.filter((dossier) => ['candidate', 'discovery-only'].includes(dossier.sourceAuthority?.lifecycleStatus)).every((dossier) => dossier.prohibitedAiwUses?.some((use) => /scor|block|recommend/i.test(use))), dossiers.filter((dossier) => ['candidate', 'discovery-only'].includes(dossier.sourceAuthority?.lifecycleStatus)).length, 'all candidate/discovery dossiers explicitly prohibit scoring, blockers or recommendations');
check('cambridge.approved-pack', cambridgePack.status === 'approved-reference-pack', cambridgePack.status, 'approved-reference-pack');
check('cambridge.reasoning-stages', Array.isArray(cambridgePack.reasoningFlow) && cambridgePack.reasoningFlow.length >= 8, cambridgePack.reasoningFlow?.length, '>=8');
check('cambridge.reasoning-questions', Object.keys(cambridgePack.reasoningQuestions ?? {}).length >= 8, Object.keys(cambridgePack.reasoningQuestions ?? {}).length, '>=8 stage question sets');
check('cambridge.review-rules', Array.isArray(cambridgePack.reviewRules) && cambridgePack.reviewRules.length >= 6, cambridgePack.reviewRules?.length, '>=6');
check('cambridge.sdd-grammar', Array.isArray(cambridgePack.sddGrammar) && cambridgePack.sddGrammar.length >= 15, cambridgePack.sddGrammar?.length, '>=15');
check('stage-kits.complete', stages.length === 8, stages.length, 8);
check('stage-kits.patterns-and-evidence', stages.every((stage) => stage.patternEmphasis?.length > 0 && stage.requiredEvidence?.length > 0), stages.filter((stage) => stage.patternEmphasis?.length > 0 && stage.requiredEvidence?.length > 0).length, stages.length);
check('generated-report.acceptance', Object.values(generatedReport.acceptance ?? {}).every(Boolean), generatedReport.acceptance, 'all true');

const failures = checks.filter((item) => !item.passed);
const evidence = {
  releaseVersion: RELEASE_VERSION,
  releaseId: RELEASE_ID,
  runtime: path.basename(root),
  generatedAt: new Date().toISOString(),
  summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
  metrics: {
    patterns: records.length,
    deepEditorialPatterns: deepEditorial.length,
    topologyGenerativePatterns: patternPack.metrics?.recordsWithTopology ?? 0,
    sourceDossiers: dossiers.length,
    cambridgeReasoningStages: cambridgePack.reasoningFlow?.length ?? 0,
    stageKits: stages.length,
  },
  checks,
  limitations: [
    'Repository activity and licence data are based on the governed catalogue snapshot; live connector refresh is not claimed in this local acceptance.',
    'Production worker, durable queue, enterprise identity, KMS signing, object storage and cross-tenant infrastructure acceptance remain in rc.10.58.',
    'Deep editorial status is encoded and gate-checked; independent enterprise acceptance remains a human governance event.'
  ]
};
const outDir = path.join(root, 'generated/rc10-55');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'rc10_55-knowledge-fabric-gate.json'), `${JSON.stringify(evidence, null, 2)}\n`);

if (failures.length > 0) {
  console.error(`FAIL rc.10.55 knowledge-fabric gate (${failures.length}/${checks.length} failed)`);
  for (const failure of failures) console.error(`- ${failure.id}: expected ${JSON.stringify(failure.expected)}, got ${JSON.stringify(failure.actual)}`);
  process.exit(1);
}
console.log(`PASS rc.10.55 knowledge-fabric gate (${checks.length}/${checks.length})`);
console.log(`Patterns ${records.length}; deep editorial ${deepEditorial.length}; dossiers ${dossiers.length}; Cambridge stages ${cambridgePack.reasoningFlow.length}; stage kits ${stages.length}.`);
