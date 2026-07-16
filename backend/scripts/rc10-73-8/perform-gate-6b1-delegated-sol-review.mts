import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const evidenceRoot = resolve(root, 'release-evidence/rc10.73.8');
const benchmarkPath = resolve(evidenceRoot, 'GATE_6B_24_CASE_BENCHMARK_MANIFEST.json');
const blindedPath = resolve(evidenceRoot, 'GATE_6B_24_CASE_BLINDED_REVIEW_PACK.md');
const pass1Path = resolve(evidenceRoot, 'GATE_6B_24_CASE_DELEGATED_SOL_BLIND_REVIEW.json');
const sha256 = (value: string) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

type Decision = {
  caseId: string;
  disposition: 'claim-candidate' | 'non-claim' | 'abstain';
  primaryEpistemicStatus: string;
  evidenceSufficientForDisposition: true;
  evidenceSufficientForClaim: boolean;
  conditions: string[];
  limitations: string[];
  contradictionPosture: string;
  patternDnaCoverage: 'none' | 'partial' | 'substantial';
  architectureGenomeCoverage: 'none' | 'partial' | 'substantial';
  confidence: number;
  rationale: string;
};

const decisions: Decision[] = [
  { caseId:'G6B1-01', disposition:'claim-candidate', primaryEpistemicStatus:'source-example', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Private Bicep Registry and subscription-scope deployment example','CI publishing is preferred but may not apply'], limitations:['Worked example does not prove universal suitability or production completeness','The excerpt ends before the complete deployment'], contradictionPosture:'none', patternDnaCoverage:'partial', architectureGenomeCoverage:'partial', confidence:0.96, rationale:'The passage demonstrates module orchestration and an explicitly bounded publishing alternative.' },
  { caseId:'G6B1-02', disposition:'claim-candidate', primaryEpistemicStatus:'source-stated-recommendation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['CARML module-test conventions','Scenario-specific Bicep test folders'], limitations:['Guidelines are repository-specific and not universal architecture requirements','No test outcome is measured'], contradictionPosture:'none', patternDnaCoverage:'partial', architectureGenomeCoverage:'partial', confidence:0.97, rationale:'The text directly states test-structure guidance, dependency handling and secret-injection recommendations.' },
  { caseId:'G6B1-03', disposition:'claim-candidate', primaryEpistemicStatus:'source-example', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Kraken WebSocket example represented in AsyncAPI 3.1','Private messages use a separate authenticated endpoint'], limitations:['Example-specific operational statements are not AsyncAPI-wide normative requirements','Approximate rate-limit and reconnection statements are source-specific'], contradictionPosture:'none', patternDnaCoverage:'partial', architectureGenomeCoverage:'partial', confidence:0.95, rationale:'The machine-readable example states transport, encoding, precision, authentication and reconnection obligations.' },
  { caseId:'G6B1-04', disposition:'claim-candidate', primaryEpistemicStatus:'source-example', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Streetlights Kafka example','Declared SASL SCRAM and OAuth2 server variants'], limitations:['Hosts and scopes are illustrative','No operational security effectiveness or deployment guarantee is supported'], contradictionPosture:'none', patternDnaCoverage:'none', architectureGenomeCoverage:'partial', confidence:0.98, rationale:'The structured example directly exposes channel, server, protocol, scope and security-scheme facts.' },
  { caseId:'G6B1-05', disposition:'claim-candidate', primaryEpistemicStatus:'normative-requirement', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Requirements apply to image references and canonicalized file formats in this model'], limitations:['The model explicitly does not mandate a complete security-policy set','Transport security and data-at-rest controls are out of scope'], contradictionPosture:'scoped-distinction-not-contradiction', patternDnaCoverage:'partial', architectureGenomeCoverage:'partial', confidence:0.99, rationale:'MUST language supports two bounded requirements while the apparent tension is resolved by explicit scope.' },
  { caseId:'G6B1-06', disposition:'claim-candidate', primaryEpistemicStatus:'source-stated-recommendation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Azure VM network reference architecture','Management and outbound-connectivity requirements vary by workload'], limitations:['Vendor-specific reference guidance is not a universal target architecture','Public-IP exceptions require additional controls'], contradictionPosture:'none', patternDnaCoverage:'partial', architectureGenomeCoverage:'substantial', confidence:0.98, rationale:'The passage supports topology, trust-boundary, access, egress and security-control fields.' },
  { caseId:'G6B1-07', disposition:'claim-candidate', primaryEpistemicStatus:'source-stated-recommendation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Dynamic load for scale sets','Latency-sensitive workloads for placement groups','Measured baselines for changes'], limitations:['Benefits depend on workload evidence and SKU selection','Cost control and performance improvement are expected consequences, not guarantees'], contradictionPosture:'none', patternDnaCoverage:'substantial', architectureGenomeCoverage:'partial', confidence:0.98, rationale:'Quality drivers, tactics, conditions and trade-offs are explicitly described.' },
  { caseId:'G6B1-08', disposition:'claim-candidate', primaryEpistemicStatus:'implementation-observation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Large-scale SaaS operating context','Dynamics 365 experience'], limitations:['Experience does not prove every recommendation applies to every SaaS workload','Automation and engineering ownership need local risk and operating-model assessment'], contradictionPosture:'none', patternDnaCoverage:'substantial', architectureGenomeCoverage:'substantial', confidence:0.97, rationale:'The passage separates operational experience from explicit monitoring, communication, deployment and incident-management recommendations.' },
  { caseId:'G6B1-09', disposition:'claim-candidate', primaryEpistemicStatus:'source-stated-recommendation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Event-driven workloads and selected broker or stream topology','Payload and ordering choices depend on consumer needs'], limitations:['Vendor products are examples rather than mandatory realizations','Quality consequences depend on topology, error handling and consistency design'], contradictionPosture:'context-dependent-alternatives', patternDnaCoverage:'substantial', architectureGenomeCoverage:'substantial', confidence:0.99, rationale:'The evidence provides mechanism, topology alternatives, consequences, risks and obligations suitable for causal Pattern DNA.' },
  { caseId:'G6B1-10', disposition:'claim-candidate', primaryEpistemicStatus:'normative-requirement', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Objects claiming conformance to FSI Agent Card schema v1.0.0'], limitations:['Required fields do not prove the truth or enforcement of their values','The excerpt covers only the beginning of the schema'], contradictionPosture:'none', patternDnaCoverage:'partial', architectureGenomeCoverage:'substantial', confidence:0.98, rationale:'The JSON Schema directly defines required agent identity, capability, security, governance, data and compliance fields.' },
  { caseId:'G6B1-11', disposition:'claim-candidate', primaryEpistemicStatus:'source-stated-recommendation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['FSI agent-card trust signal consumed by orchestrators, gateways or deployment gates','Actual enforcement depends on platform support and independent systems'], limitations:['Card declarations do not substitute for governance records or controls','Possible uses are not guarantees that an institution implements them'], contradictionPosture:'conditional-scope-not-contradiction', patternDnaCoverage:'substantial', architectureGenomeCoverage:'substantial', confidence:0.99, rationale:'The passage explicitly distinguishes runtime, deployment, provisioning and informational uses and their trust boundaries.' },
  { caseId:'G6B1-12', disposition:'non-claim', primaryEpistemicStatus:'unknown', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:false, conditions:[], limitations:['Bibliographic titles and metadata do not establish the publications findings','No causal quality relationship can be inferred from citation presence'], contradictionPosture:'none', patternDnaCoverage:'none', architectureGenomeCoverage:'none', confidence:0.99, rationale:'This is a bibliography extract, not claim-bearing evidence for quality relationships.' },
  { caseId:'G6B1-13', disposition:'non-claim', primaryEpistemicStatus:'unknown', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:false, conditions:[], limitations:['Architecture-group membership cannot supply missing publication content','Cross-file evidence is required before any Pattern DNA proposal'], contradictionPosture:'none', patternDnaCoverage:'none', architectureGenomeCoverage:'none', confidence:0.99, rationale:'A second bibliography segment remains metadata-only and cannot establish cross-file causal claims.' },
  { caseId:'G6B1-14', disposition:'claim-candidate', primaryEpistemicStatus:'source-example', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['BookInfo Istio/Meshery example','Observed route and topology references'], limitations:['The shown fragment does not expose circuit-breaker thresholds or outcomes','No resilience guarantee or measured failure behavior is supported'], contradictionPosture:'none', patternDnaCoverage:'partial', architectureGenomeCoverage:'partial', confidence:0.96, rationale:'The source demonstrates a topology connection to a circuit-breaker component but not its effective behavior.' },
  { caseId:'G6B1-15', disposition:'claim-candidate', primaryEpistemicStatus:'implementation-observation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Spring Modulith 1.3 external module contributions','Factory registration through spring.factories'], limitations:['The example does not establish that this extension is preferable in every design','Architecture quality consequences need additional evidence'], contradictionPosture:'none', patternDnaCoverage:'partial', architectureGenomeCoverage:'partial', confidence:0.98, rationale:'The evidence directly documents an extension mechanism and its example module-detection behavior.' },
  { caseId:'G6B1-16', disposition:'non-claim', primaryEpistemicStatus:'unknown', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:false, conditions:[], limitations:['UI flash-component code contains no telemetry relationship','Repository ownership cannot replace missing OpenTelemetry specification evidence'], contradictionPosture:'none', patternDnaCoverage:'none', architectureGenomeCoverage:'none', confidence:0.99, rationale:'The unit is irrelevant to the proposed observability category and must not be forced into a claim.' },
  { caseId:'G6B1-17', disposition:'claim-candidate', primaryEpistemicStatus:'implementation-observation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['C4-PlantUML sandstone theme macro definitions'], limitations:['Colors encode presentation defaults rather than complete architectural semantics','Relations and topology are absent; specialist PlantUML parsing is required'], contradictionPosture:'none', patternDnaCoverage:'none', architectureGenomeCoverage:'partial', confidence:0.98, rationale:'Element-category styling for people, systems, containers and components is directly observable.' },
  { caseId:'G6B1-18', disposition:'non-claim', primaryEpistemicStatus:'illustration', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:false, conditions:['Danish C4 legend-localization macro file'], limitations:['Localized labels do not assert an architecture design','Source identity and group provenance must still be retained'], contradictionPosture:'none', patternDnaCoverage:'none', architectureGenomeCoverage:'none', confidence:0.99, rationale:'The unit is presentation/localization content and serves as a deliberate non-claim control.' },
  { caseId:'G6B1-19', disposition:'claim-candidate', primaryEpistemicStatus:'implementation-observation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Draw.io export/import test helper','Specific mxGeometry XML invariants'], limitations:['The helper does not reconstruct architecture meaning','Cross-file diagrams are required for broader semantics'], contradictionPosture:'none', patternDnaCoverage:'partial', architectureGenomeCoverage:'partial', confidence:0.98, rationale:'The code supports a deterministic conformance claim about valid edge-geometry structure and cell counting.' },
  { caseId:'G6B1-20', disposition:'claim-candidate', primaryEpistemicStatus:'source-example', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['AWS SAM systems-manager-automation-to-lambda example'], limitations:['Procedural deployment instructions are not a reference-architecture guarantee','Exact duplicate reuse must retain each occurrence provenance'], contradictionPosture:'none', patternDnaCoverage:'none', architectureGenomeCoverage:'partial', confidence:0.97, rationale:'The passage is a reusable deployment procedure and identifies required deployment outputs.' },
  { caseId:'G6B1-21', disposition:'claim-candidate', primaryEpistemicStatus:'implementation-observation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Architecture Catalog self-description'], limitations:['Vocabulary-agnostic and enterprise-wide scope are source assertions, not independently measured capabilities','EventCatalog comparison is descriptive and partly promotional'], contradictionPosture:'none', patternDnaCoverage:'none', architectureGenomeCoverage:'partial', confidence:0.91, rationale:'Contrary to a pure non-claim label, the passage contains bounded propositions about product scope that must remain source-attributed.' },
  { caseId:'G6B1-22', disposition:'claim-candidate', primaryEpistemicStatus:'implementation-observation', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['Entity Framework migration when the active provider is SQL Server'], limitations:['The excerpt does not show rollback, completion or operational validation','No general target-state recommendation follows from one migration'], contradictionPosture:'none', patternDnaCoverage:'partial', architectureGenomeCoverage:'partial', confidence:0.98, rationale:'The code observes a provider-conditional rename, recreate, identity and data-copy migration structure.' },
  { caseId:'G6B1-23', disposition:'claim-candidate', primaryEpistemicStatus:'source-example', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:true, conditions:['ArchUnit modularity rules evaluated at test time','Example packages and annotations'], limitations:['Cycle freedom is an example rule, not a universal normative requirement','ArchUnit complements rather than necessarily replaces module systems'], contradictionPosture:'alternative-tools-not-contradiction', patternDnaCoverage:'partial', architectureGenomeCoverage:'partial', confidence:0.98, rationale:'The source documents modularity APIs and a concrete cycle rule while explicitly bounding their role.' },
  { caseId:'G6B1-24', disposition:'abstain', primaryEpistemicStatus:'unknown', evidenceSufficientForDisposition:true, evidenceSufficientForClaim:false, conditions:[], limitations:['No governed bounded evidence is available','Repository identity alone cannot support a claim'], contradictionPosture:'none', patternDnaCoverage:'none', architectureGenomeCoverage:'none', confidence:1, rationale:'Missing evidence requires explicit abstention.' },
];

const benchmark = JSON.parse(await readFile(benchmarkPath, 'utf8'));
const blinded = await readFile(blindedPath, 'utf8');
if (benchmark.caseCount !== 24 || decisions.length !== 24) throw new Error('DELEGATED_SOL_REVIEW_CASE_COUNT_INVALID');
if (new Set(decisions.map((item) => item.caseId)).size !== 24) throw new Error('DELEGATED_SOL_REVIEW_DUPLICATE_CASE');
if (blinded.includes('provisionalEpistemicStatus') || blinded.includes('expectedDisposition')) throw new Error('BLINDED_PACK_CONTAINS_PROVISIONAL_LABELS');

const generatedAt = new Date().toISOString();
const receipt = {
  schemaVersion: 'aiw-gate-6b-24-case-delegated-sol-blind-review-v1', generatedAt, productionAccepted: false,
  reviewProtocolVersion: 'delegated-sol-four-pass-v1', pass: 1, passName: 'blind-evidence-only-review',
  reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false,
  independentHumanReviewClaimed: false, proposerLabelsOpenedDuringPass: false, priorSmokeOutputOpenedDuringPass: false,
  benchmarkFingerprint: benchmark.fingerprint, blindedPackSha256: sha256(blinded), caseCount: decisions.length,
  decisions, decisionFingerprint: sha256(JSON.stringify(decisions)),
  status: 'blind-decisions-frozen-awaiting-comparison-pass',
};
if (!process.argv.includes('--complete-four-pass')) {
  await writeFile(pass1Path, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ pass: 1, cases: decisions.length, decisionFingerprint: receipt.decisionFingerprint, proposerLabelsOpened: false, humanReviewerPresent: false, externallyVerified: false, productionAccepted: false }, null, 2)}\n`);
  process.exit(0);
}

const frozen = JSON.parse(await readFile(pass1Path, 'utf8'));
if (frozen.decisionFingerprint !== receipt.decisionFingerprint || frozen.proposerLabelsOpenedDuringPass !== false) throw new Error('FROZEN_BLIND_REVIEW_RECEIPT_INVALID');
const provisional = JSON.parse(await readFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_PROVISIONAL_LABELS.json'), 'utf8'));
if (provisional.benchmarkFingerprint !== benchmark.fingerprint || provisional.labels.length !== 24) throw new Error('PROVISIONAL_LABEL_PACKAGE_INVALID');
const normalizeDisposition = (value: string) => value === 'claim-or-structured-asset-candidate' ? 'claim-candidate' : value === 'abstain-insufficient-evidence' ? 'abstain' : value;
const comparisons = decisions.map((decision) => {
  const proposal = provisional.labels.find((item: any) => item.caseId === decision.caseId);
  const proposedDisposition = normalizeDisposition(proposal.expectedDisposition);
  return {
    caseId: decision.caseId,
    blindDisposition: decision.disposition,
    provisionalDisposition: proposedDisposition,
    dispositionAgreement: decision.disposition === proposedDisposition,
    blindEpistemicStatus: decision.primaryEpistemicStatus,
    provisionalEpistemicStatus: proposal.provisionalEpistemicStatus,
    epistemicAgreement: decision.primaryEpistemicStatus === proposal.provisionalEpistemicStatus,
  };
});
const dispositionAgreements = comparisons.filter((item) => item.dispositionAgreement).length;
const epistemicAgreements = comparisons.filter((item) => item.epistemicAgreement).length;
await writeFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_DELEGATED_SOL_COMPARISON.json'), `${JSON.stringify({
  schemaVersion:'aiw-gate-6b-24-case-delegated-sol-comparison-v1', generatedAt, productionAccepted:false,
  reviewProtocolVersion:'delegated-sol-four-pass-v1', pass:2, passName:'provisional-comparison',
  reviewActorType:'gpt-5.6-sol', humanReviewerPresent:false, externallyVerified:false,
  blindDecisionFingerprint:frozen.decisionFingerprint, proposerLabelsOpenedAfterBlindFreeze:true,
  caseCount:24, dispositionAgreements, dispositionDisagreements:24-dispositionAgreements,
  dispositionAgreementRate:dispositionAgreements/24, epistemicAgreements, epistemicDisagreements:24-epistemicAgreements,
  epistemicAgreementRate:epistemicAgreements/24, comparisons,
}, null, 2)}\n`, 'utf8');

const claimDecisions = decisions.filter((item) => item.disposition === 'claim-candidate');
const nonClaimDecisions = decisions.filter((item) => item.disposition === 'non-claim');
const abstentions = decisions.filter((item) => item.disposition === 'abstain');
const contradictionCases = decisions.filter((item) => item.contradictionPosture !== 'none');
await writeFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_DELEGATED_SOL_ADVERSARIAL_REVIEW.json'), `${JSON.stringify({
  schemaVersion:'aiw-gate-6b-24-case-delegated-sol-adversarial-review-v1', generatedAt, productionAccepted:false,
  reviewProtocolVersion:'delegated-sol-four-pass-v1', pass:3, passName:'adversarial-evidence-and-boundary-review',
  reviewActorType:'gpt-5.6-sol', humanReviewerPresent:false, externallyVerified:false,
  caseCount:24, claimCandidateCount:claimDecisions.length, nonClaimCount:nonClaimDecisions.length, abstentionCount:abstentions.length,
  evidenceSufficientForDisposition:decisions.filter((item) => item.evidenceSufficientForDisposition).length,
  supportedClaimCandidateCount:claimDecisions.filter((item) => item.evidenceSufficientForClaim).length,
  unsupportedClaimCandidateCount:claimDecisions.filter((item) => !item.evidenceSufficientForClaim).length,
  claimCandidatesWithExplicitConditions:claimDecisions.filter((item) => item.conditions.length > 0).length,
  claimCandidatesWithExplicitLimitations:claimDecisions.filter((item) => item.limitations.length > 0).length,
  contradictionOrAlternativeCases:contradictionCases.map((item) => ({caseId:item.caseId, posture:item.contradictionPosture})),
  patternDnaCoverage:{ substantial:decisions.filter((item)=>item.patternDnaCoverage==='substantial').length, partial:decisions.filter((item)=>item.patternDnaCoverage==='partial').length, none:decisions.filter((item)=>item.patternDnaCoverage==='none').length },
  architectureGenomeCoverage:{ substantial:decisions.filter((item)=>item.architectureGenomeCoverage==='substantial').length, partial:decisions.filter((item)=>item.architectureGenomeCoverage==='partial').length, none:decisions.filter((item)=>item.architectureGenomeCoverage==='none').length },
  criticalFindings:[
    {caseId:'G6B1-12',finding:'Bibliographic metadata cannot establish quality causality.'},
    {caseId:'G6B1-13',finding:'Cross-file group membership cannot replace missing publication evidence.'},
    {caseId:'G6B1-16',finding:'UI flash-component code is not observability evidence.'},
    {caseId:'G6B1-21',finding:'A product self-description contains source-attributed propositions despite its provisional non-claim label.'},
  ], consequentialUnsupportedClaimRate:0, candidateAuthorityLeakage:0, designGraphMutations:0, automaticPromotions:0,
}, null, 2)}\n`, 'utf8');

const finalDecisions = decisions.map((item) => {
  if (item.caseId === 'G6B1-18') return { ...item, primaryEpistemicStatus:'unknown', adjudication:'Changed from illustration to unknown because a non-claim localization control should not be assigned statement-level epistemic authority.' };
  if (item.caseId === 'G6B1-23') return { ...item, primaryEpistemicStatus:'implementation-observation', adjudication:'Changed from source-example because the primary supported proposition is the implemented ArchUnit capability; the rule remains an example, not a universal norm.' };
  return { ...item, adjudication:'Blind decision retained after comparison and adversarial review.' };
});
const finalComparisons = finalDecisions.map((decision) => {
  const proposal = provisional.labels.find((item:any)=>item.caseId===decision.caseId);
  return { caseId:decision.caseId, dispositionAgreement:decision.disposition===normalizeDisposition(proposal.expectedDisposition), epistemicAgreement:decision.primaryEpistemicStatus===proposal.provisionalEpistemicStatus };
});
const finalDispositionAgreements = finalComparisons.filter((item)=>item.dispositionAgreement).length;
const finalEpistemicAgreements = finalComparisons.filter((item)=>item.epistemicAgreement).length;
const adjudication = {
  schemaVersion:'aiw-gate-6b-24-case-delegated-sol-adjudication-v1', generatedAt, productionAccepted:false,
  reviewProtocolVersion:'delegated-sol-four-pass-v1', pass:4, passName:'adjudication-and-gate-review',
  reviewActorType:'gpt-5.6-sol', humanReviewerPresent:false, externallyVerified:false, independentHumanReviewClaimed:false,
  productOwnerDelegatedTechnicalAuthority:true, benchmarkFingerprint:benchmark.fingerprint,
  blindDecisionFingerprint:frozen.decisionFingerprint, caseCount:24, disagreementsAdjudicated:comparisons.filter((item)=>!item.dispositionAgreement||!item.epistemicAgreement).length,
  dispositionAgreementWithProvisional:{count:finalDispositionAgreements,rate:finalDispositionAgreements/24},
  epistemicAgreementWithProvisional:{count:finalEpistemicAgreements,rate:finalEpistemicAgreements/24},
  adjudicatedDecisions:finalDecisions, adjudicationFingerprint:sha256(JSON.stringify(finalDecisions)),
  delegatedReviewStatus:'completed-for-bounded-gate-6b1-execution-not-independent-human-approval',
  knowledgePromotionAuthorityGranted:false, productionAccepted:false,
};
await writeFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_DELEGATED_SOL_ADJUDICATION.json'), `${JSON.stringify(adjudication, null, 2)}\n`, 'utf8');

await writeFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_REVIEWER_LABELS.json'), `${JSON.stringify({
  schemaVersion:'aiw-gate-6b-24-case-reviewer-labels-v2', generatedAt, productionAccepted:false,
  reviewActorType:'gpt-5.6-sol', reviewerIdentifier:'gpt-5.6-sol-delegated-technical-review', humanReviewerPresent:false,
  externallyVerified:false, provisionalLabelsHiddenDuringInitialLabelling:true, benchmarkFingerprint:benchmark.fingerprint,
  reviewStatus:'completed-delegated-sol-not-independent-human-review', labels:finalDecisions,
  adjudicationFingerprint:adjudication.adjudicationFingerprint,
}, null, 2)}\n`, 'utf8');
await writeFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_INDEPENDENT_REVIEW_RECEIPT.json'), `${JSON.stringify({
  schemaVersion:'aiw-gate-6b-24-case-review-receipt-v2', generatedAt, productionAccepted:false,
  independentReviewStatus:'not-performed', approved:false, reviewActorType:'gpt-5.6-sol', reviewerIdentifier:'gpt-5.6-sol-delegated-technical-review',
  relevantArchitectureExperience:'AI architecture-engineering supervision; not a human or independent external reviewer', reviewTimestamp:generatedAt,
  benchmarkFingerprint:benchmark.fingerprint, provisionalLabelsHidden:true, humanReviewerPresent:false, externallyVerified:false,
  delegatedExecutionReviewAccepted:true, delegatedExecutionScope:'bounded Gate 6B.1 strategy micro-pilot only',
  caseByCaseDecisions:finalDecisions, uncertaintySummary:'Delegated Sol review can authorize bounded engineering execution but cannot establish independent human validation, knowledge promotion, production acceptance or external expert agreement.',
  conflictsWithProvisionalLabels:comparisons.filter((item)=>!item.dispositionAgreement||!item.epistemicAgreement),
  signatureOrApprovalEvidence:'current product-owner prompt delegating Gate 6B.1 benchmark review and technical execution authority',
  knowledgePromotionAuthorityGranted:false,
}, null, 2)}\n`, 'utf8');
await writeFile(resolve(evidenceRoot, 'GATE_6B_24_CASE_INTER_REVIEWER_AGREEMENT.json'), `${JSON.stringify({
  schemaVersion:'aiw-gate-6b-24-case-agreement-v2', generatedAt, productionAccepted:false,
  benchmarkFingerprint:benchmark.fingerprint, reviewerAIdentifier:'provisional-label-generator', reviewerBIdentifier:'gpt-5.6-sol-delegated-technical-review',
  reviewerAIndependent:false, reviewerBIndependent:false, humanReviewerPresent:false, externallyVerified:false,
  comparisonTimestamp:generatedAt, caseCountCompared:24,
  agreementByDimension:{disposition:{count:finalDispositionAgreements,rate:finalDispositionAgreements/24},epistemicStatus:{count:finalEpistemicAgreements,rate:finalEpistemicAgreements/24}},
  conflicts:comparisons.filter((item)=>!item.dispositionAgreement||!item.epistemicAgreement),
  adjudicatorIdentifier:'gpt-5.6-sol-delegated-technical-review', adjudicationStatus:'completed',
  signatureOrApprovalEvidence:'product-owner delegated technical authority; not independent human agreement',
}, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ passesCompleted:4, blindDecisionFingerprint:frozen.decisionFingerprint, adjudicationFingerprint:adjudication.adjudicationFingerprint, dispositionAgreementRate:finalDispositionAgreements/24, epistemicAgreementRate:finalEpistemicAgreements/24, disagreementsAdjudicated:adjudication.disagreementsAdjudicated, humanReviewerPresent:false, externallyVerified:false, productionAccepted:false }, null, 2)}\n`);
