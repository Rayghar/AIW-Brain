import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Database,
  Eye,
  FileKey2,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  ShieldQuestion,
  Waypoints,
} from 'lucide-react';
import { validateProjectSecurity } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';

type SecurityLens = 'posture' | 'interfaces' | 'findings';

function textOf(value: unknown) {
  return typeof value === 'string' ? value : value === true ? 'enabled' : value === false ? 'disabled' : '';
}

function includesSecurityTerm(value: string) {
  return /(security|identity|iam|auth|gateway|firewall|vault|secret|encrypt|trust|waf|policy|token|certificate)/i.test(value);
}

export function SecurityWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const [lens, setLens] = useState<SecurityLens>('posture');
  const findings = useMemo(() => validateProjectSecurity(project), [project]);
  const interfaces = project.interfaces ?? [];

  const securityNodes = useMemo(() => project.nodes.filter((node) => {
    const propertyText = Object.entries(node.properties ?? {}).map(([key, value]) => `${key} ${textOf(value)}`).join(' ');
    return includesSecurityTerm(`${node.label} ${node.kind} ${node.tags.join(' ')} ${propertyText}`);
  }), [project.nodes]);
  const dataNodes = useMemo(() => project.nodes.filter((node) => /(data|database|store|warehouse|lake|cache|ledger)/i.test(`${node.label} ${node.kind} ${node.tags.join(' ')}`)), [project.nodes]);
  const protectedInterfaces = useMemo(() => interfaces.filter((contract) => {
    return Boolean(contract.authentication?.trim() || contract.authorization?.trim() || contract.encryption?.trim());
  }), [interfaces]);
  const sensitiveInterfaces = useMemo(() => interfaces.filter((contract) => contract.dataClassification === 'confidential' || contract.dataClassification === 'restricted'), [interfaces]);
  const unprotectedSensitive = sensitiveInterfaces.filter((contract) => !contract.authentication?.trim() || !contract.encryption?.trim());
  const trustZones = useMemo(() => {
    const zones = new Map<string, number>();
    project.nodes.forEach((node) => {
      const zone = textOf(node.properties?.trustZone) || textOf(node.properties?.networkZone) || textOf(node.properties?.zone);
      if (zone) zones.set(zone, (zones.get(zone) ?? 0) + 1);
    });
    return [...zones.entries()].map(([name, count]) => ({ name, count }));
  }, [project.nodes]);

  const inspectNode = (nodeId: string) => {
    const node = project.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    selectNode(node.id);
    setActiveStage(node.stage);
    setWorkspaceMode('design');
  };

  const postureScore = Math.max(0, Math.min(100,
    45
    + Math.min(20, securityNodes.length * 4)
    + Math.min(15, protectedInterfaces.length * 3)
    + Math.min(10, trustZones.length * 3)
    - Math.min(35, findings.length * 5)
    - Math.min(25, unprotectedSensitive.length * 10)
  ));

  return (
    <section className="studio-page security-page security-architecture-lens" data-testid="security-architecture-lens">
      <header className="security-lens__hero">
        <div>
          <span className="eyebrow"><ShieldCheck size={14}/> Platform architecture · security lens</span>
          <h1>Security, trust boundaries and control coverage</h1>
          <p>Evaluate the intended architecture model: identity controls, protected interfaces, sensitive data, trust zones and unresolved security obligations. Enterprise identity and infrastructure acceptance remain in the Control Plane.</p>
        </div>
        <div className="security-lens__score"><span>Design posture</span><strong>{postureScore}</strong><small>{findings.length} open model finding(s)</small></div>
      </header>

      <div className="workspace-tabs security-lens__tabs" role="tablist" aria-label="Security architecture views">
        <button type="button" className={lens === 'posture' ? 'active' : ''} aria-selected={lens === 'posture'} onClick={() => setLens('posture')}><ShieldCheck size={15}/> Posture</button>
        <button type="button" className={lens === 'interfaces' ? 'active' : ''} aria-selected={lens === 'interfaces'} onClick={() => setLens('interfaces')}><Waypoints size={15}/> Interfaces</button>
        <button type="button" className={lens === 'findings' ? 'active' : ''} aria-selected={lens === 'findings'} onClick={() => setLens('findings')}><AlertTriangle size={15}/> Findings</button>
      </div>

      <div className="security-lens__metrics">
        <article><Fingerprint size={18}/><span><strong>{securityNodes.length}</strong><small>Security control objects</small></span></article>
        <article><FileKey2 size={18}/><span><strong>{protectedInterfaces.length}/{interfaces.length}</strong><small>Interfaces with declared controls</small></span></article>
        <article><Database size={18}/><span><strong>{dataNodes.length}</strong><small>Data stores to protect</small></span></article>
        <article><Network size={18}/><span><strong>{trustZones.length}</strong><small>Explicit trust or network zones</small></span></article>
        <article className={unprotectedSensitive.length ? 'is-risk' : 'is-good'}>{unprotectedSensitive.length ? <AlertTriangle size={18}/> : <CheckCircle2 size={18}/>}<span><strong>{unprotectedSensitive.length}</strong><small>Sensitive contracts needing controls</small></span></article>
      </div>

      {lens === 'posture' ? <div className="security-lens__grid">
        <section className="panel-card security-lens__controls">
          <div className="panel-heading"><div><span className="eyebrow">Control coverage</span><h2>Security responsibilities represented in the model</h2></div><small>{securityNodes.length} explicit object(s)</small></div>
          {securityNodes.length ? <div className="security-control-list">{securityNodes.map((node) => <article key={node.id}>
            <span className="security-control-icon"><LockKeyhole size={16}/></span>
            <div><strong>{node.label}</strong><small>{node.kind.replaceAll('-', ' ')} · {node.stage.replace(/([A-Z])/g, ' $1')}</small><p>{node.description || 'Security responsibility represented as a canonical architecture object.'}</p></div>
            <button type="button" onClick={() => inspectNode(node.id)}><Eye size={14}/> Inspect</button>
          </article>)}</div> : <div className="security-lens__empty"><ShieldQuestion size={26}/><strong>No explicit security-control objects were found.</strong><p>Add identity, policy-enforcement, secrets, encryption or trust-boundary responsibilities to the intended model.</p></div>}
        </section>

        <aside className="security-lens__side">
          <section className="panel-card">
            <div className="panel-heading"><span><Network size={17}/><strong>Trust zones</strong></span><small>Model-declared boundaries</small></div>
            {trustZones.length ? <div className="security-zone-list">{trustZones.map((zone) => <div key={zone.name}><span><strong>{zone.name}</strong><small>explicit architecture boundary</small></span><b>{zone.count}</b></div>)}</div> : <div className="empty-card">No explicit trustZone, networkZone or zone properties are recorded.</div>}
          </section>
          <section className="panel-card">
            <div className="panel-heading"><span><Database size={17}/><strong>Data protection focus</strong></span><small>{dataNodes.length} store(s)</small></div>
            <div className="security-data-list">{dataNodes.slice(0, 8).map((node) => <button type="button" key={node.id} onClick={() => inspectNode(node.id)}><span><strong>{node.label}</strong><small>{textOf(node.properties?.dataClassification) || 'classification not declared'}</small></span><Eye size={13}/></button>)}</div>
          </section>
        </aside>
      </div> : null}

      {lens === 'interfaces' ? <section className="panel-card security-interface-register">
        <div className="panel-heading"><div><span className="eyebrow">Interface security register</span><h2>Authentication, authorization, encryption and data classification</h2></div><small>{interfaces.length} governed contract(s)</small></div>
        {interfaces.length ? <div className="security-interface-table" role="table">
          <div className="security-interface-row security-interface-row--head" role="row"><span>Interface</span><span>Authentication</span><span>Authorization</span><span>Encryption</span><span>Data</span><span>Posture</span></div>
          {interfaces.map((contract) => {
            const missing = !contract.authentication?.trim() || !contract.authorization?.trim() || !contract.encryption?.trim();
            return <div className="security-interface-row" role="row" key={contract.id}>
              <span><strong>{contract.name}</strong><small>{contract.protocol} · {contract.interactionStyle}</small></span>
              <span>{contract.authentication || 'Not declared'}</span>
              <span>{contract.authorization || 'Not declared'}</span>
              <span>{contract.encryption || 'Not declared'}</span>
              <span>{contract.dataClassification}</span>
              <b className={missing ? 'is-risk' : 'is-good'}>{missing ? 'attention' : 'declared'}</b>
            </div>;
          })}
        </div> : <div className="security-lens__empty"><KeyRound size={26}/><strong>No governed interface contracts exist.</strong><p>Security controls cannot be assessed until providers, consumers and contracts are modelled.</p></div>}
      </section> : null}

      {lens === 'findings' ? <section className="panel-card security-findings-register">
        <div className="panel-heading"><div><span className="eyebrow">Security findings</span><h2>Model gaps requiring architecture action</h2></div><small>{findings.length + unprotectedSensitive.length} issue(s)</small></div>
        <div className="security-finding-list">
          {unprotectedSensitive.map((contract) => <article key={`interface-${contract.id}`} className="is-risk"><AlertTriangle size={16}/><div><strong>Sensitive interface lacks complete security declarations</strong><p>{contract.name} carries {contract.dataClassification} data but authentication or encryption is incomplete.</p><small>Interface contract · {contract.protocol}</small></div></article>)}
          {findings.map((finding: any) => <article key={finding.id} className={finding.severity === 'HARD' ? 'is-risk' : 'is-warning'}><AlertTriangle size={16}/><div><strong>{finding.title}</strong><p>{finding.message}</p><small>{finding.severity} · {(finding.affectedNodeIds ?? []).length} object(s)</small></div></article>)}
          {!findings.length && !unprotectedSensitive.length ? <div className="security-lens__empty security-lens__empty--good"><BadgeCheck size={27}/><strong>No deterministic security gaps are open.</strong><p>Continue to validate runtime evidence and threat assumptions during assurance.</p></div> : null}
        </div>
      </section> : null}
    </section>
  );
}
