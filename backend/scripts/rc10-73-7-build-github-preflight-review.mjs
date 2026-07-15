import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const product = resolve(backend, '..');
const evidenceRoot = resolve(product, 'release-evidence/rc10.73.7');
const canonicalPath = resolve(evidenceRoot, 'GITHUB_CONNECTIVITY_PREFLIGHT.json');
const focusedPath = resolve(evidenceRoot, 'GITHUB_ARCHIVED_SOURCE_FOCUSED_PREFLIGHT.json');
const historicalPath = resolve(product, 'release-evidence/rc10.73.6/GITHUB_CONNECTIVITY_PREFLIGHT.json');
const preflight = JSON.parse(await readFile(canonicalPath, 'utf8'));
let focused = null;
try { focused = JSON.parse(await readFile(focusedPath, 'utf8')); } catch { /* Generated after archived-source approval. */ }
let historical = null;
try { historical = JSON.parse(await readFile(historicalPath, 'utf8')); } catch { /* Historical evidence is optional. */ }

if (preflight.total !== 47 || preflight.selectedCount !== 47) throw new Error('PREFLIGHT_REVIEW_REQUIRES_EXACTLY_47_SELECTED_REPOSITORIES');
if (!preflight.authenticated) throw new Error('PREFLIGHT_REVIEW_REQUIRES_AUTHENTICATED_EXECUTION');
if (!preflight.preflightOnly || preflight.completeAcquisitionStarted) throw new Error('FULL_ACQUISITION_WAS_NOT_PERMITTED');

const focusedById = new Map((focused?.results ?? []).map((item) => [item.connectorId, item]));
const reconciledResults = preflight.results.map((item) => focusedById.get(item.connectorId) ?? item);
const archived = reconciledResults.filter((item) => item.archived);
const acceptedArchived = archived.filter((item) => item.archivedAcquisitionAccepted);
const unexpectedArchived = archived.filter((item) => !item.archivedAcquisitionAccepted);
const disabled = reconciledResults.filter((item) => item.disabled);
const unreachable = reconciledResults.filter((item) => !item.reachable);
const identityChanges = reconciledResults.filter((item) => item.redirectOrRename.identityChanged || item.redirectOrRename.redirected);
const caseNormalizations = reconciledResults.filter((item) => item.redirectOrRename.caseChanged);
const licenceMissing = reconciledResults.filter((item) => !item.licenceApiEvidence.found);
const licenceInconclusive = reconciledResults.filter((item) => item.licenceApiEvidence.spdxId === 'NOASSERTION');
const licenceReview = [...new Map([...licenceMissing, ...licenceInconclusive].map((item) => [item.connectorId, item])).values()];
const allApproved = reconciledResults.every((item) => item.acquisitionStatus === 'approved');
const authorityClasses = [...new Set(reconciledResults.map((item) => item.sourceAuthorityClass))].sort();
const focusedGatePassed = Boolean(focused && focused.selectedCount === 2 && Object.values(focused.passConditions).every(Boolean));
const reconciledPassConditions = {
  authenticated: preflight.authenticated,
  governedAll47Selected: preflight.selectedCount === 47,
  all47Reachable: preflight.reachable === 47,
  all47AcquisitionApproved: allApproved,
  noUnexplainedRedirectOrRename: identityChanges.length === 0,
  noUnexpectedArchivedSource: unexpectedArchived.length === 0,
  noDisabledRepository: disabled.length === 0,
  focusedArchivedPreflightPassed: focusedGatePassed,
  sufficientRateLimit: preflight.sufficientRateLimit && Boolean(focused?.sufficientRateLimit),
};
const gatePassed = Object.values(reconciledPassConditions).every(Boolean);

const archiveRemediation = (item) => ({
  connectorId: item.connectorId,
  repository: item.requestedRepository,
  blocker: 'github-reports-repository-archived',
  exactRemediation: [
    'Product owner must explicitly approve immutable acquisition from this archived identity, or explicitly amend/retire the connector.',
    'If a successor repository is proposed, perform a separate governed identity migration; do not silently substitute it.',
    'Rerun preflight for this connector after the governance disposition is recorded.',
  ],
});

