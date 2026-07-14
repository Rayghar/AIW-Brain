export interface ArchitecturePromptContextInput {
  project: {
    id: string;
    name: string;
    domain?: string;
    description?: string;
  };
  stage: string;
  drivers?: Array<{ name: string; priority?: number; scenario?: string }>;
  forces?: string[];
  acceptedStyles?: string[];
  candidateStyles?: Array<{ name: string; score?: number; rationale?: string }>;
  acceptedPatterns?: string[];
  objects?: Array<{ id: string; type: string; name: string; responsibilities?: string[] }>;
  interfaces?: Array<{ id: string; from?: string; to?: string; kind: string; name: string }>;
  deterministicFindings?: Array<{ title: string; severity: string; message: string }>;
  evidence?: Array<{ title: string; source: string; confidence?: number }>;
}

export function buildArchitecturePromptContext(input: ArchitecturePromptContextInput): Record<string, unknown> {
  return {
    project: input.project,
    stage: input.stage,
    qualityDrivers: input.drivers ?? [],
    architecturalForces: input.forces ?? [],
    acceptedStyles: input.acceptedStyles ?? [],
    candidateStyles: input.candidateStyles ?? [],
    acceptedPatterns: input.acceptedPatterns ?? [],
    architectureObjects: input.objects ?? [],
    interfaces: input.interfaces ?? [],
    deterministicFindings: input.deterministicFindings ?? [],
    governedEvidence: input.evidence ?? [],
    instruction: 'Use the supplied AIW kernel findings and governed evidence. Do not invent official architecture facts. Return only schema-compliant output.',
  };
}
