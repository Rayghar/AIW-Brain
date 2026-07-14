export type KnowledgeAuthorityUse = 'descriptive' | 'reasoning' | 'composition' | 'scoring' | 'conformance';

export interface GithubConversionRepository {
  connectorId: string;
  repository: string;
  lifecycleStatus: string;
  trustTier: number;
  licence: { reviewStatus: string; usePolicy?: string; redistributionPermitted?: boolean };
  conversion: {
    status: string;
    liveRefreshPerformed: boolean;
    currentRevision?: string | null;
    sourceClaimCount: number;
    exactSourceLocationCount: number;
    immutableLiveSourceLocationCount: number;
    editorialSynthesisClaimCount: number;
    linkedPatternRecordCount: number;
  };
  activation: {
    permittedAuthority: string[];
    productionScoringEligible: boolean;
    discoveryOnlyInfluenceBlocked: boolean;
    candidateInfluenceBlocked: boolean;
    requiresIndependentPromotion: boolean;
    reason: string;
  };
  fingerprint: string;
}

export interface PatternKnowledgeAuthority {
  descriptive: boolean;
  reasoningReady: boolean;
  compositionReady: boolean;
  scoringCalibrated: boolean;
  conformanceReady: boolean;
  activeUse: string;
  candidateKnowledgeInfluence: 'blocked';
  discoveryKnowledgeInfluence: 'blocked';
}

export interface GithubKnowledgeConversionAssessment {
  allowedForControlledPilot: boolean;
  productionAccepted: false;
  checks: Array<{ id: string; ok: boolean; severity: 'blocker' | 'warning'; detail: string }>;
  metrics: {
    approvedRepositories: number;
    registeredRepositories: number;
    liveRefreshedRepositories: number;
    licenceVerifiedRepositories: number;
    patternRecords: number;
    recordsWithClaimLineage: number;
    scoringCalibratedRecords: number;
  };
}

export function repositoryKnowledgeUseAllowed(repository: GithubConversionRepository, use: KnowledgeAuthorityUse): boolean {
  if (repository.lifecycleStatus !== 'approved') return use === 'descriptive';
  if (use === 'descriptive') return true;
  if (use === 'reasoning') return repository.conversion.exactSourceLocationCount > 0;
  if (use === 'composition') return repository.conversion.linkedPatternRecordCount > 0;
  if (use === 'scoring') return repository.activation.productionScoringEligible;
  if (use === 'conformance') {
    return repository.conversion.liveRefreshPerformed
      && repository.licence.reviewStatus === 'verified'
      && repository.conversion.immutableLiveSourceLocationCount > 0;
  }
  return false;
}

export function patternKnowledgeUseAllowed(authority: PatternKnowledgeAuthority, use: KnowledgeAuthorityUse): boolean {
  if (use === 'descriptive') return authority.descriptive;
  if (use === 'reasoning') return authority.reasoningReady;
  if (use === 'composition') return authority.compositionReady;
  if (use === 'scoring') return authority.scoringCalibrated;
  if (use === 'conformance') return authority.conformanceReady;
  return false;
}

export function assessGithubKnowledgeConversion(input: {
  repositories: GithubConversionRepository[];
  patterns: Array<{ knowledgeAuthority?: PatternKnowledgeAuthority; lineageSummary?: { claimIds?: string[] } }>;
}): GithubKnowledgeConversionAssessment {
  const approvedRepositories = input.repositories.filter((item) => item.lifecycleStatus === 'approved').length;
  const liveRefreshedRepositories = input.repositories.filter((item) => item.conversion.liveRefreshPerformed).length;
  const licenceVerifiedRepositories = input.repositories.filter((item) => item.licence.reviewStatus === 'verified').length;
  const recordsWithClaimLineage = input.patterns.filter((item) => (item.lineageSummary?.claimIds?.length ?? 0) > 0).length;
  const scoringCalibratedRecords = input.patterns.filter((item) => item.knowledgeAuthority?.scoringCalibrated).length;
  const checks = [
    {
      id: 'approved-source-registry-complete',
      ok: approvedRepositories === 30 && input.repositories.length === 30,
      severity: 'blocker' as const,
      detail: `${approvedRepositories}/30 approved repositories are represented by conversion records.`,
    },
    {
      id: 'claim-lineage-complete',
      ok: recordsWithClaimLineage === input.patterns.length && input.patterns.length >= 200,
      severity: 'blocker' as const,
      detail: `${recordsWithClaimLineage}/${input.patterns.length} Pattern DNA records have explicit claim lineage.`,
    },
    {
      id: 'candidate-and-discovery-scoring-blocked',
      ok: input.repositories.every((item) => item.activation.candidateInfluenceBlocked && item.activation.discoveryOnlyInfluenceBlocked),
      severity: 'blocker' as const,
      detail: 'Non-approved source postures cannot score, constrain or create conformance rules.',
    },
    {
      id: 'false-scoring-authority-blocked',
      ok: input.repositories.filter((item) => !item.conversion.liveRefreshPerformed).every((item) => !item.activation.productionScoringEligible),
      severity: 'blocker' as const,
      detail: 'Repositories without immutable live snapshots cannot become production scoring authority.',
    },
    {
      id: 'immutable-live-refresh',
      ok: liveRefreshedRepositories === input.repositories.length,
      severity: 'warning' as const,
      detail: `${liveRefreshedRepositories}/${input.repositories.length} repositories have an immutable live snapshot in this distribution.`,
    },
    {
      id: 'licence-clearance',
      ok: licenceVerifiedRepositories === input.repositories.length,
      severity: 'warning' as const,
      detail: `${licenceVerifiedRepositories}/${input.repositories.length} repositories have verified licence disposition.`,
    },
  ];
  return {
    allowedForControlledPilot: checks.filter((check) => check.severity === 'blocker').every((check) => check.ok),
    productionAccepted: false,
    checks,
    metrics: {
      approvedRepositories,
      registeredRepositories: input.repositories.length,
      liveRefreshedRepositories,
      licenceVerifiedRepositories,
      patternRecords: input.patterns.length,
      recordsWithClaimLineage,
      scoringCalibratedRecords,
    },
  };
}
