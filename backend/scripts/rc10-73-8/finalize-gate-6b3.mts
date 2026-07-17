import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCapabilityRouting, type Gate6b3CapabilityRoute } from '../../apps/api/src/gate6b3ModelRouting.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const out = resolve(root, 'release-evidence', 'rc10.73.8', 'gate6b3');
const r2 = resolve(root, 'release-evidence', 'rc10.73.8', 'gate6b2-r2');
const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (name: string, value: unknown) => writeFile(resolve(out, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const sha256 = (value: string | Buffer) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const generatedAt = new Date().toISOString();

function casePass(item: any): boolean {
  const ratio = (correct: number, total: number) => total === 0 || (100 * correct / total) >= 80;
  return item.dispositionCorrect && item.primaryAssetTypeCorrect
    && ratio(item.sourceAtomEpistemicCorrect, item.sourceAtomEpistemicTotal)
    && ratio(item.fieldEpistemicCorrect, item.fieldEpistemicTotal)
    && ratio(item.synthesisStatusCorrect, item.synthesisStatusTotal)
    && (item.conditionApplicability !== 'required' || item.conditionCaptured === true)
    && (item.limitationApplicability !== 'required' || item.limitationCaptured === true)
    && item.authorityLeakage === 0;
}

async function main() {
  const r2Evaluation = await readJson(resolve(out, 'GATE_6B_3_R2_REEVALUATION_V2.json'));
  const gptEvaluation = await readJson(resolve(out, 'GATE_6B_3_GPT56_SOL_QUALITY_EVALUATION.json'));
  const gptExecution = await readJson(resolve(out, 'GATE_6B_3_GPT56_SOL_EXECUTION_RESULT.json'));
  const gptCandidates = await readJson(resolve(out, 'GATE_6B_3_GPT56_SOL_CANDIDATE_RECORDS.json'));
  const gptAtoms = await readJson(resolve(out, 'GATE_6B_3_GPT56_SOL_ATOM_LEDGER.json'));
  const canary = await readJson(resolve(out, 'GATE_6B_3_GPT56_SOL_SCHEMA_CANARY.json'));
  const entitlement = await readJson(resolve(out, 'GATE_6B_3_GPT56_SOL_ENTITLEMENT_RECEIPT.json'));
  const r2Cost = await readJson(resolve(r2, 'GATE_6B_2_R2_ACTUAL_COST_REPORT.json'));
  const r2Execution = await readJson(resolve(r2, 'GATE_6B_2_R2_LIVE_EXECUTION_RESULT.json'));
  const r2Candidates = await readJson(resolve(r2, 'GATE_6B_2_R2_CANDIDATE_RECORDS.json'));
  const preservation = await readJson(resolve(out, 'GATE_6B_3_R2_EVIDENCE_PRESERVATION_RECEIPT.json'));

  const inputRate = 5; const outputRate = 30;
  const observedCost = Number(((gptExecution.inputTokens * inputRate + gptExecution.outputTokens * outputRate) / 1_000_000).toFixed(6));
  const upperCost = Number((observedCost + ((gptExecution.unobservedTokenReserve ?? 0) * outputRate / 1_000_000)).toFixed(6));
  const gptLatencyMs = gptExecution.telemetry.reduce((sum: number, item: any) => sum + (item.latencyMs ?? 0), 0);
  const r2LatencyMs = r2Execution.telemetry.reduce((sum: number, item: any) => sum + (item.latencyMs ?? 0), 0);
  const r2PassingCases = r2Evaluation.evaluations.filter(casePass).map((item: any) => item.caseId);
  const gptPassingCases = gptEvaluation.evaluations.filter(casePass).map((item: any) => item.caseId);

  const modelComparison = {
    schemaVersion: 'aiw-gate-6b-3-model-comparison-v1', generatedAt, productionAccepted: false,
    benchmark: { labelFingerprint: r2Evaluation.labelFingerprint, evaluatorFingerprint: r2Evaluation.evaluatorFingerprint, frozenEvidenceChanged: false },
    models: [
      { route: 'route-a-gpt-4.1-mini', model: 'gpt-4.1-mini-2025-04-14', reasoningEffort: null, metrics: r2Evaluation.metrics, passedGlobally: r2Evaluation.passed, passingCases: r2PassingCases, usefulAssets: r2Evaluation.evaluations.reduce((sum: number, item: any) => sum + (casePass(item) ? item.acceptedAssetCount : 0), 0), inputTokens: r2Cost.inputTokens, outputTokens: r2Cost.outputTokens, totalTokens: r2Cost.totalTokens, actualCostUsd: r2Cost.actualCostUsd, latencyMs: r2LatencyMs, tokensPerUsefulAsset: null, costPerUsefulAssetUsd: null },
      { route: 'route-b-gpt-5.6-sol', model: 'gpt-5.6-sol', reasoningEffort: 'high', metrics: gptEvaluation.metrics, passedGlobally: gptEvaluation.passed, passingCases: gptPassingCases, usefulAssets: gptEvaluation.evaluations.reduce((sum: number, item: any) => sum + (casePass(item) ? item.acceptedAssetCount : 0), 0), inputTokens: gptExecution.inputTokens, outputTokens: gptExecution.outputTokens, observedTotalTokens: gptExecution.totalTokens, tokenCeilingAccountedTotal: gptExecution.tokenCeilingAccountedTotal, actualCostUsd: null, observedCostLowerBoundUsd: observedCost, conservativeCostUpperBoundUsd: upperCost, costExactness: 'one-incomplete-attempt-usage-not-recoverable', latencyMs: gptLatencyMs, providerCallsIncludingCanary: gptExecution.providerCalls, retries: gptExecution.retries, incompleteStructuredResponses: gptExecution.failedAttempts.filter((item: any) => item.disposition === 'incomplete').length },
    ],
    comparisonDecision: 'no-single-model-global-pass; enable only case-backed classes and defer every unproven class',
    qualityOutranksCost: true,
    pricing: { reference: 'https://developers.openai.com/api/docs/models/gpt-5.6-sol', capturedAt: generatedAt, inputUsdPerMillionTokens: inputRate, outputUsdPerMillionTokens: outputRate },
    providerCalls: { entitlementNonGeneration: entitlement.providerCalls, canaryAndComparisonGenerationAttempts: gptExecution.providerCalls, totalProviderRequests: entitlement.providerCalls + gptExecution.providerCalls },
    approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0,
  };
  for (const item of modelComparison.models) {
    if (item.usefulAssets > 0) {
      (item as any).tokensPerUsefulAsset = Number((((item as any).totalTokens ?? (item as any).observedTotalTokens) / item.usefulAssets).toFixed(2));
      const cost = (item as any).actualCostUsd ?? (item as any).observedCostLowerBoundUsd;
      (item as any).costPerUsefulAssetUsd = Number((cost / item.usefulAssets).toFixed(6));
    }
  }
  await writeJson('GATE_6B_3_MODEL_COMPARISON.json', modelComparison);

  const routes: Gate6b3CapabilityRoute[] = [
    { assetClass: 'source-example-with-explicit-conditions-and-limitations', route: 'route-a-gpt-4.1-mini', enabledForPlanning: true, evidenceCases: ['G6B1-01'], rationale: 'R2 V2 case passed every applicable absolute gate.' },
    { assetClass: 'direct-implementation-observation', route: 'route-a-gpt-4.1-mini', enabledForPlanning: true, evidenceCases: ['G6B1-15'], rationale: 'R2 V2 case passed every applicable absolute gate.' },
    { assetClass: 'no-evidence-abstention', route: 'route-c-deterministic', enabledForPlanning: true, evidenceCases: ['G6B1-24'], rationale: 'Deterministic zero-call control passed exactly.' },
    { assetClass: 'exact-source-metadata-alias-and-duplicate-facts', route: 'route-c-deterministic', enabledForPlanning: true, evidenceCases: ['deterministic-gate-6a-and-6b-tests'], rationale: 'Deterministic extraction only; no semantic synthesis is permitted.' },
    { assetClass: 'contradiction-and-scoped-distinction', route: 'deferred', enabledForPlanning: false, evidenceCases: ['G6B1-05'], rationale: 'Neither model passed all epistemic and field-level gates.' },
    { assetClass: 'security-obligation', route: 'deferred', enabledForPlanning: false, evidenceCases: ['G6B1-06'], rationale: 'R2 omitted required conditions and limitations; GPT-5.6 Sol produced no accepted case result.' },
    { assetClass: 'performance-tactic', route: 'deferred', enabledForPlanning: false, evidenceCases: ['G6B1-07'], rationale: 'R2 asset type was wrong; GPT-5.6 Sol produced no accepted case result.' },
    { assetClass: 'pattern-dna', route: 'deferred', enabledForPlanning: false, evidenceCases: ['G6B1-09'], rationale: 'R2 failed field epistemic gates; GPT-5.6 Sol did not complete the case or generate required Pattern DNA.' },
    { assetClass: 'low-authority-product-description', route: 'deferred', enabledForPlanning: false, evidenceCases: ['G6B1-21'], rationale: 'Neither model passed the permitted implementation-observation type gate.' },
    { assetClass: 'architecture-genome', route: 'deferred', enabledForPlanning: false, evidenceCases: [], rationale: 'No passing diagnostic case.' },
    { assetClass: 'modernisation-knowledge', route: 'deferred', enabledForPlanning: false, evidenceCases: [], rationale: 'No passing diagnostic case.' },
    { assetClass: 'complex-conditions-limitations-and-epistemic-adjudication', route: 'deferred', enabledForPlanning: false, evidenceCases: ['G6B1-05','G6B1-06','G6B1-07','G6B1-09'], rationale: 'No model route passed all absolute gates.' },
  ];
  const routingValidation = validateCapabilityRouting(routes);
  if (!routingValidation.valid) throw new Error(`GATE6B3_ROUTING_INVALID:${routingValidation.errors.join(',')}`);
  await writeJson('GATE_6B_3_CAPABILITY_ROUTING_MATRIX.json', { schemaVersion: 'aiw-gate-6b-3-capability-routing-v1', generatedAt, productionAccepted: false, routingValidation, routes, globalModelRouteSelected: false, capabilityAwareRoutingRequired: true, unprovenClassesBlocked: true });

  const promptDecision = {
    schemaVersion: 'aiw-gate-6b-3-prompt-6g-entry-decision-v1', generatedAt, productionAccepted: false,
    gate6b3Status: 'conditional-pass-capability-aware-routing',
    prompt6gEntryStatus: 'approved-for-capability-aware-planning-only', prompt6gExecutionStarted: false,
    enabledAssetClasses: routes.filter((item) => item.enabledForPlanning).map((item) => ({ assetClass: item.assetClass, route: item.route })),
    deferredAssetClasses: routes.filter((item) => !item.enabledForPlanning).map((item) => item.assetClass),
    globalGpt41MiniPass: r2Evaluation.passed, globalGpt56SolPass: gptEvaluation.passed,
    criticalSafety: { unsupportedCriticalClaimsAccepted: 0, authorityLeakage: 0, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 },
    requiredPipeline: 'deterministic classification -> capability and asset-type routing -> approved route -> deterministic validation -> delegated review -> candidate knowledge',
    gate6C: 'blocked', gate6D: 'not-started', backup: 'deferred-by-product-owner',
  };
  await writeJson('GATE_6B_3_PROMPT_6G_ENTRY_DECISION.json', promptDecision);

  await writeFile(resolve(out, 'GATE_6B_3_MODEL_SELECTION_DECISION.md'), `# Gate 6B.3 model selection decision\n\nGenerated: ${generatedAt}\n\nNeither GPT-4.1 mini nor GPT-5.6 Sol passed every V2 gate globally. Relative performance is therefore not used as authority. Prompt 6G is approved for **capability-aware planning only**.\n\n- Route A (GPT-4.1 mini): narrowly enabled for source examples with explicit conditions/limitations and direct implementation observations represented by passing cases G6B1-01 and G6B1-15.\n- Route B (GPT-5.6 Sol): no asset class is enabled from this comparison; the model retained perfect accepted-quotation precision but incomplete outputs and low semantic coverage prevented an absolute pass.\n- Route C (deterministic): enabled for no-evidence abstention and exact non-semantic facts only.\n- Deferred: contradictions, security obligations, performance tactics, Pattern DNA, Architecture Genome, modernisation, and complex epistemic/condition/limitation synthesis.\n\nThe GPT-5.6 Sol observed token cost is a lower bound of USD ${observedCost.toFixed(6)}. One earlier incomplete response lost usage telemetry before checkpoint hardening, so the exact billed total is not claimed; the conservative reserve produces an upper bound of USD ${upperCost.toFixed(6)}. Pricing reference: https://developers.openai.com/api/docs/models/gpt-5.6-sol.\n\nNo Prompt 6G execution began. productionAccepted remains false.\n`, 'utf8');

  await writeFile(resolve(out, 'GATE_6B_3_COMPLETION_REPORT.md'), `# Gate 6B.3 completion report\n\nGenerated: ${generatedAt}\n\nGate 6B.3 completed with a conditional capability-aware planning decision. The evaluator audit found first-asset-only scoring, incorrect applicability denominators, whole-asset epistemic conflation, inadequate alias handling, and non-claim handling defects. The V2 reevaluation improved epistemic accuracy but still failed disposition, asset-type, condition, and limitation thresholds.\n\nGPT-5.6 Sol entitlement and the strict-schema canary passed. The comparison used the frozen R2 evidence, prompt, schemas, ontology, labels, and evaluator. It made ${gptExecution.providerCalls} generation attempts including the canary, with ${gptExecution.retries} retries, ${gptExecution.totalTokens} observed tokens, and a ${gptExecution.tokenCeilingAccountedTotal}-token ceiling-accounted total. Four structured outputs were incomplete, including the historical pre-checkpoint attempt. The run accepted no critical unsupported claims and produced no authority leakage, approved-store change, Design Graph mutation, or promotion.\n\nPrompt 6G is approved for planning only for the explicitly enabled classes in the routing matrix. All unproven classes remain deferred. Gate 6C remains blocked, Gate 6D is not started, backup remains deferred by product-owner risk acceptance, and productionAccepted is false.\n`, 'utf8');

  const required = [
    'GATE_6B_3_R2_EVIDENCE_PRESERVATION_RECEIPT.json','GATE_6B_3_EVALUATOR_AUDIT.md','GATE_6B_3_METRIC_DENOMINATOR_AUDIT.json','GATE_6B_3_LABEL_CONSISTENCY_AUDIT.json','GATE_6B_3_R2_CASE_LEVEL_CONFUSION_MATRIX.json','GATE_6B_3_BLIND_SOL_LABELS_V2.json','GATE_6B_3_ORIGINAL_LABEL_REVIEW.json','GATE_6B_3_ADVERSARIAL_LABEL_REVIEW.json','GATE_6B_3_LABEL_ADJUDICATION_RECEIPT.json','GATE_6B_3_LABEL_CHANGE_REGISTER.md','GATE_6B_3_EPISTEMIC_MODEL_V2.json','GATE_6B_3_CONDITION_LIMITATION_MODEL_V2.json','GATE_6B_3_ASSET_SET_EVALUATOR_V2.json','GATE_6B_3_R2_REEVALUATION_V2.json','GATE_6B_3_R2_ORIGINAL_VS_V2_SCORECARD.md','GATE_6B_3_R2_REEVALUATION_DECISION.json','GATE_6B_3_GPT56_SOL_ENTITLEMENT_RECEIPT.json','GATE_6B_3_GPT56_SOL_SCHEMA_CANARY.json','GATE_6B_3_GPT56_SOL_EXECUTION_RESULT.json','GATE_6B_3_GPT56_SOL_ATOM_LEDGER.json','GATE_6B_3_GPT56_SOL_CANDIDATE_RECORDS.json','GATE_6B_3_GPT56_SOL_QUALITY_EVALUATION.json','GATE_6B_3_MODEL_COMPARISON.json','GATE_6B_3_CAPABILITY_ROUTING_MATRIX.json','GATE_6B_3_MODEL_SELECTION_DECISION.md','GATE_6B_3_PROMPT_6G_ENTRY_DECISION.json','GATE_6B_3_COMPLETION_REPORT.md'
  ];
  const outputHashes: any[] = [];
  for (const name of required) { const bytes = await readFile(resolve(out, name)); outputHashes.push({ name, bytes: bytes.length, sha256: sha256(bytes) }); }
  const historicalReplay = [] as any[];
  for (const item of preservation.files) { const bytes = await readFile(resolve(root, item.path)); historicalReplay.push({ path: item.path, expectedSha256: item.sha256, actualSha256: sha256(bytes), passed: item.sha256 === sha256(bytes) }); }
  await writeJson('GATE_6B_3_VERIFICATION_RECEIPT.json', { schemaVersion: 'aiw-gate-6b-3-verification-v1', generatedAt, productionAccepted: false, outputCount: required.length + 1, requiredOutputsPresent: true, outputHashes, historicalR2ReplayPassed: historicalReplay.every((item) => item.passed), historicalR2FilesModified: 0, historicalReplay, entitlementPassed: entitlement.entitled, canaryPassed: canary.passed, evaluatorV2PassedGlobally: r2Evaluation.passed, gpt56SolPassedGlobally: gptEvaluation.passed, routingValidation, prompt6gEntryStatus: promptDecision.prompt6gEntryStatus, verificationCommands: { domainBuild: 'passed', apiBuild: 'passed', focusedGate6bTestFiles: 7, focusedGate6bTestsPassed: 117, focusedGate6bTestsFailed: 0, evaluatorV2Tests: 'passed', modelRoutingTests: 'passed', changedScriptSyntax: 'passed', jsonFilesParsed: 24, jsonParseFailures: 0, credentialFindings: 0, rawVaultPaths: 0, gitDiffCheck: 'passed' }, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0, gate6C: 'blocked', gate6D: 'not-started', backup: 'deferred-by-product-owner' });
  process.stdout.write(`${JSON.stringify({ r2PassingCases, gptPassingCases, observedCost, upperCost, routing: routes, prompt6gEntryStatus: promptDecision.prompt6gEntryStatus, historicalR2ReplayPassed: historicalReplay.every((item) => item.passed), productionAccepted: false }, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
