import { createHash } from 'node:crypto';
import { mkdir, readFile, statfs, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalEpistemicStatuses, mapHistoricalEpistemicStatus, type CanonicalEpistemicStatus } from '@aiw/domain';
import { scoreEvidenceSupport } from '../../apps/api/src/approvedKnowledgeGrounding.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const evidenceRoot = resolve(root, 'release-evidence/rc10.73.8');
const generatedAt = new Date().toISOString();
const sha256 = (value: string | Buffer) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
};

await mkdir(evidenceRoot, { recursive: true });
const historicalSmokePath = resolve(evidenceRoot, 'GATE_6B_REPLACEMENT_LIVE_BOUNDED_SMOKE_RESULT.json');
const historicalSmokeBytes = await readFile(historicalSmokePath);
const historicalSmoke = JSON.parse(historicalSmokeBytes.toString('utf8'));
const historicalSmokeSha256 = sha256(historicalSmokeBytes);

const azureCorrections = historicalSmoke.candidateRecord.output.claims.map((claim: any, index: number) => ({
  claimIndex: index,
  historicalStatus: claim.epistemicStatus,
  canonicalStatus: 'source-example',
  statementOrigin: 'source',
  epistemicBasis: 'documented-example',
  rationale: index === 0
    ? 'The passage demonstrates orchestration in a worked Bicep example; it does not establish a universal capability guarantee.'
    : 'The statement describes configuration shown in the documented example and remains example-scoped.',
  candidateOnly: true,
  reviewRequired: true,
}));

const mapping = {
  schemaVersion: 'aiw-gate-6b-epistemic-status-mapping-v1', generatedAt, productionAccepted: false,
  canonicalSchemaReference: 'release-evidence/rc10.73.8/EPISTEMIC_STATUS_SCHEMA.json',
  canonicalStatuses: canonicalEpistemicStatuses,
  historicalMappings: [
    mapHistoricalEpistemicStatus('source-asserted'),
    mapHistoricalEpistemicStatus('source-asserted', { bindingLanguage: true }),
    mapHistoricalEpistemicStatus('source-asserted', { explicitSourceAdvice: true }),
    mapHistoricalEpistemicStatus('source-asserted', { documentedExample: true }),
    mapHistoricalEpistemicStatus('source-asserted', { implementationObservation: true }),
    mapHistoricalEpistemicStatus('model-inferred'),
    mapHistoricalEpistemicStatus('uncertain'),
    mapHistoricalEpistemicStatus('unrecognised-status'),
  ],
  azureSmokeMigration: {
    historicalReceipt: 'GATE_6B_REPLACEMENT_LIVE_BOUNDED_SMOKE_RESULT.json', historicalReceiptSha256: historicalSmokeSha256,
    historicalReceiptMutated: false, evidenceId: historicalSmoke.candidateRecord.evidenceId,
    immutableCommit: historicalSmoke.candidateRecord.evidenceLineage.immutableCommit,
    migrationDisposition: 'candidate-review-proposal-not-applied-to-approved-knowledge', corrections: azureCorrections,
  },
  approvedKnowledgeGraphChanged: false, designGraphMutations: 0, automaticPromotions: 0,
};
await writeFile(resolve(evidenceRoot, 'GATE_6B_EPISTEMIC_STATUS_MAPPING.json'), `${JSON.stringify(mapping, null, 2)}\n`);

const alignment = `# Gate 6B epistemic contract alignment

Generated: ${generatedAt}

Status: **implemented for future Gate 6B transformations; historical evidence preserved**. Production accepted: **false**.

Gate 6A's \`EPISTEMIC_STATUS_SCHEMA.json\` is canonical. Future outputs may use only: ${canonicalEpistemicStatuses.map((item) => `\`${item}\``).join(', ')}.

