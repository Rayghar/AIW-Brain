import { Blocks, Boxes, ClipboardList, CloudCog, DatabaseZap, Network, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import type { ArchitectureStage } from '@aiw/domain';

export type LifecycleNavigationEntry =
  | { kind: 'stage'; id: ArchitectureStage; label: string; caption: string; icon: typeof Boxes }
  | { kind: 'workspace'; id: 'quality'; label: string; caption: string; icon: typeof Boxes };

export const lifecycleNavigation: LifecycleNavigationEntry[] = [
  { kind: 'stage', id: 'designIntent', label: 'Design Brief', caption: 'Intent & constraints', icon: ClipboardList },
  { kind: 'workspace', id: 'quality', label: 'Quality Drivers', caption: 'Scenarios & measurable attributes', icon: SlidersHorizontal },
  { kind: 'stage', id: 'logicalApplication', label: 'Logical Application', caption: 'Domains & services', icon: Network },
  { kind: 'stage', id: 'applicationRealization', label: 'Application Realization', caption: 'Deployable units', icon: Blocks },
  { kind: 'stage', id: 'logicalTechnology', label: 'Logical Technology', caption: 'Vendor-neutral capabilities', icon: DatabaseZap },
  { kind: 'stage', id: 'physicalTechnology', label: 'Physical Technology', caption: 'Products & deployment', icon: CloudCog },
  { kind: 'stage', id: 'validationRealization', label: 'Review & Realize', caption: 'Audit, ADRs & exports', icon: ShieldCheck },
];
