import { Activity, GitCompareArrows, PackageSearch, Radar, ShieldCheck, Workflow } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

const referenceInventory = {
  resources: [
    {
      id: 'runtime-order-api', externalId: 'k8s:commerce:Deployment:order-api', resourceType: 'Deployment', name: 'Order API', provider: 'kubernetes',
      version: 'registry.example/order-api:1.3.0', labels: { 'aiw.node-id': 'deployable-order-api' },
      properties: { runtime: 'Node.js', replicas: 3, version: '1.3.0' },
    },
    {
      id: 'runtime-postgres', externalId: 'terraform:aws_rds_cluster.order', resourceType: 'aws_rds_cluster', name: 'Managed PostgreSQL', provider: 'generic',
      version: '16.2', labels: { 'aiw.node-id': 'physical-postgres' },
      properties: { replicas: 2, availabilityZones: 2, encryptedAtRest: true, version: '16.2' },
    },
    {
      id: 'runtime-debug-pod', externalId: 'k8s:commerce:Pod:debug-shell', resourceType: 'Pod', name: 'Debug Shell', provider: 'kubernetes',
      labels: {}, properties: { image: 'busybox:latest' },
    },
  ],
  relationships: [],
};

export function DriftWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const policyGateResult = useWorkspaceStore((state) => state.policyGateResult);
  const importRuntimeInventoryData = useWorkspaceStore((state) => state.importRuntimeInventoryData);
  const analyseRuntimeDrift = useWorkspaceStore((state) => state.analyseRuntimeDrift);
  const evaluatePolicyGateNow = useWorkspaceStore((state) => state.evaluatePolicyGateNow);
  const latestInventory = project.runtimeInventories[0];
  const latestReport = project.driftReports[0];
  const activeGate = project.policyGates.find((gate) => gate.enabled);

  return (
    <section className="studio-page drift-page">
      <div className="studio-hero">
        <div><span className="eyebrow">Drift control</span><h1>Runtime inventory & architecture drift</h1><p>Compare the governed architecture with discovered infrastructure, APIs and deployed resources, then enforce the result through an architecture policy gate.</p></div>
        <div className="hero-metric"><Radar size={22}/><strong>{latestReport ? `${latestReport.findings.length} finding${latestReport.findings.length === 1 ? '' : 's'}` : 'Not analysed'}</strong><small>Latest drift posture</small></div>
      </div>

      <div className="governance-grid">
        <article className="governance-card">
          <div className="card-title"><PackageSearch size={18}/><div><strong>Runtime inventory</strong><small>{latestInventory ? latestInventory.name : 'No inventory imported'}</small></div></div>
          <dl className="detail-list"><div><dt>Inventories</dt><dd>{project.runtimeInventories.length}</dd></div><div><dt>Latest resources</dt><dd>{latestInventory?.resources.length ?? 0}</dd></div><div><dt>Source</dt><dd>{latestInventory?.sourceType ?? '—'}</dd></div></dl>
          <button className="primary-action" onClick={() => importRuntimeInventoryData('Sample runtime inventory', 'manual', referenceInventory)}>Load sample inventory</button>
        </article>

        <article className="governance-card">
          <div className="card-title"><GitCompareArrows size={18}/><div><strong>Drift analysis</strong><small>Intended versus actual</small></div></div>
          <dl className="detail-list"><div><dt>Matched</dt><dd>{latestReport?.summary.matched ?? 0}</dd></div><div><dt>Missing</dt><dd>{latestReport?.summary.missingActual ?? 0}</dd></div><div><dt>Unmanaged</dt><dd>{latestReport?.summary.unmanagedActual ?? 0}</dd></div></dl>
          <button className="primary-action" disabled={!latestInventory} onClick={() => latestInventory && analyseRuntimeDrift(latestInventory.id)}>Analyse latest inventory</button>
        </article>

        <article className="governance-card">
          <div className="card-title"><ShieldCheck size={18}/><div><strong>Architecture policy gate</strong><small>{activeGate?.name ?? 'No gate configured'}</small></div></div>
          <dl className="detail-list"><div><dt>Status</dt><dd>{policyGateResult ? (policyGateResult.passed ? 'Passed' : 'Failed') : 'Not evaluated'}</dd></div><div><dt>Hard threshold</dt><dd>{activeGate?.hardFindingThreshold ?? '—'}</dd></div><div><dt>Missing limit</dt><dd>{activeGate?.maxMissingResources ?? '—'}</dd></div></dl>
          <button className="primary-action" disabled={!activeGate} onClick={() => activeGate && evaluatePolicyGateNow(activeGate.id, latestReport?.id)}>Evaluate gate</button>
        </article>

        <article className="governance-card">
          <div className="card-title"><Workflow size={18}/><div><strong>Architecture as code</strong><small>{project.repositoryBindings[0]?.provider ?? 'Not configured'}</small></div></div>
          <dl className="detail-list"><div><dt>Architecture path</dt><dd>{project.repositoryBindings[0]?.architecturePath ?? '—'}</dd></div><div><dt>Inventory path</dt><dd>{project.repositoryBindings[0]?.runtimeInventoryPath ?? '—'}</dd></div><div><dt>Gate path</dt><dd>{project.repositoryBindings[0]?.policyGatePath ?? '—'}</dd></div></dl>
        </article>
      </div>

      {policyGateResult && !policyGateResult.passed ? <section className="panel-card"><div className="panel-heading"><div><span className="eyebrow">CI gate</span><h2>Gate failure reasons</h2></div></div><div className="stack-list">{policyGateResult.reasons.map((reason) => <div className="finding-card" key={reason}><div><Activity size={16}/><div><strong>Policy gate condition failed</strong><p>{reason}</p></div><span className="severity severity--significant">BLOCK</span></div></div>)}</div></section> : null}

      <section className="panel-card">
        <div className="panel-heading"><div><span className="eyebrow">Runtime comparison</span><h2>Drift findings</h2></div></div>
        {latestReport?.findings.length ? <div className="finding-stack">{latestReport.findings.map((finding) => <div className={`finding-card severity-${finding.severity.toLowerCase()}`} key={finding.id}><div><Activity size={16}/><div><strong>{finding.title}</strong><p>{finding.message}</p><small>{finding.recommendation}</small></div><span>{finding.severity}</span></div></div>)}</div> : <div className="empty-card">Import a runtime inventory and run drift analysis to compare the implemented environment with the governed architecture.</div>}
      </section>
    </section>
  );
}
