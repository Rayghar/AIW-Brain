import type { AiwLifecycleStage } from '@aiw/brain-runtime';

export interface StageCoArchitectPrompt {
  id: string;
  label: string;
  instruction: string;
  taskType: string;
}

export const CO_ARCHITECT_PROMPTS_BY_STAGE: Record<AiwLifecycleStage, StageCoArchitectPrompt[]> = {
  'requirements-intent': [
    { id: 'clarify-scope', label: 'Clarify scope', instruction: 'Ask the missing questions needed to clarify the architecture scope.', taskType: 'generate-design-interview-questions' },
    { id: 'extract-constraints', label: 'Extract constraints', instruction: 'Extract business, regulatory, technology, and operational constraints.', taskType: 'critique-architecture' },
  ],
  'quality-drivers': [
    { id: 'complete-scenarios', label: 'Complete quality scenarios', instruction: 'Turn the current quality drivers into measurable quality attribute scenarios.', taskType: 'generate-design-interview-questions' },
    { id: 'detect-driver-conflicts', label: 'Find driver conflicts', instruction: 'Identify tensions between the current quality drivers and explain the trade-offs.', taskType: 'critique-architecture' },
  ],
  'system-context': [
    { id: 'challenge-boundary', label: 'Challenge boundary', instruction: 'Identify missing actors, external systems, trust boundaries and interactions in the current System Context.', taskType: 'critique-architecture' },
    { id: 'trace-journeys', label: 'Trace journeys', instruction: 'Trace accepted stakeholder journeys into the System Context and identify any missing interaction.', taskType: 'critique-architecture' },
  ],
  'logical-application': [
    { id: 'find-missing-services', label: 'Find missing services', instruction: 'Identify missing domains, services, APIs, data ownership, and boundaries.', taskType: 'critique-architecture' },
    { id: 'suggest-interfaces', label: 'Suggest interfaces', instruction: 'Suggest inbound and outbound interfaces for selected logical services.', taskType: 'draft-interface-contract' },
    { id: 'compare-patterns', label: 'Compare patterns', instruction: 'Compare the most relevant patterns for the current drivers and style.', taskType: 'compare-pattern-tradeoffs' },
  ],
  'application-realization': [
    { id: 'check-deployable-units', label: 'Check deployable units', instruction: 'Critique service/module packaging and deployable-unit boundaries.', taskType: 'critique-architecture' },
    { id: 'draft-contracts', label: 'Draft contracts', instruction: 'Draft contract responsibilities for selected services and adapters.', taskType: 'draft-interface-contract' },
  ],
  'logical-technology': [
    { id: 'recommend-platforms', label: 'Recommend platforms', instruction: 'Suggest runtime, data, messaging, identity, and observability capabilities.', taskType: 'critique-architecture' },
    { id: 'explain-tech-tradeoffs', label: 'Explain trade-offs', instruction: 'Explain the main technology trade-offs for the selected style and patterns.', taskType: 'explain-style-fit' },
  ],
  'physical-technology': [
    { id: 'check-topology', label: 'Check topology', instruction: 'Critique topology, zones, resilience, deployment, and telemetry readiness.', taskType: 'critique-architecture' },
    { id: 'prepare-run-notes', label: 'Prepare run notes', instruction: 'Prepare operational and deployment notes for review handoff.', taskType: 'prepare-review-notes' },
  ],
  'review-assurance': [
    { id: 'review-architecture', label: 'Review architecture', instruction: 'Produce review findings, blockers, strengths, and recommended decisions.', taskType: 'prepare-review-notes' },
    { id: 'explain-risks', label: 'Explain risks', instruction: 'Explain unresolved risks and the evidence required to close them.', taskType: 'critique-architecture' },
  ],
  'sdd-pack': [
    { id: 'draft-sdd', label: 'Draft SDD section', instruction: 'Draft the missing or weak SDD sections using current architecture evidence.', taskType: 'draft-sdd-section' },
    { id: 'final-readiness', label: 'Check final readiness', instruction: 'Check whether the architecture is ready for SDD delivery pack generation.', taskType: 'critique-architecture' },
  ],
};
