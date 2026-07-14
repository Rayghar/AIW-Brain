// Sprint 8.9.8 — Live provider binding contracts.
// These functions intentionally build governed plans and runbook-ready probes;
// target environments bind real SDK credentials. No write/PR/mutation authority lives here.

export type LiveRepositoryProvider = 'github' | 'gitlab' | 'azure-devops' | 'bitbucket';
export type LiveKmsProvider = 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'hashicorp-vault' | 'sovereign-hsm' | 'reference-local';
export type ProviderBindingMode = 'reference-plan' | 'read-only-live';

export interface RepositoryProviderBindingInput {
  connectorId: string;
  provider: LiveRepositoryProvider | string;
  repositoryUrl: string;
  branch?: string;
  allowedPaths: string[];
  tokenRef?: string;
  allowLiveNetwork?: boolean;
  requestedBy?: string;
}

export interface RepositoryProviderFetchPlan {
  planId: string;
  connectorId: string;
  provider: string;
  repositoryUrl: string;
  branch: string;
  mode: ProviderBindingMode;
  tokenRef: string;
  allowedPaths: string[];
  requiredEnvironment: string[];
  providerEndpoints: string[];
  executionSteps: string[];
  smokeTests: string[];
  safety: {
    readOnly: true;
    repositoryWritesDisabled: true;
    prCreationRequiresApproval: true;
    architectureMutationRequiresApproval: true;
    outputGoesToQuarantine: true;
  };
  readiness: 'blocked-missing-token-ref' | 'ready-for-target-environment';
  warnings: string[];
}

export interface KmsProviderBindingGuide {
  guideId: string;
  provider: LiveKmsProvider;
  keyRef: string;
  requiredEnvironment: string[];
  signingSteps: string[];
  verificationSteps: string[];
  zeroEgressPosture: 'supported' | 'not-supported' | 'reference-only';
  safety: {
    keyMaterialNeverStored: true;
    manifestHashSigned: true;
    candidateKnowledgeBlocked: true;
    humanPromotionRequired: true;
  };
}

