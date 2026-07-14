import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '../..');
const root = resolve(backend, '..');
const frontend = resolve(root, 'frontend');
const read = (path) => readFileSync(path, 'utf8');
const checks = [];
function check(id, passed, detail) {
  checks.push({ id, passed: Boolean(passed), detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${id}: ${detail}`);
}

const groundingPath = resolve(backend, 'apps/api/src/approvedKnowledgeGrounding.ts');
const redactionPath = resolve(backend, 'apps/api/src/dataRedaction.ts');
const schemaPath = resolve(backend, 'apps/api/src/jsonSchemaValidation.ts');
const gatewayPath = resolve(backend, 'apps/api/src/llmGateway.ts');
const doctrinePath = resolve(backend, 'apps/api/src/llmDoctrine.ts');
const coArchitectPath = resolve(backend, 'apps/api/src/coArchitect.ts');
const stagePath = resolve(backend, 'apps/api/src/designAssist.ts');
const auditPath = resolve(backend, 'apps/api/src/aiAudit.ts');
const promotionPath = resolve(backend, 'apps/api/src/knowledgePromotion.ts');
const authorityPath = resolve(backend, 'packages/intelligence/src/orchestrator/index.ts');
const frontendAuthorityPath = resolve(frontend, 'packages/intelligence/src/orchestrator/index.ts');

const grounding = existsSync(groundingPath) ? read(groundingPath) : '';
const redaction = existsSync(redactionPath) ? read(redactionPath) : '';
const schema = existsSync(schemaPath) ? read(schemaPath) : '';
const gateway = existsSync(gatewayPath) ? read(gatewayPath) : '';
const doctrine = existsSync(doctrinePath) ? read(doctrinePath) : '';
const coArchitect = existsSync(coArchitectPath) ? read(coArchitectPath) : '';
const stage = existsSync(stagePath) ? read(stagePath) : '';
const audit = existsSync(auditPath) ? read(auditPath) : '';
const promotion = existsSync(promotionPath) ? read(promotionPath) : '';
const authority = read(authorityPath);
const frontendAuthority = read(frontendAuthorityPath);
const backendPackage = JSON.parse(read(resolve(backend, 'package.json')));
const frontendPackage = JSON.parse(read(resolve(frontend, 'package.json')));
const manifest = JSON.parse(read(resolve(root, 'RELEASE_MANIFEST.json')));
const capability = JSON.parse(read(resolve(root, 'CAPABILITY_STATE.json')));

check('approved-grounding-contract', grounding.includes('ApprovedKnowledgeGroundingPack') && grounding.includes('ApprovedGroundingSource'), 'Claim-bearing approved grounding contracts exist');
check('pattern-and-claim-assembly', grounding.includes('sprint78PatternCorpus') && grounding.includes('patternAtomicClaimReceipts') && grounding.includes('knowledgeRepositoryConnectors'), 'Grounding is assembled from governed records, atomic claim receipts and source connectors');
check('actual-statement-grounding', grounding.includes('statement:') && grounding.includes('sourceFingerprint') && grounding.includes('trustTier'), 'Grounding carries actual statements, source fingerprint and trust posture');
check('grounding-exclusions', grounding.includes('excluded') && grounding.includes('absent from the approved Pattern DNA corpus or is not approved'), 'Missing or ineligible records produce explicit exclusion receipts');
check('evidence-entailment', grounding.includes('verifyEvidenceEntailment') && grounding.includes('unsupportedReferenceIds') && grounding.includes('supportScore'), 'Deterministic evidence entailment returns auditable support scores and unsupported references');
check('specificity-guards', grounding.includes('containsUnsupportedAbsolute') && grounding.includes('containsUnsupportedNumber'), 'Unsupported absolute and numeric-specific claims are guarded');
check('runtime-json-schema', schema.includes('validateJsonSchema') && schema.includes('additionalProperties') && schema.includes('oneOf') && schema.includes('anyOf'), 'Runtime validator supports strict structured-output constraints');
check('provider-post-validation', gateway.includes('validateJsonSchema(value, request.jsonSchema)') && gateway.includes('LLM_RESPONSE_SCHEMA_INVALID'), 'Provider output is post-validated by AIW');
check('schema-required', gateway.includes('LLM_JSON_SCHEMA_REQUIRED') && gateway.includes('requireStructuredOutput'), 'Structured cognitive calls require an explicit JSON schema');
check('insufficient-grounding-shape', gateway.includes('insufficientGroundingSchema') && gateway.includes("required: ['insufficientGrounding', 'missing']"), 'Explicit insufficient-grounding output is schema compatible');
check('citation-allowlist', gateway.includes('LLM_CITATION_OUTSIDE_ALLOWLIST') && gateway.includes('allowedReferenceIds'), 'Citations are constrained to the supplied allowlist');
check('gateway-entailment', gateway.includes('verifyEvidenceEntailment') && gateway.includes('LLM_EVIDENCE_ENTAILMENT_FAILED'), 'Gateway rejects cited output that fails deterministic support verification');
check('data-redaction-contract', redaction.includes('redactForModel') && redaction.includes('private-key') && redaction.includes('financial-identifier'), 'Secrets, credentials, PII and financial identifiers are covered');
check('redaction-before-provider', gateway.includes('redactForModel(request.system') && gateway.includes('redactForModel(request.user') && gateway.includes('redactedRequest'), 'Prompts are redacted before provider invocation');
check('redaction-receipt', gateway.includes('redaction: { system: systemRedaction, user: userRedaction }') && redaction.includes('fingerprint: fingerprint(match)'), 'Non-sensitive redaction receipts are returned');
check('coarchitect-claim-grounding', coArchitect.includes('buildApprovedKnowledgeGroundingPack') && coArchitect.includes('approvedKnowledgeGrounding') && coArchitect.includes('groundingSources'), 'Co-Architect receives approved claims and project evidence');
check('coarchitect-strict-schema', coArchitect.includes('jsonSchema:') && coArchitect.includes('grounding:'), 'Co-Architect call is strict-schema and citation-grounded');
check('stage-advisor-grounding', stage.includes('buildApprovedKnowledgeGroundingPack') && stage.includes('approvedClaimGrounding') && stage.includes('allowedReferenceIds: bundle.grounding.ids'), 'Stage Advisor receives claims while retaining record-level citation compatibility');
check('style-explanation-schema', stage.includes('schemaName: prompt.schemaName') && stage.includes('additionalProperties: false'), 'Style explanation uses a strict schema');
check('architecture-audit-grounding', audit.includes('buildApprovedKnowledgeGroundingPack') && audit.includes('approvedClaimGrounding') && audit.includes('grounding:'), 'Architecture Audit is claim-bearing and grounded');
check('knowledge-promotion-schema', promotion.includes('jsonSchema:') && promotion.includes('additionalProperties: false'), 'Knowledge candidate drafting is runtime-schema constrained');
check('doctrine-version', doctrine.includes("doctrine-1.1.0-rc10.73.4") && doctrine.includes('post-validates') && doctrine.includes('redacted'), 'Cognitive doctrine names post-validation, approved grounding and redaction');
check('authority-contract-version', authority.includes('1.6.0-rc10.73.4') && authority.includes('0.10.0-rc.10.73.5'), 'Architecture Brain authority contract is versioned for rc.10.73.4');
check('authority-mirror', authority === frontendAuthority, 'Frontend/backend intelligence authority contracts match');
check('backend-version', backendPackage.version === '0.10.0-rc.10.73.5', 'Backend release identity is rc.10.73.4');
check('frontend-version', frontendPackage.version === '0.10.0-rc.10.73.5', 'Frontend release identity is rc.10.73.4');
check('release-manifest', manifest.version === '0.10.0-rc.10.73.5' && manifest.approvedKnowledgeClaimGroundingImplemented === true && manifest.semanticNliEntailmentImplemented === false && manifest.productionAccepted === false, 'Manifest declares implemented controls without semantic-NLI or production overclaim');
check('capability-state', capability.release === manifest.version && capability.cognitiveBoundary?.allCognitivePathsClaimGrounded === false && capability.cognitiveBoundary?.liveProviderAccepted === false, 'Capability register exposes the controlled boundary and remaining gaps');
check('release-evidence', existsSync(resolve(root, 'AIW_RC10_73_4_RELEASE_REPORT.md')) && existsSync(resolve(root, 'AIW_RC10_73_4_IMPLEMENTATION_TRACEABILITY.md')) && existsSync(resolve(root, 'AIW_RC10_73_4_KNOWN_LIMITATIONS.md')) && existsSync(resolve(root, 'release-evidence/rc10.73.4/COGNITIVE_GROUNDING_ACCEPTANCE.json')), 'Current release evidence is included');
check('executable-test', existsSync(resolve(backend, 'apps/api/test/rc10_73_4_cognitive_grounding.test.ts')), 'Executable cognitive-boundary tests are included');

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ release: '0.10.0-rc.10.73.5', passed: checks.length - failed.length, total: checks.length, failed: failed.map((item) => item.id) }, null, 2));
if (failed.length) process.exit(1);
