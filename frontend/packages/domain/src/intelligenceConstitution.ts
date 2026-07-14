export const knowledgeAuthorityStates = [
  'discovery',
  'candidate',
  'reviewed-advisory',
  'approved-production',
  'deprecated',
  'blocked',
] as const;
export type KnowledgeAuthorityState = (typeof knowledgeAuthorityStates)[number];

export const knowledgeAuthorityUses = [
  'discover',
  'explain',
  'rank',
  'score',
  'generate-obligation',
  'generate-blocker',
  'mutate-model',
] as const;
export type KnowledgeAuthorityUse = (typeof knowledgeAuthorityUses)[number];

export interface KnowledgeAuthorityPolicy {
  state: KnowledgeAuthorityState;
  discover: boolean;
  explain: boolean;
  rank: boolean;
  score: boolean;
  generateObligation: boolean;
  generateBlocker: boolean;
  mutateModel: boolean;
  explanation: string;
}

export const AIW_INTELLIGENCE_CONSTITUTION_VERSION = '1.0.0-rc10.54';

export const knowledgeAuthorityMatrix: Record<KnowledgeAuthorityState, KnowledgeAuthorityPolicy> = {
  discovery: {
    state: 'discovery', discover: true, explain: true, rank: false, score: false,
    generateObligation: false, generateBlocker: false, mutateModel: false,
    explanation: 'Discovery sources may expand vocabulary, questions and learning paths but cannot establish architectural truth.',
  },
  candidate: {
    state: 'candidate', discover: true, explain: false, rank: false, score: false,
    generateObligation: false, generateBlocker: false, mutateModel: false,
    explanation: 'Candidate claims remain quarantined until named human review and release promotion.',
  },
  'reviewed-advisory': {
    state: 'reviewed-advisory', discover: true, explain: true, rank: true, score: false,
    generateObligation: false, generateBlocker: false, mutateModel: false,
    explanation: 'Reviewed advisory knowledge may shape alternatives and explanations but remains non-scoring and non-blocking.',
  },
  'approved-production': {
    state: 'approved-production', discover: true, explain: true, rank: true, score: true,
    generateObligation: true, generateBlocker: true, mutateModel: true,
    explanation: 'Only approved, release-bound knowledge may influence deterministic scoring, blockers, obligations or governed model proposals.',
  },
  deprecated: {
    state: 'deprecated', discover: false, explain: true, rank: false, score: false,
    generateObligation: false, generateBlocker: false, mutateModel: false,
    explanation: 'Deprecated knowledge is retained for historical explanation only.',
  },
  blocked: {
    state: 'blocked', discover: false, explain: false, rank: false, score: false,
    generateObligation: false, generateBlocker: false, mutateModel: false,
    explanation: 'Blocked knowledge is excluded from all architecture-intelligence paths.',
  },
};

export interface KnowledgeAuthorityReceipt {
  constitutionVersion: string;
  sourceId: string;
  state: KnowledgeAuthorityState;
  requestedUse: KnowledgeAuthorityUse;
  allowed: boolean;
  knowledgeReleaseId?: string | undefined;
  claimIds: string[];
  evidenceIds: string[];
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
  reason: string;
}

function useFlag(policy: KnowledgeAuthorityPolicy, use: KnowledgeAuthorityUse): boolean {
  if (use === 'discover') return policy.discover;
  if (use === 'explain') return policy.explain;
  if (use === 'rank') return policy.rank;
  if (use === 'score') return policy.score;
  if (use === 'generate-obligation') return policy.generateObligation;
  if (use === 'generate-blocker') return policy.generateBlocker;
  return policy.mutateModel;
}

export function evaluateKnowledgeAuthority(input: {
  sourceId: string;
  state: KnowledgeAuthorityState;
  requestedUse: KnowledgeAuthorityUse;
  knowledgeReleaseId?: string | undefined;
  claimIds?: string[] | undefined;
  evidenceIds?: string[] | undefined;
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
}): KnowledgeAuthorityReceipt {
  const policy = knowledgeAuthorityMatrix[input.state];
  let allowed = useFlag(policy, input.requestedUse);
  const reasons: string[] = [policy.explanation];
  if (input.state === 'approved-production' && !input.knowledgeReleaseId) {
    allowed = false;
    reasons.push('Production authority requires a pinned immutable knowledge release.');
  }
  if (input.state === 'approved-production' && ['score','generate-obligation','generate-blocker','mutate-model'].includes(input.requestedUse) && !input.approvedBy) {
    allowed = false;
    reasons.push('Production authority requires a named independent human approver.');
  }
  if ((input.evidenceIds ?? []).length === 0 && ['score','generate-obligation','generate-blocker','mutate-model'].includes(input.requestedUse)) {
    allowed = false;
    reasons.push('Authoritative architecture actions require claim-level evidence.');
  }
  return {
    constitutionVersion: AIW_INTELLIGENCE_CONSTITUTION_VERSION,
    sourceId: input.sourceId,
    state: input.state,
    requestedUse: input.requestedUse,
    allowed,
    ...(input.knowledgeReleaseId ? { knowledgeReleaseId: input.knowledgeReleaseId } : {}),
    claimIds: [...(input.claimIds ?? [])],
    evidenceIds: [...(input.evidenceIds ?? [])],
    ...(input.approvedBy ? { approvedBy: input.approvedBy } : {}),
    ...(input.approvedAt ? { approvedAt: input.approvedAt } : {}),
    reason: reasons.join(' '),
  };
}

export function assertKnowledgeAuthority(input: Parameters<typeof evaluateKnowledgeAuthority>[0]): KnowledgeAuthorityReceipt {
  const receipt = evaluateKnowledgeAuthority(input);
  if (!receipt.allowed) throw new Error(`AIW knowledge authority denied: ${receipt.reason}`);
  return receipt;
}

export const reasoningAuthority = {
  deterministicKernel: ['eligibility','scoring','validity','conformance','safe-mutation'],
  approvedKnowledgeRelease: ['evidence','patterns','obligations','rules','explanations'],
  llm: ['interpretation','clarification','drafting','summarisation'],
  architect: ['design-acceptance','model-change-approval'],
  reviewer: ['independent-disposition','waiver-review'],
  knowledgeApprover: ['claim-promotion','release-approval'],
} as const;
