import { readFile } from 'node:fs/promises';
import { synthesisStrategyIds } from '@aiw/domain';
import {
  sprint78KnowledgeReleaseManifest,
  portfolioIntelligencePlatformRelease,
  pilotEvaluationPlatformRelease,
  productionAcceptancePlatformRelease,
} from '@aiw/engine';

export function sprint878PlatformRelease() {
  return {
    releaseId: 'AIW-0.10.0-rc.6',
    version: '0.10.0-rc.6',
    sprint: '8.7.8-intelligence-activation-admin-console',
    status: 'implemented',
    knowledgeReleaseId: 'AKR-0.10.60',
    capabilities: {
      intelligenceActivationWizard: true,
      guidedArchitectureBriefAuthoring: true,
      scenarioTemplateLibrary: ['payments','saas','legacy-modernization'],
      firstArchitectureModelGeneration: true,
      visualModelHandoff: true,
      llmConfigurationAdmin: true,
      repositoryEvidenceOnboarding: true,
      knowledgeGovernanceAdmin: true,
      runtimeAcceptanceAdmin: true,
      releaseFinalizationControls: true,
      deterministicOfflineMode: true,
    },
    governanceBoundary: 'The admin console can configure routes and expose setup evidence, but LLMs, repositories and runtime probes still cannot silently mutate governed architecture state or bypass production-acceptance evidence.',
  };
}

export function sprint879PlatformRelease() {
  return {
    releaseId: 'AIW-0.10.0-rc.6',
    version: '0.10.0-rc.6',
    sprint: '8.7.9-direct-canvas-manipulation-ux-hardening',
    status: 'implemented',
    knowledgeReleaseId: 'AKR-0.10.60',
    capabilities: {
      directNodeResizeHandles: true,
      lockedPresentationObjects: true,
      numericInspectorSizing: true,
      autoFitObjectSizing: true,
      multiSelectionState: true,
      alignmentControls: ['left','center','top'],
      distributionControls: ['horizontal','vertical'],
      bulkSizingControls: true,
      directManipulationGuidance: true,
      semanticArchitecturePreserved: true,
      deterministicOfflineMode: true,
    },
    governanceBoundary: 'Canvas manipulation changes presentation metadata, positions and view layout only. Architecture semantics, recommendations and mutations remain governed by the canonical architecture model and human-approved workflows.',
  };
}

export function adminConfigurationSummary() {
  const env = process.env;
  const configured = (name: string) => Boolean(env[name] && String(env[name]).trim());
  const llmProvider = env.AIW_LLM_PROVIDER ?? (env.OPENAI_API_KEY ? 'openai' : 'deterministic-fallback');
  return {
    version: '0.10.0-rc.10.4',
    releaseId: 'AIW-0.10.0-rc.10.4',
    generatedAt: new Date().toISOString(),
    secretValuesExposed: false,
    llm: {
      configured: configured('OPENAI_API_KEY') || configured('AZURE_OPENAI_API_KEY') || configured('ANTHROPIC_API_KEY') || configured('AIW_LLM_RUNTIME_CONFIG_PATH'),
      provider: env.AIW_LLM_PROVIDER ?? llmProvider,
      model: env.AIW_LLM_MODEL ?? 'not configured',
      protocol: env.AIW_LLM_PROTOCOL ?? 'responses',
      structuredOutputRequired: env.AIW_LLM_REQUIRE_STRUCTURED_OUTPUT !== 'false',
      fallbackAllowed: env.AIW_LLM_ALLOW_FALLBACK !== 'false',
    },
    repository: {
      githubKnowledgeEnabled: env.AIW_ENABLE_GITHUB_KNOWLEDGE === 'true',
      repositoryWritesEnabled: env.AIW_ENABLE_REPOSITORY_WRITES === 'true',
      githubTokenConfigured: configured('AIW_GITHUB_TOKEN') || configured('GITHUB_TOKEN'),
      repositoryTokenConfigured: configured('AIW_REPOSITORY_TOKEN'),
    },
    runtime: {
      acceptanceMode: env.AIW_RUNTIME_ACCEPTANCE_MODE ?? 'report',
      requiredChecks: (env.AIW_RUNTIME_REQUIRED_CHECKS ?? '').split(',').map((value) => value.trim()).filter(Boolean),
      databaseConfigured: configured('DATABASE_URL'),
      vectorIndexingEnabled: env.AIW_ENABLE_VECTOR_INDEXING === 'true',
      objectStoreConfigured: configured('AIW_OBJECT_STORE_ENDPOINT') || configured('AIW_S3_BUCKET') || configured('MINIO_ROOT_USER'),
      oidcConfigured: configured('AIW_OIDC_ISSUER') || configured('OIDC_ISSUER'),
      otelConfigured: configured('AIW_OTEL_EXPORTER_OTLP_ENDPOINT') || configured('OTEL_EXPORTER_OTLP_ENDPOINT'),
      signingConfigured: configured('AIW_RELEASE_PRIVATE_KEY_PEM') || configured('AIW_RELEASE_PRIVATE_KEY_PATH'),
    },
    governance: {
      knowledgeReleaseId: 'AKR-0.10.60',
      candidateKnowledgeCanScore: false,
      releaseSigningConfigured: configured('AIW_RELEASE_PRIVATE_KEY_PEM') || configured('AIW_RELEASE_PRIVATE_KEY_PATH'),
      productionFinalAllowedWithoutEvidence: false,
    },
  };
}