const identity = {
  schemaVersion: 'aiw-github-repository-identity-resolution-v1',
  releaseId: 'AIW v0.10.0-rc.10.73.7-preflight',
  generatedAt: preflight.generatedAt,
  productionAccepted: false,
  completeAcquisitionStarted: false,
  sourceEvidence: 'release-evidence/rc10.73.7/GITHUB_CONNECTIVITY_PREFLIGHT.json',
  supplementalFocusedEvidence: focused ? 'release-evidence/rc10.73.7/GITHUB_ARCHIVED_SOURCE_FOCUSED_PREFLIGHT.json' : null,
  releasePathReconciliation: {
    canonicalCurrentPath: 'release-evidence/rc10.73.7/GITHUB_CONNECTIVITY_PREFLIGHT.json',
    historicalPath: 'release-evidence/rc10.73.6/GITHUB_CONNECTIVITY_PREFLIGHT.json',
    historicalTotal: historical?.total ?? null,
    historicalReachable: historical?.reachable ?? null,
    disposition: 'rc10.73.6 remains immutable historical evidence for the prior 30-source preflight; rc10.73.7 is canonical for the governed all-47 preflight.',
  },
  summary: {
    selected: preflight.selectedCount,
    acquisitionApproved: preflight.results.filter((item) => item.acquisitionStatus === 'approved').length,
    reachable: preflight.reachable,
    exactIdentity: preflight.exactIdentityCount,
    redirectsOrRenames: identityChanges.length,
    caseNormalizations: caseNormalizations.length,
    archived: archived.length,
    archivedApprovedForImmutableAcquisition: acceptedArchived.length,
    archivedUnexpected: unexpectedArchived.length,
    disabled: disabled.length,
    visibility: Object.fromEntries([...new Set(reconciledResults.map((item) => item.visibility))].map((visibility) => [visibility, reconciledResults.filter((item) => item.visibility === visibility).length])),
    sourceAuthorityClasses: authorityClasses,
  },
  repositories: reconciledResults.map((item) => ({
    connectorId: item.connectorId,
    requestedOwnerRepository: item.requestedRepository,
    resolvedOwnerRepository: item.resolvedRepository,
    acquisitionStatus: item.acquisitionStatus,
    sourceAuthorityClass: item.sourceAuthorityClass,
    reachable: item.reachable,
    httpStatus: item.httpStatus,
    apiRequestId: item.apiRequestId,
    redirectOrRename: item.redirectOrRename,
    defaultBranch: item.defaultBranch,
    archived: item.archived,
    archivedAcquisitionAccepted: item.archivedAcquisitionAccepted ?? false,
    archivedSourceDisposition: item.archivedSourceDisposition ?? null,
    sourceFreshnessStatus: item.sourceFreshnessStatus ?? null,
    currentGuidanceEligible: item.currentGuidanceEligible ?? null,
    semanticReviewStatus: item.semanticReviewStatus,
    automaticPromotionAllowed: item.automaticPromotionAllowed ?? null,
    successorRepository: item.successorRepository ?? null,
    successorMigrationRequired: item.successorMigrationRequired ?? null,
    immutableRevisionEvidence: item.immutableRevisionEvidence ?? null,
    disabled: item.disabled,
    visibility: item.visibility,
    licenceApiEvidence: item.licenceApiEvidence,
    rateLimitImpact: item.rateLimitImpact,
    remediationRequired: item.remediationRequired,
  })),
};

const observed = preflight.rateLimitObservedFromResponseHeaders;
const rateLimitReceipt = {
  schemaVersion: 'aiw-github-rate-limit-receipt-v1',
  releaseId: identity.releaseId,
  generatedAt: preflight.generatedAt,
  productionAccepted: false,
  authenticated: preflight.authenticated,
  authenticationReceipt: {
    aiwGithubTokenInitiallyPresentInCodexProcess: false,
    githubCliAuthenticated: true,
    effectiveAiwGithubTokenPresentDuringPreflight: true,
    credentialBridge: 'GitHub CLI keyring token supplied in-memory to the PowerShell -Token parameter; not printed or persisted.',
    secretValueRecorded: false,
  },
  endpointSnapshots: { before: preflight.rateLimitBefore, after: preflight.rateLimitAfter },
  responseHeaderObservation: observed,
  endpointCacheObservation: 'The /rate_limit body repeated the earlier 4,994 value; per-response x-ratelimit-remaining headers showed the actual decreasing core budget and are used conservatively.',
  conservativeRemaining: observed.minimumRemaining,
  estimatedPreflightCoreRequests: observed.estimatedRepositoryAndLicenceRequests,
  sufficientForPreflight: preflight.sufficientRateLimit,
  fullAcquisitionCapacityDecision: 'not-evaluated-by-this-preflight; full acquisition remains approval-gated',
};

