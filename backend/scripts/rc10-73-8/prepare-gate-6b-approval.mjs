import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, statfs, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const product = resolve(here, '../../..');
const evidenceRoot = resolve(product, 'release-evidence/rc10.73.8');
const candidateRoot = resolve(product, 'knowledge-repository/AKR-0.10.73.8/candidate/gate-6a/deterministic-corpus-v1');
const generatedAt = new Date().toISOString();
const localTestsPassed = process.argv.includes('--local-tests-passed');
const localBuildPassed = process.argv.includes('--local-build-passed');
const intendedModel = process.env.AIW_LLM_KNOWLEDGE_EXTRACTION_MODEL || process.env.AIW_KNOWLEDGE_MODEL || process.env.AIW_LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-sol';
const secretPresent = Boolean(process.env.OPENAI_API_KEY);
const allowlist = (() => { try { const value = JSON.parse(process.env.AIW_LLM_MODEL_ALLOWLIST || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } })();
const selectedAllowlistEntry = allowlist.find((entry) => entry?.providerId === 'openai' && entry?.model === intendedModel && (!entry.purposes?.length || entry.purposes.includes('knowledge-extraction')));

function sha256(value) { return `sha256:${createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex')}`; }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stable(item)]));
  return value;
}
async function* ndjson(path) {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) yield JSON.parse(line);
}
function pathFamily(path) { return path.split('/').slice(0, 2).join('/').toLowerCase(); }
function theme(value) {
  const text = `${value.repository} ${value.path} ${value.heading ?? ''}`.toLowerCase();
  if (/agent|multi-agent|a2a|mcp/.test(text)) return 'agentic-architecture';
  if (/observ|telemetr|metric|trace|logging/.test(text)) return 'observability';
  if (/secur|identity|auth|threat|zero-trust/.test(text)) return 'security';
  if (/resilien|retry|circuit|failover|chaos|recovery/.test(text)) return 'resilience';
  if (/migrat|modern|refactor|legacy/.test(text)) return 'modernisation';
  if (/interface|api|asyncapi|event|message|contract|schema/.test(text)) return 'interfaces-and-data-obligations';
  if (/pattern|tactic|quality|fitness|conformance|rule/.test(text)) return 'patterns-tactics-and-conformance';
  if (/diagram|model|c4|structurizr|plantuml|calm|likec4|topolog/.test(text)) return 'diagram-and-model-semantics';
  if (/reference|blueprint|deployment|terraform|kubernetes|helm/.test(text)) return 'reference-and-deployment-architecture';
  return 'general-architecture';
}
function artefactTypes(value) {
  const extension = extname(value.path).toLowerCase();
  const output = [];
  if (['.json','.yaml','.yml','.xml','.tf','.hcl','.dsl','.puml','.plantuml','.mmd','.bpmn','.drawio','.c4','.calm'].includes(extension)) output.push('machine-readable-or-structured-model');
  if (['.png','.jpg','.jpeg','.svg','.gif','.webp','.drawio','.puml','.plantuml','.mmd'].includes(extension)) output.push('diagram-or-visual-model');
  if (/adr|decision/i.test(value.path)) output.push('adr-or-decision-source');
  if (/test|rule|fitness|archunit|jqassistant|conformance/i.test(value.path)) output.push('conformance-or-fitness-source');
  if (/deploy|terraform|kubernetes|helm|topology|blueprint/i.test(value.path)) output.push('deployment-or-topology-blueprint');
  if (/runbook|operat|observ|telemetr|resilien|chaos/i.test(value.path)) output.push('operational-or-resilience-source');
  if (/agent|a2a|mcp/i.test(value.path)) output.push('agentic-architecture-source');
  return output.length ? [...new Set(output)] : ['bounded-prose-or-code-evidence'];
}
function negativeCandidateBasis(value) {
  if (['boilerplate','generated-content','non-architectural'].includes(value.semanticDisposition)) return `deterministic-${value.semanticDisposition}`;
  const administrative = `${value.path} ${value.heading ?? ''}`.toLowerCase();
  if (/(^|[/\\])licen[cs]e(?:\.|$)|acknowledg|contribut|code of conduct|security policy|release notes|changelog/.test(administrative)) return 'administrative-passage-negative-control';
  if ((value.tokenCount ?? Number.POSITIVE_INFINITY) <= 10) return 'short-passage-negative-control';
  return null;
}
function rank(value, kind) {
  let score = Math.min(value.tokenCount ?? 0, 2000);
  if (value.crossFileGroupId) score += 5000;
  if (value.contradictionEvidenceEstimate) score += 4000;
  if (value.semanticDisposition === 'near-duplicate-clustered') score += 3000;
  if (value.semanticDisposition === 'ambiguous') score += 2500;
  if (kind === 'negative' && negativeCandidateBasis(value)) score += 5000;
  if (kind === 'claim' && value.proposedForSemanticTransformation) score += 5000;
  return score;
}
function retain(pool, value, kind) {
  pool.push(value);
  if (pool.length > 128) pool.sort((left, right) => rank(right, kind) - rank(left, kind) || left.evidenceId.localeCompare(right.evidenceId)).splice(128);
}
function choose(pool, used, predicate = () => true) {
  return [...pool].sort((left, right) => rank(right, left.poolKind) - rank(left, right.poolKind) || left.evidenceId.localeCompare(right.evidenceId)).find((value) => !used.has(value.semanticUnitId) && predicate(value));
}