export async function releasePrivateKeyPem(): Promise<string> {
  if (process.env.AIW_RELEASE_PRIVATE_KEY_PEM) return process.env.AIW_RELEASE_PRIVATE_KEY_PEM.replace(/\\n/g, '\n');
  if (process.env.AIW_RELEASE_PRIVATE_KEY_PATH) return readFile(process.env.AIW_RELEASE_PRIVATE_KEY_PATH, 'utf8');
  throw new Error('RELEASE_SIGNING_KEY_NOT_CONFIGURED');
}

export function sprint79KnowledgeRelease() {
  const previous = sprint78KnowledgeReleaseManifest();
  return {
    ...previous,
    version: '0.8.9',
    releaseId: 'AKR-0.8.9',
    status: 'approved' as const,
    operationalization: {
      configurableLlmGateway: true,
      githubRefreshPipeline: true,
      objectStoragePersistence: true,
      pgvectorRetrieval: true,
      externalFitnessDelivery: true,
      conformanceEvidenceAdapters: true,
      externalEd25519Verification: true,
    },
  };
}

export function sprint80PlatformRelease() {
  return {
    releaseId: 'AIW-0.9.0',
    version: '0.9.0',
    sprint: '8.0',
    status: 'implemented',
    knowledgeReleaseId: 'AKR-0.8.9',
    deterministicSimulationModel: 'aiw-simulation-1.0',
    capabilities: {
      designBriefAssessment: true,
      governedAlternativeSynthesis: true,
      diversifiedStrategyPostures: synthesisStrategyIds,
      deterministicScenarioSimulation: true,
      paretoComparison: true,
      llmNarrativeEnrichment: true,
      canonicalModelApplication: true,
      decisionPackageGeneration: true,
      calmAndMermaidExport: true,
      fitnessAndConformanceHandoff: true,
    },
    governanceBoundary: 'The LLM may explain bounded alternatives but cannot change eligibility, Pattern DNA, scores, topology, simulations or approval state.',
  };
}

export function sprint801PlatformRelease() {
  return {
    releaseId: 'AIW-0.9.1',
    version: '0.9.1',
    sprint: '8.0.1',
    status: 'implemented',
    knowledgeReleaseId: 'AKR-0.8.9',
    capabilities: {
      stableIdTraitScoring: true,
      applicabilityGating: true,
      calibratedQualityControls: true,
      pendingDriverProtection: true,
      providerNeutralEmbeddedCoArchitect: true,
      reversibleEvidenceBoundedProposals: true,
      contextualVisualKnowledgeGuide: true,
      deterministicFallback: true,
      recommendationRegressionGate: true,
    },
    governanceBoundary: 'The LLM may explain and propose reversible changes, but deterministic rules, approved knowledge, eligibility, scores and human approval remain authoritative.',
  };
}

export function sprint802PlatformRelease() {
  return {
    releaseId: 'AIW-0.9.2',
    version: '0.9.2',
    sprint: '8.0.2',
    status: 'implemented',
    knowledgeReleaseId: 'AKR-0.8.9',
    capabilities: {
      governedProjectHub: true,
      serverAuthoritativeAutosave: true,
      optimisticConcurrencyAndOfflineFallback: true,
      durableSnapshots: true,
      measurableQualityScenarioEditor: true,
      aiAssistedBriefStructuring: true,
      fullPatternDnaRetrievalInWorkbench: true,
      nodeAnchoredVisualGuidance: true,
      stageExitGates: true,
      durableCoArchitectAndAuditTrace: true,
      realtimePresenceAndActivity: true,
      tenantConfigurableLlmRoutes: true,
      persistedSynthesisRunsAndSimulations: true,
      undoRedo: true,
      responsiveAndRtlFoundation: true,
    },
    governanceBoundary: 'Server state is authoritative when connected. AI and knowledge guidance remain evidence-bounded, reversible and human-controlled, with a deterministic offline path.',
  };
}

