import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GitHubRestClient, DEFAULT_GITHUB_API_VERSION } from './rc10-73-6-github-acquisition-core.mjs';
import { selectAcquisitionDossiers } from './rc10-73-7-acquisition-selection.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const product = resolve(backend, '..');
const sourceMap = JSON.parse(await readFile(resolve(backend, 'data/rc10_55-global-architecture-intelligence-source-map.json'), 'utf8'));
const requestedIds = (process.env.AIW_REFRESH_CONNECTORS || '').split(',').map((value) => value.trim()).filter(Boolean);
const selected = selectAcquisitionDossiers(sourceMap.dossiers, requestedIds);
const token = process.env.AIW_GITHUB_TOKEN?.trim() || undefined;
const client = new GitHubRestClient({ token, apiBase: process.env.AIW_GITHUB_API_BASE, apiVersion: process.env.AIW_GITHUB_API_VERSION || DEFAULT_GITHUB_API_VERSION, maxRetries: 0, requestTimeoutMs: Number(process.env.AIW_GITHUB_PREFLIGHT_TIMEOUT_MS || 15_000) });

function numberHeader(headers, name) {
  const value = Number(headers?.[name]);
  return Number.isFinite(value) ? value : null;
}

function classifyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/GITHUB_HTTP_(\d{3})/);
  const httpStatus = match ? Number(match[1]) : null;
  let classification = 'network-or-transport-failure';
  let remediation = 'Verify DNS, TLS, proxy and GitHub API connectivity, then retry only this connector.';
  if (httpStatus === 401) { classification = 'authentication-failure'; remediation = 'Refresh the GitHub credential and confirm it can access the requested repository.'; }
  else if (httpStatus === 403) { classification = 'authorization-or-rate-limit'; remediation = 'Inspect token scopes and rate-limit state; wait for reset or grant the minimum required repository access.'; }
  else if (httpStatus === 404) { classification = 'not-found-or-not-visible'; remediation = 'Confirm the exact owner/repository identity and token visibility; do not substitute a similarly named repository.'; }
  else if (httpStatus === 451) { classification = 'legal-access-restriction'; remediation = 'Escalate the legal access restriction; do not acquire or substitute the repository.'; }
  else if (httpStatus && httpStatus >= 500) { classification = 'github-service-failure'; remediation = 'Retry this connector after GitHub service health recovers.'; }
  else if (/timeout|aborted/i.test(message)) { classification = 'request-timeout'; remediation = 'Verify network/proxy health and retry this connector with a bounded higher preflight timeout.'; }
  return { message, httpStatus, classification, remediation };
}

function rateSnapshot(response) {
  const core = response?.body?.resources?.core ?? response?.body?.rate ?? {};
  return {
    httpStatus: response?.status ?? null,
    limit: Number(core.limit ?? 0),
    remaining: Number(core.remaining ?? 0),
    used: Number(core.used ?? 0),
    resetEpochSeconds: Number(core.reset ?? 0),
    resetAt: core.reset ? new Date(Number(core.reset) * 1000).toISOString() : null,
    resource: response?.headers?.['x-ratelimit-resource'] ?? 'core',
  };
}

let rateLimitBefore = null;
let rateLimitBeforeError = null;
try { rateLimitBefore = rateSnapshot(await client.request('/rate_limit')); }
catch (error) { rateLimitBeforeError = classifyError(error); }