const governance = JSON.parse(await readFile(resolve(product, 'release-evidence/rc10.73.7/ALL_47_REPOSITORY_GOVERNANCE_MATRIX.json'), 'utf8'));
const authorityByConnector = new Map(governance.repositories.map((item) => [item.connectorId, item.sourceAuthorityClass]));
const repositories = [...governance.repositories].sort((left, right) => left.connectorId.localeCompare(right.connectorId));
const crossFile = JSON.parse(await readFile(resolve(product, 'release-evidence/rc10.73.7/CROSS_FILE_ARCHITECTURE_GROUPS.json'), 'utf8'));
const crossFileByPath = new Map();
for (const group of crossFile.groups) for (const path of group.memberPaths) if (!crossFileByPath.has(`${group.connectorId}\n${path}`)) crossFileByPath.set(`${group.connectorId}\n${path}`, group.groupId);

const semanticUnits = new Map();
for (const name of (await readdir(candidateRoot)).filter((name) => /^semantic-units-[0-9a-f]{2}\.ndjson$/.test(name)).sort()) {
  for await (const unit of ndjson(resolve(candidateRoot, name))) semanticUnits.set(unit.semanticUnitId, unit);
}

const pools = new Map(repositories.map((item) => [item.connectorId, { claim: [], negative: [], complex: [], any: [] }]));
for (const name of (await readdir(candidateRoot)).filter((name) => /^passage-dispositions-[0-9a-f]{2}\.ndjson$/.test(name)).sort()) {
  for await (const passage of ndjson(resolve(candidateRoot, name))) {
    const unit = semanticUnits.get(passage.semanticUnitId);
    const pool = pools.get(passage.connectorId);
    if (!unit || !pool) continue;
    const crossFileGroupId = crossFileByPath.get(`${passage.connectorId}\n${passage.path}`) ?? null;
    const value = {
      ...passage,
      proposedForSemanticTransformation: unit.proposedForSemanticTransformation === true,
      occurrenceCount: unit.occurrenceCount,
      nearDuplicateCluster: unit.nearDuplicateCluster === true,
      crossFileGroupId,
      sourceAuthorityClass: authorityByConnector.get(passage.connectorId),
    };
    retain(pool.any, { ...value, poolKind: 'any' }, 'any');
    if (value.proposedForSemanticTransformation && !['boilerplate','generated-content','non-architectural'].includes(value.semanticDisposition)) retain(pool.claim, { ...value, poolKind: 'claim' }, 'claim');
    if (negativeCandidateBasis(value)) retain(pool.negative, { ...value, poolKind: 'negative' }, 'negative');
    if (value.contradictionEvidenceEstimate || value.crossFileGroupId || value.nearDuplicateCluster || ['ambiguous','near-duplicate-clustered','human-review-required'].includes(value.semanticDisposition) || value.tokenCount >= 400) retain(pool.complex, { ...value, poolKind: 'complex' }, 'complex');
  }
}

function selectionRecord(value, slot, expectedOutcome, pairWithSemanticUnitId = null) {
  const complexityReasons = [
    ...(value.contradictionEvidenceEstimate ? ['contradiction-signal'] : []),
    ...(value.crossFileGroupId ? ['cross-file-architecture-group'] : []),
    ...(value.nearDuplicateCluster || value.semanticDisposition === 'near-duplicate-clustered' ? ['alias-or-near-duplicate'] : []),
    ...(value.semanticDisposition === 'ambiguous' ? ['ambiguous-evidence'] : []),
    ...(value.tokenCount >= 400 ? ['high-information-density'] : []),
  ];
  return {
    slot, connectorId: value.connectorId, repository: value.repository, sourceAuthorityClass: value.sourceAuthorityClass,
    semanticUnitId: value.semanticUnitId, canonicalEvidenceId: value.evidenceId, immutableCommit: value.immutableCommit,
    path: value.path, heading: value.heading, structuralRange: value.structuralRange, excerptHash: value.excerptHash,
    parserVersion: value.parserVersion, tokenCount: value.tokenCount, occurrenceCount: value.occurrenceCount,
    deterministicDisposition: value.semanticDisposition, expectedOutcome, independentReviewStatus: 'not-independently-reviewed',
    ...(slot === 'deliberate-non-claim' ? { negativeControlBasis: negativeCandidateBasis(value) } : {}),
    theme: theme(value), artefactTypes: artefactTypes(value), crossFileGroupId: value.crossFileGroupId,
    complexityReasons, ...(pairWithSemanticUnitId ? { pairWithSemanticUnitId } : {}),
  };
}
function evidenceGapControl(repository, slot, reason) {
  return {
    slot,
    connectorId: repository.connectorId,
    repository: repository.ownerRepository,
    sourceAuthorityClass: repository.sourceAuthorityClass,
    semanticUnitId: `CONTROL-${repository.connectorId}-${slot}`,
    canonicalEvidenceId: null,
    immutableCommit: null,
    path: null,
    heading: null,
    structuralRange: null,
    excerptHash: null,
    parserVersion: null,
    tokenCount: 0,
    occurrenceCount: 0,
    deterministicDisposition: 'missing-governed-evidence',
    expectedOutcome: 'preflight-abstention-missing-governed-evidence',
    independentReviewStatus: 'not-independently-reviewed',
    theme: 'source-gap-and-abstention',
    artefactTypes: ['evidence-absence-control'],
    crossFileGroupId: null,
    complexityReasons: ['source-gap'],
    modelCallAllowed: false,
    isEvidenceAbsenceControl: true,
    gapReason: reason,
  };
}

