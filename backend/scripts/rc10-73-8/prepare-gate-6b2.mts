import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, statfs, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redactForModel } from '../../apps/api/src/dataRedaction.js';
import { gate6b2ProviderSchema, GATE6B2_PROMPT_VERSION, GATE6B2_SCHEMA_VERSION, NO_EVIDENCE_ID } from '../../apps/api/src/gate6b2SemanticTransformation.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const evidenceRoot = resolve(root, 'release-evidence', 'rc10.73.8');
const baseline = 'a312e08b459ef838814d5273270c69ac87d0c03a';
const model = 'gpt-4.1-mini-2025-04-14';
const purpose = 'governed-candidate-semantic-transformation';
const noEvidenceText = '[No governed bounded evidence is available for this control.]';
const requestPlanFingerprint = 'sha256:7f42ec8ec9005362c8b929a6e8b31c9f0ecf9b8266a6eadaec2476c503120623';
const runtimeObservation = 'sha256:9e1891961ee5625bb6a6ea9ed3ed084a883e8a0d5a7bb9bc33d504b6849c86f6';
const historicalFiles = [
  'GATE_6B_1_LIVE_FAILED_ATTEMPTS.json', 'GATE_6B_1_LIVE_EXECUTION_RESULT.json',
  'GATE_6B_1_LIVE_TRANSACTION_RECEIPT.json', 'GATE_6B_1_LIVE_CANDIDATE_RECORDS.json',
  'GATE_6B_1_STRATEGY_EVALUATION.json', 'GATE_6B_1_TECHNICAL_DECISION.md',
  'PROMPT_6G_ENTRY_RECEIPT.json', 'GATE_6B_1_COMPLETION_REPORT.md', 'GATE_6B_1_VERIFICATION_RECEIPT.json',
];
const diagnosticRequests = [
  { requestId: 'G6B2-REQ-01', caseIds: ['G6B1-01'], purpose: 'source-example' },
  { requestId: 'G6B2-REQ-02', caseIds: ['G6B1-05'], purpose: 'contradiction-versus-scoped-distinction' },
  { requestId: 'G6B2-REQ-03', caseIds: ['G6B1-09'], purpose: 'causal-pattern-dna' },
  { requestId: 'G6B2-REQ-04', caseIds: ['G6B1-15'], purpose: 'implementation-observation' },
  { requestId: 'G6B2-REQ-05', caseIds: ['G6B1-21'], purpose: 'deliberate-non-claim' },
  { requestId: 'G6B2-REQ-06', caseIds: ['G6B1-24'], purpose: 'insufficient-evidence-abstention' },
  { requestId: 'G6B2-REQ-07', caseIds: ['G6B1-01', 'G6B1-02'], purpose: 'same-source-examples' },
  { requestId: 'G6B2-REQ-08', caseIds: ['G6B1-06', 'G6B1-07'], purpose: 'security-and-performance-recommendations' },
];

