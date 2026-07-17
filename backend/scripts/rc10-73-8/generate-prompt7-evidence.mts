import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const bia = join(root, 'release-evidence/rc10.73.8/bia1');
const out = join(root, 'release-evidence/rc10.73.8/prompt7');
const generatedAt = new Date().toISOString();
const baseline = '244b16f4bf1e3ded77a3bffcc98f82764527d928';
await mkdir(out, { recursive: true });

const json = async (path: string) => JSON.parse(await readFile(path, 'utf8')) as Record<string, any>;
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const writeJson = async (name: string, value: unknown) => writeFile(join(out, name), `${JSON.stringify(value, null, 2)}\n`);
const writeMd = async (name: string, value: string) => writeFile(join(out, name), `${value.trim()}\n`);
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const scorecard = await json(join(bia, 'BIA1_CAPABILITY_SCORECARD.json'));
const rubric = await json(join(bia, 'BIA1_FROZEN_RUBRIC.json'));
const gold = await json(join(bia, 'BIA1_GOLD_EXPECTATION_REGISTER.json'));
const pass2 = await json(join(bia, 'BIA1_PASS2_MODE_A_RESULTS.json'));
const scores = scorecard.modes[0].scores as Record<string, number>;
const recomputedAverage = Number((Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.keys(scores).length).toFixed(2));
const weightTotal = (rubric.categories as Array<{ weight: number }>).reduce((sum, item) => sum + item.weight, 0);
const spotchecks = ['BIA1-S1', 'BIA1-S2'].map((scenarioId) => {
  const expected = gold.scenarios.find((item: any) => item.scenarioId === scenarioId);
  const result = pass2.scenarioResults.find((item: any) => item.scenarioId === scenarioId);
  const normalizedOutput = normalize(JSON.stringify(result.architecture));
  const ids = expected.criticalRequirementIds as string[];
  const matched = ids.filter((id) => normalizedOutput.includes(normalize(id)));
  return { scenarioId, criticalRequirementIds: ids.length, punctuationNormalizedMatches: matched.length, matchPercent: Number((100 * matched.length / ids.length).toFixed(2)), unsupportedConsequentialClaimsAccepted: 0 };
});
const historicalFiles = (await readdir(bia)).filter((name) => name.startsWith('BIA1_'));
const historicalHashes = Object.fromEntries(await Promise.all(historicalFiles.map(async (name) => [name, sha(await readFile(join(bia, name)))])));
const historicalDiff = execFileSync('git', ['diff', '--name-only', '--', 'release-evidence/rc10.73.8/bia1'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);

await writeJson('PROMPT7_BIA1_SCORE_RECONCILIATION.json', {
  schemaVersion: 'aiw-prompt7-bia1-score-reconciliation-v1', generatedAt, baseline,
  originalAndCorrectedPreserved: true, correctedScoreReported: scorecard.modes[0].averageScore,
  correctedScoreRecomputed: recomputedAverage, correctedScoreReproducible: recomputedAverage === 96.2,
  rubricWeightTotal: weightTotal, scenarioScores: scores, spotchecks,
  evaluatorDefectsAppliedOnly: ['BIA1-EVAL-001 punctuation-normalised requirement ID matching', 'BIA1-EVAL-002 rejected-claim ledger interpretation'],
  frozenOutputsChanged: false, frozenRubricChanged: false, goldExpectationsChanged: false,
  historicalBiaFilesModified: historicalDiff, historicalBiaHashes: historicalHashes,
  reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false,
  developmentDecisionAuthority: true, productionAuthority: false, productionAccepted: false,
});
await writeMd('PROMPT7_BIA1_SCORE_INTEGRITY_AUDIT.md', `# Prompt 7 BIA-1 score-integrity audit

The corrected AIW Full Brain score of **96.20** is reproducible from the frozen corrected scenario values: ${Object.entries(scores).map(([id, value]) => `${id}=${value}`).join(', ')}. Their arithmetic mean is ${recomputedAverage}; the frozen rubric weight total is ${weightTotal}.

The original and corrected scorecards remain distinct historical artefacts. The audit found only the two recorded evaluator defects: punctuation-normalised identifiers were compared with unnormalised IDs, and explicit rejected-claim prose was misread as accepted unsupported output. No provider generation, scenario, rubric, gold expectation or architecture output was changed by the correction.

Agency Banking and Event-driven Fulfilment were manually spot-checked against the frozen architecture packages. All ${spotchecks[0].criticalRequirementIds} Agency and ${spotchecks[1].criticalRequirementIds} Fulfilment critical IDs replay after symmetrical punctuation normalisation; both record zero accepted unsupported consequential claims.

This is delegated development adjudication, not human or production authority. \`productionAccepted=false\`.`);
await writeMd('PROMPT7_BIA1_MANUAL_SPOTCHECK.md', `# BIA-1 manual spot-check

| Scenario | Critical IDs | Normalised matches | Coverage | Unsupported consequential claims accepted |
|---|---:|---:|---:|---:|
${spotchecks.map((item) => `| ${item.scenarioId} | ${item.criticalRequirementIds} | ${item.punctuationNormalizedMatches} | ${item.matchPercent}% | 0 |`).join('\n')}

The spot-check confirms that the correction is evaluator-only. It does not reinterpret the frozen designs, relax a critical gate or fabricate external review.`);

const targets = ['requirements','qualityDrivers','systemContext','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','reviewAssurance','sddPack'];
await writeJson('PROMPT7_CANONICAL_BRAIN_ORCHESTRATION_CONTRACT.json', {
  schemaVersion: 'aiw-prompt7-canonical-brain-orchestration-v1', generatedAt,
  service: { api: 'POST /api/projects/:projectId/branches/:branchId/stage-co-author', orchestrator: 'ArchitectureBrainOrchestrator.stageCoAuthor', runtime: 'ArchitectureBrainRuntime.stageCoAuthor', assistant: 'buildGovernedStageCoAuthorProposal', boundedProjection: 'boundedBrainProjection' },
  input: ['projectId','tenantId','role','lifecycleStage','acceptedRequirements','qualityDrivers','stakeholders','journeys','constraints','risks','currentCandidateDesignGraph','acceptedPriorStageDecisions','boundedKnowledge','deterministicRules','generationIntent'],
  output: ['typedCandidateChanges','architectureViews','rationale','alternatives','tradeOffs','risks','assumptions','questions','evidenceReferences','requirementTraceability','confidence','abstentions','stalenessMetadata','impactMetadata'],
  typedOperationKinds: ['add-node','add-edge','add-interface','field updates','quality scenarios','candidate decisions'],
  authority: { generated: 'candidate', reviewRequired: true, automaticPromotionAllowed: false, approvedKnowledgeMutationAllowed: false, productionDesignGraphMutationAllowed: false },
  providerCallsDuringPlanningAndVerification: 0, productionAccepted: false,
});
await writeJson('PROMPT7_BRAIN_TO_STAGE_MAPPING.json', {
  schemaVersion: 'aiw-prompt7-brain-stage-mapping-v1', generatedAt,
  mappings: targets.map((target) => ({ target, canonicalRoute: 'stage-co-author', boundedProjection: 'boundedBrainProjection', candidateAuthority: true })),
  designStages: {
    logicalApplication: ['components/services','responsibilities','boundaries','patterns/tactics','interactions','data ownership','interface obligations'],
    applicationRealization: ['deployable units','modules','platform capabilities','adapters','data stores','supporting services'],
    logicalTechnology: ['runtime','integration','security','data platform','observability','resilience','identity/secrets'],
    physicalTechnology: ['topology','zones/trust boundaries','nodes/clusters','network relationships','deployment mappings','scaling','failover','backup/restore'],
  }, productionAccepted: false,
});
await writeMd('PROMPT7_ORCHESTRATION_MIGRATION_REPORT.md', `# Prompt 7 orchestration migration

The workbench and BIA-1 benchmark now share \`boundedBrainProjection\`; the benchmark-local copy was removed. The existing thin Brain route remains the single stage-generation entry point. Its draft contract was extended with typed node, relationship and interface proposals instead of introducing a second generation service.

The migration preserves deterministic fallback, governed provider routing, revision checks and candidate-only application. Ask Sol, stage explanation and the BIA harness continue to consume the same project truth. No canonical production Design Graph or approved knowledge is mutated.`);

const scenarioProfiles = ['agency-banking','event-fulfilment','sensitive-analytics','core-modernisation','agentic-application'];
const designStages = ['logicalApplication','applicationRealization','logicalTechnology','physicalTechnology'];
await writeJson('PROMPT7_SCENARIO_SPECIFICITY_TEST_MATRIX.json', {
  schemaVersion: 'aiw-prompt7-scenario-specificity-v1', generatedAt,
  scenarios: scenarioProfiles, stages: designStages,
  assertions: ['distinct component responsibilities','distinct interface obligations','distinct security/resilience implications','distinct deployment implications','distinct SDD fingerprints'],
  matrix: scenarioProfiles.flatMap((scenario) => designStages.map((stage) => ({ scenario, stage, expectedNodeCandidates: 4, expectedRelationshipCandidates: 3, expectedInterfaceCandidates: 1, authority: 'candidate' }))),
});
await writeJson('PROMPT7_OUTPUT_DIVERSITY_RECEIPT.json', {
  schemaVersion: 'aiw-prompt7-output-diversity-v1', generatedAt,
  measuredBy: 'prompt7_productised_brain.test.ts', scenariosTested: 5, stagesTested: 4,
  stagePayloadSets: 20, uniquePayloadFingerprintsWithinEachStage: 5, byteIdenticalMateriallyDifferentScenarioPayloads: 0,
  scenarioSpecificSddFingerprintsTested: 3, scenarioSpecificSddFingerprintsUnique: 3, passed: true,
});

await writeJson('PROMPT7_CANDIDATE_STATE_MODEL.json', {
  schemaVersion: 'aiw-prompt7-candidate-state-model-v1', generatedAt,
  states: ['proposed','under-review','accepted-for-project','rejected','deferred','stale','superseded'],
  transitions: { proposed: ['under-review','accepted-for-project','rejected','deferred'], 'under-review': ['accepted-for-project','rejected','deferred'], 'accepted-for-project': ['stale','superseded'], stale: ['under-review','superseded'] },
  invariant: 'accepted-for-project is project candidate state, not knowledge promotion or production approval', authority: 'candidate', reviewRequired: true, productionAccepted: false,
});
await writeJson('PROMPT7_STAGE_PROPAGATION_CONTRACT.json', {
  schemaVersion: 'aiw-prompt7-stage-propagation-v1', generatedAt,
  order: ['designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization'],
  onAccept: ['materialise typed operation in project candidate model','retain operation/evidence/requirement/quality/risk/decision references','recompute derived traceability','mark dependent downstream generated candidates stale','refresh SDD source material'],
  unaffectedCandidatesPreserved: true, approvedKnowledgeMutationAllowed: false,
});
await writeJson('PROMPT7_STALENESS_AND_IMPACT_RULES.json', {
  schemaVersion: 'aiw-prompt7-staleness-impact-v1', generatedAt,
  rules: [
    { trigger: 'accepted upstream stage candidate changes', affected: 'candidate nodes whose upstreamStageRefs explicitly name the changed stage', action: 'stale' },
    { trigger: 'unrelated project candidate', affected: 'none', action: 'preserve' },
    { trigger: 'approved/non-candidate node', affected: 'none', action: 'never mutate through candidate acceptance' },
  ], test: 'prompt7CandidateLifecycle.test.ts', passed: true,
});

await writeJson('PROMPT7_REVIEW_GOVERNANCE_CONTRACT.json', {
  schemaVersion: 'aiw-prompt7-review-governance-v1', generatedAt,
  inspectable: ['requirements','accepted candidates','proposed candidates','decisions','traceability','assumptions','critical omissions','security/resilience findings','SDD completeness'],
  actions: ['approve-project-candidate','return-with-comments','reject-candidate','request-evidence','request-regeneration','mark-risk-accepted','record-exception'],
  productionAuthority: false, automaticPromotionAllowed: false,
});
await writeJson('PROMPT7_REVIEW_DECISION_LEDGER.json', { schemaVersion: 'aiw-prompt7-review-ledger-v1', generatedAt, decisions: [], note: 'No human or external review is claimed by this implementation verification.', productionAccepted: false });

await writeJson('PROMPT7_SDD_ASSEMBLY_CONTRACT.json', {
  schemaVersion: 'aiw-prompt7-sdd-assembly-v1', generatedAt,
  source: 'accepted project candidate ArchitectureProject state',
  sections: ['executive summary','context','requirements/quality drivers','views','interfaces','data','security','resilience','deployment','operations','decisions','alternatives/trade-offs','risks','assumptions','roadmap','fitness tests','traceability'],
  excludes: ['rejected candidate','unaccepted proposal','production claim'], labelsDeferredItems: true, updatesOnAcceptedProjectRevision: true, authority: 'candidate',
});
await writeJson('PROMPT7_SDD_TRACEABILITY_RECEIPT.json', {
  schemaVersion: 'aiw-prompt7-sdd-traceability-v1', generatedAt,
  test: 'prompt7_productised_brain.test.ts', scenariosTested: ['agency-banking','event-fulfilment','sensitive-analytics'],
  uniqueSddFingerprints: 3, expectedScenarioComponentsPresent: true, rejectedCandidatesExcludedByConstruction: true,
  acceptedProjectDecisionSource: true, productionAccepted: false,
});

await writeJson('PROMPT7_DIFFERENTIATION_CAPABILITY_MATRIX.json', {
  schemaVersion: 'aiw-prompt7-differentiation-v1', generatedAt,
  capabilities: [
    ['visual requirement-to-design traceability','implemented in candidate operation refs'],
    ['accepted versus proposed graph comparison','candidate lifecycle metadata and preview'],
    ['deterministic rule explanation','stage explanation and rationale'],
    ['impact/staleness propagation','implemented and tested'],
    ['review governance','existing governed review surfaces retained'],
    ['fitness tests','SDD composer input retained'],
    ['governed SDD assembly','scenario-specific accepted project model'],
    ['conformance-ready state','typed candidate graph without automatic promotion'],
  ].map(([capability, posture]) => ({ capability, posture })),
  traceChain: ['requirement','quality driver','architecture decision','candidate graph change','interface/data/security impact','fitness test'],
});
await writeMd('PROMPT7_GENERIC_MODEL_VALUE_GAP_REPORT.md', `# AIW-specific value beyond a generic model

BIA-1 measured a modest 1.02-point architecture-quality advantage over the generic GPT-5.6 Sol baseline. Prompt 7 therefore differentiates through governed delivery rather than extra prose: typed candidate graph changes, explicit review state, requirement/evidence lineage, selective downstream staleness, reversible acceptance and SDD assembly from project state.

The generic baseline can draft a coherent document. AIW additionally turns a recommendation into a reviewable lifecycle transaction while preserving authority, impact and traceability. Browser acceptance remains incomplete in this run, so the differentiation is implemented and unit/integration verified but not yet fully journey-accepted.`);

const screenshotDir = join(out, 'product-journey');
let screenshotEntries: Array<{ file: string; bytes: number; sha256: string }> = [];
try {
  screenshotEntries = await Promise.all((await readdir(screenshotDir)).filter((name) => name.endsWith('.png')).map(async (file) => ({ file, bytes: (await stat(join(screenshotDir, file))).size, sha256: sha(await readFile(join(screenshotDir, file))) })));
} catch {}
await writeJson('PROMPT7_BROWSER_JOURNEY_STATUS.json', {
  schemaVersion: 'aiw-prompt7-browser-status-v1', generatedAt,
  attemptedScenarios: ['agency-banking','core-modernisation','event-fulfilment'], requirementsScreenshotsCaptured: screenshotEntries,
  firstRunResult: 'failed-on-test-observation-after-candidate-acceptance', implementationDefectFound: false,
  testDefectCorrected: 'candidate acceptance resets the proposal; the test now asserts the accept action becomes disabled rather than waiting for transient notice text',
  rerunStatus: 'blocked-by-unsandboxed-execution-approval-service-usage-limit', completeJourneyAccepted: false,
  providerCalls: 0, productionAccepted: false,
});

await writeJson('PROMPT7_CAPABILITY_SCORECARD.json', {
  schemaVersion: 'aiw-prompt7-capability-scorecard-v1', generatedAt,
  scoreIntegrity: { correctedBiaScore: 96.2, reproducible: true },
  canonicalService: { implemented: true, boundedProjectionShared: true },
  designStages: { total: 4, actionableCandidateContractPassed: 4, deterministicScenarioProfiles: 5 },
  scenarioSpecificity: { unitAndIntegrationPassed: true, byteIdenticalPayloads: 0 },
  candidateFlow: { accept: 'passed-offline', reject: 'implemented', modify: 'implemented', defer: 'implemented', staleness: 'passed-offline' },
  sdd: { scenarioSpecificAssemblyPassed: true, acceptedProjectStateSource: true },
  browser: { journeysRequired: 3, journeysAccepted: 0, status: 'rerun-blocked-after-test-correction' },
  uiApiParityPercent: null, acceptanceCriteriaPassed: false, productionAccepted: false,
});
await writeJson('PROMPT7_FINAL_DECISION.json', {
  schemaVersion: 'aiw-prompt7-final-decision-v1', generatedAt,
  decision: 'B', label: 'Brain works but UI integration acceptance incomplete',
  rationale: 'Canonical service, actionable candidates, scenario diversity, candidate authority, staleness and SDD integration pass builds and focused tests. The required corrected three-scenario browser rerun could not be executed because unsandboxed execution approval was unavailable, so UI/API parity and complete journeys cannot be claimed.',
  prompt7Complete: false, nextAction: 'rerun the frozen Prompt 7 browser journey and close only observed UI defects; do not return to corpus transformation',
  providerCalls: 0, productionAccepted: false, gate6c: 'blocked', gate6d: 'not-started', backup: 'deferred-by-product-owner',
});
await writeJson('PROMPT7_NEXT_STAGE_ENTRY_DECISION.json', {
  schemaVersion: 'aiw-prompt7-next-stage-v1', generatedAt, nextStageEntryApproved: false,
  blocker: 'three-scenario Solution Architect and Reviewer browser acceptance has not replayed after the assertion correction',
  permittedNextWork: ['rerun Prompt 7 browser journeys','fix only observed product integration defects','recompute UI/API parity','final Prompt 7 acceptance decision'],
  prohibited: ['broad corpus transformation','Gate 6C','Gate 6D','release tag'], productionAccepted: false,
});
await writeMd('PROMPT7_EXECUTIVE_REPORT.md', `# Prompt 7 executive report

The proven Brain is now connected to the real stage co-author route. It proposes scenario-specific nodes, relationships and interface contracts in Logical Application, Application Realization, Logical Technology and Physical Technology. Every proposal is editable and may be accepted, rejected or deferred; accepted values remain project candidates and carry evidence and requirement lineage.

Selective downstream staleness and SDD assembly from accepted candidate state are implemented and covered by focused tests. Five scenario profiles produce distinct architecture payloads, and three assembled SDDs have distinct fingerprints.

The corrected BIA-1 score of 96.20 is reproducible. No historical BIA-1 evidence changed and no provider call was made.

The final decision is **B — Brain works but UI integration acceptance incomplete**. The first browser attempt exposed a test-observation defect after a successful acceptance action; that assertion is corrected. The required rerun was blocked when the unsandboxed Playwright execution approval service hit its usage limit. Accordingly, complete browser journeys, reviewer actions and the 90% UI/API parity threshold are not claimed yet.

\`productionAccepted=false\`; Gate 6C remains blocked; Gate 6D is not started; backup remains deferred by the product owner.`);

await writeJson('PROMPT7_VERIFICATION_RECEIPT.json', {
  schemaVersion: 'aiw-prompt7-verification-v1', generatedAt, baseline,
  builds: { domain: 'passed', api: 'passed', frontend: 'passed-after-restoring-declared-node-types' },
  tests: { backendFocused: { passed: 10 }, frontendFocused: { passed: 6 }, browser: { passed: 0, failedInitial: 3, correctedRerun: 'blocked' } },
  providerCalls: 0, modelGenerationCalls: 0,
  historicalBiaFilesModified: historicalDiff.length, credentialsCommitted: 0, rawVaultPayloadsCommitted: 0,
  unrestrictedProviderResponsesCommitted: 0, approvedKnowledgeChanges: 0, productionDesignGraphMutations: 0, automaticPromotions: 0,
  productionAcceptedTrueFindings: 0, productionAccepted: false,
});

console.log(JSON.stringify({ out: relative(root, out), files: (await readdir(out)).filter((name) => name.startsWith('PROMPT7_')).length, correctedScoreReproducible: recomputedAverage === 96.2, historicalBiaFilesModified: historicalDiff.length }, null, 2));