const results = new Array(selected.length);
let cursor = 0;
const workers = Array.from({ length: Math.min(6, selected.length) }, async () => {
  while (true) {
    const index = cursor++;
    if (index >= selected.length) return;
    const dossier = selected[index];
    const base = {
      connectorId: dossier.connectorId,
      requestedRepository: dossier.repository,
      acquisitionStatus: dossier.acquisitionStatus,
      sourceAuthorityClass: dossier.sourceAuthorityClass,
      archivedSourceDisposition: dossier.archivedSourceDisposition ?? null,
      sourceFreshnessStatus: dossier.sourceFreshnessStatus ?? null,
      currentGuidanceEligible: dossier.currentGuidanceEligible ?? null,
      semanticReviewStatus: dossier.semanticReviewStatus,
      automaticPromotionAllowed: dossier.automaticPromotionAllowed ?? null,
      successorRepository: dossier.successorRepository ?? null,
      successorMigrationRequired: dossier.successorMigrationRequired ?? null,
    };
    try {
      const repositoryResponse = await client.repository(dossier.repository);
      const body = repositoryResponse.body ?? {};
      const resolvedRepository = String(body.full_name ?? dossier.repository);
      const identityChanged = resolvedRepository.toLowerCase() !== dossier.repository.toLowerCase();
      const caseChanged = !identityChanged && resolvedRepository !== dossier.repository;
      let licenceResponse;
      let licenceError = null;
      try { licenceResponse = await client.license(resolvedRepository); }
      catch (error) { licenceError = classifyError(error); }
      const licenceBody = licenceResponse?.body ?? {};
      const licenceFound = licenceResponse?.status === 200;
      const licenceSpdxId = licenceFound ? licenceBody.license?.spdx_id ?? null : null;
      const archived = Boolean(body.archived);
      const disabled = Boolean(body.disabled);
      let revisionResponse;
      let revisionError = null;
      try { revisionResponse = await client.commit(resolvedRepository, body.default_branch); }
      catch (error) { revisionError = classifyError(error); }
      const immutableRevision = typeof revisionResponse?.body?.sha === 'string' && /^[0-9a-f]{40}$/i.test(revisionResponse.body.sha) ? revisionResponse.body.sha : null;
      const archivedAcquisitionAccepted = archived && dossier.archivedSourceDisposition === 'approved-for-immutable-acquisition';
      const remediation = [];
      if (identityChanged) remediation.push(`Review and explicitly approve the resolved identity ${resolvedRepository}; do not silently replace ${dossier.repository}.`);
      if (archived && !archivedAcquisitionAccepted) remediation.push('Review the archived repository posture before acquisition.');
      if (archivedAcquisitionAccepted && !immutableRevision) remediation.push('Archived acquisition approval requires a successfully resolved immutable commit SHA.');
      if (disabled) remediation.push('Repository is disabled; block acquisition until the source owner restores or governance retires it.');
      if (!licenceFound) remediation.push('No repository licence API evidence was returned; require path-level licence review before redistribution or promotion.');
      else if (!licenceSpdxId || licenceSpdxId === 'NOASSERTION') remediation.push('GitHub licence detection is inconclusive; require path-level legal/licence review before redistribution or promotion.');
      if (licenceError) remediation.push(licenceError.remediation);
      if (revisionError) remediation.push(revisionError.remediation);
      results[index] = {
        ...base,
        resolvedRepository,
        reachable: true,
        status: 'reachable',
        httpStatus: repositoryResponse.status,
        apiRequestId: repositoryResponse.headers?.['x-github-request-id'] ?? null,
        redirectOrRename: {
          redirected: repositoryResponse.redirected,
          requestedUrl: repositoryResponse.requestedUrl,
          resolvedUrl: repositoryResponse.resolvedUrl,
          identityChanged,
          caseChanged,
          disposition: identityChanged ? 'review-required' : caseChanged ? 'case-normalized' : repositoryResponse.redirected ? 'http-redirect-observed' : 'exact-identity',
        },
        defaultBranch: body.default_branch ?? null,
        archived,
        archivedAcquisitionAccepted,
        disabled,
        visibility: body.visibility ?? (body.private ? 'private' : 'public'),
        immutableRevisionEvidence: {
          httpStatus: revisionResponse?.status ?? revisionError?.httpStatus ?? null,
          commitSha: immutableRevision,
          resolved: Boolean(immutableRevision),
          ref: body.default_branch ?? null,
          apiRequestId: revisionResponse?.headers?.['x-github-request-id'] ?? null,
          errorClassification: revisionError?.classification ?? null,
        },
        licenceApiEvidence: {
          httpStatus: licenceResponse?.status ?? licenceError?.httpStatus ?? null,
          found: licenceFound,
          spdxId: licenceSpdxId,
          name: licenceFound ? licenceBody.license?.name ?? null : null,
          key: licenceFound ? licenceBody.license?.key ?? null : null,
          path: licenceFound ? licenceBody.path ?? null : null,
          apiRequestId: licenceResponse?.headers?.['x-github-request-id'] ?? null,
          errorClassification: licenceError?.classification ?? null,
        },
        rateLimitImpact: {
          estimatedCoreRequests: 3,
          repositoryRequestRemaining: numberHeader(repositoryResponse.headers, 'x-ratelimit-remaining'),
          licenceRequestRemaining: numberHeader(licenceResponse?.headers, 'x-ratelimit-remaining'),
          revisionRequestRemaining: numberHeader(revisionResponse?.headers, 'x-ratelimit-remaining'),
        },
        remediationRequired: remediation,
      };
    } catch (error) {
      const failure = classifyError(error);
      results[index] = {
        ...base,
        resolvedRepository: null,
        reachable: false,
        status: 'unreachable',
        httpStatus: failure.httpStatus,
        failureClassification: failure.classification,
        error: failure.message,
        redirectOrRename: { redirected: false, requestedUrl: `https://api.github.com/repos/${dossier.repository}`, resolvedUrl: null, identityChanged: false, caseChanged: false, disposition: 'unresolved' },
        defaultBranch: null,
        archived: null,
        archivedAcquisitionAccepted: false,
        disabled: null,
        visibility: null,
        immutableRevisionEvidence: { httpStatus: null, commitSha: null, resolved: false, ref: null, apiRequestId: null, errorClassification: 'repository-unreachable' },
        licenceApiEvidence: { httpStatus: null, found: false, spdxId: null, name: null, key: null, path: null, apiRequestId: null, errorClassification: 'repository-unreachable' },
        rateLimitImpact: { estimatedCoreRequests: 1, repositoryRequestRemaining: null, licenceRequestRemaining: null, revisionRequestRemaining: null },
        remediationRequired: [failure.remediation],
      };
    }
  }
});
await Promise.all(workers);