Every claim now carries both a statement origin and an epistemic basis. Source-backed statuses require source origin; \`sol-inference\` requires Sol origin; and \`hypothesis\` requires hypothesis origin. Product-runtime Sol cannot assign \`expert-interpretation\`; that status requires a separate external-review receipt. A normative requirement additionally requires official-specification authority, binding source language, and a \`normative-text\` basis. These controls prevent an example from becoming a requirement merely because a model assigns a stronger label.

The legacy values \`source-asserted\`, \`model-inferred\`, and \`uncertain\` are not accepted by the strict output schema. \`source-asserted\` requires context-specific migration to requirement, recommendation, example, implementation observation, or an explicit unknown/review state. \`model-inferred\` maps to \`sol-inference\`; \`uncertain\` maps to \`unknown\`. Unknown values are rejected.

The three claims in the successful Azure Bicep smoke are assessed as \`source-example\`, not normative requirements. They describe a worked deployment example and its demonstrated module configuration. The historical receipt remains unchanged; the correction exists only in \`GATE_6B_EPISTEMIC_STATUS_MAPPING.json\` as a candidate review proposal.

No approved knowledge, production graph, or canonical Design Graph was changed.
`;
await writeFile(resolve(evidenceRoot, 'GATE_6B_EPISTEMIC_CONTRACT_ALIGNMENT.md'), alignment);