export function reconciledPlatformRelease() {
  return {
    releaseId: 'AIW-0.9.6',
    version: '0.9.6',
    sprint: '8.0.3-reconciled',
    status: 'implemented',
    knowledgeReleaseId: 'AKR-0.10.60',
    basedOn: 'AIW-0.9.2',
    mergedIntelligenceBranch: 'AIW-0.9.5-selective',
    capabilities: {
      integratedProjectJourney: true,
      serverAuthoritativeProjects: true,
      persistentCoArchitect: true,
      realtimeCollaborationRuntime: true,
      structuredEnterpriseBrief: true,
      honestCalibrationLifecycle: true,
      stableIdTraitScoring: true,
      releaseBoundKnowledgeRetrieval: true,
      deterministicCitationWhitelist: true,
      selectedObjectStageAdvisor: true,
      humanGatedKnowledgeDraftingAndPromotion: true,
      recommendationSemanticRegression: true,
      productionKnowledgeGate: true,
      webAndApiProductionDeployment: true,
    },
    governanceBoundary: 'Only approved, evidence-bearing records from AKR-0.10.60 may ground production advice. LLM output is citation-resolved, reversible and human-controlled.',
  };
}


export function hardeningPlatformRelease() {
  return {
    releaseId: 'AIW-0.9.7',
    version: '0.9.7',
    sprint: '8.0.4-hardening',
    status: 'implemented',
    knowledgeReleaseId: 'AKR-0.10.60',
    basedOn: 'AIW-0.9.6',
    capabilities: {
      roleBasedProgressiveDisclosure: true,
      coreInternationalizedShell: true,
      rtlAndAccessibleNavigationFoundation: true,
      accessibleCanvasOutline: true,
      offlineInstallableShell: true,
      honestCalibrationReviewPack: true,
      knowledgeDepthScoringAndRetrievalGate: true,
      approvedEmpiricalSimulationCalibration: true,
      platformAcceptanceEvidenceReport: true,
      criticalPatternEditorialEnrichment: true,
    },
    externalAcceptanceRequired: [
      'Expert approval of draft quality-attribute calibrations',
      'Credentialed provider, GitHub, PostgreSQL, object-storage, CI and telemetry acceptance',
      'Complete professional translation and WCAG 2.2 AA audit',
      'Empirical evidence collection for project-specific simulation profiles',
    ],
    governanceBoundary: 'Unreviewed calibration cannot score, shallow knowledge cannot lead, comparative simulation cannot present itself as measured fact, and configured integrations cannot present themselves as production-verified.',
  };
}


export function embeddedIntelligencePlatformRelease() {
  return {
    releaseId: 'AIW-0.9.9',
    version: '0.9.9',
    sprint: '8.6-embedded-intelligence',
    status: 'implemented',
    knowledgeReleaseId: 'AKR-0.10.60',
    basedOn: 'AIW-0.9.7',
    capabilities: {
      unifiedArchitectureEventModel: true,
      canonicalIntelligenceContext: true,
      governedReleaseBoundRetrieval: true,
      adaptiveComponentRanking: true,
      intelligenceReviewedConnections: true,
      attributeConsequenceAnalysis: true,
      continuousArchitectureCritique: true,
      rankedNextBestActions: true,
      reversibleHumanApprovedChangeSets: true,
      evidenceAndIntelligenceTrace: true,
      candidateKnowledgeExcludedFromProduction: true,
      offlineDeterministicOperation: true,
    },
    calibrationBoundary: {
      productionCalibratedAttributes: 8,
      aiDraftedAttributesPendingIndependentReview: 12,
      unreviewedAttributesAffectProductionScoring: false,
    },
    governanceBoundary: 'Every Design Studio event is evaluated against the canonical model and approved AKR-0.10.60 knowledge release. Candidate knowledge cannot drive production advice, and architecture mutations remain deterministic, reversible and human-approved.',
  };
}


