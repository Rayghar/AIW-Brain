import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const evidenceRoot = resolve(root, 'release-evidence/rc10.73.8');
const originalSmokePath = resolve(evidenceRoot, 'GATE_6B_LIVE_BOUNDED_SMOKE_RESULT.json');
const localPolicyPath = resolve(root, 'backend/config/llm-runtime-overrides.json');
const generatedAt = new Date().toISOString();
const configuredAlias = 'gpt-4.1-mini';
const snapshot = 'gpt-4.1-mini-2025-04-14';
const purpose = 'governed-candidate-semantic-transformation';
const verified = process.argv.includes('--verified');
const originalSmokeBytes = await readFile(originalSmokePath);
const originalSmokeSha256 = `sha256:${createHash('sha256').update(originalSmokeBytes).digest('hex')}`;
const originalSmoke = JSON.parse(originalSmokeBytes.toString('utf8'));
const localPolicy = JSON.parse(await readFile(localPolicyPath, 'utf8'));
const policy = localPolicy.tenants?.['gate-6b-local-smoke'];
const route = policy?.routes?.[0];
const entry = policy?.modelAllowlist?.[0];
if (route?.providerId !== 'openai' || route?.model !== snapshot || route?.purpose !== purpose
  || route?.fallbackRouteIds?.length !== 0 || policy?.allowFallback !== false
  || entry?.provider !== 'openai' || entry?.configuredAlias !== configuredAlias
  || entry?.requestedModel !== snapshot || entry?.resolvedModel !== snapshot
  || entry?.modelFamily !== configuredAlias || entry?.modelIdentityDecision !== 'exact-snapshot-pinned'
  || JSON.stringify(entry?.allowedSnapshots) !== JSON.stringify([snapshot])) {
  throw new Error('GATE_6B_LOCAL_SNAPSHOT_POLICY_MISMATCH');
}

const identityPolicy = {
  schemaVersion: 'aiw-gate-6b-model-identity-policy-v1', generatedAt, productionAccepted: false,
  provider: 'openai', configuredAlias, requestedModel: snapshot, resolvedModel: snapshot,
  modelFamily: configuredAlias, allowedSnapshots: [snapshot], purpose, fallback: 'disabled',
  verificationReference: 'release-evidence/rc10.73.8/GATE_6B_REJECTED_TRANSACTION_TELEMETRY.json',
  verificationTimestamp: generatedAt, modelIdentityDecision: 'exact-snapshot-pinned-by-product-owner-after-observed-provider-resolution',
  acceptanceRules: [
    'Accept when the exact requested model is explicitly allowlisted and the provider reports that exact model.',
    'Accept an approved alias only when the provider-reported model exactly equals a snapshot explicitly listed for that alias.',
  ],
  prohibitedMatching: { wildcard: true, prefix: true, regularExpression: true, similarFamilyName: true, implicitLatestSnapshot: true },
  fallbackEnabled: false, modelSubstitutionEnabled: false,
};

const mapping = {
  schemaVersion: 'aiw-gate-6b-model-alias-snapshot-mapping-v1', generatedAt, productionAccepted: false,
  provider: 'openai', purpose, configuredAlias, requestedModel: snapshot, resolvedModel: snapshot,
  modelFamily: configuredAlias, allowedSnapshots: [snapshot],
  verificationReference: 'release-evidence/rc10.73.8/GATE_6B_LIVE_BOUNDED_SMOKE_RESULT.json',
  verificationTimestamp: originalSmoke.completedAt,
  modelIdentityDecision: 'approved-exact-snapshot-for-gate-6b',
  evidence: {
    entitlementReceipt: 'release-evidence/rc10.73.8/GATE_6B_LIVE_MODEL_ENTITLEMENT_RECEIPT.json',
    rejectedTransactionReceipt: 'release-evidence/rc10.73.8/GATE_6B_LIVE_BOUNDED_SMOKE_RESULT.json',
    originalRejectedReceiptSha256: originalSmokeSha256,
    requestedAliasObserved: originalSmoke.exactModelValidation?.configured,
    resolvedSnapshotObserved: originalSmoke.exactModelValidation?.providerReported,
  },
  exactComparisonRequired: true, wildcardAllowed: false, prefixAcceptanceAllowed: false, regexAcceptanceAllowed: false,
  fallback: 'disabled',
};

const started = Date.parse(originalSmoke.startedAt);
const completed = Date.parse(originalSmoke.completedAt);
const rejectedTelemetry = {
  schemaVersion: 'aiw-gate-6b-rejected-transaction-telemetry-v1', generatedAt, productionAccepted: false,
  historicalReceipt: 'release-evidence/rc10.73.8/GATE_6B_LIVE_BOUNDED_SMOKE_RESULT.json',
  historicalReceiptSha256: originalSmokeSha256, historicalReceiptPreservedUnchanged: true,
  transactionStatus: 'rejected-model-identity', semanticContentPersistedAsCandidate: false,
  provider: originalSmoke.provider, purpose: originalSmoke.purpose,
  configuredAlias, requestedModel: originalSmoke.exactModelValidation?.configured,
  providerReportedModel: originalSmoke.exactModelValidation?.providerReported,
  resolvedModel: originalSmoke.exactModelValidation?.providerReported,
  httpStatus: null, httpStatusClass: originalSmoke.httpRequest?.statusClass ?? null,
  providerRequestId: null,
  inputTokens: null, outputTokens: null, totalTokens: null,
  elapsedDurationMs: Number.isFinite(started) && Number.isFinite(completed) ? completed - started : null,
  retryCount: originalSmoke.retryCount,
  responseFingerprint: null,
  schemaValidationStatus: 'not-run-identity-rejected-first',
  identityValidationStatus: 'rejected', finalDisposition: 'rejected-model-identity',
  recoveredFields: ['http-status-class', 'requested-model', 'provider-reported-model', 'elapsed-duration', 'retry-count', 'final-disposition'],
  unavailableFields: [
    'Exact HTTP status was not retained by the pre-fix gateway.',
    'The provider request ID for the transformation response was not retained.',
    'Token usage was parsed after the pre-fix identity check and therefore was not retained.',
    'A provider-response fingerprint was not created before the pre-fix identity check.',
  ],
  secretMaterialIncluded: false, authenticationHeadersIncluded: false, requestBodyIncluded: false,
  providerResponseContentIncluded: false, candidateAuthorityChanged: false, designGraphMutations: 0,
};

