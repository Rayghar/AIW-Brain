import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const r2Root = resolve(root, 'release-evidence', 'rc10.73.8', 'gate6b2-r2');
const out = resolve(root, 'release-evidence', 'rc10.73.8', 'gate6b3');
const sha256 = (value: string | Buffer) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (name: string, value: unknown) => writeFile(resolve(out, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const preserved = [
  'GATE_6B_2_R2_PROVIDER_PROTOCOL_AUDIT.json', 'GATE_6B_2_R2_COMPLETION_REPORT.md',
  'GATE_6B_2_R2_MODEL_CAPABILITY_ESCALATION.json', 'GATE_6B_2_R2_ACTUAL_COST_REPORT.json',
  'GATE_6B_2_R2_CANDIDATE_RECORDS.json', 'GATE_6B_2_R2_EVIDENCE_ATOM_LEDGER.json',
  'GATE_6B_2_R2_FAILED_ATTEMPTS.json', 'GATE_6B_2_R2_LIVE_EXECUTION_RESULT.json',
  'GATE_6B_2_R2_PROMPT_6G_ENTRY_DECISION.json', 'GATE_6B_2_R2_QUALITY_EVALUATION.json',
  'GATE_6B_2_R2_TRANSACTION_RECEIPT.json', 'GATE_6B_2_R2_VERIFICATION_RECEIPT.json',
  'GATE_6B_2_R2_SCHEMA_CONTRACT.json', 'GATE_6B_2_R2_EVIDENCE_ATOM_CONTRACT.json',
  'GATE_6B_2_R2_TYPED_ASSET_CONTRACT.json', 'GATE_6B_2_R2_REQUEST_PLAN.json',
  'GATE_6B_2_R2_EXECUTION_AUTHORITY.json', 'GATE_6B_2_R2_TRANSFER_SAFETY_RECEIPT.json',
  'GATE_6B_2_R2_PREDECESSOR_RESULT_RECEIPT.json', 'GATE_6B_2_R2_STRUCTURED_OUTPUT_ROOT_CAUSE.md',
];

async function main() {
  await mkdir(out, { recursive: true });
  const generatedAt = new Date().toISOString();
  const files = [];
  for (const name of preserved) {
    const bytes = await readFile(resolve(r2Root, name));
    files.push({ path: relative(root, resolve(r2Root, name)).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) });
  }
  const manifestFingerprint = sha256(JSON.stringify(files.map(({ path, bytes, sha256: hash }) => ({ path, bytes, sha256: hash }))));
  await writeJson('GATE_6B_3_R2_EVIDENCE_PRESERVATION_RECEIPT.json', {
    schemaVersion: 'aiw-gate-6b-3-r2-preservation-v1', generatedAt, productionAccepted: false,
    preservedFileCount: files.length, files, manifestFingerprint, historicalFilesModified: 0,
    approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0,
    verificationMethod: 'byte-length-and-sha256-before-v2-work',
  });

  const original = await readJson(resolve(r2Root, 'GATE_6B_2_R2_QUALITY_EVALUATION.json'));
  const labels = await readJson(resolve(root, 'release-evidence', 'rc10.73.8', 'GATE_6B_2_FROZEN_SOL_LABELS.json'));
  const candidate = await readJson(resolve(r2Root, 'GATE_6B_2_R2_CANDIDATE_RECORDS.json'));
  const evaluations = original.evaluations;
  const metricAudits = [
    { metric: 'dispositionAccuracy', reported: original.metrics.dispositionAccuracy, denominator: evaluations.length, numerator: evaluations.filter((item: any) => item.dispositionCorrect).length, unit: 'case occurrences', duplicateCaseEffect: 'G6B1-01 counted twice because individual and paired requests were both included' },
    { metric: 'semanticAssetTypeAccuracy', reported: original.metrics.semanticAssetTypeAccuracy, denominator: evaluations.length, numerator: evaluations.filter((item: any) => item.assetTypeCorrect).length, unit: 'case occurrences', defect: 'only acceptedAssets[0] was evaluated; the complete case asset set was ignored' },
    { metric: 'canonicalEpistemicStatusAccuracy', reported: original.metrics.canonicalEpistemicStatusAccuracy, denominator: evaluations.length, numerator: evaluations.filter((item: any) => item.epistemicCorrect).length, unit: 'case occurrences', defect: 'one asset-level status was compared with one frozen status; source atoms, fields and synthesis were conflated' },
    { metric: 'conditionCompleteness', reported: original.metrics.conditionCompleteness, denominator: evaluations.length, numerator: Math.round(original.metrics.conditionCompleteness * evaluations.length / 100), unit: 'all case occurrences', defect: 'non-applicable and optional cases remained in the denominator; only nonempty candidate asset conditions or empty frozen requirements passed' },
    { metric: 'limitationCompleteness', reported: original.metrics.limitationCompleteness, denominator: evaluations.length, numerator: Math.round(original.metrics.limitationCompleteness * evaluations.length / 100), unit: 'all case occurrences', defect: 'non-applicable and optional cases remained in the denominator; only nonempty candidate asset limitations or empty frozen requirements passed' },
    { metric: 'correctNonClaimDisposition', reported: original.metrics.correctNonClaimDisposition, denominator: evaluations.filter((item: any) => item.caseId === 'G6B1-21').length, numerator: evaluations.filter((item: any) => item.caseId === 'G6B1-21' && item.dispositionCorrect).length, unit: 'frozen deliberate-non-claim occurrences', defect: 'zero validated atoms became rejected-semantic-output; no deterministic non-claim classification path existed' },
  ];
  await writeJson('GATE_6B_3_METRIC_DENOMINATOR_AUDIT.json', {
    schemaVersion: 'aiw-gate-6b-3-denominator-audit-v1', generatedAt, productionAccepted: false,
    originalEvaluationCount: evaluations.length, uniqueCaseCount: new Set(evaluations.map((item: any) => item.caseId)).size,
    assetRecordCount: candidate.records.length, metrics: metricAudits,
    findings: {
      nonApplicableConditionsCountedAsMissing: true, nonApplicableLimitationsCountedAsMissing: true,
      completeAssetSetEvaluated: false, firstAcceptedAssetOnly: true,
      assetTypeAliasesNormalised: ['security-control->security-obligation','resilience-control->resilience-obligation','insufficient-evidence-abstention->abstention'],
      compositeAssetForcedToOneEpistemicStatus: true, fieldEpistemicStatusesEvaluated: false,
      zeroAtomDeliberateNonClaimClassifiedAsFailure: true, pairedCaseIndividualFallbackAvailable: false,
      assetAuthorityConfusedWithEpistemicStatus: false, sourceEpistemicConflatedWithSynthesisStatus: true,
    },
  });

  const consistency = labels.labels.map((label: any) => {
    const findings: string[] = [];
    if (label.caseId === 'G6B1-02') findings.push('source-example-is-too-narrow-for-guidelines-and-direct-implementation-observations');
    if (label.caseId === 'G6B1-05') findings.push('whole-composite-asset-cannot-inherit-normative-status-from-two-requirement-atoms');
    if (label.caseId === 'G6B1-07') findings.push('resilience-control-is-not-supported;excerpt-is-performance-efficiency-guidance');
    if (label.caseId === 'G6B1-09') findings.push('pattern-dna-synthesis-status-is-distinct-from-source-atom-epistemic-status');
    if (label.caseId === 'G6B1-21') findings.push('non-claim-label-conflicts-with-explicit-claim-bearing-product-description');
    return { caseId: label.caseId, consistent: findings.length === 0, findings };
  });
  await writeJson('GATE_6B_3_LABEL_CONSISTENCY_AUDIT.json', {
    schemaVersion: 'aiw-gate-6b-3-label-consistency-audit-v1', generatedAt, productionAccepted: false,
    originalLabelFingerprint: labels.labelFingerprint, caseCount: labels.labels.length,
    confirmedCaseCount: consistency.filter((item: any) => item.consistent).length,
    defectCaseCount: consistency.filter((item: any) => !item.consistent).length, cases: consistency,
    originalLabelsModified: false, externalHumanReview: false,
  });
  await writeJson('GATE_6B_3_R2_CASE_LEVEL_CONFUSION_MATRIX.json', {
    schemaVersion: 'aiw-gate-6b-3-r2-confusion-matrix-v1', generatedAt, productionAccepted: false,
    source: 'original-r2-evaluator-before-v2-change', evaluationCount: evaluations.length,
    cases: evaluations.map((item: any) => ({ requestId: item.requestId, caseId: item.caseId, actualDisposition: item.disposition, expectedDisposition: item.expectedDisposition, dispositionCorrect: item.dispositionCorrect, actualAssetType: item.assetType, expectedAssetType: item.expectedAssetType, assetTypeCorrect: item.assetTypeCorrect, actualEpistemicStatus: item.epistemicStatus, expectedEpistemicStatus: item.expectedEpistemicStatus, epistemicCorrect: item.epistemicCorrect })),
  });
  await writeFile(resolve(out, 'GATE_6B_3_EVALUATOR_AUDIT.md'), `# Gate 6B.3 evaluator audit\n\nGenerated: ${generatedAt}  \nProduction accepted: false\n\nThe R2 evaluator used ten request-level case occurrences rather than nine unique cases; G6B1-01 was counted twice. Disposition, asset type and epistemic accuracy used the first accepted asset only. Additional correct assets were ignored. Asset aliases were limited to three hardcoded mappings.\n\nCondition and limitation completeness used all ten occurrences as the denominator. Cases with non-applicable or optional conditions/limitations could therefore be penalised. Field-level epistemic status was not evaluated, and a single whole-asset epistemic status conflated source atoms with synthesis.\n\nG6B1-21 was forced to be a deliberate non-claim although its excerpt contains an explicit architecture-product description. G6B1-07 was expected to be a resilience control although the excerpt explicitly describes Performance Efficiency. No individual semantic-isolation fallback existed for a failed member of a paired request.\n\nThe audit was completed before V2 evaluator implementation. Original labels, outputs and scores remain unchanged.\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ preservedFileCount: files.length, preservationFingerprint: manifestFingerprint, originalEvaluationCount: evaluations.length, uniqueCaseCount: new Set(evaluations.map((item: any) => item.caseId)).size, labelDefectCases: consistency.filter((item: any) => !item.consistent).map((item: any) => item.caseId), networkCalls: 0, modelCalls: 0, productionAccepted: false }, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