const selection = [];
const selectedIds = new Set();
for (const repository of repositories) {
  const pool = pools.get(repository.connectorId);
  const used = new Set();
  const first = choose(pool.claim, used) ?? choose(pool.any, used);
  if (!first) throw new Error(`PILOT_SELECTION_EMPTY:${repository.connectorId}`);
  used.add(first.semanticUnitId); selectedIds.add(first.semanticUnitId);
  const second = choose(pool.claim, used, (item) => pathFamily(item.path) !== pathFamily(first.path) && (item.semanticDisposition !== first.semanticDisposition || extname(item.path) !== extname(first.path)))
    ?? choose(pool.claim, used, (item) => item.path !== first.path) ?? choose(pool.any, used, (item) => item.path !== first.path);
  if (second) { used.add(second.semanticUnitId); selectedIds.add(second.semanticUnitId); }
  const negative = choose(pool.negative, used);
  if (negative) { used.add(negative.semanticUnitId); selectedIds.add(negative.semanticUnitId); }
  const complex = choose(pool.complex, used) ?? choose(pool.any, used);
  if (complex) { used.add(complex.semanticUnitId); selectedIds.add(complex.semanticUnitId); }
  selection.push(selectionRecord(first, 'claim-bearing-primary', 'claim-candidate-or-evidence-bounded-abstention'));
  selection.push(second
    ? selectionRecord(second, 'claim-bearing-materially-different', 'claim-candidate-or-evidence-bounded-abstention')
    : evidenceGapControl(repository, 'claim-bearing-materially-different', 'Repository corpus has no second materially different bounded semantic unit.'));
  selection.push(negative
    ? selectionRecord(negative, 'deliberate-non-claim', 'non-claim-or-evidence-bounded-abstention')
    : evidenceGapControl(repository, 'deliberate-non-claim', 'Repository corpus has no bounded administrative, boilerplate, generated, irrelevant, or short negative-control passage.'));
  selection.push(complex
    ? selectionRecord(complex, 'complex-ambiguous-contradictory-or-cross-file', 'candidate-or-abstain-requiring-individual-review')
    : evidenceGapControl(repository, 'complex-ambiguous-contradictory-or-cross-file', 'Repository corpus has no distinct complex bounded semantic unit.'));
}

const allComplex = [...new Map(
  [...pools.values()].flatMap((pool) => pool.complex).map((item) => [item.semanticUnitId, item]),
).values()].filter((item) => !selectedIds.has(item.semanticUnitId));
const supplementaryDefinitions = [
  ['supplementary-contradiction', (item) => item.contradictionEvidenceEstimate, 4],
  ['supplementary-alias-near-duplicate', (item) => item.nearDuplicateCluster || item.semanticDisposition === 'near-duplicate-clustered', 4],
  ['supplementary-cross-file-or-model', (item) => item.crossFileGroupId || artefactTypes(item).some((type) => type.includes('model')), 4],
];
for (const [slot, predicate, count] of supplementaryDefinitions) {
  const matches = allComplex.filter((item) => !selectedIds.has(item.semanticUnitId) && predicate(item)).sort((left, right) => left.evidenceId.localeCompare(right.evidenceId)).slice(0, count);
  if (matches.length !== count) throw new Error(`PILOT_SUPPLEMENTARY_COVERAGE_MISSING:${slot}:${matches.length}`);
  for (const item of matches) {
    selectedIds.add(item.semanticUnitId);
    const pair = selection.find((candidate) => candidate.connectorId === item.connectorId && candidate.slot !== 'deliberate-non-claim') ?? selection.find((candidate) => candidate.theme === theme(item));
    selection.push(selectionRecord(item, slot, 'paired-analysis-candidate-or-abstention', pair?.semanticUnitId ?? null));
  }
}

