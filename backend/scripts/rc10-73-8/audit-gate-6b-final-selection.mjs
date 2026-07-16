import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const evidenceRoot = resolve(root, 'release-evidence/rc10.73.8');
const candidateRoot = resolve(root, 'knowledge-repository/AKR-0.10.73.8/candidate/gate-6a/deterministic-corpus-v1');
const inputPath = resolve(evidenceRoot, 'GATE_6B_PILOT_SELECTION.json');
const outputPath = resolve(evidenceRoot, 'GATE_6B_FINAL_PILOT_SELECTION.json');
const reportPath = resolve(evidenceRoot, 'GATE_6B_FINAL_PILOT_SELECTION_QA.md');
const generatedAt = new Date().toISOString();

const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]))
    : value;

async function* ndjson(path) {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) yield JSON.parse(line);
}

const selectionInput = JSON.parse(await readFile(inputPath, 'utf8'));
const manifestIndex = JSON.parse(await readFile(resolve(root, 'release-evidence/rc10.73.7/CONTENT_SNAPSHOT_MANIFEST_INDEX.json'), 'utf8'));
const governance = JSON.parse(await readFile(resolve(root, 'release-evidence/rc10.73.7/ALL_47_REPOSITORY_GOVERNANCE_MATRIX.json'), 'utf8'));
const crossFile = JSON.parse(await readFile(resolve(root, 'release-evidence/rc10.73.7/CROSS_FILE_ARCHITECTURE_GROUPS.json'), 'utf8'));
const manifestByConnector = new Map(manifestIndex.manifests.map((item) => [item.connectorId, item]));
const authorityByConnector = new Map(governance.repositories.map((item) => [item.connectorId, item.sourceAuthorityClass]));
const groupByPath = new Map();
for (const group of crossFile.groups) for (const path of group.memberPaths) {
  const key = `${group.connectorId}\n${path}`;
  if (!groupByPath.has(key)) groupByPath.set(key, group.groupId);
}

const parsedFileCache = new Map();
let rawVaultFilesRead = 0;
let rawVaultBytesRead = 0;

async function evidenceFor(record) {
  const manifest = manifestByConnector.get(record.connectorId);
  if (!manifest || !record.path || !record.canonicalEvidenceId) return { ok: false, reason: 'snapshot-or-evidence-identity-missing' };
  const snapshotDir = dirname(resolve(root, manifest.manifestPath));
  const parserPath = resolve(snapshotDir, 'files', `${record.path}.aiw.json`);
  let parsed = parsedFileCache.get(parserPath);
  if (!parsed) {
    try {
      const text = await readFile(parserPath, 'utf8');
      rawVaultFilesRead += 1;
      rawVaultBytesRead += Buffer.byteLength(text);
      parsed = JSON.parse(text);
      parsedFileCache.set(parserPath, parsed);
    } catch {
      return { ok: false, reason: 'parser-output-not-readable' };
    }
  }
  const passage = (parsed.evidencePassages ?? []).find((item) => item.evidenceId === record.canonicalEvidenceId);
  if (!passage) return { ok: false, reason: 'bounded-passage-not-found' };
  const excerpt = String(passage.boundedExcerpt ?? '');
  const replay = sha256(excerpt);
  if (replay !== record.excerptHash || replay !== passage.excerptHash) return { ok: false, reason: 'excerpt-hash-replay-failed' };
  if (passage.connectorId !== record.connectorId || passage.repository !== record.repository || passage.path !== record.path) return { ok: false, reason: 'evidence-identity-mismatch' };
  if (passage.immutableCommitSha !== record.immutableCommit) return { ok: false, reason: 'immutable-revision-mismatch' };
  return { ok: true, excerpt, passage, parserVersion: parsed.parserVersion ?? passage.parserVersion };
}

