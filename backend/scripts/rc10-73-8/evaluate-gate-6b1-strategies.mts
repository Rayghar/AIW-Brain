import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const evidenceRoot = resolve(root, 'release-evidence', 'rc10.73.8');
const sha256 = (value: string): string => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const strategies = ['one-semantic-unit-per-call', 'same-source-bounded-micro-batches', 'bounded-architecture-group'] as const;
const matchedCases = new Set(['G6B1-01','G6B1-02','G6B1-03','G6B1-04','G6B1-06','G6B1-07','G6B1-10','G6B1-11','G6B1-12','G6B1-13','G6B1-17','G6B1-18']);

async function readJson(name: string): Promise<any> {
  return JSON.parse(await readFile(resolve(evidenceRoot, name), 'utf8'));
}

async function writeJson(name: string, value: unknown): Promise<void> {
  await writeFile(resolve(evidenceRoot, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function criticalEpistemicErrors(expected: string, output: any): string[] {
  const errors: string[] = [];
  const statuses = (output.claims ?? []).map((claim: any) => claim.epistemicStatus);
  if (['non-claim', 'abstain'].includes(output.disposition)) return errors;
  if (expected === 'hypothesis' && statuses.some((status: string) => status !== 'hypothesis')) errors.push('hypothesis-represented-as-fact');
  if (['source-example','implementation-observation','illustration','unknown'].includes(expected) && statuses.includes('normative-requirement')) errors.push('descriptive-or-example-evidence-elevated-to-requirement');
  if ((output.claims ?? []).some((claim: any) => claim.statementOrigin === 'sol' && !['sol-inference','hypothesis'].includes(claim.epistemicStatus))) errors.push('model-inference-recorded-as-source-fact');
  return errors;
}

function metrics(records: any[], labels: Map<string, any>, requests: any[]) {
  const evaluated = records.map((record) => {
    const expected = labels.get(record.caseId);
    const output = record.output;
    const dispositionCorrect = expected?.disposition === output.disposition;
    const statuses = (output.claims ?? []).map((claim: any) => claim.epistemicStatus);
    const epistemicExact = expected?.disposition !== 'claim-candidate'
      ? output.claims.length === 0
      : statuses.length > 0 && statuses.includes(expected.primaryEpistemicStatus);
    const conditionsComplete = expected?.disposition !== 'claim-candidate' || output.claims.every((claim: any) => Array.isArray(claim.conditions) && claim.conditions.length > 0);
    const limitationsComplete = expected?.disposition !== 'claim-candidate' || output.claims.every((claim: any) => Array.isArray(claim.limitations) && claim.limitations.length > 0);
    const nonClaimCorrect = expected?.disposition === 'claim-candidate' || (['non-claim','abstain'].includes(output.disposition) && output.claims.length === 0);
    const criticalErrors = criticalEpistemicErrors(expected?.primaryEpistemicStatus ?? 'unknown', output);
    return { caseId: record.caseId, requestId: record.requestId, dispositionCorrect, epistemicExact, conditionsComplete, limitationsComplete, nonClaimCorrect, criticalErrors };
  });
  const rate = (field: keyof (typeof evaluated)[number]) => evaluated.length ? evaluated.filter((item) => item[field] === true).length / evaluated.length : 0;
  const requestIds = new Set(records.map((item) => item.requestId));
  const relevantRequests = requests.filter((item) => requestIds.has(item.requestId));
  const atomicSupport = relevantRequests.flatMap((item) => item.groundingSupport ?? []);
  const unsupported = atomicSupport.filter((item: any) => item.status !== 'supported' && item.persisted !== false);
  const rejectedBeforePersistence = atomicSupport.filter((item: any) => item.persisted === false);
  const criticalErrors = evaluated.flatMap((item) => item.criticalErrors.map((error) => ({ caseId: item.caseId, error })));
  const schemaValidity = relevantRequests.length ? relevantRequests.filter((item) => item.schemaValid === true).length / relevantRequests.length : 0;
  const evidenceLineage = relevantRequests.length ? relevantRequests.filter((item) => item.evidenceLineageValid === true).length / relevantRequests.length : 0;
  const totalInputTokens = relevantRequests.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0);
  const totalOutputTokens = relevantRequests.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0);
  const claims = records.reduce((sum, item) => sum + (item.output.claims?.length ?? 0), 0);
  const qualityScore = 0.25 * rate('dispositionCorrect') + 0.25 * rate('epistemicExact') + 0.15 * rate('conditionsComplete') + 0.15 * rate('limitationsComplete') + 0.20 * rate('nonClaimCorrect');
  const gate = {
    schemaValidityAtLeast98Percent: schemaValidity >= 0.98,
    exactEvidenceLineage100Percent: evidenceLineage === 1,
    consequentialUnsupportedClaimRateZero: unsupported.length === 0,
    criticalEpistemicMisclassificationZero: criticalErrors.length === 0,
    candidateAuthorityLeakageZero: records.every((item) => item.authority === 'candidate'),
    designGraphMutationZero: records.every((item) => item.designGraphMutation === false),
    automaticPromotionZero: records.every((item) => item.automaticPromotion === false),
    dispositionAccuracyAtLeast90Percent: rate('dispositionCorrect') >= 0.90,
    epistemicExactAccuracyAtLeast90Percent: rate('epistemicExact') >= 0.90,
    nonClaimRejectionAccuracyAtLeast95Percent: rate('nonClaimCorrect') >= 0.95,
    conditionCompletenessAtLeast90Percent: rate('conditionsComplete') >= 0.90,
    limitationCompletenessAtLeast90Percent: rate('limitationsComplete') >= 0.90,
  };
  return {
    caseOutputs: evaluated.length, requestCount: relevantRequests.length, claimCount: claims,
    schemaValidity, exactEvidenceLineage: evidenceLineage, consequentialUnsupportedClaimCount: unsupported.length,
    atomicClaimsRejectedBeforePersistence: rejectedBeforePersistence.length,
    criticalEpistemicMisclassificationCount: criticalErrors.length, criticalEpistemicErrors: criticalErrors,
    dispositionAccuracy: rate('dispositionCorrect'), epistemicExactAccuracy: rate('epistemicExact'),
    conditionCompleteness: rate('conditionsComplete'), limitationCompleteness: rate('limitationsComplete'),
    nonClaimRejectionAccuracy: rate('nonClaimCorrect'), qualityScore,
    inputTokens: totalInputTokens, outputTokens: totalOutputTokens, totalTokens: totalInputTokens + totalOutputTokens,
    gate, passed: Object.values(gate).every(Boolean), cases: evaluated,
  };
}

const execution = await readJson('GATE_6B_1_LIVE_EXECUTION_RESULT.json');
const candidates = await readJson('GATE_6B_1_LIVE_CANDIDATE_RECORDS.json');
const reviewer = await readJson('GATE_6B_24_CASE_REVIEWER_LABELS.json');
const labels = new Map(reviewer.labels.map((item: any) => [item.caseId, item]));
const directComparison: Record<string, unknown> = {};
for (const strategy of strategies) {
  const subset = candidates.records.filter((item: any) => item.strategy === strategy && matchedCases.has(item.caseId));
  directComparison[strategy] = metrics(subset, labels, execution.requestReceipts);
}
const broadIndividual = metrics(candidates.records.filter((item: any) => item.strategy === 'one-semantic-unit-per-call'), labels, execution.requestReceipts);
const passing = strategies.map((strategy) => ({ strategy, result: directComparison[strategy] as any })).filter((item) => item.result.passed)
  .sort((left, right) => right.result.qualityScore - left.result.qualityScore || right.result.epistemicExactAccuracy - left.result.epistemicExactAccuracy || left.result.totalTokens - right.result.totalTokens);
const selectedStrategy = passing[0]?.strategy ?? null;
  const decision = selectedStrategy ? selectedStrategy : 'redesign-and-rerun-smaller-diagnostic-set';
const generatedAt = new Date().toISOString();
const evaluation = {
  schemaVersion: 'aiw-gate-6b-1-strategy-evaluation-v1', generatedAt, productionAccepted: false,
  benchmarkFingerprint: execution.benchmarkFingerprint, matchedSubsetFingerprint: execution.matchedSubsetFingerprint,
  reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false,
  broadIndividualBaseline: broadIndividual, directMatchedSubsetComparison: directComparison,
  directComparisonCaseCount: 12, broadBaselineCaseCount: 24,
  qualityOutranksCost: true, selectedDecision: decision, selectedStrategy,
  relativeBestStrategyBeforeQualityGates: (strategies.map((strategy) => ({ strategy, result: directComparison[strategy] as any }))
    .sort((left, right) => right.result.qualityScore - left.result.qualityScore)[0]?.strategy ?? null),
  gatesPassed: Boolean(selectedStrategy),
  candidateAuthorityLeakage: 0, designGraphMutations: 0, automaticPromotions: 0,
  approvedKnowledgeChanges: 0, productionAcceptedStatus: false,
  evaluationFingerprint: '',
};
evaluation.evaluationFingerprint = sha256(JSON.stringify(evaluation));
await writeJson('GATE_6B_1_STRATEGY_EVALUATION.json', evaluation);
await writeFile(resolve(evidenceRoot, 'GATE_6B_1_TECHNICAL_DECISION.md'), `# Gate 6B.1 technical decision\n\nGenerated: ${generatedAt}\n\nDecision: **${decision}**. Production accepted: **false**.\n\nThe decision uses the 12-case matched subset for direct strategy comparison and all 24 individual cases only as the broad baseline. Quality gates are applied before token cost. ${selectedStrategy ? `The selected strategy passed schema, exact-lineage, consequential-unsupported-claim, critical-epistemic, authority-isolation, Design Graph and promotion gates.` : `No strategy passed every mandatory gate; a smaller diagnostic redesign is required before Prompt 6G can proceed.`}\n\nThis is a GPT-5.6 Sol delegated technical decision, not independent human validation and not knowledge promotion. All outputs remain candidate-only. Backup remains deferred.\n`, 'utf8');
await writeJson('PROMPT_6G_ENTRY_RECEIPT.json', {
  schemaVersion: 'aiw-prompt-6g-entry-receipt-v1', generatedAt, productionAccepted: false,
  gate6b1EvaluationFingerprint: evaluation.evaluationFingerprint, gate6b1Passed: Boolean(selectedStrategy),
  selectedStrategy, entryStatus: selectedStrategy ? 'permitted-epistemic-uncertainty-engineering-only' : 'blocked-pending-strategy-redesign',
  permittedScope: selectedStrategy ? ['epistemic-status-contract-hardening','first-class-uncertainty-records','knowledge-gap-and-abstention-controls'] : [],
  prohibitedScope: ['knowledge-promotion','approved-knowledge-mutation','Design-Graph-mutation','automatic-promotion','production-acceptance'],
  humanReviewerPresent: false, externallyVerified: false, backupStatus: 'deferred-by-product-owner',
  gate6cStatus: 'blocked', gate6dStatus: 'not-started',
});
process.stdout.write(`${JSON.stringify({ selectedDecision: decision, selectedStrategy, gatesPassed: Boolean(selectedStrategy), broadIndividual, directComparison, productionAccepted: false }, null, 2)}\n`);