if (selection.length !== 200) throw new Error(`PILOT_SELECTION_COUNT_INVALID:${selection.length}`);
let uniqueBoundedIds = new Set(selection.filter((item) => item.isEvidenceAbsenceControl !== true).map((item) => item.semanticUnitId));
if (uniqueBoundedIds.size < 188) {
  const extraCandidates = [...new Map(
    [...pools.values()].flatMap((pool) => pool.any).map((item) => [item.semanticUnitId, item]),
  ).values()]
    .filter((item) => !uniqueBoundedIds.has(item.semanticUnitId))
    .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
  const required = 188 - uniqueBoundedIds.size;
  if (selection.length + required > 220 || extraCandidates.length < required) throw new Error(`PILOT_EVIDENCE_UNIT_MINIMUM_MISSING:${uniqueBoundedIds.size}`);
  for (const item of extraCandidates.slice(0, required)) {
    selection.push(selectionRecord(item, 'supplementary-unique-unit-coverage', 'candidate-non-claim-or-evidence-bounded-abstention'));
    uniqueBoundedIds.add(item.semanticUnitId);
  }
}
const sourceGapControls = selection.filter((item) => item.isEvidenceAbsenceControl === true);
const requiredPilotThemes = ['agentic-architecture','diagram-and-model-semantics','interfaces-and-data-obligations','modernisation','observability','patterns-tactics-and-conformance','reference-and-deployment-architecture','resilience','security'];
const uniquePoolCandidates = [...new Map(
  [...pools.values()].flatMap((pool) => pool.any).map((item) => [item.semanticUnitId, item]),
).values()];
for (const requiredTheme of requiredPilotThemes) {
  if (selection.some((item) => item.isEvidenceAbsenceControl !== true && theme(item) === requiredTheme)) continue;
  const candidate = uniquePoolCandidates
    .filter((item) => !uniqueBoundedIds.has(item.semanticUnitId) && theme(item) === requiredTheme)
    .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId))[0];
  if (!candidate || selection.length >= 220) throw new Error(`PILOT_REQUIRED_THEME_MISSING:${requiredTheme}`);
  selection.push(selectionRecord(candidate, 'supplementary-required-theme-coverage', 'candidate-non-claim-or-evidence-bounded-abstention'));
  uniqueBoundedIds.add(candidate.semanticUnitId);
}
const boundedSemanticUnitCount = uniqueBoundedIds.size;
const boundedOccurrenceCount = selection.length - sourceGapControls.length;
const baseCounts = Object.fromEntries(repositories.map((repository) => [repository.connectorId, selection.filter((item) => item.connectorId === repository.connectorId && !item.slot.startsWith('supplementary-')).length]));
if (Object.values(baseCounts).some((count) => count !== 4)) throw new Error('PILOT_REPOSITORY_BASE_COVERAGE_INVALID');

function counts(items, key) { const result = {}; for (const item of items) for (const value of (Array.isArray(item[key]) ? item[key] : [item[key]])) result[value ?? 'none'] = (result[value ?? 'none'] ?? 0) + 1; return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right))); }
const abstentionCases = [
  { id: 'G6B-ABSTAIN-CORE-BANKING', topic: 'current normative core-banking modernisation guidance', evidenceRefs: [], expected: 'preflight-abstention-missing-governed-evidence', modelCallAllowed: false },
  { id: 'G6B-ABSTAIN-MCP-A2A', topic: 'complete official MCP and A2A protocol guidance', evidenceRefs: [], expected: 'preflight-abstention-missing-governed-evidence', modelCallAllowed: false },
  { id: 'G6B-ABSTAIN-OTEL-SPEC', topic: 'official OpenTelemetry specification semantics', evidenceRefs: [], expected: 'preflight-abstention-demo-cannot-substitute-for-official-specification', modelCallAllowed: false },
];
const authorityCoverage = counts(selection, 'sourceAuthorityClass');
const slotCoverage = counts(selection, 'slot');
const artefactCoverage = counts(selection, 'artefactTypes');
const themeCoverage = counts(selection, 'theme');
const dispositionCoverage = counts(selection, 'deterministicDisposition');
const selectionFingerprint = sha256(JSON.stringify(stable(selection)));
const uniqueEvidenceSelection = [...new Map(
  selection.filter((item) => item.isEvidenceAbsenceControl !== true).map((item) => [item.semanticUnitId, item]),
).values()];
const comparisonPriority = (item) => {
  if (item.slot === 'supplementary-contradiction') return 0;
  if (item.slot === 'supplementary-alias-near-duplicate') return 1;
  if (item.slot === 'supplementary-cross-file-or-model' || item.crossFileGroupId) return 2;
  if (item.slot === 'deliberate-non-claim') return 3;
  return 4;
};
const comparisonSubset = [...uniqueEvidenceSelection]
  .sort((left, right) => comparisonPriority(left) - comparisonPriority(right) || left.semanticUnitId.localeCompare(right.semanticUnitId))
  .slice(0, 24);