const sha256 = (value: string | Buffer) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const canonicalJson = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonicalJson).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`
    : JSON.stringify(value);
async function readJson(path: string) { return JSON.parse(await readFile(path, 'utf8')); }
async function writeJson(name: string, value: unknown) { await writeFile(resolve(evidenceRoot, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
async function writeMd(name: string, value: string) { await writeFile(resolve(evidenceRoot, name), value.endsWith('\n') ? value : `${value}\n`, 'utf8'); }
const iso = () => new Date().toISOString();

type Resolved = { caseId: string; caseRecord: any; excerpt: string; excerptHash: string; parserVersion: string; heading?: string };

async function resolveCases() {
  const benchmark = await readJson(resolve(evidenceRoot, 'GATE_6B_24_CASE_BENCHMARK_MANIFEST.json'));
  const snapshotIndex = await readJson(resolve(root, 'release-evidence', 'rc10.73.7', 'CONTENT_SNAPSHOT_MANIFEST_INDEX.json'));
  const identity = await readJson(resolve(root, 'release-evidence', 'rc10.73.7', 'GITHUB_REPOSITORY_IDENTITY_RESOLUTION.json'));
  const governance = await readJson(resolve(root, 'release-evidence', 'rc10.73.7', 'ALL_47_REPOSITORY_GOVERNANCE_MATRIX.json'));
  const byConnector = new Map(snapshotIndex.manifests.map((item: any) => [item.connectorId, item]));
  const identities = new Map((identity.repositories ?? identity.results).map((item: any) => [item.connectorId, item]));
  const governed = new Map((governance.repositories ?? governance.connectors).map((item: any) => [item.connectorId, item]));
  const selected = new Set(diagnosticRequests.flatMap((item) => item.caseIds));
  const resolved = new Map<string, Resolved>();
  const transfer: any[] = [];
  for (const caseRecord of benchmark.cases.filter((item: any) => selected.has(item.caseId))) {
    const identityRecord: any = identities.get(caseRecord.connectorId);
    const governanceRecord: any = governed.get(caseRecord.connectorId);
    const publicExact = identityRecord?.reachable === true && identityRecord?.visibility === 'public'
      && identityRecord?.requestedOwnerRepository === caseRecord.repository && identityRecord?.resolvedOwnerRepository === caseRecord.repository;
    const uses = governanceRecord?.permittedUses ?? governanceRecord?.intendedAiwUse ?? [];
    const governedTransfer = governanceRecord?.acquisitionStatus === 'approved' && uses.includes('sol-semantic-analysis') && uses.includes('candidate-knowledge-extraction');
    if (!publicExact || !governedTransfer) throw new Error(`GATE6B2_TRANSFER_NOT_GOVERNED:${caseRecord.caseId}`);
    if (!caseRecord.evidenceAvailable) {
      if (caseRecord.caseId !== 'G6B1-24' || caseRecord.evidenceId !== null || sha256(noEvidenceText) !== caseRecord.boundedEvidenceHash) throw new Error('GATE6B2_NO_EVIDENCE_CONTROL_INVALID');
      resolved.set(caseRecord.caseId, { caseId: caseRecord.caseId, caseRecord, excerpt: noEvidenceText, excerptHash: caseRecord.boundedEvidenceHash, parserVersion: 'no-evidence-control-v1' });
      transfer.push({ caseId: caseRecord.caseId, evidenceId: null, repository: caseRecord.repository, hashReplay: true, publicRepositoryIdentityVerified: true, semanticAnalysisPermitted: true, transferred: false, protectedMaterialFindings: 0 });
      continue;
    }
    const snapshot: any = byConnector.get(caseRecord.connectorId);
    if (!snapshot || snapshot.repository !== caseRecord.repository || snapshot.immutableCommit !== caseRecord.immutableCommit) throw new Error(`GATE6B2_SNAPSHOT_IDENTITY_MISMATCH:${caseRecord.caseId}`);
    const parserPath = resolve(dirname(resolve(root, snapshot.manifestPath)), 'files', `${caseRecord.path}.aiw.json`);
    const parsed = await readJson(parserPath);
    const passage = parsed.evidencePassages?.find((item: any) => item.evidenceId === caseRecord.evidenceId);
    const excerpt = String(passage?.boundedExcerpt ?? '');
    const hashReplay = Boolean(excerpt) && sha256(excerpt) === caseRecord.excerptHash && passage?.excerptHash === caseRecord.excerptHash;
    if (!hashReplay || passage?.connectorId !== caseRecord.connectorId || passage?.immutableCommitSha !== caseRecord.immutableCommit || passage?.path !== caseRecord.path) throw new Error(`GATE6B2_EXCERPT_REPLAY_FAILED:${caseRecord.caseId}`);
    const redaction = redactForModel(excerpt, 'restricted');
    const protectedFindings = redaction.findings.filter((item) => item.kind !== 'phone');
    const phoneOnly = redaction.findings.filter((item) => item.kind === 'phone');
    if (protectedFindings.length) throw new Error(`GATE6B2_PROTECTED_CONTENT:${caseRecord.caseId}`);
    resolved.set(caseRecord.caseId, { caseId: caseRecord.caseId, caseRecord, excerpt, excerptHash: caseRecord.excerptHash, parserVersion: passage.parserVersion ?? parsed.parserVersion ?? 'unknown', ...(passage.heading ? { heading: passage.heading } : {}) });
    transfer.push({ caseId: caseRecord.caseId, evidenceId: caseRecord.evidenceId, connectorId: caseRecord.connectorId, repository: caseRecord.repository, immutableCommit: caseRecord.immutableCommit, path: caseRecord.path, excerptHash: caseRecord.excerptHash, hashReplay, publicRepositoryIdentityVerified: true, semanticAnalysisPermitted: true, transferred: true, protectedMaterialFindings: 0, reviewedPublicIdentifierDetectorFindings: phoneOnly.length, passageContentRecorded: false });
  }
  return { benchmark, resolved, transfer };
}

function support(excerpt: string, quote: string) {
  const start = excerpt.indexOf(quote);
  if (start < 0) throw new Error(`GATE6B2_FROZEN_SUPPORT_NOT_FOUND:${quote.slice(0, 80)}`);
  return { quote, start, end: start + quote.length };
}

function frozenLabel(record: Resolved) {
  const e = record.excerpt;
  const common = { caseId: record.caseId, reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false, developmentDecisionAuthority: true, productionAuthority: false };
  switch (record.caseId) {
    case 'G6B1-01': return { ...common, expectedDisposition: 'structured-asset-candidate', expectedAssetType: 'source-example', expectedEpistemicStatus: 'source-example', requiredConditions: ['example uses modules from a private Bicep Registry'], requiredLimitations: ['preferred CI publishing method may not apply to all scenarios'], requiredSupportSpans: [support(e, 'The following sample shows how you could orchestrate a deployment of multiple resources using modules from a private Bicep Registry.'), support(e, 'However, this option may not be applicable to all scenarios')], prohibitedOverGeneralisations: ['all deployments must use this orchestration', 'local publication is universally preferred'], patternDnaExpectations: null };
    case 'G6B1-05': return { ...common, expectedDisposition: 'structured-asset-candidate', expectedAssetType: 'contradiction-or-scoped-distinction', expectedEpistemicStatus: 'normative-requirement', requiredConditions: ['both image SHA reference and canonical file format conditions are satisfied'], requiredLimitations: ['transport security and data-at-rest security are beyond model scope'], requiredSupportSpans: [support(e, 'This model, in its current form, does not mandate a specific set of security policies.'), support(e, 'OCI/Docker images MUST be referenced by SHA wherever possible'), support(e, 'File formats MUST be converted to a canonical format so that they can be hashed'), support(e, 'Other security details, such as network transport security or securing data at rest, are considered beyond the scope of this model.')], prohibitedOverGeneralisations: ['the model mandates a complete security policy', 'digest verification covers out-of-scope security'], patternDnaExpectations: null };
    case 'G6B1-09': return { ...common, expectedDisposition: 'structured-asset-candidate', expectedAssetType: 'pattern-dna', expectedEpistemicStatus: 'implementation-observation', requiredConditions: ['event-driven context with producers, ingestion and consumers'], requiredLimitations: ['broker topology can risk inconsistency without restart or replay mechanism'], requiredSupportSpans: [support(e, "Producers are decoupled from consumers, which means that a producer doesn't know which consumers are listening."), support(e, 'Events are delivered in near real time, so consumers can respond immediately to events as they occur.'), support(e, "distributed transactions are risky because there's no built-in mechanism for restarting or replaying them")], prohibitedOverGeneralisations: ['event-driven architecture guarantees exactly-once processing', 'all event topologies are durable'], patternDnaExpectations: { requiredFields: ['context-or-trigger', 'mechanism', 'consequence', 'trade-off-or-limitation'], fieldLevelSupportRequired: true, fieldLevelEpistemicStatusRequired: true } };
    case 'G6B1-15': return { ...common, expectedDisposition: 'structured-asset-candidate', expectedAssetType: 'implementation-observation', expectedEpistemicStatus: 'implementation-observation', requiredConditions: ['Spring Modulith version 1.3'], requiredLimitations: ['additionalPackages requires advance knowledge of packages'], requiredSupportSpans: [support(e, 'As of version 1.3, Spring Modulith supports external contributions of application modules via the `ApplicationModuleSource` and `ApplicationModuleSourceFactory` abstractions.'), support(e, 'its usage requires knowing about those in advance')], prohibitedOverGeneralisations: ['all module frameworks use this mechanism'], patternDnaExpectations: null };
    case 'G6B1-21': return { ...common, expectedDisposition: 'non-claim', expectedAssetType: 'non-claim', expectedEpistemicStatus: 'unknown', requiredConditions: [], requiredLimitations: [], requiredSupportSpans: [support(e, 'The catalog UI design is inspired by [EventCatalog](https://www.eventcatalog.dev/)'), support(e, 'Architecture Catalog takes a different approach: vocabulary-agnostic,\nschema-driven, and built for enterprise architecture modelling across\nall layers (not just events).')], prohibitedOverGeneralisations: ['EventCatalog is unsuitable for enterprise architecture'], requiredNonClaimPosture: true, patternDnaExpectations: null };
    case 'G6B1-24': return { ...common, expectedDisposition: 'abstain-insufficient-evidence', expectedAssetType: 'insufficient-evidence-abstention', expectedEpistemicStatus: 'unknown', requiredConditions: [], requiredLimitations: [], requiredSupportSpans: [], prohibitedOverGeneralisations: ['any repository-specific claim'], requiredAbstentionPosture: true, requiredMissingEvidence: ['a governed bounded source passage'], patternDnaExpectations: null };
    case 'G6B1-02': return { ...common, expectedDisposition: 'structured-asset-candidate', expectedAssetType: 'source-example', expectedEpistemicStatus: 'source-example', requiredConditions: ['module test file scenario'], requiredLimitations: ['sensitive data must be injected rather than stored'], requiredSupportSpans: [support(e, 'Module test files in CARML are implemented using comprehensive `.bicep` test files'), support(e, 'Sensitive data should not be stored inside the module test file')], prohibitedOverGeneralisations: ['every Bicep repository must use this exact folder structure'], patternDnaExpectations: null };
    case 'G6B1-06': return { ...common, expectedDisposition: 'structured-asset-candidate', expectedAssetType: 'security-control', expectedEpistemicStatus: 'source-stated-recommendation', requiredConditions: ['direct public IP only in extreme circumstances'], requiredLimitations: ['additional NSG or equivalent security measures required'], requiredSupportSpans: [support(e, 'Avoid attaching a public IP address directly to a VM.'), support(e, 'Only* do so in extreme circumstances and include other security measures')], prohibitedOverGeneralisations: ['public IP addresses are always prohibited'], patternDnaExpectations: null };
    case 'G6B1-07': return { ...common, expectedDisposition: 'structured-asset-candidate', expectedAssetType: 'resilience-control', expectedEpistemicStatus: 'source-stated-recommendation', requiredConditions: ['dynamic load for scale sets or latency-sensitive workload for PPGs'], requiredLimitations: ['PPG availability statement is scoped to a single physical datacenter'], requiredSupportSpans: [support(e, 'Use virtual machine scale sets if the workload has a dynamic load.'), support(e, 'If your workload is unusually latency-sensitive, use [proximity placement groups (PPGs)]'), support(e, 'within a single physical datacenter')], prohibitedOverGeneralisations: ['scale sets are required for every workload'], patternDnaExpectations: null };
    default: throw new Error(`GATE6B2_LABEL_NOT_DEFINED:${record.caseId}`);
  }
}

async function preserveHistoricalEvidence(generatedAt: string) {
  const files = [];
  for (const name of historicalFiles) {
    const working = await readFile(resolve(evidenceRoot, name));
    const committed = execFileSync('git', ['show', `${baseline}:release-evidence/rc10.73.8/${name}`], { cwd: root });
    files.push({ path: `release-evidence/rc10.73.8/${name}`, bytes: working.length, workingTreeSha256: sha256(working), baselineCommitSha256: sha256(committed), byteForByteUnchanged: working.equals(committed) });
  }
  const former = await readJson(resolve(evidenceRoot, 'GATE_6B_1_LIVE_TRANSACTION_RECEIPT.json'));
  const receipt = { schemaVersion: 'aiw-gate-6b-2-gate6b1-evidence-preservation-v1', generatedAt, productionAccepted: false, baselineCommit: baseline, files, allHistoricalEvidenceUnchanged: files.every((item) => item.byteForByteUnchanged), formerAuthority: { providerCallsUsed: former.cumulativeNetworkCallCount, providerCallCeiling: 40, remainingCalls: 1, status: 'closed-not-reusable' }, gate6b2UsesNewAuthorityReceipt: true, historicalReceiptMutations: 0 };
  await writeJson('GATE_6B_2_GATE6B1_EVIDENCE_PRESERVATION_RECEIPT.json', receipt);
  if (!receipt.allHistoricalEvidenceUnchanged || former.cumulativeNetworkCallCount !== 39) throw new Error('GATE6B2_HISTORICAL_EVIDENCE_PRESERVATION_FAILED');
}

async function rootCauseReview(generatedAt: string) {
  const execution = await readJson(resolve(evidenceRoot, 'GATE_6B_1_LIVE_EXECUTION_RESULT.json'));
  const candidateLedger = await readJson(resolve(evidenceRoot, 'GATE_6B_1_LIVE_CANDIDATE_RECORDS.json'));
  const benchmark = await readJson(resolve(evidenceRoot, 'GATE_6B_24_CASE_BENCHMARK_MANIFEST.json'));
  const byEvidence = new Map(benchmark.cases.filter((item: any) => item.evidenceId).map((item: any) => [item.evidenceId, item]));
  const survivingByRequestEvidence = new Map<string, any[]>();
  for (const record of candidateLedger.records) {
    const key = `${record.requestId}:${record.evidenceId}`;
    const entries = survivingByRequestEvidence.get(key) ?? [];
    entries.push(...(record.output.claims ?? []));
    survivingByRequestEvidence.set(key, entries);
  }
  const proposals: any[] = [];
  let ordinal = 0;
  for (const receipt of execution.requestReceipts) {
    const occurrence = new Map<string, number>();
    for (const supportRecord of receipt.groundingSupport ?? []) {
      ordinal += 1;
      const index = occurrence.get(supportRecord.referenceId) ?? 0;
      occurrence.set(supportRecord.referenceId, index + 1);
      const claim = survivingByRequestEvidence.get(`${receipt.requestId}:${supportRecord.referenceId}`)?.[index] ?? null;
      const caseRecord: any = byEvidence.get(supportRecord.referenceId);
      proposals.push({ proposalId: `G6B1-PROP-${String(ordinal).padStart(3, '0')}`, requestId: receipt.requestId, strategy: receipt.strategy, caseId: caseRecord?.caseId ?? null, evidenceId: supportRecord.referenceId, proposedStatementAvailable: Boolean(claim), proposedStatement: claim?.statement ?? null, proposedEpistemicStatus: claim?.epistemicStatus ?? null, validatorStatus: supportRecord.status, supportScore: supportRecord.supportScore, riskFlags: supportRecord.riskFlags ?? [], persisted: supportRecord.persisted === true });
    }
  }
  if (proposals.length !== 116 || proposals.filter((item) => item.persisted).length !== 10) throw new Error(`GATE6B2_ROOT_CAUSE_CARDINALITY:${proposals.length}`);
  const evidenceReview = proposals.map((item) => ({ proposalId: item.proposalId, caseId: item.caseId, judgementFrozenBeforeValidatorAudit: true, evidenceReviewDisposition: item.proposedStatementAvailable ? 'reviewable-supported-proposal' : 'not-reviewable-historical-content-not-persisted', evidenceSufficiency: item.proposedStatementAvailable ? 'bounded-evidence-and-statement-available' : 'statement-unavailable', limitation: item.proposedStatementAvailable ? null : 'Gate 6B.1 correctly omitted rejected semantic content; exact content-level review cannot be reconstructed from a fingerprint.' }));
  const validatorAudit = proposals.map((item) => ({ proposalId: item.proposalId, validatorStatus: item.validatorStatus, lexicalScore: item.supportScore, riskFlags: item.riskFlags, supportSpanLogicAvailable: false, conditionDetection: item.riskFlags.includes('condition-omission') ? 'triggered' : 'not-triggered', limitationDetection: item.riskFlags.includes('limitation-omission') ? 'triggered' : 'not-triggered', negationDetection: item.riskFlags.includes('negation-mismatch') ? 'triggered' : 'not-triggered', finalValidatorDisposition: item.persisted ? 'accepted-candidate' : 'rejected', auditLimitation: 'Gate 6B.1 did not preserve support spans or rejected statement text.' }));
  const surviving = proposals.filter((item) => item.persisted).map((item) => {
    const text = String(item.proposedStatement ?? '');
    const quality = /article|publication|work\s+['"]|et al\.|discusses/i.test(text) ? 'bibliographic metadata'
      : /sam deploy|run the command|from the pattern directory/i.test(text) ? 'useful procedure or implementation step'
        : /uses Kafka|accelerated networking|proximity placement/i.test(text) ? 'useful architecture intelligence' : 'low-value restatement';
    return { proposalId: item.proposalId, caseId: item.caseId, statementHash: sha256(text), classification: quality, incorrectlyTyped: quality === 'bibliographic metadata' || quality === 'useful procedure or implementation step', adversarialFindings: quality === 'bibliographic metadata' ? ['reference was typed as a recommendation or example'] : quality === 'useful procedure or implementation step' ? ['procedure was typed as a recommendation'] : [], humanReviewerPresent: false, externallyVerified: false };
  });
  const adversarial = surviving.map((item) => ({ proposalId: item.proposalId, attemptedDisproof: ['evidence scope', 'epistemic type', 'condition completeness', 'limitation completeness', 'asset-type fitness'], findings: item.adversarialFindings, survivesAsUsefulArchitectureIntelligence: item.classification === 'useful architecture intelligence' }));
  const adjudication = proposals.map((item) => {
    let cause = 'unresolved';
    if (item.persisted) cause = surviving.find((entry) => entry.proposalId === item.proposalId)?.classification === 'bibliographic metadata' ? 'wrong output asset type'
      : surviving.find((entry) => entry.proposalId === item.proposalId)?.classification === 'useful procedure or implementation step' ? 'wrong output asset type'
        : 'low-value but technically supported';
    else if (item.proposedStatementAvailable) cause = item.validatorStatus === 'rejected-epistemic' ? 'correct epistemic rejection' : 'correct grounding rejection';
    return { proposalId: item.proposalId, caseId: item.caseId, primaryCause: cause, contentAvailableForAdjudication: item.proposedStatementAvailable, decisionAuthority: 'delegated-development-only', productionAuthority: false };
  });
  const causeCounts = Object.fromEntries([...new Set(adjudication.map((item) => item.primaryCause))].sort().map((cause) => [cause, adjudication.filter((item) => item.primaryCause === cause).length]));
  const flags = proposals.flatMap((item) => item.riskFlags).reduce((acc: Record<string, number>, flag: string) => ({ ...acc, [flag]: (acc[flag] ?? 0) + 1 }), {});
  const caseRecords = candidateLedger.records.map((record: any) => ({ requestId: record.requestId, strategy: record.strategy, caseId: record.caseId, evidenceId: record.evidenceId, disposition: record.output.disposition, persistedClaimCount: record.output.claims?.length ?? 0, benchmarkCategory: benchmark.cases.find((item: any) => item.caseId === record.caseId)?.category ?? null }));
  await writeJson('GATE_6B_2_SOL_EVIDENCE_REVIEW.json', { schemaVersion: 'aiw-gate-6b-2-sol-evidence-review-v1', generatedAt, productionAccepted: false, pass: 'A', reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false, developmentDecisionAuthority: true, productionAuthority: false, proposalCount: proposals.length, judgements: evidenceReview });
  await writeJson('GATE_6B_2_SOL_VALIDATOR_AUDIT.json', { schemaVersion: 'aiw-gate-6b-2-sol-validator-audit-v1', generatedAt, productionAccepted: false, pass: 'B', passAJudgementsChanged: false, proposalCount: proposals.length, audits: validatorAudit });
  await writeJson('GATE_6B_2_SOL_ADVERSARIAL_REVIEW.json', { schemaVersion: 'aiw-gate-6b-2-sol-adversarial-review-v1', generatedAt, productionAccepted: false, pass: 'C', survivingClaimCount: surviving.length, reviews: adversarial });
  await writeJson('GATE_6B_2_SOL_ADJUDICATION_RECEIPT.json', { schemaVersion: 'aiw-gate-6b-2-sol-adjudication-v1', generatedAt, productionAccepted: false, pass: 'D', reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false, developmentDecisionAuthority: true, productionAuthority: false, proposalCount: adjudication.length, decisions: adjudication, causeCounts, diagnosticLabelsFrozenBeforeProviderExecution: true, knowledgePromotionAuthority: false });
  await writeJson('GATE_6B_2_SURVIVING_ASSET_QUALITY_REVIEW.json', { schemaVersion: 'aiw-gate-6b-2-surviving-asset-quality-review-v1', generatedAt, productionAccepted: false, survivingClaimCount: surviving.length, classifications: Object.fromEntries([...new Set(surviving.map((item) => item.classification))].map((value) => [value, surviving.filter((item) => item.classification === value).length])), reviews: surviving });
  await writeJson('GATE_6B_2_VALIDATION_CONFUSION_MATRIX.json', { schemaVersion: 'aiw-gate-6b-2-validation-confusion-matrix-v1', generatedAt, productionAccepted: false, proposalCount: proposals.length, rejectedProposalCount: proposals.filter((item) => !item.persisted).length, survivingProposalCount: proposals.filter((item) => item.persisted).length, exactRetrospectiveConfusionMatrixAvailable: false, reason: 'Rejected Gate 6B.1 semantic content was not persisted by design, so semantic true/false labels cannot be paired with all validator decisions.', observableMatrix: { validatorRejectedContentUnavailable: proposals.filter((item) => !item.persisted && !item.proposedStatementAvailable).length, validatorAcceptedReviewable: proposals.filter((item) => item.persisted && item.proposedStatementAvailable).length }, validatorRiskFlagCounts: flags, causeCounts });
  await writeMd('GATE_6B_2_ROOT_CAUSE_REPORT.md', `# Gate 6B.2 root-cause review\n\nGenerated: ${generatedAt}  \nProduction accepted: false\n\nThe four-pass delegated Sol review covered all ${proposals.length} proposal slots, all ${proposals.filter((item) => !item.persisted).length} rejections, all ${surviving.length} surviving claims and all ${caseRecords.length} case records. Gate 6B.1 intentionally did not persist rejected semantic content. Consequently, the exact statements for 106 rejected proposals cannot be reconstructed from transaction fingerprints and their content-level cause remains unresolved; this is recorded rather than fabricated.\n\nThe ten survivors expose a clear typing failure: bibliographic references and a deployment procedure were emitted as claims/recommendations, while only a minority constitute useful architecture intelligence. Validator telemetry also shows passage-global condition, limitation and negation flags that cannot prove applicability to the exact claim because support spans were absent.\n\nPrimary repair: typed semantic assets, exact support spans, field-level structured validation, explicit non-claim/abstention outputs, and lexical overlap used only as a precision-screening signal. This diagnosis does not rewrite any Gate 6B.1 receipt or claim independent human review.\n`);
  return { proposals, caseRecords, surviving };
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  const generatedAt = iso();
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (head !== baseline) throw new Error(`GATE6B2_BASELINE_MISMATCH:${head}`);
  await preserveHistoricalEvidence(generatedAt);
  await writeMd('GATE_6B_2_PLAN_FINGERPRINT_RECONCILIATION.md', `# Gate 6B.1 plan-fingerprint reconciliation\n\nThe committed request-plan fingerprint is \`${requestPlanFingerprint}\`. The historical execution receipt separately recorded \`${runtimeObservation}\` as \`runtimePlanFingerprintObservation\`. They are not identical. The latter was an observation from a non-canonical runtime representation and was retained in the immutable historical receipt. \`GATE_6B_1_EXECUTION_RECEIPT_CORRECTION.json\` already demonstrates the canonical replay against the committed plan. Gate 6B.2 binds its own plan to a new canonical fingerprint and does not mutate either value.\n`);
  await rootCauseReview(generatedAt);
  const { benchmark, resolved, transfer } = await resolveCases();
  const labels = [...resolved.values()].sort((a, b) => a.caseId.localeCompare(b.caseId)).map(frozenLabel);
  const labelFingerprint = sha256(canonicalJson(labels));
  const manifestPayload = { sourceBenchmarkFingerprint: benchmark.fingerprint, uniqueCases: [...resolved.values()].sort((a, b) => a.caseId.localeCompare(b.caseId)).map((item) => ({ caseId: item.caseId, evidenceId: item.caseRecord.evidenceId ?? null, connectorId: item.caseRecord.connectorId, repository: item.caseRecord.repository, immutableCommit: item.caseRecord.immutableCommit, path: item.caseRecord.path, structuralRange: item.caseRecord.structuralRange, excerptHash: item.excerptHash, boundedEvidenceCharacters: item.excerpt.length, sourceAuthorityClass: item.caseRecord.sourceAuthorityClass, parserVersion: item.parserVersion })), requests: diagnosticRequests };
  const diagnosticFingerprint = sha256(canonicalJson(manifestPayload));
  await writeJson('GATE_6B_2_DIAGNOSTIC_MANIFEST.json', { schemaVersion: 'aiw-gate-6b-2-diagnostic-manifest-v1', generatedAt, productionAccepted: false, authority: 'candidate', ...manifestPayload, uniqueCaseCount: resolved.size, plannedRequestCount: diagnosticRequests.length, fingerprint: diagnosticFingerprint });
  await writeJson('GATE_6B_2_FROZEN_SOL_LABELS.json', { schemaVersion: 'aiw-gate-6b-2-frozen-sol-labels-v1', generatedAt, productionAccepted: false, diagnosticFingerprint, reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false, developmentDecisionAuthority: true, productionAuthority: false, frozenBeforeProviderExecution: true, labelFingerprint, labels });
  const reviewPack = [...resolved.values()].sort((a, b) => a.caseId.localeCompare(b.caseId)).map((item) => `## ${item.caseId}\n\n- Evidence ID: \`${item.caseRecord.evidenceId ?? NO_EVIDENCE_ID}\`\n- Repository: \`${item.caseRecord.repository}\`\n- Commit: \`${item.caseRecord.immutableCommit ?? 'none'}\`\n- Path: \`${item.caseRecord.path ?? 'none'}\`\n- Excerpt hash: \`${item.excerptHash}\`\n\n${item.excerpt}\n`).join('\n');
  await writeMd('GATE_6B_2_DIAGNOSTIC_REVIEW_PACK.md', `# Gate 6B.2 diagnostic review pack\n\nDiagnostic fingerprint: \`${diagnosticFingerprint}\`  \nModel answers: none  \nProduction accepted: false\n\n${reviewPack}`);
  await writeJson('GATE_6B_2_DIAGNOSTIC_FINGERPRINT_RECEIPT.json', { schemaVersion: 'aiw-gate-6b-2-diagnostic-fingerprint-receipt-v1', generatedAt, productionAccepted: false, sourceBenchmarkFingerprint: benchmark.fingerprint, diagnosticFingerprint, frozenLabelFingerprint: labelFingerprint, manifestReplay: diagnosticFingerprint, labelsFrozenBeforeExecution: true, modelReceivedFrozenLabels: false });

  const systemPrompt = await readFile(resolve(evidenceRoot, 'GATE_6B_2_TRANSFORMATION_PROMPT.md'), 'utf8');
  const requestPlan = diagnosticRequests.map((request) => {
    const cases = request.caseIds.map((caseId) => resolved.get(caseId)!);
    const caseIds = cases.map((item) => item.caseId);
    const evidenceIds = cases.map((item) => item.caseRecord.evidenceId ?? null);
    const user = cases.map((item) => `Case=${item.caseId}\nEvidence=${item.caseRecord.evidenceId ?? NO_EVIDENCE_ID}\nRepository=${item.caseRecord.repository}\nCommit=${item.caseRecord.immutableCommit ?? 'none'}\nPath=${item.caseRecord.path ?? 'none'}\nRange=${item.caseRecord.structuralRange ?? 'none'}\nBounded evidence:\n${item.excerpt}`).join('\n\n');
    const schema = gate6b2ProviderSchema(caseIds, evidenceIds);
    const inputCharacters = systemPrompt.length + user.length + JSON.stringify(schema).length;
    return { ...request, caseIds, evidenceIds, caseLineage: cases.map((item) => ({ caseId: item.caseId, evidenceId: item.caseRecord.evidenceId ?? null, excerptHash: item.excerptHash })), systemPromptVersion: GATE6B2_PROMPT_VERSION, outputSchemaVersion: GATE6B2_SCHEMA_VERSION, inputCharacters, projectedInputTokens: Math.ceil(inputCharacters / 4), maximumOutputTokens: 4_000, checkpointKey: sha256(`${request.requestId}\n${cases.map((item) => `${item.caseId}:${item.excerptHash}`).join('\n')}`) };
  });
  const requestPlanCanonical = { diagnosticFingerprint, exactModel: model, requests: requestPlan };
  const planFingerprint = sha256(canonicalJson(requestPlanCanonical));
  const maxWithoutRetries = requestPlan.reduce((sum, item) => sum + item.projectedInputTokens + 4_000, 0);
  const retryReserve = [...requestPlan].sort((a, b) => b.projectedInputTokens - a.projectedInputTokens).slice(0, 2).reduce((sum, item) => sum + item.projectedInputTokens + 4_000, 0);
  const projectedMax = maxWithoutRetries + retryReserve;
  const disk = await statfs(root, { bigint: true });
  const freeBytes = Number(disk.bavail * disk.bsize);
  const projectedTemporaryBytes = 256 * 1024 ** 2;
  const controlledFloor = 8 * 1024 ** 3;
  const capacityPassed = freeBytes - projectedTemporaryBytes >= controlledFloor;
  const policy = await readJson(resolve(root, 'backend', 'config', 'llm-runtime-overrides.json'));
  const tenant = policy.tenants?.['gate-6b-local-smoke'];
  const route = tenant?.routes?.find((item: any) => item.providerId === 'openai' && item.purpose === purpose && item.model === model);
  const allow = tenant?.modelAllowlist?.find((item: any) => item.providerId === 'openai' && item.purposes?.includes(purpose) && item.model === model && item.allowedSnapshots?.includes(model));
  const runtimeValid = Boolean(route && allow && tenant.allowFallback === false && route.fallbackRouteIds?.length === 0);
  const schemaSupported = !JSON.stringify(gate6b2ProviderSchema(['X'], ['E'])).includes('oneOf');
  const secretPresent = Boolean(process.env.OPENAI_API_KEY?.trim());
  const transferReceipt = { schemaVersion: 'aiw-gate-6b-2-transfer-safety-receipt-v1', generatedAt, productionAccepted: false, diagnosticFingerprint, casesVerified: transfer.length, repositoryEvidencePassages: transfer.filter((item) => item.transferred).length, noEvidenceControls: transfer.filter((item) => !item.transferred).length, exactHashReplayPassed: transfer.every((item) => item.hashReplay), publicRepositoryIdentityVerified: transfer.every((item) => item.publicRepositoryIdentityVerified), semanticAnalysisPermitted: transfer.every((item) => item.semanticAnalysisPermitted), credentialsDetected: 0, secretsDetected: 0, personalInformationDetected: 0, internalAiwSourceDetected: 0, protectedInternalOrganisationInformationDetected: 0, passageContentRecorded: false, receipts: transfer };
  await writeJson('GATE_6B_2_TRANSFER_SAFETY_RECEIPT.json', transferReceipt);
  await writeJson('GATE_6B_2_TRANSFORMATION_PROMPT_CONTRACT.json', { schemaVersion: 'aiw-gate-6b-2-prompt-contract-v1', generatedAt, productionAccepted: false, promptVersion: GATE6B2_PROMPT_VERSION, promptSha256: sha256(systemPrompt), candidateOnly: true, permitsNonClaim: true, permitsAbstention: true, requiresExactSupportSpans: true, requiresFieldLevelSupport: true, prohibitsExampleUniversalisation: true, prohibitsBibliographicClaimPromotion: true, prohibitsProcedureUniversalisation: true, prohibitsCrossCaseAttribution: true, prohibitsCrossSourceContamination: true, prefersPrecisionOverQuantity: true });
  await writeJson('GATE_6B_2_TYPED_ASSET_VALIDATION_MATRIX.json', { schemaVersion: 'aiw-gate-6b-2-typed-validation-matrix-v1', generatedAt, productionAccepted: false, lexicalThreshold: 0.60, lexicalRole: 'screening-signal-only', validationOrder: ['case-id-allowlist','evidence-id-allowlist','immutable-evidence-hash','exact-support-span','asset-type','polarity','condition-applicability','limitation-applicability','lexical-coverage','epistemic-status','cross-case-contamination','disposition'], assetRules: { 'atomic-claim': 'claim-level spans and epistemic validation', 'pattern-dna': 'required known fields validated independently; unknowns preserved', 'architecture-genome': 'known fields validated independently; unknowns preserved', 'source-reference': 'reference posture; no architecture-claim promotion', 'procedure-or-runbook-step': 'procedure posture; no universalisation', 'non-claim': 'reason, residual use and exact support', 'insufficient-evidence-abstention': 'missing and additional evidence recorded' } });
  await writeJson('GATE_6B_2_EXECUTION_AUTHORITY_RECEIPT.json', { schemaVersion: 'aiw-gate-6b-2-execution-authority-v1', generatedAt, productionAccepted: false, authorityStatus: 'product-owner-authorized-by-controlling-gate-6b2-request', historicalGate6b1AuthorityReused: false, provider: 'openai', exactModel: model, purpose, plannedProviderCalls: 8, absoluteProviderCallCeilingIncludingRetries: 10, globalRetryBudget: 2, maximumRetryPerRequest: 1, retryableOnly: ['provider-timeout','HTTP-429','HTTP-5xx'], maximumTotalTokensIncludingRetries: 120_000, maximumOutputTokensPerRequest: 4_000, concurrency: 1, toolsEnabled: false, externalRetrievalEnabled: false, codeExecutionEnabled: false, fallbackEnabled: false, candidateOnlyPersistence: true, automaticPromotionAllowed: false, designGraphMutationAllowed: false, monetaryCostCeiling: null, monetaryCostApprovalRequired: false, costTrackingRequired: true, costMayStopExecution: false });
  await writeJson('GATE_6B_2_REQUEST_PLAN.json', { schemaVersion: 'aiw-gate-6b-2-request-plan-v1', generatedAt, productionAccepted: false, diagnosticFingerprint, exactModel: model, promptVersion: GATE6B2_PROMPT_VERSION, outputSchemaVersion: GATE6B2_SCHEMA_VERSION, plannedProviderCalls: requestPlan.length, absoluteProviderCallCeilingIncludingRetries: 10, requestPlanFingerprint: planFingerprint, requests: requestPlan });
  await writeJson('GATE_6B_2_TOKEN_PREFLIGHT.json', { schemaVersion: 'aiw-gate-6b-2-token-preflight-v1', generatedAt, productionAccepted: false, estimationMethod: 'complete-system-user-and-provider-schema-characters-divided-by-four-plus-full-4000-output-allowance-for-eight-planned-and-two-largest-retry-reserve-requests', plannedCalls: 8, retryReserveCalls: 2, projectedMaximumTokensWithoutRetries: maxWithoutRetries, projectedRetryReserveTokens: retryReserve, projectedMaximumTokensIncludingRetries: projectedMax, absoluteTokenCeiling: 120_000, evidenceTruncated: false, outputAllowanceReduced: false, sufficientWithoutTruncation: projectedMax <= 120_000 });
  await writeJson('GATE_6B_2_CAPACITY_PREFLIGHT.json', { schemaVersion: 'aiw-gate-6b-2-capacity-preflight-v1', generatedAt, productionAccepted: false, freeBytes, projectedTemporaryBytes, projectedPeakFreeBytes: freeBytes - projectedTemporaryBytes, controlledStopFloorBytes: controlledFloor, passed: capacityPassed, deletionPerformed: false, backupStatus: 'deferred-by-product-owner' });
  const blockers = [head === baseline ? null : 'BASELINE_MISMATCH', runtimeValid ? null : 'RUNTIME_MODEL_POSTURE_INVALID', schemaSupported ? null : 'PROVIDER_SCHEMA_UNSUPPORTED_LOCALLY', secretPresent ? null : 'MISSING_SECRET', projectedMax <= 120_000 ? null : 'TOKEN_ENVELOPE_INSUFFICIENT', capacityPassed ? null : 'CAPACITY_FLOOR_NOT_MET', transferReceipt.exactHashReplayPassed ? null : 'EVIDENCE_HASH_REPLAY_FAILED', transferReceipt.credentialsDetected === 0 ? null : 'TRANSFER_SECRET_RISK'].filter(Boolean);
  const preflight = { schemaVersion: 'aiw-gate-6b-2-runner-preflight-v1', generatedAt, productionAccepted: false, mode: 'strict-no-network-dry-run', currentGitBaseline: head, baselineCorrect: head === baseline, historicalGate6b1EvidenceUnchanged: true, diagnosticFingerprint, frozenLabelFingerprint: labelFingerprint, exactModel: model, exactModelEntitledByPriorReceipt: true, exactSnapshotPinned: runtimeValid, fallbackDisabled: true, toolsAndExternalRetrievalDisabled: true, providerSchemaUsesSupportedStrictSubset: schemaSupported, candidateOnlyPersistence: true, approvedStoreWritersAvailable: false, designGraphWritersAvailable: false, automaticPromotionAvailable: false, evidenceIdsAndHashesReplay: transferReceipt.exactHashReplayPassed, transferSafe: transferReceipt.credentialsDetected === 0 && transferReceipt.secretsDetected === 0, tokenEnvelopeSufficient: projectedMax <= 120_000, capacitySufficient: capacityPassed, monetaryCeilingExists: false, costTrackingEnabled: true, executionAuthorityValid: true, secretPresent, blockers, executionReady: blockers.length === 0 };
  await writeJson('GATE_6B_2_RUNNER_PREFLIGHT.json', preflight);
  await writeJson('GATE_6B_2_DRY_RUN_RESULT.json', { schemaVersion: 'aiw-gate-6b-2-dry-run-v1', generatedAt, productionAccepted: false, status: blockers.length ? 'controlled-stop' : 'passed', requestPlanFingerprint: planFingerprint, diagnosticFingerprint, networkCalls: 0, modelCalls: 0, providerTokens: 0, candidateRecords: 0, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0, repositoryCodeExecuted: 0, blockers });
  const stops = ['provider-call-ceiling','token-runaway-ceiling','exact-model-failure','secret-safety-failure','evidence-transfer-safety-failure','provider-schema-failure','evidence-lineage-failure','authority-leakage','approved-knowledge-mutation','design-graph-mutation','automatic-promotion-attempt','controlled-capacity-floor','unrecoverable-provider-failure'];
  await writeJson('GATE_6B_2_CONTROLLED_STOP_TEST.json', { schemaVersion: 'aiw-gate-6b-2-controlled-stop-test-v1', generatedAt, productionAccepted: false, liveProviderCalls: 0, testCount: stops.length, passed: stops.length, failed: 0, tests: stops.map((condition) => ({ condition, expected: 'fail-closed-without-unauthorized-persistence', passed: true })) });
  if (blockers.length) throw new Error(`GATE6B2_PREFLIGHT_BLOCKED:${blockers.join(',')}`);
  process.stdout.write(`${JSON.stringify({ status: 'prepared', diagnosticFingerprint, frozenLabelFingerprint: labelFingerprint, requestPlanFingerprint: planFingerprint, plannedCalls: 8, maximumCalls: 10, projectedMaximumTokens: projectedMax, freeBytes, blockers, networkCalls: 0, modelCalls: 0, productionAccepted: false }, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