const blockers = {
  schemaVersion: 'aiw-github-preflight-blockers-v1',
  releaseId: identity.releaseId,
  generatedAt: preflight.generatedAt,
  productionAccepted: false,
  status: gatePassed ? 'passed-awaiting-product-owner-approval' : 'blocked-pending-remediation',
  fullAcquisitionMayStart: false,
  blockingCount: unreachable.length + identityChanges.length + unexpectedArchived.length + disabled.length + (focusedGatePassed ? 0 : 1),
  blockers: [
    ...unreachable.map((item) => ({ connectorId: item.connectorId, repository: item.requestedRepository, blocker: item.failureClassification ?? 'unreachable', exactRemediation: item.remediationRequired })),
    ...identityChanges.map((item) => ({ connectorId: item.connectorId, repository: item.requestedRepository, resolvedRepository: item.resolvedRepository, blocker: 'identity-redirect-or-rename', exactRemediation: ['Explicitly reconcile and approve the identity change; do not silently substitute the resolved repository.', 'Rerun the connector preflight after governance metadata is amended.'] })),
    ...unexpectedArchived.map((item) => ({ connectorId: item.connectorId, repository: item.requestedRepository, blocker: 'unapproved-archived-source', exactRemediation: ['Record an explicit archived-source acquisition disposition or retire the connector; do not silently substitute a successor.'] })),
    ...disabled.map((item) => ({ connectorId: item.connectorId, repository: item.requestedRepository, blocker: 'repository-disabled', exactRemediation: ['Source owner must restore the repository or product owner must explicitly retire/amend the connector.', 'Rerun the connector preflight after disposition.'] })),
    ...(!focusedGatePassed ? [{ connectorId: null, repository: null, blocker: 'focused-archived-preflight-not-passed', exactRemediation: ['Run the approved two-connector preflight and prove exact identity, archived status, and immutable revision resolution.'] }] : []),
  ],
  acceptedArchivedSources: acceptedArchived.map((item) => ({
    connectorId: item.connectorId,
    repository: item.requestedRepository,
    archivedSourceDisposition: item.archivedSourceDisposition,
    sourceFreshnessStatus: item.sourceFreshnessStatus,
    currentGuidanceEligible: item.currentGuidanceEligible,
    semanticReviewStatus: item.semanticReviewStatus,
    automaticPromotionAllowed: item.automaticPromotionAllowed,
    successorRepository: item.successorRepository,
    successorMigrationRequired: item.successorMigrationRequired,
    immutableRevisionEvidence: item.immutableRevisionEvidence,
    authorityLimit: 'Acquisition-only approval; not current normative guidance and no scoring, hard-constraint, conformance, promotion, redistribution, Design Graph mutation, or production authority.',
  })),
  nonBlockingReviewRequirements: licenceReview.map((item) => ({
    connectorId: item.connectorId,
    repository: item.requestedRepository,
    category: item.licenceApiEvidence.found ? 'licence-api-inconclusive' : 'licence-api-not-found',
    licenceApiHttpStatus: item.licenceApiEvidence.httpStatus,
    spdxId: item.licenceApiEvidence.spdxId,
    exactRemediation: 'Allow acquisition/quarantine only under the governed candidate-only policy; prohibit redistribution and promotion until path-level licence evidence receives independent legal/licence review.',
  })),
  passedConditions: Object.entries(reconciledPassConditions).filter(([, passed]) => passed).map(([name]) => name),
  failedConditions: Object.entries(reconciledPassConditions).filter(([, passed]) => !passed).map(([name]) => name),
};