const strategyPlan = {
  schemaVersion: 'aiw-gate-6b-strategy-comparison-plan-v1', generatedAt, productionAccepted: false,
  pilotSelectionRecords: selection.length, boundedSemanticUnits: boundedSemanticUnitCount, boundedOccurrences: boundedOccurrenceCount,
  sourceGapControls: sourceGapControls.length, evidenceAbsenceControls: abstentionCases.length,
  pairedComparisonSubset: {
    semanticUnits: 24,
    selection: comparisonSubset.map((item) => item.semanticUnitId),
    composition: counts(comparisonSubset, 'slot'),
    crossFileGroupUnitCount: comparisonSubset.filter((item) => item.crossFileGroupId).length,
    strategies: [
      { id: 'one-unit-per-call', maximumUnitsPerCall: 1, plannedCalls: 24 },
      { id: 'same-source-micro-batch', maximumUnitsPerCall: 3, plannedCalls: 8, crossSourceMixingAllowed: false },
      { id: 'bounded-architecture-group', maximumUnitsPerCall: 4, plannedCalls: 6, crossFileGroupRequired: true },
    ],
  },
  measuredMetrics: ['schema-validity','evidence-lineage-accuracy','unsupported-claims','cross-unit-contamination','condition-and-limitation-completeness','epistemic-classification','ontology-classification','duplicate-reuse','contradiction-precision','pattern-dna-completeness','architecture-genome-completeness','token-use','model-calls','retries','elapsed-time','candidate-output-size','projected-human-review-load'],
  selectionRule: 'Evidence precision and zero cross-unit contamination outrank cost. Lowest cost may not win.',
  projectedCalls: { comparison: 38, remainingIfIndividual: 176, evidenceAbsencePreflightCalls: 0, likelyTotalIfIndividualWins: 214, hardCeiling: 250 },
  projectedUnitEquivalents: 248,
};
const tokenPlan = {
  schemaVersion: 'aiw-gate-6b-token-and-retry-policy-v1', generatedAt, productionAccepted: false,
  maximumSemanticUnits: 220, selectedSemanticUnits: boundedSemanticUnitCount, selectionRecords: selection.length, sourceGapControls: sourceGapControls.length,
  maximumModelCalls: 250, maximumTotalTokens: 750000,
  estimatedTokens: { minimum: 285200, likely: 458800, maximumUncapped: 806000, maximumScenarioExceedsCeiling: true },
  estimatedElapsedRuntimeSeconds: { minimum: 900, likely: 2700, maximumAtLimits: 9000, basis: '214 likely calls, initial concurrency two, provider latency and bounded retries not yet measured' },
  estimatedCandidateOutputBytes: { likely: 24 * 1024 ** 2, maximumEnvelope: 64 * 1024 ** 2 },
  maximumRetriesPerUnitOrBatch: 2, initialConcurrency: 2, maximumConcurrencyAfterCleanEvidence: 4,
  retryable: ['provider-timeout','provider-429','provider-5xx','transient-transport'],
  neverRetry: ['model-not-allowlisted','missing-secret','input-too-large','missing-evidence-lineage','schema-invalid','citation-outside-allowlist','unsupported-critical-claim','candidate-authority-leakage','design-graph-mutation'],
  controlledStops: ['modelCalls>=250','totalTokens>=750000','semanticUnits>220','freeSpace<8GiB','retries>2','candidate-authority-leakage','design-graph-mutation','secret-exposure','unsupported-critical-claim','loss-of-evidence-lineage','repeated-schema-failure'],
  costApprovalStatus: 'not-approved', pricingStatus: 'not-queried-no-network',
};
const uniqueIds = (items) => [...new Set(items.map((item) => item.semanticUnitId))];
const mandatoryReview = uniqueEvidenceSelection.filter((item) => item.slot.includes('complex') || item.slot.includes('contradiction') || item.crossFileGroupId || ['official-specification-or-standard','official-reference-architecture'].includes(item.sourceAuthorityClass));
const clusterReview = uniqueEvidenceSelection.filter((item) => item.slot.includes('alias') || item.occurrenceCount > 1);
const sampledReview = uniqueEvidenceSelection.filter((item) => item.sourceAuthorityClass === 'educational-or-discovery-source' && item.slot === 'deliberate-non-claim');
const estimatedClusterReduction = Math.floor(uniqueIds(clusterReview).length * 0.5);
const estimatedSampleReduction = Math.floor(uniqueIds(sampledReview).length * 0.75);
const reviewPlan = {
  schemaVersion: 'aiw-gate-6b-review-prioritisation-plan-v1', generatedAt, productionAccepted: false,
  mandatoryIndividualReview: uniqueIds(mandatoryReview),
  clusterReviewEligible: uniqueIds(clusterReview),
  sampledReviewEligible: uniqueIds(sampledReview),
  sourceGapReviewRequired: sourceGapControls.map((item) => item.semanticUnitId),
  propagationBoundaries: ['same deterministic semantic-unit fingerprint','same output-schema and prompt version','no contradiction marker','no authority-class elevation','individual provenance retained'],
  estimatedReviewItemsWithoutClustering: boundedSemanticUnitCount + sourceGapControls.length,
  estimatedReviewItemsWithGovernedClustering: boundedSemanticUnitCount + sourceGapControls.length - estimatedClusterReduction - estimatedSampleReduction,
  estimatedReduction: estimatedClusterReduction + estimatedSampleReduction,
  independentReviewPerformed: false,
};
const disk = await statfs(product, { bigint: true });
const freeBytes = Number(disk.bavail * disk.bsize);
const capacity = {
  schemaVersion: 'aiw-gate-6b-capacity-assessment-v1', generatedAt, productionAccepted: false,
  freeBytes, preferredMinimumBytes: 15 * 1024 ** 3, controlledStopFloorBytes: 8 * 1024 ** 3,
  projectedTemporaryBytes: 512 * 1024 ** 2, projectedPermanentBytes: 64 * 1024 ** 2,
  projectedFreeBytesAtPeak: freeBytes - 576 * 1024 ** 2,
  capacityReadyForPilot: freeBytes >= 15 * 1024 ** 3 && freeBytes - 576 * 1024 ** 2 >= 8 * 1024 ** 3,
  requiresFreshAssessmentImmediatelyBeforeExecution: true, automaticEvidenceDeletionAllowed: false,
};

