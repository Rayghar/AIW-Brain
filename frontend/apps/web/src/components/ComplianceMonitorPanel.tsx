import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { computeCanvasCompliance } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';

export function ComplianceMonitorPanel() {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const findings = useWorkspaceStore((state) => state.findings);
  const metrics = computeCanvasCompliance(project, library, findings);
  return <div className="canvas-compliance-monitor">
    <div><ShieldCheck size={14}/><strong>Design assurance</strong><small>Live</small></div>
    {metrics.map((metric) => {
      const coverage = metric.applicableControls ? Math.round((metric.satisfiedControls / metric.applicableControls) * 100) : 100;
      const critical = metric.hardViolations > 0;
      return <article key={metric.id} className={critical ? 'critical' : metric.evidenceGaps ? 'warning' : ''}>
        <header><span>{critical ? <AlertTriangle size={12}/> : <CheckCircle2 size={12}/>} {metric.name}</span><b>{coverage}%</b></header>
        <div><i style={{ width: `${Math.max(2,Math.min(100,coverage))}%` }}/></div>
        <small>{metric.satisfiedControls}/{metric.applicableControls} controls · {metric.evidenceGaps} evidence gaps · {metric.activeExceptions} exceptions</small>
      </article>;
    })}
  </div>;
}
