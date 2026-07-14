export type KnowledgeDepthGrade = 'production-deep' | 'production-supporting' | 'needs-enrichment';

export interface KnowledgeDepthDimension {
  id: 'specificity' | 'applicability' | 'tradeoffs' | 'evidence' | 'operability' | 'realization' | 'conformance' | 'topology';
  label: string;
  score: number;
  maximum: number;
  notes: string[];
}

export interface KnowledgeDepthAssessment {
  recordId: string;
  recordName: string;
  score: number;
  grade: KnowledgeDepthGrade;
  primaryRecommendationEligible: boolean;
  dimensions: KnowledgeDepthDimension[];
  blockers: string[];
  warnings: string[];
  genericPhraseMatches: string[];
}

export interface KnowledgeDepthPortfolio {
  assessedAt: string;
  recordCount: number;
  productionDeep: number;
  productionSupporting: number;
  needsEnrichment: number;
  averageScore: number;
  assessments: KnowledgeDepthAssessment[];
}