type CalibrationCase = {
  id: string; category: string; evidenceId: string; evidence: string; claim: string;
  expectedSupported: boolean; criticalUnsupported: boolean; rationale: string;
};
const calibrationCases: CalibrationCase[] = [
  { id: 'CAL-DIRECT', category: 'directly-supported', evidenceId: 'E-CB', evidence: 'A circuit breaker opens after repeated downstream failures and blocks further calls until the recovery interval ends.', claim: 'A circuit breaker opens after repeated downstream failures and blocks further calls until the recovery interval ends.', expectedSupported: true, criticalUnsupported: false, rationale: 'Direct statement replay.' },
  { id: 'CAL-PARAPHRASE', category: 'accurate-paraphrase', evidenceId: 'E-CB', evidence: 'When a downstream service repeatedly fails, a circuit breaker opens and prevents further calls until a recovery interval expires.', claim: 'When downstream failures repeat, the circuit breaker opens and blocks further calls until the recovery interval ends.', expectedSupported: true, criticalUnsupported: false, rationale: 'Condition and recovery limitation retained.' },
  { id: 'CAL-PARTIAL', category: 'partially-supported', evidenceId: 'E-CB', evidence: 'A circuit breaker blocks calls after repeated failures.', claim: 'A circuit breaker blocks calls after repeated failures and guarantees zero downtime.', expectedSupported: false, criticalUnsupported: true, rationale: 'Supported core plus unsupported guarantee.' },
  { id: 'CAL-UNSUPPORTED', category: 'unsupported', evidenceId: 'E-CB', evidence: 'A circuit breaker blocks calls after repeated failures.', claim: 'The pattern automatically encrypts all stored customer data.', expectedSupported: false, criticalUnsupported: true, rationale: 'Unrelated conclusion.' },
  { id: 'CAL-OTHER-PASSAGE', category: 'supported-by-another-passage', evidenceId: 'E-CB', evidence: 'A circuit breaker blocks calls after repeated failures.', claim: 'An outbox records events in the same transaction as business state.', expectedSupported: false, criticalUnsupported: true, rationale: 'Plausible elsewhere but unsupported by the cited passage.' },
  { id: 'CAL-EXCESSIVE', category: 'valid-id-excessive-conclusion', evidenceId: 'E-CB', evidence: 'A circuit breaker can reduce repeated calls during a downstream failure.', claim: 'A circuit breaker always eliminates every cascading failure without risk or operational cost.', expectedSupported: false, criticalUnsupported: true, rationale: 'Evidence ID is valid but conclusion is absolute and excessive.' },
  { id: 'CAL-EXAMPLE-GUARANTEE', category: 'example-generalised-to-guarantee', evidenceId: 'E-EX', evidence: 'For example, this sample deploys two modules to one resource group.', claim: 'This architecture always guarantees that every module deployment succeeds.', expectedSupported: false, criticalUnsupported: true, rationale: 'A worked example cannot establish a guarantee.' },
  { id: 'CAL-CONDITION-OMITTED', category: 'condition-omitted', evidenceId: 'E-COND', evidence: 'When traffic exceeds the configured threshold, the policy routes requests to a secondary endpoint.', claim: 'The policy routes requests to a secondary endpoint.', expectedSupported: false, criticalUnsupported: true, rationale: 'Trigger condition omitted.' },
  { id: 'CAL-LIMITATION-OMITTED', category: 'limitation-omitted', evidenceId: 'E-LIM', evidence: 'Caching can reduce read latency; however, stale data remains a consistency risk.', claim: 'Caching reduces read latency.', expectedSupported: false, criticalUnsupported: true, rationale: 'Material consistency limitation omitted.' },
  { id: 'CAL-CONTRADICTION', category: 'contradictory-evidence', evidenceId: 'E-NEG', evidence: 'The component must not persist authentication tokens.', claim: 'The component persists authentication tokens.', expectedSupported: false, criticalUnsupported: true, rationale: 'Claim reverses a binding prohibition.' },
  { id: 'CAL-CONDITION-RETAINED', category: 'condition-retained', evidenceId: 'E-COND', evidence: 'When traffic exceeds the configured threshold, the policy routes requests to a secondary endpoint.', claim: 'When traffic exceeds the configured threshold, the policy routes requests to a secondary endpoint.', expectedSupported: true, criticalUnsupported: false, rationale: 'Condition is retained.' },
  { id: 'CAL-LIMITATION-RETAINED', category: 'limitation-retained', evidenceId: 'E-LIM', evidence: 'Caching can reduce read latency; however, stale data remains a consistency risk.', claim: 'Caching can reduce read latency, but stale data remains a consistency risk.', expectedSupported: true, criticalUnsupported: false, rationale: 'Benefit and limitation retained.' },
];
const scoredCases = calibrationCases.map((item) => ({ ...item, score: scoreEvidenceSupport(item.claim, item.evidence, true) }));
const thresholds = [0.3, 0.4, 0.5, 0.55, 0.6, 0.7].map((threshold) => {
  let tp = 0; let fp = 0; let tn = 0; let fn = 0; let criticalFalsePositive = 0;
  for (const item of scoredCases) {
    const accepted = item.score.supportScore >= threshold;
    if (accepted && item.expectedSupported) tp += 1;
    else if (accepted) { fp += 1; if (item.criticalUnsupported) criticalFalsePositive += 1; }
    else if (item.expectedSupported) fn += 1;
    else tn += 1;
  }
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 1;
  return { threshold, tp, fp, tn, fn, precision, recall, falsePositiveRate: fp / Math.max(1, fp + tn), falseNegativeRate: fn / Math.max(1, fn + tp), criticalUnsupportedClaimRate: criticalFalsePositive / Math.max(1, scoredCases.filter((item) => item.criticalUnsupported).length) };
});
const recommendedThreshold = 0.6;
const calibrationSet = {
  schemaVersion: 'aiw-gate-6b-grounding-calibration-set-v1', generatedAt, productionAccepted: false,
  independentReviewStatus: 'provisional-not-independently-reviewed', precisionMode: true,
  cases: scoredCases, thresholds, recommendedThreshold,
  fingerprint: sha256(stable(scoredCases.map(({ id, category, evidenceId, evidence, claim, expectedSupported, criticalUnsupported, rationale }) => ({ id, category, evidenceId, evidence, claim, expectedSupported, criticalUnsupported, rationale })))),
  networkCalls: 0, modelCalls: 0, approvedKnowledgeChanged: false,
};
await writeFile(resolve(evidenceRoot, 'GATE_6B_GROUNDING_CALIBRATION_SET.json'), `${JSON.stringify(calibrationSet, null, 2)}\n`);
const selectedMetrics = thresholds.find((item) => item.threshold === recommendedThreshold)!;
await writeFile(resolve(evidenceRoot, 'GATE_6B_GROUNDING_SCORE_DEFINITION.md'), `# Gate 6B grounding support-score definition

Generated: ${generatedAt}

The support score is a deterministic lexical claim-coverage signal, not a probability, truth score, semantic-entailment guarantee, or authority score. Tokens shorter than four characters and common stop words are excluded. The lexical component is the fraction of material claim tokens shared with the cited evidence, rounded to four decimals.

In precision mode, unsupported absolutes, unsupported numeric specificity, omitted source conditions, omitted material limitations, and negation mismatch create explicit risk flags and force the support score to zero. A weak result is rejected rather than treated as verified. Exact evidence-ID membership and schema validation remain separate mandatory controls.

The score cannot reliably recognise novel synonyms, domain equivalence, causal validity, or subtle scope changes. It therefore supports fail-closed screening only. Human review and later independently labelled calibration remain mandatory.
`);
await writeFile(resolve(evidenceRoot, 'GATE_6B_GROUNDING_THRESHOLD_CALIBRATION.md'), `# Gate 6B grounding-threshold calibration

Generated: ${generatedAt}

Recommended provisional threshold: **${recommendedThreshold} in precision mode**. Production accepted: **false**.

At this threshold the provisional ${scoredCases.length}-case deterministic set measured precision ${(selectedMetrics.precision * 100).toFixed(1)}%, recall ${(selectedMetrics.recall * 100).toFixed(1)}%, false-positive rate ${(selectedMetrics.falsePositiveRate * 100).toFixed(1)}%, false-negative rate ${(selectedMetrics.falseNegativeRate * 100).toFixed(1)}%, and critical unsupported-claim rate ${(selectedMetrics.criticalUnsupportedClaimRate * 100).toFixed(1)}%.

The former Gate 6B threshold of 0.03 is retired. It was not calibrated and allowed weak lexical overlap to pass. The new threshold is provisional because the set is authored for deterministic engineering calibration and has not received independent labels. Precision is prioritised over recall: unsupported consequential claims and weak scores must abstain.

No provider calls were made. No approved knowledge or graph state changed.
`);