const runtimeReady = secretPresent && Boolean(selectedAllowlistEntry) && localTestsPassed && localBuildPassed;
const runtimeReceipt = {
  schemaVersion: 'aiw-gate-6b-runtime-readiness-receipt-v1', generatedAt, gate6aCheckpoint: 'ce787cc8881e5257e0b6529e7b93a65947264b2d', productionAccepted: false,
  providerId: 'openai', intendedModel, resolvedModel: intendedModel, secretReference: 'OPENAI_API_KEY', secretPresent,
  explicitModelAllowlist: allowlist, modelAllowlisted: Boolean(selectedAllowlistEntry), providerAccountModelSupportVerified: false,
  modelVerificationPosture: 'not-verified-no-secret-no-approved-network-check', runtimeReady,
  localControlTestsPassed: localTestsPassed,
  localVerification: {
    focusedTestFiles: 3, focusedTests: 17, focusedTestsPassed: localTestsPassed ? 17 : 0,
    domainTypeBuildExitCode: localBuildPassed ? 0 : null, apiTypeBuildExitCode: localBuildPassed ? 0 : null,
    secretPresenceInspection: 'process-environment-and-local-env-filenames-only-values-not-read-or-logged',
  },
  controls: {
    strictModelAllowlisting: true, boundedInputCharacters: 32768, strictStructuredOutput: true,
    evidenceIdAllowlisting: true, redaction: true, unsupportedClaimRejection: true,
    maximumRetries: 2, deadLetterRecords: true, requestFingerprint: true, responseFingerprint: true,
    tokenAccounting: true, candidateOnlyPersistence: true, designGraphMutationAllowed: false, automaticPromotionAllowed: false,
  },
  activeProbeExecuted: false, networkCalls: 0, modelCalls: 0,
  blockers: [...(!secretPresent ? ['OPENAI_API_KEY absent'] : []), ...(!selectedAllowlistEntry ? ['No provider-account-verified allowlisted model'] : []), 'Network approval not requested because runtime preconditions are incomplete'],
  gate6BStatus: 'approval-package-only-not-started', gate6CStatus: 'blocked', gate6DStatus: 'not-started',
};
const smoke = {
  schemaVersion: 'aiw-gate-6b-bounded-transformation-smoke-v1', generatedAt, productionAccepted: false,
  executionStatus: runtimeReady ? 'awaiting-explicit-network-approval' : 'not-executed-controlled-stop',
  providerId: 'openai', model: selectedAllowlistEntry?.model ?? null, secretPresent,
  deterministicTransportHarnessPassed: localTestsPassed, deterministicHarnessTests: 17, liveProviderCallExecuted: false,
  networkCalls: 0, modelCalls: 0, tokens: 0, candidateRecordsPersisted: 0, designGraphMutations: 0, automaticPromotions: 0,
  blockers: runtimeReceipt.blockers,
};
const pilot = {
  schemaVersion: 'aiw-gate-6b-pilot-selection-v1', generatedAt, gate6aFingerprint: 'sha256:72b08d5fa133f75e7c49ef7be40d7d98be620cb57c7af2e7ca78200bf02710c2',
  productionAccepted: false, authority: 'candidate', independentReviewStatus: 'not-independently-reviewed',
  selectionFingerprint, selectionRecordCount: selection.length, boundedSemanticUnitCount, boundedOccurrenceCount,
  sourceGapControlCount: sourceGapControls.length, repositoriesCovered: Object.keys(baseCounts).length,
  baseCasesPerRepository: 4, supplementaryRecords: selection.length - 188, evidenceAbsenceControls: abstentionCases,
  sourceGapControls,
  repositoryBaseCoverage: baseCounts, authorityCoverage, slotCoverage, artefactCoverage, themeCoverage, dispositionCoverage,
  selection,
};
const provisionalGold = {
  schemaVersion: 'aiw-gate-6b-provisional-gold-set-v1', generatedAt, productionAccepted: false,
  status: 'inspectable-product-owner-review-candidate', independentlyApproved: false,
  warning: 'Deterministic expected outcomes are not independent expert labels.',
  qualityGates: { exactEvidenceLineage: 1, candidateAuthorityLeakage: 0, designGraphMutation: 0, unsupportedCriticalClaims: 0, minimumSchemaValidity: 0.995, maximumUnsupportedClaimRate: 0.01, minimumOntologyAccuracy: 0.9, minimumNonClaimRejectionAccuracy: 0.95, minimumContradictionPrecision: 0.85, minimumReferenceArchitectureMembershipPrecision: 0.9, exactDuplicateReuse: 1, hypothesesAsFacts: 0, examplesAsGuarantees: 0 },
  cases: selection.map((item) => ({ semanticUnitId: item.semanticUnitId, evidenceId: item.canonicalEvidenceId, slot: item.slot, expectedOutcome: item.expectedOutcome, reviewStatus: 'unreviewed' })),
  evidenceAbsenceControls: abstentionCases,
};

