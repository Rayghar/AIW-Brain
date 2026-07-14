import { describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import {
  architectureBreadcrumb,
  architectureChildren,
  architectureScopesForLevel,
  inferArchitectureDecompositionLevel,
  resolveDecompositionVisibleNodeIds,
  validateArchitectureDecomposition,
} from '../src/index.js';

describe('rc.10.62 interactive architecture decomposition', () => {
  it('builds explicit system, container, component, code and deployment levels', () => {
    const project = structuredClone(sampleProject);
    expect(architectureScopesForLevel(project, 'system').some((node) => node.id === 'system-order-payment')).toBe(true);
    expect(architectureScopesForLevel(project, 'container').some((node) => node.id === 'deployable-order-api')).toBe(true);
    expect(architectureScopesForLevel(project, 'component').some((node) => node.id === 'module-order-outbox')).toBe(true);
    expect(architectureScopesForLevel(project, 'code').some((node) => node.id === 'code-order-command-handler')).toBe(true);
    expect(architectureScopesForLevel(project, 'deployment').some((node) => node.id === 'physical-container-platform')).toBe(true);
  });

  it('supports click-through scope resolution and breadcrumbs', () => {
    const project = structuredClone(sampleProject);
    const systemChildren = architectureChildren(project, 'system-order-payment').map((node) => node.id);
    expect(systemChildren).toContain('deployable-order-api');
    const containerView = resolveDecompositionVisibleNodeIds(project, 'component', 'deployable-order-api');
    expect(containerView.has('deployable-order-api')).toBe(true);
    expect(containerView.has('module-order-outbox')).toBe(true);
    expect(containerView.has('code-order-command-handler')).toBe(true);
    expect(containerView.has('module-payment-adapter')).toBe(false);
    const trail = architectureBreadcrumb(project, 'code-order-command-handler').map((node) => node.id);
    expect(trail).toEqual(['system-order-payment','deployable-order-api','module-order-outbox','code-order-command-handler']);
  });

  it('classifies sample objects and reports hierarchy quality without losing findings', () => {
    const project = structuredClone(sampleProject);
    const code = project.nodes.find((node) => node.id === 'code-payment-provider-client')!;
    expect(inferArchitectureDecompositionLevel(code)).toBe('code');
    const report = validateArchitectureDecomposition(project);
    expect(report.countsByLevel.system).toBeGreaterThan(0);
    expect(report.countsByLevel.container).toBeGreaterThan(0);
    expect(report.countsByLevel.component).toBeGreaterThan(0);
    expect(report.countsByLevel.code).toBe(2);
    expect(report.issues.every((issue) => issue.message.length > 0 && issue.remediation.length > 0)).toBe(true);
    expect(report.valid).toBe(true);
    expect(report.issues.some((issue) => issue.severity === 'blocker')).toBe(false);
  });
});