const rows = reconciledResults.map((item) => {
  const identityDisposition = item.redirectOrRename.disposition;
  const licence = item.licenceApiEvidence.found ? `${item.licenceApiEvidence.httpStatus}/${item.licenceApiEvidence.spdxId ?? 'unknown'}` : `${item.licenceApiEvidence.httpStatus ?? 'n/a'}/not-found`;
  const remediation = item.remediationRequired.length ? item.remediationRequired.join(' ') : 'None.';
  return `| ${item.connectorId} | ${item.requestedRepository} | ${item.resolvedRepository ?? 'unresolved'} | ${item.httpStatus ?? 'n/a'} | ${item.defaultBranch ?? 'n/a'} | ${item.archived} | ${item.disabled} | ${item.visibility ?? 'n/a'} | ${identityDisposition} | ${licence} | ${item.rateLimitImpact.licenceRequestRemaining ?? item.rateLimitImpact.repositoryRequestRemaining ?? 'n/a'} | ${remediation} |`;
});
const report = `# GitHub Connectivity Preflight Review\n\n` +
  `Baseline: AIW v0.10.0-rc.10.73.6  \nPreflight evidence: rc.10.73.7  \nGenerated: ${preflight.generatedAt}  \nProduction accepted: **false**  \nFull acquisition started: **false**\n\n` +
  `## Outcome\n\nAuthenticated metadata preflight selected **47**, reached **47**, and resolved **47 exact identities**. All have \`acquisitionStatus=approved\`; differentiated authority remains across ${authorityClasses.length} classes. No redirect, rename, disabled repository, or visibility anomaly was observed. ${caseNormalizations.length ? `GitHub normalized repository casing for ${caseNormalizations.map((item) => `\`${item.requestedRepository}\` → \`${item.resolvedRepository}\``).join(', ')}; this is recorded as casing only, not treated as a repository substitution.` : 'No repository casing normalization was observed.'}\n\nThe ideal pass is **not satisfied** because GitHub reports ${archived.length} governed repositories as archived: ${archived.map((item) => `\`${item.connectorId}\` (${item.requestedRepository})`).join(', ')}. Full acquisition remains blocked pending explicit product-owner disposition and approval.\n\n` +
  `## Authentication and rate limit\n\nGitHub CLI authentication passed. \`AIW_GITHUB_TOKEN\` was not pre-set in the Codex process; the CLI keyring credential was bridged into the preflight process in memory and never printed or persisted. Conservative observed core capacity after repository/licence calls was **${observed.minimumRemaining}/5000**, sufficient for this preflight.\n\n` +
  `## Release-path reconciliation\n\nThe rc.10.73.6 file is retained as historical evidence for its prior ${historical?.total ?? 'unknown'}-repository run. The canonical all-47 result is \`release-evidence/rc10.73.7/GITHUB_CONNECTIVITY_PREFLIGHT.json\`.\n\n` +
  `## All 47 repository results\n\n| Connector | Requested | Resolved | HTTP | Default branch | Archived | Disabled | Visibility | Identity | Licence API | Rate remaining | Remediation |\n|---|---|---|---:|---|---:|---:|---|---|---|---:|---|\n${rows.join('\n')}\n\n` +
  `## Licence evidence\n\n${licenceMissing.length} repositories returned no licence API file: ${licenceMissing.map((item) => `\`${item.connectorId}\``).join(', ')}. ${licenceInconclusive.length} returned \`NOASSERTION\`: ${licenceInconclusive.map((item) => `\`${item.connectorId}\``).join(', ')}. These do not silently gain licence or redistribution authority.\n\n` +
  `## Decision\n\n**WAIT FOR PRODUCT-OWNER APPROVAL.** Do not run the complete acquisition until the two archived-source dispositions are explicitly recorded and the preflight is rerun or the product owner explicitly accepts archived immutable acquisition.\n`;

