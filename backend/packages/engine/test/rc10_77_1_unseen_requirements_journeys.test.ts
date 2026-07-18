import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject } from '@aiw/domain';
import { distillRequirementsDeterministically } from '../src/requirementsGenesis.js';

describe('unseen requirements journey derivation', () => {
  it('derives a governed assisted-service journey from explicit customer-request evidence', () => {
    const project = structuredClone(sampleProject) as ArchitectureProject;
    project.name = 'Unseen regulated assisted service';
    const proposal = distillRequirementsDeterministically({
      project,
      sources: [{
        name: 'brief.txt',
        kind: 'paste',
        text: 'The human service journey must accept a customer request, retrieve governed evidence, produce a bounded recommendation for agent approval, escalate uncertainty and preserve an audit trail. Model failure must use deterministic fallback.',
      }],
    });
    expect(proposal.journeys).toHaveLength(1);
    expect(proposal.journeys[0]?.name).toBe('Assisted service request');
    expect(proposal.journeys[0]?.requirementRefs.length).toBeGreaterThan(0);
    expect(proposal.journeys[0]?.architectureObligations).toContain('Human approval or escalation');
  });
});
