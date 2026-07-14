import { Activity, BookOpenCheck, Boxes, BrainCircuit, GitBranch, KeyRound, LibraryBig, ScrollText, Settings2, ShieldCheck, UserCog } from 'lucide-react';

export const adminNavigationEntries: Array<{
  id: string;
  label: string;
  caption: string;
  icon: typeof Boxes;
  workspace: 'admin' | 'knowledge';
  adminTab?: string;
}> = [
  { id: 'admin-overview', label: 'Admin Control Plane', caption: 'System posture and tenant control', icon: Settings2, workspace: 'admin', adminTab: 'overview' },
  { id: 'mind-factory', label: 'Mind Factory', caption: 'Ingestion to signed intelligence', icon: BrainCircuit, workspace: 'admin', adminTab: 'mindFactory' },
  { id: 'knowledge-governance', label: 'Knowledge Governance', caption: 'Review claims and contradictions', icon: BookOpenCheck, workspace: 'admin', adminTab: 'knowledgeGovernance' },
  { id: 'knowledge-sources', label: 'Knowledge Sources', caption: 'Trust, licence and coverage', icon: LibraryBig, workspace: 'admin', adminTab: 'sources' },
  { id: 'llm-routes', label: 'LLM Routes & API Keys', caption: 'Providers, secrets and policy', icon: KeyRound, workspace: 'admin', adminTab: 'models' },
  { id: 'github-repos', label: 'GitHub Repos', caption: 'Snapshots and repo ingestion', icon: GitBranch, workspace: 'admin', adminTab: 'repositories' },
  { id: 'workers', label: 'Workers', caption: 'Heartbeats, queues and jobs', icon: Activity, workspace: 'admin', adminTab: 'workers' },
  { id: 'audit', label: 'Audit', caption: 'Events and change evidence', icon: ScrollText, workspace: 'admin', adminTab: 'audit' },
  { id: 'tenant', label: 'Tenant Settings', caption: 'Identity and environment policy', icon: UserCog, workspace: 'admin', adminTab: 'tenant' },
  { id: 'production', label: 'Production Readiness', caption: 'Final production gate', icon: ShieldCheck, workspace: 'admin', adminTab: 'production' },
];