function meaningfulWords(text) {
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[`*_#>|{}\[\]()]/g, ' ')
    .match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu)?.filter((word) => word.length > 1) ?? [];
}

function quality(text, record) {
  const words = meaningfulWords(text);
  const compact = text.replace(/\s+/g, ' ').trim();
  const heading = String(record.heading ?? '').replace(/\s+/g, ' ').trim();
  const headingOnly = Boolean(heading) && compact.toLocaleLowerCase() === heading.toLocaleLowerCase();
  const fragment = words.length <= 3;
  const placeholder = /(?:\{\{[^}]+\}\}|\b(?:todo|tbd|lorem ipsum|replace me|your text here|placeholder)\b|^<[^>]+>$)/i.test(compact);
  const verbSignal = /\b(?:is|are|must|should|shall|can|may|provides?|requires?|uses?|enables?|prevents?|reduces?|improves?|supports?|defines?|describes?|allows?|ensures?|represents?|consists?|contains?|includes?|depends?|avoids?|applies?|when|if|unless|however|but)\b/i.test(compact);
  const structuredSignal = record.artefactTypes?.some((item) => /structured-model|diagram|topology|conformance|decision/.test(item)) && words.length >= 12;
  const propositional = words.length >= 8 && (verbSignal || structuredSignal || /[.!?;:]\s/.test(compact));
  const conditionOrTradeoff = /\b(?:if|when|unless|requires?|condition|limitation|trade-?off|however|but|at the cost|depends?)\b/i.test(compact);
  const reasons = [
    ...(headingOnly ? ['heading-only'] : []),
    ...(fragment ? ['one-to-three-token-fragment'] : []),
    ...(placeholder ? ['template-or-placeholder'] : []),
    ...(!propositional ? ['insufficient-propositional-content'] : []),
  ];
  return { words: words.length, headingOnly, fragment, placeholder, propositional, conditionOrTradeoff, reasons, eligible: reasons.length === 0 };
}

function topics(record, excerpt = '') {
  const text = `${record.repository ?? ''} ${record.path ?? ''} ${record.heading ?? ''} ${excerpt}`.toLowerCase();
  const result = new Set();
  if (/agent|multi-agent|agentic|a2a|mcp/.test(text)) result.add('agentic-architecture');
  if (/observ|telemetr|metric|trace|logging|monitoring/.test(text)) result.add('observability');
  if (/secur|identity|auth|threat|trust bound|zero.?trust|credential/.test(text)) result.add('security-and-trust-boundaries');
  if (/resilien|retry|circuit|failover|chaos|recovery|availability|fault|degrad/.test(text)) result.add('resilience');
  if (/migrat|moderni|refactor|legacy|strangler|transition|target.?state/.test(text)) result.add('modernisation');
  if (/interface|api|asyncapi|event|message|contract|schema|interoperab/.test(text)) result.add('interfaces-and-data-obligations');
  if (/reference architecture|blueprint|deployment|topology|architecture template|genome/.test(text) || record.crossFileGroupId) result.add('reference-architecture-and-genome');
  if (/pattern|tactic|quality attribute|consequence|trade-?off|cause|prerequisite|obligation/.test(text)) result.add('causal-pattern-dna');
  if (record.contradictionEvidenceEstimate || record.slot?.includes('contradiction')) result.add('contradiction');
  return [...result].sort();
}

function auditedRecord(record, evidence, mode = 'existing-selection') {
  if (record.isEvidenceAbsenceControl) return {
    ...record,
    auditMode: mode,
    auditedDisposition: 'source-gap-abstention-control',
    modelInputEligible: false,
    excerptHashReplay: null,
    meaningfulTokenCount: 0,
    qualityReasons: ['missing-governed-evidence'],
    auditedTopics: ['abstention-and-missing-evidence'],
  };
  if (!evidence.ok) return {
    ...record,
    auditMode: mode,
    auditedDisposition: 'insufficient-evidence-control',
    modelInputEligible: false,
    excerptHashReplay: false,
    meaningfulTokenCount: 0,
    qualityReasons: [evidence.reason],
    auditedTopics: topics(record),
  };
  const check = quality(evidence.excerpt, record);
  const intendedNegative = record.slot === 'deliberate-non-claim';
  return {
    ...record,
    auditMode: mode,
    originalSlot: record.slot,
    auditedDisposition: check.eligible
      ? intendedNegative ? 'meaningful-non-claim-control' : 'meaningful-model-input'
      : intendedNegative ? 'non-claim-control' : 'insufficient-evidence-control',
    modelInputEligible: check.eligible,
    excerptHashReplay: true,
    meaningfulTokenCount: check.words,
    qualityReasons: check.reasons,
    hasConditionLimitationOrTradeoffSignal: check.conditionOrTradeoff,
    parserRequirementSatisfied: true,
    auditedTopics: topics(record, evidence.excerpt),
  };
}

const finalRecords = [];
for (const record of selectionInput.selection) finalRecords.push(auditedRecord(record, await evidenceFor(record)));

const selectedSemanticIds = new Set(finalRecords.filter((item) => !item.isEvidenceAbsenceControl).map((item) => item.semanticUnitId));
const targets = {
  modernisation: 5,
  resilience: 5,
  observability: 5,
  'agentic-architecture': 5,
  'security-and-trust-boundaries': 8,
  'interfaces-and-data-obligations': 8,
  'reference-architecture-and-genome': 8,
  'causal-pattern-dna': 8,
  contradiction: 6,
  'abstention-and-missing-evidence': 12,
};

function coverage(records) {
  const output = Object.fromEntries(Object.keys(targets).map((key) => [key, 0]));
  for (const record of records) {
    if (record.modelInputEligible || record.auditedDisposition === 'source-gap-abstention-control') {
      for (const topic of record.auditedTopics ?? []) if (topic in output) output[topic] += 1;
    }
  }
  return output;
}

let currentCoverage = coverage(finalRecords);
const missingTopics = () => Object.entries(targets).filter(([topic, target]) => (currentCoverage[topic] ?? 0) < target).map(([topic]) => topic);
const retained = new Map(Object.keys(targets).map((topic) => [topic, []]));

function metadataTopics(item) { return topics({ ...item, crossFileGroupId: groupByPath.get(`${item.connectorId}\n${item.path}`) ?? null }); }
function retainCandidate(topic, item) {
  const pool = retained.get(topic);
  if (!pool || selectedSemanticIds.has(item.semanticUnitId)) return;
  pool.push(item);
  if (pool.length > 80) pool.sort((a, b) => Number(b.contradictionEvidenceEstimate) - Number(a.contradictionEvidenceEstimate) || Math.min(b.tokenCount, 800) - Math.min(a.tokenCount, 800) || a.evidenceId.localeCompare(b.evidenceId)).splice(80);
}

if (missingTopics().some((topic) => topic !== 'abstention-and-missing-evidence')) {
  const shardNames = (await readdir(candidateRoot)).filter((name) => /^passage-dispositions-[0-9a-f]{2}\.ndjson$/.test(name)).sort();
  for (const name of shardNames) for await (const item of ndjson(resolve(candidateRoot, name))) {
    if (selectedSemanticIds.has(item.semanticUnitId)) continue;
    if (['boilerplate','generated-content','non-architectural','specialist-parser-required'].includes(item.semanticDisposition)) continue;
    if ((item.tokenCount ?? 0) < 20) continue;
    for (const topic of metadataTopics(item)) if (topic !== 'abstention-and-missing-evidence') retainCandidate(topic, item);
  }
}

for (const topic of Object.keys(targets)) {
  if (topic === 'abstention-and-missing-evidence') continue;
  const pool = (retained.get(topic) ?? []).sort((a, b) => Number(b.contradictionEvidenceEstimate) - Number(a.contradictionEvidenceEstimate) || Math.min(b.tokenCount, 800) - Math.min(a.tokenCount, 800) || a.evidenceId.localeCompare(b.evidenceId));
  for (const item of pool) {
    if ((currentCoverage[topic] ?? 0) >= targets[topic] || finalRecords.length >= 220) break;
    if (selectedSemanticIds.has(item.semanticUnitId)) continue;
    const crossFileGroupId = groupByPath.get(`${item.connectorId}\n${item.path}`) ?? null;
    const record = {
      slot: 'supplementary-final-quality-coverage', connectorId: item.connectorId, repository: item.repository,
      sourceAuthorityClass: authorityByConnector.get(item.connectorId), semanticUnitId: item.semanticUnitId,
      canonicalEvidenceId: item.evidenceId, immutableCommit: item.immutableCommit, path: item.path,
      heading: item.heading, structuralRange: item.structuralRange, excerptHash: item.excerptHash,
      parserVersion: item.parserVersion, tokenCount: item.tokenCount, occurrenceCount: 1,
      deterministicDisposition: item.semanticDisposition, expectedOutcome: 'candidate-non-claim-or-evidence-bounded-abstention',
      independentReviewStatus: 'not-independently-reviewed', theme: topic,
      artefactTypes: crossFileGroupId ? ['cross-file-architecture-evidence'] : ['bounded-prose-or-structured-evidence'],
      crossFileGroupId, complexityReasons: [...(item.contradictionEvidenceEstimate ? ['contradiction-signal'] : []), ...(crossFileGroupId ? ['cross-file-architecture-group'] : [])],
      contradictionEvidenceEstimate: Boolean(item.contradictionEvidenceEstimate),
    };
    const audited = auditedRecord(record, await evidenceFor(record), 'supplementary-quality-coverage');
    if (!audited.modelInputEligible || !(audited.auditedTopics ?? []).includes(topic)) continue;
    finalRecords.push(audited);
    selectedSemanticIds.add(item.semanticUnitId);
    currentCoverage = coverage(finalRecords);
  }
}

const modelInputs = finalRecords.filter((item) => item.modelInputEligible);
const controls = finalRecords.filter((item) => !item.modelInputEligible);
const qualityDemotions = finalRecords.filter((item) => item.auditMode === 'existing-selection' && !item.isEvidenceAbsenceControl && !item.modelInputEligible);
const shortfalls = Object.fromEntries(Object.entries(targets).filter(([topic, target]) => (currentCoverage[topic] ?? 0) < target).map(([topic, target]) => [topic, { target, actual: currentCoverage[topic] ?? 0 }]));
const smokeCandidates = modelInputs.filter((item) => item.meaningfulTokenCount >= 40 && item.meaningfulTokenCount <= 500
  && item.hasConditionLimitationOrTradeoffSignal
  && item.auditedDisposition === 'meaningful-model-input'
  && !/required|specialist|opaque/i.test(String(item.parserVersion ?? ''))
  && /\.(?:md|markdown|adoc|asciidoc|rst)$/i.test(String(item.path ?? ''))
  && !/sample|example|quick start|getting started|contribut|licen[cs]e|acknowledg/i.test(String(item.heading ?? ''))
  && ['reviewed-practitioner-or-implementation-source','architecture-conformance-implementation','official-reference-architecture'].includes(item.sourceAuthorityClass)
  && !/bank|payment|regulat|legal|financial|compliance/i.test(`${item.repository} ${item.path} ${item.heading ?? ''}`)
  && !item.qualityReasons.length);
const smokeCandidate = smokeCandidates.sort((a, b) => Number(Boolean(b.complexityReasons?.length)) - Number(Boolean(a.complexityReasons?.length)) || Math.abs(a.meaningfulTokenCount - 180) - Math.abs(b.meaningfulTokenCount - 180) || a.semanticUnitId.localeCompare(b.semanticUnitId))[0] ?? null;
if (!smokeCandidate) throw new Error('GATE_6B_NO_MEANINGFUL_SMOKE_CANDIDATE');

const fingerprintBasis = finalRecords.map(({ auditMode, auditedDisposition, auditedTopics, canonicalEvidenceId, connectorId, excerptHash, modelInputEligible, semanticUnitId, slot }) => ({ auditMode, auditedDisposition, auditedTopics, canonicalEvidenceId, connectorId, excerptHash, modelInputEligible, semanticUnitId, slot }));
const selectionFingerprint = sha256(JSON.stringify(stable(fingerprintBasis)));
const result = {
  schemaVersion: 'aiw-gate-6b-final-pilot-selection-v1', generatedAt, productionAccepted: false,
  authority: 'candidate', executionStatus: 'not-started', sourceSelectionFingerprint: selectionInput.selectionFingerprint,
  selectionFingerprint, maximumSemanticUnits: 220, selectionRecords: finalRecords.length,
  modelInputUnits: modelInputs.length, controlRecords: controls.length, repositoriesVisible: new Set(finalRecords.map((item) => item.connectorId)).size,
  qualityDemotions: qualityDemotions.length, supplementaryQualityUnits: finalRecords.filter((item) => item.auditMode === 'supplementary-quality-coverage').length,
  excerptHashReplayFailures: finalRecords.filter((item) => item.excerptHashReplay === false).length,
  coverageTargets: targets, meaningfulCoverage: currentCoverage, coverageShortfalls: shortfalls,
  rawVaultAuditReads: { files: rawVaultFilesRead, bytes: rawVaultBytesRead, mode: 'bounded-selected-evidence-and-candidate-QA-only' },
  networkCalls: 0, modelCalls: 0, semanticTransformations: 0, designGraphMutations: 0, automaticPromotions: 0,
  smokeCandidate: {
    semanticUnitId: smokeCandidate.semanticUnitId, evidenceId: smokeCandidate.canonicalEvidenceId,
    connectorId: smokeCandidate.connectorId, repository: smokeCandidate.repository, immutableCommit: smokeCandidate.immutableCommit,
    path: smokeCandidate.path, heading: smokeCandidate.heading, structuralRange: smokeCandidate.structuralRange,
    excerptHash: smokeCandidate.excerptHash, parserVersion: smokeCandidate.parserVersion,
    sourceAuthorityClass: smokeCandidate.sourceAuthorityClass, meaningfulTokenCount: smokeCandidate.meaningfulTokenCount,
    auditedTopics: smokeCandidate.auditedTopics,
  },
  records: finalRecords,
};

await mkdir(evidenceRoot, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
const coverageRows = Object.entries(targets).map(([topic, target]) => `| ${topic} | ${target} | ${currentCoverage[topic] ?? 0} | ${(currentCoverage[topic] ?? 0) >= target ? 'met' : 'shortfall'} |`).join('\n');
const demotionRows = qualityDemotions.slice(0, 40).map((item) => `| ${item.connectorId} | ${item.semanticUnitId} | ${item.originalSlot ?? item.slot} | ${item.auditedDisposition} | ${(item.qualityReasons ?? []).join(', ')} |`).join('\n') || '| None | n/a | n/a | n/a | n/a |';
const report = `# Gate 6B Final Pilot Selection Quality Audit

Generated: ${generatedAt}

Status: **deterministic QA complete; pilot not started**. Production accepted: **false**.

## Outcome

- Final selection records: ${finalRecords.length} / 220 maximum
- Meaningful model-input units: ${modelInputs.length}
- Non-model controls and abstentions: ${controls.length}
- Existing cases demoted by content QA: ${qualityDemotions.length}
- Supplementary meaningful coverage units: ${finalRecords.filter((item) => item.auditMode === 'supplementary-quality-coverage').length}
- Repositories kept visible: ${new Set(finalRecords.map((item) => item.connectorId)).size} / 47
- Excerpt-hash replay failures: ${result.excerptHashReplayFailures}
- Network calls: 0
- Model calls: 0
- Selection fingerprint: \`${selectionFingerprint}\`

Repository quotas were not used to manufacture model inputs. Heading-only, placeholder, one-to-three-token, label-only, non-propositional, missing-parser and hash-invalid cases are retained as controls or abstentions and are excluded from model execution.

## Meaningful coverage

| Topic | Target | Actual | Result |
|---|---:|---:|---|
${coverageRows}

## Reclassified existing cases

| Connector | Semantic unit | Original slot | Audited disposition | Reason |
|---|---|---|---|---|
${demotionRows}

The gold set remains provisional and has not been independently reviewed. Candidate authority, individual provenance, source-gap controls and exact source-occurrence mappings are preserved.
`;
await writeFile(reportPath, report);
process.stdout.write(`${JSON.stringify({ selectionRecords: finalRecords.length, modelInputUnits: modelInputs.length, controls: controls.length, demotions: qualityDemotions.length, supplementary: result.supplementaryQualityUnits, repositoriesVisible: result.repositoriesVisible, hashReplayFailures: result.excerptHashReplayFailures, meaningfulCoverage: currentCoverage, coverageShortfalls: shortfalls, selectionFingerprint, smokeCandidate: result.smokeCandidate, networkCalls: 0, modelCalls: 0, productionAccepted: false }, null, 2)}\n`);