const pilot = JSON.parse(await readFile(resolve(evidenceRoot, 'GATE_6B_FINAL_PILOT_SELECTION.json'), 'utf8'));
const priorStrategy = JSON.parse(await readFile(resolve(evidenceRoot, 'GATE_6B_STRATEGY_COMPARISON_PLAN.json'), 'utf8'));
const manifestIndex = JSON.parse(await readFile(resolve(root, 'release-evidence/rc10.73.7/CONTENT_SNAPSHOT_MANIFEST_INDEX.json'), 'utf8'));
const bySemanticId = new Map(pilot.records.map((item: any) => [item.semanticUnitId, item]));
const manifestByConnector = new Map(manifestIndex.manifests.map((item: any) => [item.connectorId, item]));

const curated: Array<{ id: string; category: string; provisionalStatus: CanonicalEpistemicStatus; questions: string[] }> = [
  { id: 'SEMU-e9f9d891f5f3ea90e38f70a9', category: 'source-example', provisionalStatus: 'source-example', questions: ['What does the worked example demonstrate?', 'Which conclusions would over-generalise the example?'] },
  { id: 'SEMU-f2931bbe5d7f1c3fd9d4b1bd', category: 'source-example-implementation-structure', provisionalStatus: 'source-example', questions: ['Which module-test structure is demonstrated?', 'Which conclusions require evidence beyond this example?'] },
  { id: 'SEMU-8cb01d6b548dbace272417aa', category: 'interfaces-and-data-obligations', provisionalStatus: 'source-example', questions: ['Which interface and security obligations are directly stated?', 'Which statements are recommendations rather than requirements?'] },
  { id: 'SEMU-02a62be700366b90d661a71b', category: 'machine-readable-source-example', provisionalStatus: 'source-example', questions: ['Which interface and security facts are directly observable?', 'Which claims require abstention?'] },
  { id: 'SEMU-da2a0e336eef32c7df3b60c5', category: 'contradiction-and-scope-tension', provisionalStatus: 'normative-requirement', questions: ['Does the passage contain a true contradiction or a scoped distinction?', 'Identify both sides before judging.'] },
  { id: 'SEMU-5d681719b2ac4ad1465e0244', category: 'security-reference-architecture', provisionalStatus: 'source-stated-recommendation', questions: ['Identify security obligations and recommendations.', 'Which Architecture Genome fields are supported?'] },
  { id: 'SEMU-5145eec6ccf40e5e999b4bb2', category: 'resilience-and-performance', provisionalStatus: 'source-stated-recommendation', questions: ['Which quality drivers and trade-offs are explicit?', 'What conditions are required?'] },
  { id: 'SEMU-0fb29b6a62cb6cc9df28b5d4', category: 'modernisation-observation', provisionalStatus: 'implementation-observation', questions: ['Which operational lessons are observations?', 'Which recommendations are source-stated?'] },
  { id: 'SEMU-e1d61a650356828956575045', category: 'causal-pattern-dna', provisionalStatus: 'source-stated-recommendation', questions: ['Extract cause, mechanism, consequence, and trade-off.', 'Distinguish topology alternatives.'] },
  { id: 'SEMU-7fefaadf12f0efdec201ed2d', category: 'agentic-architecture-genome', provisionalStatus: 'implementation-observation', questions: ['Which agent-card fields are directly represented?', 'Which governance controls belong in the Architecture Genome?'] },
  { id: 'SEMU-047d5038e3482af8ee64b7fd', category: 'agentic-governance-cross-field', provisionalStatus: 'source-stated-recommendation', questions: ['Which fields are obligations versus illustrations?', 'Identify trust-boundary implications.'] },
  { id: 'SEMU-0484cddf43204952d6882ebe', category: 'pattern-dna-quality-model', provisionalStatus: 'implementation-observation', questions: ['Which quality relationships are machine-readable observations?', 'Which causal links remain hypotheses?'] },
  { id: 'SEMU-678ef38412e39a3c1245cb8c', category: 'cross-file-pattern-dna', provisionalStatus: 'implementation-observation', questions: ['How does this unit relate to its architecture group?', 'Which fields require cross-file evidence?'] },
  { id: 'SEMU-d9dd8008567d9ca5a3b73da4', category: 'resilience-source-example', provisionalStatus: 'source-example', questions: ['Which resilience behaviour is demonstrated?', 'What is not guaranteed by the example?'] },
  { id: 'SEMU-52c704f2c28e3897f26c840a', category: 'implementation-observation', provisionalStatus: 'implementation-observation', questions: ['Which module structure is observable?', 'Can it support a recommendation without other evidence?'] },
  { id: 'SEMU-5e095ebe0cf60567fe9c07a9', category: 'observability', provisionalStatus: 'source-example', questions: ['Which telemetry relationships are explicit?', 'What official-specification gaps remain?'] },
  { id: 'SEMU-887f5b7f716711dbb37786cb', category: 'diagram-semantics', provisionalStatus: 'implementation-observation', questions: ['Which model elements and relations are explicit?', 'Which semantics require a specialist parser?'] },
  { id: 'SEMU-807374cfa7e810b3e7d7118a', category: 'diagram-non-claim-control', provisionalStatus: 'unknown', questions: ['Does this paired model content carry an architectural proposition?', 'Which provenance must be retained if treated as a non-claim?'] },
  { id: 'SEMU-5ee5141bf54426a9f4d00b1f', category: 'cross-file-reasoning', provisionalStatus: 'implementation-observation', questions: ['What is supported by this unit alone?', 'What must be deferred to its architecture group?'] },
  { id: 'SEMU-2f7d1e8e3e138187076862c7', category: 'duplicate-reuse', provisionalStatus: 'source-example', questions: ['Is this content semantically reusable across occurrences?', 'What provenance must remain individual?'] },
  { id: 'SEMU-52464381ba053761a5c71a1b', category: 'deliberate-non-claim', provisionalStatus: 'unknown', questions: ['Does this passage contain any architectural proposition?', 'Should the system reject or abstain?'] },
  { id: 'SEMU-20c7f2c259762971c74979ed', category: 'modernisation', provisionalStatus: 'implementation-observation', questions: ['Which migration structure is observed?', 'Which target-state recommendation needs more evidence?'] },
  { id: 'SEMU-2c791505a291982eea0ec748', category: 'conformance-implementation', provisionalStatus: 'implementation-observation', questions: ['Which modularity rules are implemented?', 'Which rule can be treated as normative, if any?'] },
  { id: 'CONTROL-GH-AWESOME-ANTIPATTERN-claim-bearing-materially-different', category: 'insufficient-evidence-and-abstention', provisionalStatus: 'unknown', questions: ['No second governed passage is available. Must the system abstain?', 'What evidence is missing?'] },
];

