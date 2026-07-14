export interface RecommendationItem {
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  action?: string;
  evidenceReferences?: string[];
}

export interface ArchitectureCritiqueResponse {
  summary: string;
  findings: RecommendationItem[];
  recommendations: RecommendationItem[];
  risks: RecommendationItem[];
  confidence: number;
  requiresHumanReview: boolean;
}

export interface StyleRecommendationExplanation {
  selectedStyle?: string;
  summary: string;
  fitRationale: string[];
  tradeOffs: string[];
  conflicts: string[];
  supportingPatterns: string[];
  confidence: number;
  requiresHumanReview: boolean;
}

export interface PatternRecommendationExplanation {
  pattern: string;
  whyItFits: string[];
  obligations: string[];
  conflicts: string[];
  relatedPatterns: string[];
  confidence: number;
}

export interface InterfaceSuggestionResponse {
  summary: string;
  suggestedInterfaces: Array<{
    name: string;
    kind: 'api' | 'event' | 'command' | 'data-contract' | 'port';
    from?: string;
    to?: string;
    responsibility: string;
    candidateFields?: string[];
  }>;
  risks: RecommendationItem[];
  confidence: number;
}

export interface SDDSectionDraftResponse {
  sectionName: string;
  markdown: string;
  assumptions: string[];
  evidenceReferences: string[];
  gaps: string[];
  confidence: number;
  requiresHumanReview: boolean;
}

export interface DecisionRadarResponse {
  summary: string;
  decisionQuality: 'weak' | 'emerging' | 'defensible' | 'strong';
  openQuestions: string[];
  missingEvidence: string[];
  riskyAssumptions: string[];
  recommendedNextActions: string[];
  confidence: number;
}

export type KnownLlmOutput =
  | ArchitectureCritiqueResponse
  | StyleRecommendationExplanation
  | PatternRecommendationExplanation
  | InterfaceSuggestionResponse
  | SDDSectionDraftResponse
  | DecisionRadarResponse;