export function fullJourneyIntelligencePlatformRelease() {
  return {
    releaseId: 'AIW-0.10.0-alpha.1',
    version: '0.10.0-alpha.1',
    sprint: '8.7.1-full-journey-kernel-migration',
    status: 'implemented-alpha',
    knowledgeReleaseId: 'AKR-0.10.60',
    basedOn: 'AIW-0.9.9',
    capabilities: {
      unifiedArchitectureEventModel: true,
      fullJourneyWorkspaceContext: true,
      kernelProjectedVisualModels: true,
      designBriefVisualIntelligence: true,
      qualityTradeoffVisualIntelligence: true,
      synthesisVisualIntelligence: true,
      patternCompositionVisualIntelligence: true,
      governanceVisualIntelligence: true,
      realizationVisualIntelligence: true,
      canonicalEvidenceAndReasoningTrace: true,
      reversibleHumanApprovedChangeSets: true,
      candidateKnowledgeExcludedFromProduction: true,
      offlineDeterministicOperation: true,
    },
    visualModelBoundary: 'Architecture modelling is an interactive node-and-relationship graph. Text is supporting metadata, not the primary modelling surface.',
    governanceBoundary: 'Every migrated lifecycle workspace consumes one kernel response contract and visual projection from the canonical project. Model changes remain deterministic, reviewable and human-approved.',
  };
}


export function continuousConformancePlatformRelease() {
  return {
    releaseId: 'AIW-0.10.0-alpha.3',
    version: '0.10.0-alpha.3',
    sprint: '8.7.3-realization-continuous-conformance',
    status: 'implemented-alpha',
    knowledgeReleaseId: 'AKR-0.10.60',
    basedOn: 'AIW-0.10.0-alpha.2',
    capabilities: {
      projectScopedConformancePlans: true,
      patternAndObjectFitnessArtifacts: true,
      ciEvidenceNormalization: true,
      intendedVersusActualAssessment: true,
      explicitUnverifiedControlState: true,
      explainableConformanceGate: true,
      visualConformanceGraph: true,
      governedRemediationChangeSets: true,
      automaticArchitectureMutationDisabled: true,
      deterministicOfflineAssessment: true,
    },
    conformanceBoundary: 'A configured control is not considered passed. It remains unverified until matching execution or model evidence is evaluated.',
    governanceBoundary: 'Remediation is generated as a reviewable change set. AIW does not silently mutate architecture models or implementation repositories.',
  };
}

export function enterpriseRuntimePlatformRelease() {
  return {
    releaseId: 'AIW-0.10.0-alpha.2',
    version: '0.10.0-alpha.2',
    sprint: '8.7.2-enterprise-runtime-activation',
    status: 'implemented-alpha',
    knowledgeReleaseId: 'AKR-0.10.60',
    basedOn: 'AIW-0.10.0-alpha.1',
    capabilities: {
      activePostgresRlsProbe: true,
      objectStoreRoundTripProbe: true,
      pgvectorExtensionProbe: true,
      oidcDiscoveryAndJwksProbe: true,
      githubCredentialedRepositoryProbe: true,
      governedLlmStructuredOutputProbe: true,
      otlpSyntheticSpanProbe: true,
      releaseSigningKeyProbe: true,
      tenantScopedAcceptanceEvidence: true,
      enforceableStartupAcceptancePolicy: true,
      enterpriseRuntimeWorkspace: true,
      deterministicOfflineFallback: true,
    },
    acceptanceBoundary: 'Environment variables prove configuration only. Verified status requires an active runtime probe, retained evidence and the configured required-check policy.',
    governanceBoundary: 'External services enrich and persist the workbench, but deterministic architecture rules, approved knowledge, tenant isolation and human approval remain authoritative.',
  };
}



export const historicalReleaseHandlers = {
  sprint878PlatformRelease,
  sprint879PlatformRelease,
  sprint79KnowledgeRelease,
  sprint80PlatformRelease,
  sprint801PlatformRelease,
  sprint802PlatformRelease,
  reconciledPlatformRelease,
  hardeningPlatformRelease,
  embeddedIntelligencePlatformRelease,
  fullJourneyIntelligencePlatformRelease,
  continuousConformancePlatformRelease,
  enterpriseRuntimePlatformRelease,
  portfolioIntelligencePlatformRelease,
  pilotEvaluationPlatformRelease,
  productionAcceptancePlatformRelease,
};
