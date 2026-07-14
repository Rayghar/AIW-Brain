import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CloudCog,
  Database,
  Eye,
  GitCompareArrows,
  Network,
  Play,
  Radar,
  RefreshCw,
  ServerCog,
  Waypoints,
} from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

type RuntimeLens = 'inventory' | 'mapping' | 'operations';

function readableDate(value?: string) {
  if (!value) return 'Not captured';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function PlatformRuntimeWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const runReferenceCollector = useWorkspaceStore((state) => state.runReferenceCollector);
  const deriveReferenceTelemetryTopology = useWorkspaceStore((state) => state.deriveReferenceTelemetryTopology);
  const analyseRuntimeDrift = useWorkspaceStore((state) => state.analyseRuntimeDrift);
  const analyseOperationalPosture = useWorkspaceStore((state) => state.analyseOperationalPosture);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const [lens, setLens] = useState<RuntimeLens>('inventory');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(() => project.runtimeInventories[0]?.id ?? null);

  const inventory = project.runtimeInventories.find((item) => item.id === selectedInventoryId) ?? project.runtimeInventories[0] ?? null;
  const structuralReport = inventory ? project.driftReports.find((report) => report.inventoryId === inventory.id) ?? null : null;
  const operationalReport = inventory ? project.operationalDriftReports.find((report) => report.inventoryId === inventory.id) ?? null : null;
  const mappedResourceIds = useMemo(() => new Set(structuralReport?.mappings.map((mapping) => mapping.actualResourceId) ?? []), [structuralReport]);
  const intendedRuntimeNodes = useMemo(() => project.nodes.filter((node) => node.stage === 'logicalTechnology' || node.stage === 'physicalTechnology'), [project.nodes]);
  const resourceCount = project.runtimeInventories.reduce((sum, item) => sum + item.resources.length, 0);
  const relationshipCount = project.runtimeInventories.reduce((sum, item) => sum + item.relationships.length, 0);
  const openDrift = project.driftReports.flatMap((report) => report.findings).filter((finding) => finding.status === 'open').length;
  const openOperational = project.operationalDriftReports.flatMap((report) => report.findings).filter((finding) => finding.status === 'open').length;

  const keepRuntimeOpen = () => window.setTimeout(() => setWorkspaceMode('runtime'), 0);
  const collect = () => {
    const id = runReferenceCollector();
    if (id) setSelectedInventoryId(id);
    keepRuntimeOpen();
  };
  const derive = () => {
    const id = deriveReferenceTelemetryTopology();
    setSelectedInventoryId(id);
    keepRuntimeOpen();
  };
  const analyse = () => {
    if (!inventory) return;
    analyseRuntimeDrift(inventory.id);
    analyseOperationalPosture(inventory.id);
    keepRuntimeOpen();
  };

  const coverage = inventory && intendedRuntimeNodes.length
    ? Math.round(((structuralReport?.mappings.length ?? 0) / intendedRuntimeNodes.length) * 100)
    : 0;

  return (
    <section className="studio-page platform-runtime-workspace" data-testid="platform-runtime-workspace">
      <header className="platform-runtime__hero">
        <div>
          <span className="eyebrow"><CloudCog size={14}/> Platform architecture · observed runtime</span>
          <h1>Observed architecture and runtime evidence</h1>
          <p>Collect or derive runtime inventory, compare it with the intended technology model and identify structural, cost, capacity and resilience drift. Infrastructure production acceptance remains in the Administrator Control Plane.</p>
        </div>
        <div className="platform-runtime__actions">
          <button type="button" onClick={collect}><Play size={15}/> Load reference collector</button>
          <button type="button" onClick={derive}><Waypoints size={15}/> Derive telemetry topology</button>
          <button type="button" className="button button--primary" disabled={!inventory} onClick={analyse}><GitCompareArrows size={15}/> Compare intended vs observed</button>
        </div>
      </header>

      <div className="platform-runtime__metrics">
        <article><Boxes size={18}/><span><strong>{intendedRuntimeNodes.length}</strong><small>Intended technology objects</small></span></article>
        <article><ServerCog size={18}/><span><strong>{resourceCount}</strong><small>Observed runtime resources</small></span></article>
        <article><Network size={18}/><span><strong>{relationshipCount}</strong><small>Observed relationships</small></span></article>
        <article><Radar size={18}/><span><strong>{openDrift + openOperational}</strong><small>Open drift findings</small></span></article>
        <article className={coverage >= 80 ? 'is-good' : 'is-warning'}>{coverage >= 80 ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}<span><strong>{coverage}%</strong><small>Intended-to-observed coverage</small></span></article>
      </div>

      <div className="workspace-tabs platform-runtime__tabs" role="tablist" aria-label="Observed architecture views">
        <button type="button" className={lens === 'inventory' ? 'active' : ''} aria-selected={lens === 'inventory'} onClick={() => setLens('inventory')}><ServerCog size={15}/> Runtime inventory</button>
        <button type="button" className={lens === 'mapping' ? 'active' : ''} aria-selected={lens === 'mapping'} onClick={() => setLens('mapping')}><GitCompareArrows size={15}/> Intended vs observed</button>
        <button type="button" className={lens === 'operations' ? 'active' : ''} aria-selected={lens === 'operations'} onClick={() => setLens('operations')}><Activity size={15}/> Operational posture</button>
      </div>

      <div className="platform-runtime__selector">
        <label><span>Evidence snapshot</span><select value={inventory?.id ?? ''} onChange={(event) => setSelectedInventoryId(event.target.value)} disabled={!project.runtimeInventories.length}>
          {!project.runtimeInventories.length ? <option value="">No runtime inventory captured</option> : null}
          {project.runtimeInventories.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sourceType} · {item.resources.length} resources</option>)}
        </select></label>
        {inventory ? <div><strong>{inventory.name}</strong><small>{readableDate(inventory.capturedAt)} · {inventory.rawFingerprint.slice(0, 12)}</small></div> : <div><strong>Start with evidence</strong><small>Use a reference collector or telemetry topology to exercise the workflow.</small></div>}
      </div>

      {lens === 'inventory' ? <section className="panel-card platform-runtime__inventory">
        <div className="panel-heading"><div><span className="eyebrow">Observed resources</span><h2>Runtime inventory</h2></div><small>{inventory?.resources.length ?? 0} resources · {inventory?.relationships.length ?? 0} relationships</small></div>
        {inventory ? <div className="platform-runtime__resource-grid">{inventory.resources.map((resource) => <article key={resource.id}>
          <span className="platform-runtime__resource-icon">{/(database|postgres|mysql|sql|store)/i.test(resource.resourceType) ? <Database size={16}/> : <ServerCog size={16}/>}</span>
          <div><strong>{resource.name}</strong><small>{resource.resourceType} · {resource.provider ?? inventory.sourceType}</small><p>{[resource.namespace, resource.region, resource.version].filter(Boolean).join(' · ') || 'Runtime metadata captured from source evidence.'}</p></div>
          <b className={mappedResourceIds.has(resource.id) ? 'is-good' : 'is-neutral'}>{mappedResourceIds.has(resource.id) ? 'mapped' : 'observed'}</b>
        </article>)}</div> : <div className="platform-runtime__empty"><RefreshCw size={27}/><strong>No runtime evidence has been captured.</strong><p>Load the reference collector or derive a topology from telemetry to create an observed-architecture snapshot.</p></div>}
      </section> : null}

      {lens === 'mapping' ? <section className="panel-card platform-runtime__mapping">
        <div className="panel-heading"><div><span className="eyebrow">Structural conformance</span><h2>Intended technology mapped to observed resources</h2></div><small>{structuralReport ? `Revision ${structuralReport.projectRevision}` : 'Analysis not run'}</small></div>
        {structuralReport ? <>
          <div className="platform-runtime__mapping-summary">
            <span><strong>{structuralReport.summary.matched}</strong><small>matched</small></span>
            <span><strong>{structuralReport.summary.missingActual}</strong><small>missing actual</small></span>
            <span><strong>{structuralReport.summary.unmanagedActual}</strong><small>unmanaged</small></span>
            <span><strong>{structuralReport.summary.propertyMismatches + structuralReport.summary.topologyMismatches}</strong><small>model mismatches</small></span>
          </div>
          <div className="platform-runtime__finding-list">{structuralReport.findings.map((finding) => <article key={finding.id} className={`severity-${finding.severity.toLowerCase()}`}><AlertTriangle size={15}/><div><strong>{finding.title}</strong><p>{finding.message}</p><small>{finding.kind} · {finding.recommendation}</small></div><b>{finding.status}</b></article>)}</div>
          {!structuralReport.findings.length ? <div className="platform-runtime__empty platform-runtime__empty--good"><CheckCircle2 size={27}/><strong>No structural drift was detected.</strong><p>The observed inventory maps to the intended architecture at the current evidence depth.</p></div> : null}
        </> : <div className="platform-runtime__empty"><GitCompareArrows size={27}/><strong>No comparison has been run.</strong><p>Select an evidence snapshot and run “Compare intended vs observed”.</p></div>}
      </section> : null}

      {lens === 'operations' ? <section className="panel-card platform-runtime__operations">
        <div className="panel-heading"><div><span className="eyebrow">Operational architecture</span><h2>Cost, capacity, resilience and SLO posture</h2></div><small>{project.serviceLevelObjectives.length} SLO(s)</small></div>
        <div className="platform-runtime__operations-grid">
          <article><div className="panel-heading"><span><Radar size={16}/><strong>Operational drift</strong></span><small>{operationalReport?.findings.length ?? 0} finding(s)</small></div>{operationalReport ? <div className="platform-runtime__finding-list">{operationalReport.findings.map((finding) => <div key={finding.id} className={`severity-${finding.severity.toLowerCase()}`}><AlertTriangle size={14}/><span><strong>{finding.title}</strong><small>{finding.category} · {finding.recommendation}</small></span><b>{finding.status}</b></div>)}</div> : <div className="empty-card">Run the intended-versus-observed comparison to calculate operational drift.</div>}</article>
          <article><div className="panel-heading"><span><Activity size={16}/><strong>Service-level objectives</strong></span><small>Architecture intent</small></div><div className="platform-runtime__slo-list">{project.serviceLevelObjectives.map((slo) => <div key={slo.id}><span><strong>{slo.name}</strong><small>{slo.indicator} · {slo.window} window</small></span><b>{slo.target}</b></div>)}</div></article>
        </div>
      </section> : null}
    </section>
  );
}