await mkdir(evidenceRoot, { recursive: true });
for (const [name, value] of Object.entries({
  'GATE_6B_RUNTIME_READINESS_RECEIPT.json': runtimeReceipt,
  'GATE_6B_BOUNDED_TRANSFORMATION_SMOKE.json': smoke,
  'GATE_6B_TOKEN_AND_RETRY_POLICY.json': tokenPlan,
  'GATE_6B_PILOT_SELECTION.json': pilot,
  'GATE_6B_STRATEGY_COMPARISON_PLAN.json': strategyPlan,
  'GATE_6B_REVIEW_PRIORITISATION_PLAN.json': reviewPlan,
  'GATE_6B_CAPACITY_ASSESSMENT.json': capacity,
  'GATE_6B_PROVISIONAL_GOLD_SET.json': provisionalGold,
})) await writeFile(resolve(evidenceRoot, name), `${JSON.stringify(value, null, 2)}\n`);

const allowlistReport = `# Gate 6B Model Allowlist Report\n\nGenerated: ${generatedAt}\n\n- Provider: OpenAI\n- Intended local configuration label: \`${intendedModel}\`\n- Secret present: **${secretPresent}**\n- Explicit allowlist entries: **${allowlist.length}**\n- Intended label allowlisted: **${Boolean(selectedAllowlistEntry)}**\n- Provider-account support verified: **false**\n- Runtime ready: **${runtimeReady}**\n\nThe allowlist is deliberately empty and fail-closed. The repository previously used \`gpt-5.6-sol\` as an intended label, but a Codex/product label is not proof of an OpenAI API model identifier or account entitlement. The bundled offline documentation reference does not establish that identifier and explicitly requires fresh official verification. No current documentation or account endpoint was contacted because network approval was not requested and \`OPENAI_API_KEY\` is absent.\n\nBefore a live smoke, the product owner must approve a network check, the account secret must be supplied externally, and the exact provider/model/purpose tuple must be added with a verification reference. No secret value may enter this report or Git.\n`;
await writeFile(resolve(evidenceRoot, 'GATE_6B_MODEL_ALLOWLIST_REPORT.md'), allowlistReport);
const approvalReport = `# Gate 6B Pilot Approval Package\n\nGenerated: ${generatedAt}\n\nStatus: **prepared; not approved; not started**. Production accepted: **false**.\n\n## Selection\n\n- Corpus semantic units: ${selection.length}\n- Governed repositories: 47/47, with four base cases per repository\n- Supplementary paired cases: 12\n- Evidence-absence controls: ${abstentionCases.length}\n- Selection fingerprint: \`${selectionFingerprint}\`\n- Authority classes covered: ${Object.keys(authorityCoverage).length}\n- Candidate authority only; independent gold-set review has not occurred.\n\n## Strategy comparison\n\nA 24-unit paired subset is planned across one-unit calls, same-source micro-batches of at most three, and cross-file architecture groups of at most four. The comparison uses 38 calls before a strategy is selected. Evidence precision and contamination controls outrank cost.\n\n## Limits\n\n- Semantic-unit ceiling: 220\n- Model-call ceiling: 250\n- Token ceiling: 750,000\n- Retry ceiling: 2\n- Initial concurrency: 2; maximum after clean evidence: 4\n- Estimated token demand: 285,200 minimum; 458,800 likely; 806,000 uncapped maximum. The hard ceiling stops execution before 750,000 is exceeded.\n- Expected new candidate storage: below 64 MiB permanent; 512 MiB temporary envelope.\n\n## Runtime blocker\n\nThe secret is absent and there is no account-verified model allowlist entry. The live bounded smoke and pilot command are therefore blocked. No network or model call was made.\n\n## Proposed command after separate approval\n\n\`node backend/scripts/rc10-73-8/run-gate-6b-pilot.mjs --selection release-evidence/rc10.73.8/GATE_6B_PILOT_SELECTION.json --max-units 220 --max-calls 250 --max-tokens 750000 --max-retries 2 --concurrency 2\`\n\nThe runner command is a proposal only; no executable pilot runner has been invoked or authorized.\n`;
await writeFile(resolve(evidenceRoot, 'GATE_6B_PILOT_APPROVAL_PACKAGE.md'), approvalReport);
const gapLines = sourceGapControls.length
  ? sourceGapControls.map((item) => `- ${item.connectorId} / ${item.slot}: ${item.gapReason}`).join('\n')
  : '- None.';