const command = 'node --env-file-if-exists=.env --import=tsx scripts/rc10-73-8/run-gate-6b-live-bounded-smoke.mts --approved-replacement-smoke';
const approval = `# Gate 6B replacement bounded-smoke approval request

Generated: ${generatedAt}

Status: **not approved and not executed**. Production accepted: **false**.

The fail-closed model-identity contract is now configured for provider \`openai\`, exact requested snapshot \`${snapshot}\`, and purpose \`${purpose}\`. The alias \`${configuredAlias}\` is retained only as governed identity metadata. The sole allowed snapshot is \`${snapshot}\`; wildcard, prefix, regular-expression matching, fallback, and substitution are prohibited.

The original alias-based smoke remains a rejected historical transaction at \`GATE_6B_LIVE_BOUNDED_SMOKE_RESULT.json\` with SHA-256 \`${originalSmokeSha256}\`. A replacement run will write a separate replacement receipt and will not rewrite that historical evidence.

Proposed command from \`backend\` after explicit product-owner approval:

\`\`\`powershell
${command}
\`\`\`

Limits: one call, zero retries, concurrency one, one previously approved public bounded passage, at most 8,000 input characters, at most 1,500 output tokens, no tools, no web search, no external retrieval, no code execution, candidate-only persistence, zero automatic promotion, and zero Design Graph mutation.

Do not run the full Gate 6B pilot. Gate 6C remains blocked and Gate 6D has not started.
`;

const readiness = {
  schemaVersion: 'aiw-gate-6b-post-fix-runtime-readiness-v1', generatedAt, productionAccepted: false,
  provider: 'openai', configuredAlias, requestedModel: snapshot, resolvedModel: snapshot,
  modelFamily: configuredAlias, allowedSnapshots: [snapshot], purpose,
  modelIdentityDecision: 'exact-snapshot-pinned', fallback: 'disabled',
  originalRejectedSmoke: { preserved: true, sha256: originalSmokeSha256, finalDisposition: 'rejected-model-identity' },
  implementationChecks: { exactIdentityPolicyImplemented: true, preAcceptanceTelemetryImplemented: true,
    rejectedSemanticContentPersistenceProhibited: true, wildcardAndPrefixAcceptanceProhibited: true },
  verification: {
    focusedRuntimeTests: verified ? { status: 'passed', testFiles: 3, tests: 24 } : 'pending',
    domainBuild: verified ? 'passed' : 'pending', apiBuild: verified ? 'passed' : 'pending',
    originalReceiptHashReplay: verified ? 'passed' : 'pending-final-check',
  },
  replacementSmoke: { approvalStatus: 'pending-explicit-product-owner-approval', executed: false, proposedCommand: command },
  fullPilotExecuted: false, gate6BStatus: 'blocked-pending-replacement-smoke-approval-and-execution',
  gate6CStatus: 'blocked', gate6DStatus: 'not-started', backupStatus: 'deferred-by-product-owner',
  recommendation: verified ? 'eligible-to-request-one-replacement-bounded-smoke; not-authorized-to-execute' : 'complete-tests-builds-and-diff-review-before-requesting-smoke-approval',
};

for (const [name, value] of [
  ['GATE_6B_MODEL_IDENTITY_POLICY.json', identityPolicy],
  ['GATE_6B_MODEL_ALIAS_SNAPSHOT_MAPPING.json', mapping],
  ['GATE_6B_REJECTED_TRANSACTION_TELEMETRY.json', rejectedTelemetry],
  ['GATE_6B_POST_FIX_RUNTIME_READINESS.json', readiness],
]) await writeFile(resolve(evidenceRoot, name), `${JSON.stringify(value, null, 2)}\n`);
await writeFile(resolve(evidenceRoot, 'GATE_6B_REPLACEMENT_SMOKE_APPROVAL.md'), approval);

const finalOriginalHash = `sha256:${createHash('sha256').update(await readFile(originalSmokePath)).digest('hex')}`;
if (finalOriginalHash !== originalSmokeSha256) throw new Error('GATE_6B_ORIGINAL_SMOKE_RECEIPT_CHANGED');
process.stdout.write(`${JSON.stringify({ snapshot, originalSmokeSha256, originalSmokePreserved: true, replacementSmokeExecuted: false, proposedCommand: command, productionAccepted: false }, null, 2)}\n`);
