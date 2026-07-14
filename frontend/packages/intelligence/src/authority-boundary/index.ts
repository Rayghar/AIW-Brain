export interface IntelligenceAuthorityBoundary {
  mode: 'local-reference' | 'server-authoritative' | 'offline-signed';
  llmMayScore: false;
  llmMayMutateArchitecture: false;
  candidateKnowledgeMayInfluenceProduction: false;
  proposedChangeSetsRequireApproval: true;
}

export const defaultAuthorityBoundary: IntelligenceAuthorityBoundary = {
  mode: 'server-authoritative',
  llmMayScore: false,
  llmMayMutateArchitecture: false,
  candidateKnowledgeMayInfluenceProduction: false,
  proposedChangeSetsRequireApproval: true,
};

export function explainAuthorityBoundary(boundary: IntelligenceAuthorityBoundary = defaultAuthorityBoundary): string {
  return `AIW authority mode is ${boundary.mode}; LLM scoring, candidate-knowledge production influence and silent architecture mutation are disabled; proposed changes require approval.`;
}