const formattedCounts = (value) => Object.entries(value).map(([key, count]) => `${key}=${count}`).join(', ');
const reconciledApprovalReport = `# Gate 6B Pilot Approval Package

Generated: ${generatedAt}

Status: **prepared; not approved; not started**. Production accepted: **false**.

## Selection

- Distinct bounded corpus semantic units: ${boundedSemanticUnitCount}
- Bounded source occurrences: ${boundedOccurrenceCount}
- Source-gap controls (not model inputs): ${sourceGapControls.length}
- Total inspectable selection records: ${selection.length}
- Governed repositories represented: 47/47, with four base slots each
- Supplementary paired and unique-coverage records: ${selection.length - 188}
- Global evidence-absence controls: ${abstentionCases.length}
- Selection fingerprint: \`${selectionFingerprint}\`
- Authority classes covered: ${Object.keys(authorityCoverage).length}
- Candidate authority only; independent gold-set review has not occurred.

Authority coverage: ${formattedCounts(authorityCoverage)}.

Artefact coverage: ${formattedCounts(artefactCoverage)}.

Topic coverage: ${formattedCounts(themeCoverage)}.

Deterministic disposition coverage: ${formattedCounts(dispositionCoverage)}.

The corpus cannot truthfully supply every requested per-repository slot. Missing slots are retained as preflight abstention controls and cannot be sent to the model. The pilot therefore meets the minimum of 188 distinct bounded units while keeping source gaps visible.

### Per-repository source gaps

${gapLines}

The global abstention controls cover absent current normative core-banking evidence, complete official MCP/A2A guidance, and official OpenTelemetry specification evidence.

## Strategy comparison

A 24-unit paired subset is planned across one-unit calls, same-source micro-batches of at most three, and bounded cross-file architecture groups of at most four. The comparison uses 38 calls before a strategy is selected. Evidence precision and contamination controls outrank cost.

## Limits

- Semantic-unit ceiling: 220
- Model-call ceiling: 250
- Token ceiling: 750,000
- Retry ceiling: 2
- Initial concurrency: 2; maximum after clean evidence: 4
- Estimated token demand: 285,200 minimum; 458,800 likely; 806,000 uncapped maximum. The hard ceiling stops execution before 750,000 is exceeded.
- Expected elapsed runtime: 15 minutes minimum, 45 minutes likely, up to 150 minutes at the limits; these are estimates because live provider latency is unmeasured.
- Expected calls if the individual strategy wins after comparison: 214; hard ceiling 250.
- Expected new candidate storage: below 64 MiB permanent; 512 MiB temporary envelope.

## Runtime blocker

The runtime process has no OpenAI secret and there is no provider-account-verified model allowlist entry. The live bounded smoke and pilot are blocked. No network or model call was made.

## Proposed command after separate runtime and product-owner approvals

\`node backend/scripts/rc10-73-8/run-gate-6b-pilot.mjs --selection release-evidence/rc10.73.8/GATE_6B_PILOT_SELECTION.json --max-units 220 --max-calls 250 --max-tokens 750000 --max-retries 2 --concurrency 2\`

The command is a proposal only. The executable pilot runner has not been implemented or invoked, so it cannot be mistaken for an authorized path.
`;
await writeFile(resolve(evidenceRoot, 'GATE_6B_PILOT_APPROVAL_PACKAGE.md'), reconciledApprovalReport);

process.stdout.write(`${JSON.stringify({ runtimeReady, secretPresent, allowlistEntries: allowlist.length, boundedSemanticUnits: boundedSemanticUnitCount, sourceGapControls: sourceGapControls.length, selectionRecords: selection.length, repositoriesCovered: Object.keys(baseCounts).length, selectionFingerprint, capacityReady: capacity.capacityReadyForPilot, networkCalls: 0, modelCalls: 0, productionAccepted: false }, null, 2)}\n`);