let rateLimitAfter = null;
let rateLimitAfterError = null;
try { rateLimitAfter = rateSnapshot(await client.request('/rate_limit')); }
catch (error) { rateLimitAfterError = classifyError(error); }
const reachable = results.filter((item) => item.reachable).length;
const unexpectedIdentity = results.filter((item) => item.redirectOrRename.identityChanged || item.redirectOrRename.redirected);
const archivedOrDisabled = results.filter((item) => item.archived || item.disabled);
const unexpectedArchivedOrDisabled = results.filter((item) => (item.archived && !item.archivedAcquisitionAccepted) || item.disabled);
const unresolvedImmutableRevisions = results.filter((item) => !item.immutableRevisionEvidence.resolved);
const observedRemainingValues = results.flatMap((item) => [item.rateLimitImpact.repositoryRequestRemaining, item.rateLimitImpact.licenceRequestRemaining, item.rateLimitImpact.revisionRequestRemaining]).filter(Number.isFinite);
const observedMinimumRemaining = observedRemainingValues.length ? Math.min(...observedRemainingValues) : null;
const effectiveRemaining = observedMinimumRemaining ?? rateLimitAfter?.remaining ?? null;
const sufficientRateLimit = Boolean(effectiveRemaining !== null && effectiveRemaining >= Math.max(500, selected.length * 4));
const report = {
  schemaVersion: 'aiw-github-connectivity-preflight-v2',
  releaseId: 'AIW v0.10.0-rc.10.73.7-preflight',
  generatedAt: new Date().toISOString(),
  apiVersion: client.apiVersion,
  authenticated: Boolean(token),
  preflightOnly: true,
  completeAcquisitionStarted: false,
  productionAccepted: false,
  selectionScope: requestedIds.length ? 'explicit-connector-filter' : 'all-acquisition-approved-connectors',
  requestedConnectorIds: requestedIds,
  selectedCount: selected.length,
  total: results.length,
  reachable,
  unreachable: results.length - reachable,
  exactIdentityCount: results.length - unexpectedIdentity.length,
  archivedOrDisabledCount: archivedOrDisabled.length,
  acceptedArchivedCount: results.filter((item) => item.archivedAcquisitionAccepted).length,
  unresolvedImmutableRevisionCount: unresolvedImmutableRevisions.length,
  sufficientRateLimit,
  rateLimitBefore,
  rateLimitAfter,
  rateLimitObservedFromResponseHeaders: {
    minimumRemaining: observedMinimumRemaining,
    maximumRemaining: observedRemainingValues.length ? Math.max(...observedRemainingValues) : null,
    estimatedRepositoryAndLicenceRequests: results.reduce((total, item) => total + item.rateLimitImpact.estimatedCoreRequests, 0),
  },
  rateLimitErrors: { before: rateLimitBeforeError, after: rateLimitAfterError },
  passConditions: {
    authenticated: Boolean(token),
    expectedSelectionCount: requestedIds.length ? results.length === requestedIds.length : results.length === 47,
    allSelectedReachable: reachable === results.length,
    noUnexplainedRedirect: unexpectedIdentity.length === 0,
    noUnexpectedArchivedOrDisabled: unexpectedArchivedOrDisabled.length === 0,
    immutableRevisionResolvedForAllSelected: unresolvedImmutableRevisions.length === 0,
    sufficientRateLimit,
  },
  results,
};
const outputName = requestedIds.length ? 'GITHUB_ARCHIVED_SOURCE_FOCUSED_PREFLIGHT.json' : 'GITHUB_CONNECTIVITY_PREFLIGHT.json';
const output = resolve(product, 'release-evidence', 'rc10.73.7', outputName);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output, authenticated: report.authenticated, selectedCount: report.selectedCount, reachable: report.reachable, unreachable: report.unreachable, sufficientRateLimit: report.sufficientRateLimit, completeAcquisitionStarted: false, productionAccepted: false }, null, 2));
if (!Object.values(report.passConditions).every(Boolean)) process.exitCode = 2;