async function evidenceFor(record: any): Promise<{ content: string; contentHash: string; hashReplay: boolean }> {
  if (!record.canonicalEvidenceId) return { content: '[No governed bounded evidence is available for this control.]', contentHash: sha256('[No governed bounded evidence is available for this control.]'), hashReplay: true };
  const manifest: any = manifestByConnector.get(record.connectorId);
  if (!manifest) throw new Error(`BENCHMARK_MANIFEST_MISSING:${record.connectorId}`);
  const parserPath = resolve(dirname(resolve(root, manifest.manifestPath)), 'files', `${record.path}.aiw.json`);
  const parsed = JSON.parse(await readFile(parserPath, 'utf8'));
  const passage = parsed.evidencePassages?.find((item: any) => item.evidenceId === record.canonicalEvidenceId);
  if (!passage?.boundedExcerpt) throw new Error(`BENCHMARK_EVIDENCE_MISSING:${record.semanticUnitId}`);
  const content = String(passage.boundedExcerpt);
  return { content, contentHash: sha256(content), hashReplay: sha256(content) === record.excerptHash && passage.excerptHash === record.excerptHash };
}

const benchmarkCases = [];
for (let index = 0; index < curated.length; index += 1) {
  const definition = curated[index]!;
  const record: any = bySemanticId.get(definition.id);
  if (!record) throw new Error(`BENCHMARK_SELECTION_MISSING:${definition.id}`);
  const evidence = await evidenceFor(record);
  if (!evidence.hashReplay) throw new Error(`BENCHMARK_HASH_REPLAY_FAILED:${definition.id}`);
  benchmarkCases.push({
    caseId: `G6B1-${String(index + 1).padStart(2, '0')}`, semanticUnitId: record.semanticUnitId,
    evidenceId: record.canonicalEvidenceId ?? null, connectorId: record.connectorId, repository: record.repository,
    immutableCommit: record.immutableCommit ?? null, path: record.path ?? null, structuralRange: record.structuralRange ?? null,
    sourceAuthorityClass: record.sourceAuthorityClass, category: definition.category,
    boundedEvidenceContent: evidence.content, excerptHash: record.excerptHash ?? evidence.contentHash,
    reviewQuestions: definition.questions, architectureGroupId: record.crossFileGroupId ?? null,
    occurrenceCount: record.occurrenceCount ?? 0, evidenceAvailable: Boolean(record.canonicalEvidenceId),
    modelGeneratedAnswerIncluded: false, independentReviewStatus: 'not-reviewed',
    provisionalStatus: definition.provisionalStatus,
  });
}
const benchmarkFingerprint = sha256(stable(benchmarkCases.map(({ boundedEvidenceContent, provisionalStatus, ...item }) => ({ ...item, boundedEvidenceHash: sha256(boundedEvidenceContent) }))));
const priorIds: string[] = priorStrategy.pairedComparisonSubset.selection;
const currentIds = benchmarkCases.map((item) => item.semanticUnitId);
const removedPriorCases = priorIds.filter((id) => !currentIds.includes(id)).map((id) => {
  const record: any = bySemanticId.get(id);
  const singleSidedContradiction = record?.slot === 'supplementary-contradiction';
  return {
    semanticUnitId: id, retained: false,
    reason: singleSidedContradiction
      ? 'Replaced because the prior contradiction candidate supplied only one side within the case.'
      : (record?.meaningfulTokenCount ?? 0) <= 3
        ? 'Excluded as a one-to-three-token fragment.'
        : 'Replaced during fresh review to improve propositional context or mandatory coverage.',
  };
});
const manifest = {
  schemaVersion: 'aiw-gate-6b-24-case-benchmark-manifest-v1', generatedAt, productionAccepted: false,
  caseCount: benchmarkCases.length, semanticUnitCount: benchmarkCases.length, modelCalls: 0,
  independentReviewStatus: 'not-started', blindedPackContainsModelAnswers: false,
  coverage: [...new Set(benchmarkCases.map((item) => item.category))].sort(),
  architectureGroups: [...new Set(benchmarkCases.map((item) => item.architectureGroupId).filter(Boolean))].sort(),
  fingerprint: benchmarkFingerprint,
  freshQualityReview: {
    priorStrategyPlan: 'GATE_6B_STRATEGY_COMPARISON_PLAN.json', priorCaseCount: priorIds.length,
    retainedPriorCaseCount: priorIds.filter((id) => currentIds.includes(id)).length,
    replacedPriorCaseCount: removedPriorCases.length, removedPriorCases,
    headingOnlyCasesAllowed: false, oneToThreeTokenFragmentsAllowed: false, singleSidedContradictionCasesAllowed: false,
  },
  cases: benchmarkCases.map(({ boundedEvidenceContent, provisionalStatus, ...item }) => ({
    ...item, boundedEvidenceHash: sha256(boundedEvidenceContent), boundedEvidenceCharacters: boundedEvidenceContent.length,
    qualityReview: {
      fragmentExcluded: item.evidenceAvailable ? boundedEvidenceContent.trim().split(/\s+/).length > 3 : true,
      propositionalContentOrExplicitControl: item.evidenceAvailable ? boundedEvidenceContent.trim().split(/\s+/).length > 3 : item.category === 'insufficient-evidence-and-abstention',
      twoSidedContradictionEvidence: item.category === 'contradiction-and-scope-tension' ? /does not mandate/i.test(boundedEvidenceContent) && /\bMUST\b/.test(boundedEvidenceContent) : null,
    },
  })),
};
await writeFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_BENCHMARK_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_PROVISIONAL_LABELS.json'), `${JSON.stringify({
  schemaVersion: 'aiw-gate-6b-24-case-provisional-labels-v1', generatedAt, productionAccepted: false,
  independentReviewStatus: 'not-independently-approved', blindedReviewerMustNotReceiveThisFileInitially: true,
  benchmarkFingerprint, labels: benchmarkCases.map((item) => ({ caseId: item.caseId, expectedDisposition: item.evidenceAvailable ? (item.category.includes('non-claim') ? 'non-claim' : 'claim-or-structured-asset-candidate') : 'abstain-insufficient-evidence', provisionalEpistemicStatus: item.provisionalStatus, reviewRequired: true })),
}, null, 2)}\n`);
const blindedSections = benchmarkCases.map((item) => {
  const reviewContent = item.boundedEvidenceContent.replace(/[ \t]+$/gm, '');
  return `## ${item.caseId}\n\n- Evidence ID: \`${item.evidenceId ?? 'none'}\`\n- Repository: \`${item.repository}\`\n- Source authority: \`${item.sourceAuthorityClass}\`\n- Category under review: \`${item.category}\`\n- Architecture group: \`${item.architectureGroupId ?? 'none'}\`\n\n### Bounded evidence\n\n\`\`\`text\n${reviewContent}\n\`\`\`\n\n### Review questions\n\n${item.reviewQuestions.map((question) => `- ${question}`).join('\n')}\n`;
}).join('\n');
await writeFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_BLINDED_REVIEW_PACK.md'), `# Gate 6B 24-case blinded review pack\n\nGenerated: ${generatedAt}\n\nThis package contains source evidence and review questions only. It contains no model-generated or provisional answer. Presentation-only trailing whitespace is removed without changing source identity or the manifest's original excerpt hash. Independent review status: **not started**. Production accepted: **false**.\n\nBenchmark fingerprint: \`${benchmarkFingerprint}\`.\n\n${blindedSections}`);
await writeFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_REVIEW_INSTRUCTIONS.md'), `# Gate 6B 24-case independent review instructions\n\nGenerated: ${generatedAt}\n\nReview each case without opening \`GATE_6B_24_CASE_PROVISIONAL_LABELS.json\`. Determine claim/non-claim/abstention disposition, canonical epistemic status, evidence sufficiency, conditions, limitations, contradiction posture, Pattern DNA or Architecture Genome coverage, and whether cross-file evidence is required. Record uncertainty rather than forcing a label.\n\nA second pass may compare labels with the provisional package after initial judgements are frozen. This package is not independently approved until an identifiable human reviewer completes and signs the review receipt.\n`);

