import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, CircleDashed, CloudCog, Database, GitBranch, KeyRound, Play, RefreshCw, ServerCog, ShieldAlert, TriangleAlert } from 'lucide-react';
import { getJson, postJson } from '../lib/apiClient';

type AcceptanceStatus = 'verified' | 'configured' | 'reference-only' | 'not-configured' | 'failed';
type ProbeId = 'ACC-POSTGRES' | 'ACC-OBJECT-STORE' | 'ACC-VECTOR' | 'ACC-LLM' | 'ACC-GITHUB' | 'ACC-CI' | 'ACC-OIDC' | 'ACC-OTEL' | 'ACC-SIGNING';

interface AcceptanceCheck {
  id: ProbeId;
  name: string;
  category: string;
  status: AcceptanceStatus;
  detail: string;
  remediation: string;
  activeProbe: boolean;
  probeMode: 'passive' | 'active';
  durationMs: number;
  evidence: string[];
}
interface AcceptanceReport {
  generatedAt: string;
  platformVersion: string;
  environment: string;
  productionAccepted: boolean;
  verified: number;
  configured: number;
  open: number;
  checks: AcceptanceCheck[];
  requiredChecks: ProbeId[];
  boundary: string;
}
interface AcceptanceRun { runId: string; actorId: string; generatedAt: string; report: AcceptanceReport }

const probeGroups: Array<{ label: string; ids: ProbeId[]; icon: typeof Database }> = [
  { label: 'Data foundation', ids: ['ACC-POSTGRES','ACC-VECTOR','ACC-OBJECT-STORE'], icon: Database },
  { label: 'Enterprise trust', ids: ['ACC-OIDC','ACC-SIGNING'], icon: KeyRound },
  { label: 'Connected intelligence', ids: ['ACC-LLM','ACC-GITHUB'], icon: GitBranch },
  { label: 'Delivery & telemetry', ids: ['ACC-CI','ACC-OTEL'], icon: Activity },
];

function StatusIcon({ status }: { status: AcceptanceStatus }) {
  if (status === 'verified') return <CheckCircle2 size={17}/>;
  if (status === 'failed') return <TriangleAlert size={17}/>;
  return <CircleDashed size={17}/>;
}

