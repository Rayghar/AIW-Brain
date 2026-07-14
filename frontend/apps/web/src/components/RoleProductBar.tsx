import { Boxes, BrainCircuit, Command, DatabaseZap, Layers3, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import type { ExperienceProfileId, WorkspaceModeId } from '../lib/experienceProfiles';
import { roleShellDefinition, type RoleShellTarget } from '../lib/roleProductShell';
import type { ArchitectureStage } from '@aiw/domain';

const roleIcons = {
  'solution-architect': Layers3,
  'enterprise-architect': Boxes,
  'platform-architect': SlidersHorizontal,
  reviewer: ShieldCheck,
  'knowledge-curator': DatabaseZap,
  administrator: BrainCircuit,
} as const;

export interface RoleProductBarProps {
  roleId: ExperienceProfileId;
  workspaceMode: WorkspaceModeId;
  activeStage: ArchitectureStage;
  onNavigate: (target: RoleShellTarget) => void;
  onOpenCommand: () => void;
}


const workspaceLabels: Partial<Record<WorkspaceModeId,string>> = {
  cockpit: 'Project Cockpit',
  portfolio: 'Portfolio Intelligence',
  comparison: 'Architecture Comparison',
  governance: 'Governance',
  knowledge: 'Knowledge Studio',
  patterns: 'Architecture Composition',
  synthesis: 'Architecture Options',
  pilot: 'Evaluation Lab',
  runtime: 'Observed Architecture',
  operations: 'Operational Intelligence',
};

const stageLabels: Record<ArchitectureStage,string> = {
  designIntent: 'Requirements & Intent',
  logicalApplication: 'Logical Application',
  applicationRealization: 'Application Realisation',
  logicalTechnology: 'Logical Technology',
  physicalTechnology: 'Physical Technology',
  validationRealization: 'Review & Assurance',
};

export function RoleProductBar({ roleId, workspaceMode, activeStage, onOpenCommand }: RoleProductBarProps) {
  const definition = roleShellDefinition(roleId);
  const Icon = roleIcons[roleId];
  const location = workspaceMode === 'design' ? stageLabels[activeStage] : workspaceLabels[workspaceMode] ?? workspaceMode.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
  return (
    <section className={`role-product-bar role-product-bar--${roleId} role-product-bar--context`} aria-label={`${definition.shell} context`}>
      <div className="role-product-bar__identity">
        <span><Icon size={16}/></span>
        <div><strong>{definition.shell}</strong><small>{definition.purpose}</small></div>
      </div>
      <div className="role-product-bar__location" aria-label="Current workspace"><span>Current workspace</span><strong>{location}</strong></div>
      <button type="button" className="role-product-bar__command" onClick={onOpenCommand} title="Open the AIW command surface"><Command size={15}/><span>Command</span></button>
    </section>
  );
}