function checksum(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function providerEnv(provider: string): string[] {
  if (provider === 'github') return ['AIW_GITHUB_TOKEN'];
  if (provider === 'gitlab') return ['AIW_GITLAB_TOKEN'];
  if (provider === 'azure-devops') return ['AIW_AZURE_DEVOPS_TOKEN', 'AIW_AZURE_DEVOPS_ORG'];
  if (provider === 'bitbucket') return ['AIW_BITBUCKET_TOKEN'];
  return ['AIW_REPOSITORY_TOKEN'];
}

function providerEndpoint(provider: string, repositoryUrl: string, branch: string): string {
  const cleaned = repositoryUrl.replace(/\.git$/, '');
  if (provider === 'github') return `${cleaned}/tree/${branch}`;
  if (provider === 'gitlab') return `${cleaned}/-/tree/${branch}`;
  if (provider === 'azure-devops') return `${cleaned}?version=GB${branch}`;
  if (provider === 'bitbucket') return `${cleaned}/src/${branch}`;
  return cleaned;
}

export function createReadOnlyProviderFetchPlan(input: RepositoryProviderBindingInput): RepositoryProviderFetchPlan {
  const branch = input.branch ?? 'main';
  const tokenRef = input.tokenRef ?? '';
  const warnings: string[] = [];
  if (!tokenRef) warnings.push('tokenRef is required before a target environment can execute live provider fetch.');
  if (!input.allowedPaths.length) warnings.push('allowedPaths must be configured to prevent broad repository ingestion.');
  if (!/^https:\/\//.test(input.repositoryUrl)) warnings.push('repositoryUrl must be HTTPS for provider-bound execution.');
  const mode: ProviderBindingMode = input.allowLiveNetwork && tokenRef && !warnings.length ? 'read-only-live' : 'reference-plan';
  return {
    planId: `provider-fetch-${checksum(`${input.connectorId}:${input.repositoryUrl}:${branch}:${input.allowedPaths.join('|')}`)}`,
    connectorId: input.connectorId,
    provider: input.provider,
    repositoryUrl: input.repositoryUrl,
    branch,
    mode,
    tokenRef: tokenRef || 'missing-token-ref',
    allowedPaths: [...new Set(input.allowedPaths)].sort(),
    requiredEnvironment: providerEnv(input.provider),
    providerEndpoints: [providerEndpoint(input.provider, input.repositoryUrl, branch)],
    executionSteps: [
      'Resolve connector and tenant policy.',
      'Validate read-only token scope and allowed paths.',
      'Fetch provider tree/blob metadata for allowed paths only.',
      'Capture commit SHA and source provenance.',
      'Create quarantined source snapshot.',
      'Keep all extracted claims non-scoring until named-human review and promoted release pinning.',
    ],
    smokeTests: ['token-scope-read-only', 'allowed-path-filter-enforced', 'commit-sha-recorded', 'snapshot-created-in-quarantine', 'no-repository-write-attempted'],
    safety: { readOnly: true, repositoryWritesDisabled: true, prCreationRequiresApproval: true, architectureMutationRequiresApproval: true, outputGoesToQuarantine: true },
    readiness: mode === 'read-only-live' ? 'ready-for-target-environment' : 'blocked-missing-token-ref',
    warnings,
  };
}

export function createKmsProviderBindingGuide(input: { provider: LiveKmsProvider | string; keyRef?: string; sovereign?: boolean }): KmsProviderBindingGuide {
  const provider = input.provider as LiveKmsProvider;
  const keyRef = input.keyRef ?? `${provider}/aiw/knowledge-pack-signing-key`;
  const env = provider === 'aws-kms' ? ['AWS_REGION', 'AIW_KMS_KEY_ID']
    : provider === 'azure-keyvault' ? ['AZURE_TENANT_ID', 'AIW_KEYVAULT_KEY_ID']
    : provider === 'gcp-kms' ? ['GOOGLE_APPLICATION_CREDENTIALS', 'AIW_GCP_KMS_KEY_NAME']
    : provider === 'hashicorp-vault' ? ['VAULT_ADDR', 'AIW_VAULT_TRANSIT_KEY']
    : provider === 'sovereign-hsm' ? ['AIW_HSM_SLOT', 'AIW_HSM_KEY_LABEL']
    : ['AIW_REFERENCE_SIGNING_KEY'];
  return {
    guideId: `kms-guide-${checksum(`${provider}:${keyRef}`)}`,
    provider,
    keyRef,
    requiredEnvironment: env,
    signingSteps: [
      'Hash the knowledge-pack manifest and file checksums.',
      'Send only the manifest hash to the configured KMS/HSM provider.',
      'Record provider, keyRef, signature id and verification material.',
      'Attach the attestation to the .aiw-kpack envelope.',
      'Reject activation when signature, release id or candidate-knowledge rules fail.',
    ],
    verificationSteps: ['manifest-hash-matches', 'signature-provider-allowed-by-tenant-policy', 'keyRef-recorded', 'candidate-knowledge-blocked', 'human-promotion-required'],
    zeroEgressPosture: provider === 'hashicorp-vault' || provider === 'sovereign-hsm' ? 'supported' : provider === 'reference-local' ? 'reference-only' : 'not-supported',
    safety: { keyMaterialNeverStored: true, manifestHashSigned: true, candidateKnowledgeBlocked: true, humanPromotionRequired: true },
  };
}

export function createProviderBoundDeploymentSmokePlan(): string[] {
  return [
    'Register read-only repository connector with allowed paths.',
    'Run provider fetch plan and confirm mode is read-only-live in target environment.',
    'Execute source refresh and confirm quarantined snapshot created.',
    'Export .aiw-kpack and sign manifest hash through configured KMS.',
    'Import .aiw-kpack in a clean tenant and confirm activation remains tenant/project scoped.',
  ];
}