export function EnterpriseRuntimeWorkspace() {
  const [report, setReport] = useState<AcceptanceReport | null>(null);
  const [history, setHistory] = useState<AcceptanceRun[]>([]);
  const [selected, setSelected] = useState<Set<ProbeId>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [current, runs] = await Promise.all([
        getJson<AcceptanceReport>('/api/platform/acceptance'),
        getJson<{ records: AcceptanceRun[] }>('/api/platform/acceptance/history?limit=8'),
      ]);
      setReport(current); setHistory(runs.records);
      setSelected(new Set(current.checks.filter((item) => item.activeProbe).map((item) => item.id)));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Runtime acceptance is unavailable.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const run = async () => {
    if (!selected.size) return;
    setLoading(true); setError(null);
    try {
      const result = await postJson<{ runId: string; report: AcceptanceReport }>('/api/platform/acceptance/probe', { checkIds: [...selected] });
      setReport(result.report);
      const runs = await getJson<{ records: AcceptanceRun[] }>('/api/platform/acceptance/history?limit=8');
      setHistory(runs.records);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Active probe failed.'); }
    finally { setLoading(false); }
  };

  const requiredVerified = useMemo(() => report ? report.requiredChecks.filter((id) => report.checks.find((item) => item.id === id)?.status === 'verified').length : 0, [report]);

  return <section className="studio-page enterprise-runtime-page">
    <div className="studio-hero runtime-hero">
      <div>
        <span className="eyebrow">Enterprise runtime</span>
        <h1>Prove the runtime, not just the configuration</h1>
        <p>Credentialed probes validate persistence, tenant isolation, vector retrieval, object storage, identity, GitHub, model routing, telemetry and release trust. Every run creates tenant-scoped acceptance evidence.</p>
      </div>
      <div className={`hero-metric ${report?.productionAccepted ? 'hero-metric--healthy' : ''}`}>
        {report?.productionAccepted ? <CheckCircle2 size={23}/> : <ShieldAlert size={23}/>} 
        <strong>{report?.productionAccepted ? 'Accepted' : 'Evidence open'}</strong>
        <small>{requiredVerified}/{report?.requiredChecks.length ?? 0} required controls verified</small>
      </div>
    </div>

    <section className="runtime-control-panel panel-card">
      <div className="panel-heading">
        <div><span className="eyebrow">Active acceptance</span><h2>Select the infrastructure boundaries to probe</h2></div>
        <div className="runtime-actions">
          <button className="button button--secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/> Refresh posture</button>
          <button className="button button--primary" onClick={() => void run()} disabled={loading || !selected.size}><Play size={15}/> Run {selected.size} probe{selected.size === 1 ? '' : 's'}</button>
        </div>
      </div>
      <p className="panel-intro">Active probes may contact configured enterprise services. They never expose secret values and do not promote candidate knowledge or mutate architecture models.</p>
      <div className="runtime-probe-groups">
        {probeGroups.map((group) => {
          const Icon = group.icon;
          return <article key={group.label}>
            <header><Icon size={17}/><strong>{group.label}</strong></header>
            {group.ids.map((id) => {
              const item = report?.checks.find((candidate) => candidate.id === id);
              const enabled = item?.activeProbe ?? false;
              return <label key={id} className={!enabled ? 'is-disabled' : ''}>
                <input type="checkbox" checked={selected.has(id)} disabled={!enabled || loading} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(id); else next.delete(id); return next; })}/>
                <span><b>{item?.name ?? id}</b><small>{item?.status.replaceAll('-', ' ') ?? 'loading'}</small></span>
              </label>;
            })}
          </article>;
        })}
      </div>
      {error ? <div className="runtime-error"><TriangleAlert size={16}/>{error}</div> : null}
    </section>

    {report ? <>
      <div className="runtime-summary-grid">
        <article><CheckCircle2 size={18}/><strong>{report.verified}</strong><span>Verified by probe</span></article>
        <article><CloudCog size={18}/><strong>{report.configured}</strong><span>Configured only</span></article>
        <article><TriangleAlert size={18}/><strong>{report.open}</strong><span>Open or failed</span></article>
        <article><ServerCog size={18}/><strong>{report.platformVersion}</strong><span>{report.environment} runtime</span></article>
      </div>
      <section className="runtime-check-grid">
        {report.checks.map((item) => <article key={item.id} className={`runtime-check-card runtime-check-card--${item.status}`}>
          <header><StatusIcon status={item.status}/><div><strong>{item.name}</strong><small>{item.category} · {item.status.replaceAll('-', ' ')}</small></div><span>{item.probeMode}</span></header>
          <p>{item.detail}</p>
          {item.evidence.length ? <div className="runtime-evidence">{item.evidence.map((entry) => <code key={entry}>{entry}</code>)}</div> : null}
          <footer><span>{item.durationMs ? `${item.durationMs} ms` : 'not actively probed'}</span><small>{item.remediation}</small></footer>
        </article>)}
      </section>
      <p className="runtime-boundary">{report.boundary}</p>
    </> : <div className="empty-card">{loading ? 'Loading runtime posture…' : 'No runtime report is available.'}</div>}

    <section className="panel-card runtime-history">
      <div className="panel-heading"><div><span className="eyebrow">Retained evidence</span><h2>Recent acceptance runs</h2></div></div>
      {history.length ? <div className="stack-list">{history.map((run) => <div className="list-row" key={run.runId}><div><strong>{new Date(run.generatedAt).toLocaleString()}</strong><small>{run.actorId} · {run.report.verified} verified · {run.report.open} open</small></div><span className={`status-pill ${run.report.productionAccepted ? 'status-pill--approved' : ''}`}>{run.report.productionAccepted ? 'accepted' : 'open'}</span></div>)}</div> : <div className="empty-card">No active acceptance run has been retained yet.</div>}
    </section>
  </section>;
}
