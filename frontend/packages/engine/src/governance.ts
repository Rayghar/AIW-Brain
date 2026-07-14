import { createId, type ArchitectureProject, type Finding, type GovernanceRule, type KnowledgeLibrary, type StageApproval } from '@aiw/domain';

function makeFinding(rule: GovernanceRule, message: string, affectedNodeIds: string[] = []): Finding {
  return {
    id: createId('finding'),
    ruleId: rule.id,
    severity: rule.severity,
    title: rule.title,
    message,
    rationale: rule.rationale,
    affectedNodeIds,
    affectedEdgeIds: [],
    mitigations: rule.mitigations,
    canOverride: rule.severity !== 'HARD',
  };
}

export function evaluateGovernanceRulePacks(project: ArchitectureProject, library: KnowledgeLibrary): Finding[] {
  const packs = library.rulePacks.filter((pack) => project.activeRulePackIds.includes(pack.id) && pack.status === 'approved');
  const findings: Finding[] = [];
  for (const rule of packs.flatMap((pack) => pack.rules).filter((item) => item.enabled)) {
    const p = rule.parameters;
    if (rule.predicate === 'PROHIBIT_TECHNOLOGY') {
      const terms = (p.terms as string[] | undefined) ?? [];
      const hits = project.nodes.filter((node) => terms.some((term) => node.label.toLowerCase().includes(term.toLowerCase())));
      if (hits.length) findings.push(makeFinding(rule, `The active rule pack prohibits: ${hits.map((node) => node.label).join(', ')}.`, hits.map((node) => node.id)));
    }
    if (rule.predicate === 'REQUIRE_NODE_KIND') {
      const kind = String(p.kind ?? '');
      const stage = p.stage ? String(p.stage) : undefined;
      const applies = !stage || project.nodes.some((node) => node.stage === stage);
      if (applies && !project.nodes.some((node) => node.kind === kind && (!stage || node.stage === stage))) {
        findings.push(makeFinding(rule, `A ${kind} is required${stage ? ` in ${stage}` : ''}, but none is modeled.`));
      }
    }
    if (rule.predicate === 'REQUIRE_PROPERTY') {
      const kind = String(p.kind ?? '');
      const property = String(p.property ?? '');
      const expected = p.expected;
      const hits = project.nodes.filter((node) => node.kind === kind && node.properties[property] !== expected);
      if (hits.length) findings.push(makeFinding(rule, `${hits.length} ${kind} component(s) do not set ${property} to the required value.`, hits.map((node) => node.id)));
    }
    if (rule.predicate === 'REQUIRE_PATTERN') {
      const patternId = String(p.patternId ?? '');
      const triggerTag = String(p.triggerTag ?? '');
      const triggered = project.nodes.some((node) => node.tags.includes(triggerTag));
      const selected = project.patternSelections.some((selection) => selection.patternId === patternId && selection.status === 'accepted');
      if (triggered && !selected) findings.push(makeFinding(rule, `${patternId} must be accepted when components tagged “${triggerTag}” are present.`));
    }
    if (rule.predicate === 'REQUIRE_DECISION') {
      const phrase = String(p.phrase ?? '').toLowerCase();
      if (!project.decisions.some((decision) => `${decision.title} ${decision.decision}`.toLowerCase().includes(phrase) && decision.status === 'accepted')) {
        findings.push(makeFinding(rule, `An accepted architecture decision covering “${phrase}” is required.`));
      }
    }
    if (rule.predicate === 'LIMIT_SINGLE_ZONE_CRITICAL') {
      const critical = project.nodes.filter((node) => node.stage === 'physicalTechnology' && (node.tags.includes('critical') || node.properties.critical === true));
      const hits = critical.filter((node) => Number(node.properties.availabilityZones ?? 1) < 2);
      if (hits.length) findings.push(makeFinding(rule, `Critical technology components must span at least two failure domains: ${hits.map((node) => node.label).join(', ')}.`, hits.map((node) => node.id)));
    }
  }
  return findings;
}

export function approvalReadiness(project: ArchitectureProject, stage: StageApproval['stage'], findings: Finding[], openObligations: number): { ready: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (findings.some((finding) => finding.severity === 'HARD')) blockers.push('Resolve all hard validation findings.');
  if (findings.some((finding) => finding.severity === 'SIGNIFICANT' && finding.affectedNodeIds.some((id) => project.nodes.find((node) => node.id === id)?.stage === stage))) blockers.push('Resolve or formally accept significant findings in this stage.');
  if (openObligations > 0) blockers.push(`Close or acknowledge ${openObligations} architecture obligation(s).`);
  if (!project.nodes.some((node) => node.stage === stage) && !['designIntent', 'validationRealization'].includes(stage)) blockers.push('Add at least one architecture element to this stage.');
  return { ready: blockers.length === 0, blockers };
}
