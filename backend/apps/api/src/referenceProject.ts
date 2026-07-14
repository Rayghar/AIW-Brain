import type { ArchitectureProject, ProjectMember } from '@aiw/domain';

const REFERENCE_PROJECT_MEMBERS: ReadonlyArray<Omit<ProjectMember, 'joinedAt'>> = [
  { id: 'reference-solution-architect', displayName: 'Reference Solution Architect', email: 'solution-architect@reference.aiw.invalid', role: 'architect', status: 'active' },
  { id: 'reference-enterprise-architect', displayName: 'Reference Enterprise Architect', email: 'enterprise-architect@reference.aiw.invalid', role: 'governance', status: 'active' },
  { id: 'reference-platform-architect', displayName: 'Reference Platform Architect', email: 'platform-architect@reference.aiw.invalid', role: 'architect', status: 'active' },
  { id: 'reference-reviewer', displayName: 'Reference Architecture Reviewer', email: 'reviewer@reference.aiw.invalid', role: 'reviewer', status: 'active' },
  { id: 'reference-knowledge-curator', displayName: 'Reference Knowledge Curator', email: 'knowledge-curator@reference.aiw.invalid', role: 'viewer', status: 'active' },
  { id: 'reference-administrator', displayName: 'Reference Platform Administrator', email: 'administrator@reference.aiw.invalid', role: 'owner', status: 'active' },
];

export function withReferenceMembers(projectInput: ArchitectureProject): ArchitectureProject {
  const project = structuredClone(projectInput);
  const joinedAt = project.updatedAt || new Date().toISOString();
  for (const member of REFERENCE_PROJECT_MEMBERS) {
    if (!project.members.some((item) => item.id === member.id)) project.members.push({ ...member, joinedAt });
  }
  return project;
}

export function memberSetsMatch(left: ProjectMember[], right: ProjectMember[]): boolean {
  const normalize = (members: ProjectMember[]) => [...members]
    .map(({ id, displayName, email, role, status, joinedAt }) => ({ id, displayName, email, role, status, joinedAt }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}
