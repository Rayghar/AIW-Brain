import { describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { resolveLifecycleStatus } from '../lifecycleStatusService';

describe('authoritative lifecycle status', () => {
  it('uses the explicit System Context lifecycle step instead of inferring Logical Application', () => {
    const project = structuredClone(sampleProject);
    project.activeStage = 'logicalApplication';
    const result = resolveLifecycleStatus(project, undefined, 'context');
    expect(result.active.id).toBe('context');
    expect(result.current.id).toBe('context');
  });

  it('uses the explicit SDD lifecycle step instead of collapsing it into Review', () => {
    const project = structuredClone(sampleProject);
    project.activeStage = 'validationRealization';
    const result = resolveLifecycleStatus(project, undefined, 'sdd');
    expect(result.active.id).toBe('sdd');
    expect(result.current.id).toBe('sdd');
  });

  it('does not recommend an earlier Requirements stage when the architect is working in Physical Technology', () => {
    const project = structuredClone(sampleProject);
    project.activeStage = 'physicalTechnology';
    // Deliberately make the brief incomplete: an upstream warning must remain visible
    // without moving the working frontier backwards.
    project.description = '';
    project.objectives = [];
    const result = resolveLifecycleStatus(project, undefined, 'physicalTechnology');
    expect(result.active.id).toBe('physicalTechnology');
    expect(result.current.id).toBe('physicalTechnology');
    expect(result.next.index).toBeGreaterThanOrEqual(result.active.index);
  });

  it('keeps overview compatible with the architecture-stage projection', () => {
    const project = structuredClone(sampleProject);
    project.activeStage = 'applicationRealization';
    const result = resolveLifecycleStatus(project, undefined, 'overview');
    expect(result.active.id).toBe('realization');
  });
});
