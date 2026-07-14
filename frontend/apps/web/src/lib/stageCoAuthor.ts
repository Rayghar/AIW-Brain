import type {
  ArchitectureProject,
  ArchitectureStage,
  StageArchitectureExplanation,
  StageCoAuthorProposal,
  StageCoAuthorTarget,
} from '@aiw/domain';

export const stageCoAuthorTargetToArchitectureStage: Record<StageCoAuthorTarget, ArchitectureStage> = {
  requirements: 'designIntent',
  qualityDrivers: 'designIntent',
  systemContext: 'logicalApplication',
  logicalApplication: 'logicalApplication',
  applicationRealization: 'applicationRealization',
  logicalTechnology: 'logicalTechnology',
  physicalTechnology: 'physicalTechnology',
  reviewAssurance: 'validationRealization',
  sddPack: 'validationRealization',
};

export const stageCoAuthorTitles: Record<StageCoAuthorTarget, string> = {
  requirements: 'Requirements & Architecture Intent',
  qualityDrivers: 'Quality Drivers & Measurable Scenarios',
  systemContext: 'System Context & Interaction Boundaries',
  logicalApplication: 'Logical Application Architecture',
  applicationRealization: 'Application Realization',
  logicalTechnology: 'Logical Technology Architecture',
  physicalTechnology: 'Physical Technology & Deployment',
  reviewAssurance: 'Review & Assurance',
  sddPack: 'SDD & Delivery Pack',
};

function pendingExplanation(target: StageCoAuthorTarget): StageArchitectureExplanation {
  return {
    title: `${stageCoAuthorTitles[target]} — governed rationale`,
    stagePurpose: 'The Architecture Brain has not yet produced a proposal for this project revision.',
    businessOutcomeNarrative: 'Request Sol guidance to assemble a model-grounded explanation from the canonical project, deterministic kernel and pinned knowledge manifest.',
    requirementEnablement: [],
    designLogic: [],
    selectedComponents: [],
    interfacesAndFlow: [],
    qualityAttributeImpact: [],
    tradeOffSummary: [],
    risksAndOpenQuestions: [],
    downstreamConsequences: [],
    completionEvidence: [],
  };
}

/**
 * Creates presentation-only pending state. It deliberately contains no
 * architecture recommendation, field proposal or inferred rationale. All
 * design intelligence must come from the server-side AIW Brain Orchestrator.
 */
export function createPendingStageCoAuthorProposal(project: ArchitectureProject, target: StageCoAuthorTarget): StageCoAuthorProposal {
  return {
    schemaVersion: '1.0',
    mode: 'deterministic',
    targetStage: target,
    architectureStage: stageCoAuthorTargetToArchitectureStage[target],
    projectRevision: project.revision,
    generatedAt: new Date().toISOString(),
    summary: `Request the Architecture Brain to analyse ${stageCoAuthorTitles[target]} for this project revision.`,
    operations: [],
    clarifications: [],
    explanation: pendingExplanation(target),
    notice: 'Server authority is required. The browser does not generate alternative architecture advice or silently mutate the model.',
  };
}

export function evidenceLabel(project: ArchitectureProject, ref: string): string {
  const intelligence = project.requirementsIntelligence;
  const evidence = intelligence?.evidence.find((item) => item.id === ref);
  if (evidence) return evidence.excerpt || evidence.locator;
  const requirement = intelligence?.requirements.find((item) => item.id === ref);
  if (requirement) return requirement.title;
  const journey = intelligence?.journeys.find((item) => item.id === ref);
  if (journey) return journey.name;
  if (ref === 'project:description') return project.description || 'Project description';
  if (ref.startsWith('objective:')) return project.objectives[Number(ref.split(':')[1])] ?? ref;
  if (ref.startsWith('constraint:')) return project.constraints[Number(ref.split(':')[1])] ?? ref;
  if (ref.startsWith('assumption:')) return project.assumptions[Number(ref.split(':')[1])] ?? ref;
  if (ref.startsWith('quality-scenario:')) return project.qualityScenarios.find((item) => item.id === ref.slice('quality-scenario:'.length))?.responseMeasure ?? ref;
  if (ref.startsWith('node:')) return project.nodes.find((item) => item.id === ref.slice('node:'.length))?.label ?? ref;
  if (ref.startsWith('interface:')) return (project.interfaces ?? []).find((item) => item.id === ref.slice('interface:'.length))?.name ?? ref;
  return ref;
}
