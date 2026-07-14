import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, BadgeCheck, ChevronDown, ChevronRight, CircleDot, DatabaseZap, Layers3, Sparkles, Target } from 'lucide-react';
import type { WorkspaceModeId } from '../lib/experienceProfiles';
import { workspaceExperienceDefinition } from '../lib/workspaceExperienceRegistry';
import { roleTaskContract } from '../lib/roleTaskContracts';
import { useWorkspaceStore } from '../store/workspaceStore';

/**
 * A compact task contract around specialist workspaces.
 *
 * rc.10.65.1 deliberately removes the permanent "Task path" and "Outcome
 * contract" side rails. Those rails repeated information already available in
 * the role navigation and reduced the usable canvas/table width. The contract
 * remains available on demand so the workflow is explainable without making
 * every page look like a textbook chapter.
 */
export function TaskWorkspaceFrame({ mode, children }: { mode: WorkspaceModeId; children: ReactNode }) {
  const definition = workspaceExperienceDefinition(mode);
  const project = useWorkspaceStore((state) => state.project);
  const findings = useWorkspaceStore((state) => state.findings);
  const roleId = useWorkspaceStore((state) => state.experienceProfile);
  const conformanceEvidence = useWorkspaceStore((state) => state.conformanceEvidence);
  const [showContract, setShowContract] = useState(false);
  const [activeTask, setActiveTask] = useState<{title:string;caption:string;taskId?:string}|null>(() => {
    if (typeof window === 'undefined') return null;
    const taskId = window.sessionStorage.getItem('aiw.activeRoleTask');
    const contract = roleTaskContract(taskId);
    return contract ? { title: contract.title, caption: contract.caption, taskId: contract.id } : null;
  });

  useEffect(() => {
    const handler = (event: Event) => setActiveTask((event as CustomEvent<{title:string;caption:string;taskId?:string}>).detail);
    window.addEventListener('aiw:role-task', handler);
    return () => window.removeEventListener('aiw:role-task', handler);
  }, []);

  const taskContract = roleTaskContract(activeTask?.taskId);
  const hardFindings = findings.filter((finding) => finding.severity === 'HARD').length;
  const stageNodes = project.nodes.filter((node) => node.stage === project.activeStage).length;
  const completionSignals = useMemo(() => {
    if (roleId === 'enterprise-architect' || roleId === 'knowledge-curator') return [];
    if (roleId === 'reviewer') {
      const pending = project.stageApprovals.filter((item) => item.status === 'pending').length;
      return [
        { label: 'Findings', value: String(findings.length) },
        { label: 'Hard / high', value: String(hardFindings) },
        { label: 'Pending reviews', value: String(pending) },
        { label: 'Evidence', value: String(conformanceEvidence.length + (project.interfaces?.length ?? 0)) },
      ];
    }
    if (roleId === 'platform-architect') {
      const runtimeResources = project.runtimeInventories.reduce((sum, inventory) => sum + inventory.resources.length, 0);
      const drift = project.driftReports.reduce((sum, report) => sum + report.findings.filter((finding) => finding.status === 'open').length, 0)
        + project.operationalDriftReports.reduce((sum, report) => sum + report.findings.filter((finding) => finding.status === 'open').length, 0);
      return [
        { label: 'Intended', value: `${project.nodes.filter((node) => node.stage === 'logicalTechnology' || node.stage === 'physicalTechnology').length} objects` },
        { label: 'Observed', value: `${runtimeResources} resources` },
        { label: 'Drift', value: String(drift) },
        { label: 'Evidence', value: String(conformanceEvidence.length) },
      ];
    }
    return [
      { label: 'Model', value: `${project.nodes.length} objects` },
      { label: 'Stage', value: `${stageNodes} objects` },
      { label: 'Blockers', value: String(hardFindings) },
      { label: 'Revision', value: String(project.revision) },
    ];
  }, [conformanceEvidence.length, findings.length, hardFindings, project, roleId, stageNodes]);

  const title = taskContract?.title ?? activeTask?.title ?? definition.title;
  const caption = taskContract?.caption ?? activeTask?.caption ?? definition.objective;
  const primaryAction = taskContract?.primaryAction ?? definition.primaryAction;
  const steps = taskContract?.steps ?? definition.steps;
  const inputs = taskContract?.inputs ?? definition.inputs;
  const outputs = taskContract?.outputs ?? definition.outputs;
  const completion = taskContract?.completion ?? definition.completion;

  return <section className={`task-workspace-frame task-workspace-frame--${mode}`} data-workspace-disposition={definition.disposition} data-task-intent={taskContract?.lens ?? activeTask?.taskId ?? mode} data-testid={`task-workspace-${mode}`}>
    <header className="task-workspace-frame__header">
      <div className="task-workspace-frame__identity">
        <span className="eyebrow"><Target size={14}/> {definition.ownerRoles.includes(roleId) ? 'Accountable workspace' : 'Shared workspace'}</span>
        <h1>{title}</h1>
        <p>{caption}</p>
      </div>
      {completionSignals.length ? <div className="task-workspace-frame__signals" aria-label="Workspace status">{completionSignals.map((signal) => <span key={signal.label}><small>{signal.label}</small><strong>{signal.value}</strong></span>)}</div> : null}
    </header>

    <div className="task-workspace-frame__contract">
      <button type="button" onClick={() => setShowContract((value) => !value)} aria-expanded={showContract}>
        <Sparkles size={14}/><strong>{primaryAction}</strong><span>{completion}</span>{showContract ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} 
      </button>
      {showContract ? <div className="task-workspace-frame__contract-expanded" role="region" aria-label="Task and outcome contract">
        <section className="task-workspace-frame__path"><strong>Task path</strong><div>{steps.map((step, index) => <span key={step}><i>{index + 1}</i>{step}</span>)}</div></section>
        <div className="task-workspace-frame__contract-grid">
          <section><strong>Consumes</strong>{inputs.map((item) => <span key={item}><CircleDot size={10}/>{item}</span>)}</section>
          <section><strong>Produces</strong>{outputs.map((item) => <span key={item}><BadgeCheck size={11}/>{item}</span>)}</section>
          <section><strong>Differentiating capability</strong>{definition.differentiators.map((item) => <span key={item}><DatabaseZap size={11}/>{item}</span>)}</section>
          <section className="task-workspace-frame__outcome-contract"><strong><Activity size={13}/> Outcome contract</strong><span><Layers3 size={13}/>{completion}</span><small>{project.name} · {roleId.replace(/-/g,' ')}</small></section>
        </div>
      </div> : null}
    </div>

    <main className="task-workspace-frame__workarea">{children}</main>
  </section>;
}