const disk = await statfs(root, { bigint: true });
const freeBytes = Number(disk.bavail * disk.bsize);
const projectedTemporaryBytes = 256 * 1024 ** 2;
const projectedPermanentBytes = 32 * 1024 ** 2;
const capacity = {
  schemaVersion: 'aiw-gate-6b-1-capacity-assessment-v1', generatedAt, productionAccepted: false,
  measuredFreeBytes: freeBytes, preferredMinimumBeforeExecutionBytes: 15 * 1024 ** 3,
  controlledStopFloorBytes: 8 * 1024 ** 3, projectedTemporaryBytes, projectedPermanentBytes,
  projectedFreeBytesAtPeak: freeBytes - projectedTemporaryBytes - projectedPermanentBytes,
  capacityReady: freeBytes >= 15 * 1024 ** 3 && freeBytes - projectedTemporaryBytes - projectedPermanentBytes >= 8 * 1024 ** 3,
  requiresFreshMeasurementImmediatelyBeforeExecution: true, automaticEvidenceDeletionAllowed: false,
};
await writeFile(resolve(evidenceRoot, 'GATE_6B_1_CAPACITY_ASSESSMENT.json'), `${JSON.stringify(capacity, null, 2)}\n`);
const proposedCommand = 'node --env-file-if-exists=.env --import=tsx scripts/rc10-73-8/run-gate-6b-strategy-micro-pilot.mts --manifest ../release-evidence/rc10.73.8/GATE_6B_24_CASE_BENCHMARK_MANIFEST.json --model gpt-4.1-mini-2025-04-14 --max-units 24 --max-calls 40 --max-tokens 120000 --max-retries 1 --concurrency 2 --approved-gate-6b-1';
const strategyPlan = {
  schemaVersion: 'aiw-gate-6b-1-strategy-micro-pilot-plan-v1', generatedAt, productionAccepted: false,
  executionStatus: 'prepared-not-approved-not-started', benchmarkFingerprint,
  provider: 'openai', exactModel: 'gpt-4.1-mini-2025-04-14', fallback: 'disabled',
  limits: { semanticUnits: 24, totalCalls: 40, retriesPerCall: 1, retryableOnly: ['provider-timeout','http-429','http-5xx'], totalTokens: 120000, concurrency: 2 },
  strategies: [
    { id: 'one-semantic-unit-per-call', plannedCalls: 24, maximumUnitsPerCall: 1 },
    { id: 'same-source-bounded-micro-batches', plannedCalls: 10, maximumUnitsPerCall: 3, crossSourceMixingAllowed: false },
    { id: 'bounded-architecture-group', plannedCalls: 6, maximumUnitsPerCall: 4, architectureGroupRequired: true },
  ],
  measuredMetrics: ['schema-validity','exact-evidence-lineage','unsupported-claim-rate','epistemic-status-accuracy','condition-and-limitation-completeness','non-claim-rejection','contradiction-precision','pattern-dna-completeness','architecture-genome-field-accuracy','cross-unit-contamination','tokens-per-valid-asset','calls-per-valid-asset','elapsed-duration','review-effort'],
  selectionRule: 'Quality gates and evidence precision outrank cost; the cheapest strategy cannot win if it reduces correctness.',
  candidateOnlyPersistence: true, automaticPromotionAllowed: false, designGraphMutationAllowed: false,
  tokenCeilingApproved: false, costApprovalStatus: 'not-approved', pricingEstimateStatus: 'not-calculated-no-pricing-query',
  capacityAssessment: capacity, runnerImplementationStatus: 'proposed-command-not-executed', proposedCommand,
};
await writeFile(resolve(evidenceRoot, 'GATE_6B_1_STRATEGY_MICRO_PILOT_PLAN.json'), `${JSON.stringify(strategyPlan, null, 2)}\n`);
await writeFile(resolve(evidenceRoot, 'GATE_6B_1_EXECUTION_APPROVAL.md'), `# Gate 6B.1 strategy micro-pilot approval package\n\nGenerated: ${generatedAt}\n\nStatus: **prepared, not approved, not started**. Production accepted: **false**.\n\nThe proposed comparison uses the same 24 independently reviewable cases across individual calls, same-source micro-batches, and bounded architecture-group calls. The hard envelope is 24 units, 40 calls, 120,000 total tokens, concurrency two, and at most one retry only for timeout, HTTP 429, or HTTP 5xx. Fallback is disabled and the exact model is \`gpt-4.1-mini-2025-04-14\`.\n\nMeasured free space: ${freeBytes} bytes. Projected peak free space: ${capacity.projectedFreeBytesAtPeak} bytes. A fresh capacity check is mandatory immediately before any future execution.\n\nCost approval is **not granted** and no pricing estimate was queried. The provisional token ceiling is not execution authority.\n\nProposed command after implementation review and explicit product-owner approval:\n\n\`\`\`powershell\n${proposedCommand}\n\`\`\`\n\nDo not execute Gate 6B.1, the remaining pilot, Gate 6C, or Gate 6D without separate approval.\n`);

process.stdout.write(`${JSON.stringify({ canonicalStatuses: canonicalEpistemicStatuses.length, calibrationCases: scoredCases.length, recommendedThreshold, calibrationMetrics: selectedMetrics, benchmarkCases: benchmarkCases.length, benchmarkFingerprint, capacity, modelCalls: 0, networkCalls: 0, productionAccepted: false }, null, 2)}\n`);