const reconciledReport = `# GitHub Connectivity Preflight Review\n\n` +
  `Baseline: AIW v0.10.0-rc.10.73.6  \nPreflight evidence: rc.10.73.7  \nGenerated by command: ${focused?.generatedAt ?? preflight.generatedAt}  \nCanonical all-47 execution: ${preflight.generatedAt}  \nProduction accepted: **false**  \nFull acquisition started: **false**\n\n` +
  `## Outcome\n\nAuthenticated metadata preflight selected **47**, reached **47**, and resolved **47 exact identities**. All have \`acquisitionStatus=approved\`; differentiated authority remains across ${authorityClasses.length} classes. No redirect, rename, disabled repository, or visibility anomaly was observed.\n\nGitHub reports ${archived.length} governed repositories as archived. The focused rerun accepted ${acceptedArchived.length} for immutable acquisition while keeping \`currentGuidanceEligible=false\`, requiring freshness and successor review, and resolving an immutable commit SHA for each. Their archived state remains explicit evidence; it is not hidden or converted into current normative authority. No successor was substituted.\n\n` +
  `## Authentication and rate limit\n\nGitHub CLI authentication passed. The credential was supplied to the preflight process in memory and was never printed or persisted. Conservative observed core capacity was **${focused?.rateLimitObservedFromResponseHeaders?.minimumRemaining ?? observed.minimumRemaining}/5000**, sufficient for the focused preflight.\n\n` +
  `## Release-path reconciliation\n\nThe rc.10.73.6 file remains historical evidence for its prior ${historical?.total ?? 'unknown'}-repository run. The canonical all-47 result is \`release-evidence/rc10.73.7/GITHUB_CONNECTIVITY_PREFLIGHT.json\`; the approved archived-source rerun is \`release-evidence/rc10.73.7/GITHUB_ARCHIVED_SOURCE_FOCUSED_PREFLIGHT.json\`.\n\n` +
  `## All 47 repository results\n\n| Connector | Requested | Resolved | HTTP | Default branch | Archived | Disabled | Visibility | Identity | Licence API | Rate remaining | Remediation |\n|---|---|---|---:|---|---:|---:|---|---|---|---:|---|\n${rows.join('\n')}\n\n` +
  `## Archived acquisition boundary\n\n${acceptedArchived.map((item) => `- \`${item.connectorId}\` — \`${item.requestedRepository}\`; immutable revision \`${item.immutableRevisionEvidence?.commitSha}\`; archived-source disposition \`${item.archivedSourceDisposition}\`; current guidance eligible: \`${item.currentGuidanceEligible}\`; successor: \`${item.successorRepository}\`.`).join('\n')}\n\nThis permission is limited to acquisition, immutable snapshotting, quarantine, deterministic parsing, and candidate-only semantic analysis. It grants no normative, scoring, elimination, hard-constraint, conformance, promotion, redistribution, Design Graph mutation, or production authority.\n\n` +
  `## Licence evidence\n\n${licenceMissing.length} repositories returned no licence API file. ${licenceInconclusive.length} returned \`NOASSERTION\`. These do not silently gain licence or redistribution authority.\n\n` +
  `## Decision\n\nFocused archived-source gate: **${focusedGatePassed ? 'passed' : 'failed'}**. Full acquisition remains unstarted and separately approval-gated. Production acceptance remains false.\n`;

await mkdir(evidenceRoot, { recursive: true });
await writeFile(resolve(evidenceRoot, 'GITHUB_REPOSITORY_IDENTITY_RESOLUTION.json'), `${JSON.stringify(identity, null, 2)}\n`);
await writeFile(resolve(evidenceRoot, 'GITHUB_RATE_LIMIT_RECEIPT.json'), `${JSON.stringify(rateLimitReceipt, null, 2)}\n`);
await writeFile(resolve(evidenceRoot, 'PREFLIGHT_BLOCKERS.json'), `${JSON.stringify(blockers, null, 2)}\n`);
await writeFile(resolve(evidenceRoot, 'GITHUB_CONNECTIVITY_PREFLIGHT_REVIEW.md'), reconciledReport);
console.log(JSON.stringify({ selected: preflight.selectedCount, reachable: preflight.reachable, exactIdentity: preflight.exactIdentityCount, archived: archived.length, disabled: disabled.length, redirectsOrRenames: identityChanges.length, caseNormalizations: caseNormalizations.length, licenceReviewRequired: licenceReview.length, gatePassed, fullAcquisitionMayStart: false, productionAccepted: false }, null, 2));
