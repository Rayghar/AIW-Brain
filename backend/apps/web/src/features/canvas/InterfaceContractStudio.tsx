import { useMemo, useState } from 'react';
import { Cable, CheckCircle2, FileCode2, Plus, Save, Trash2, X } from 'lucide-react';
import { createId, type ArchitectureInterface, type ArchitectureNode } from '@aiw/domain';
import { useWorkspaceStore } from '../../store/workspaceStore';

function defaultContract(stage: ArchitectureInterface['stage'], nodes: ArchitectureNode[]): ArchitectureInterface {
  const provider = nodes[0]?.id ?? '';
  const consumer = nodes.find((node) => node.id !== provider)?.id;
  const now = new Date().toISOString();
  return {
    id: createId('interface'),
    name: 'New interface contract',
    stage,
    providerNodeId: provider,
    consumerNodeIds: consumer ? [consumer] : [],
    interactionStyle: 'request-response',
    protocol: 'HTTPS/REST',
    operationOrEvent: 'TBD',
    version: '1.0.0',
    authentication: 'OAuth 2.0 / workload identity',
    authorization: 'Policy-controlled',
    encryption: 'TLS 1.2+',
    timeoutMs: 3000,
    retryPolicy: 'Exponential backoff with jitter; retry only safe operations',
    idempotency: 'Idempotency key required for retried commands',
    ordering: 'Not required',
    deliveryGuarantee: 'At-most-once request semantics',
    deadLetterPolicy: 'Not applicable',
    replayPolicy: 'Not applicable',
    slo: 'p95 latency and availability target required',
    dataClassification: 'internal',
    owner: 'TBD',
    lifecycleStatus: 'proposed',
    evidenceIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function InterfaceContractStudio({ onClose }: { onClose: () => void }) {
  const project = useWorkspaceStore((state) => state.project);
  const upsert = useWorkspaceStore((state) => state.upsertInterface);
  const remove = useWorkspaceStore((state) => state.removeInterface);
  const stageNodes = useMemo(() => project.nodes.filter((node) => node.stage === project.activeStage), [project.nodes, project.activeStage]);
  const stageContracts = useMemo(() => (project.interfaces ?? []).filter((item) => item.stage === project.activeStage), [project.interfaces, project.activeStage]);
  const [selectedId, setSelectedId] = useState(stageContracts[0]?.id ?? '');
  const selected = stageContracts.find((item) => item.id === selectedId);
  const [draft, setDraft] = useState<ArchitectureInterface>(() => selected ?? defaultContract(project.activeStage, stageNodes));

  function patch<K extends keyof ArchitectureInterface>(key: K, value: ArchitectureInterface[K]) {
    setDraft((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  }
  function choose(id: string) {
    setSelectedId(id);
    const item = stageContracts.find((contract) => contract.id === id);
    if (item) setDraft({ ...item });
  }
  function startNew() {
    const next = defaultContract(project.activeStage, stageNodes);
    setSelectedId('');
    setDraft(next);
  }
  const completeness = [draft.name, draft.providerNodeId, draft.consumerNodeIds.length ? 'consumer' : '', draft.protocol, draft.operationOrEvent, draft.version, draft.owner]
    .filter(Boolean).length;

  return (
    <section className="interface-contract-studio" aria-label="Interface contract studio">
      <header className="interface-contract-studio__header">
        <div>
          <span className="eyebrow">Canonical interface model</span>
          <h3><Cable size={18} /> Interfaces and contracts</h3>
          <p>Define provider, consumers, protocol, security, reliability, ownership and conformance evidence without leaving the diagram.</p>
        </div>
        <div className="interface-contract-studio__actions">
          <span className={completeness >= 7 ? 'status-chip status-chip--ready' : 'status-chip'}>
            {completeness}/7 essentials
          </span>
          <button type="button" className="button button--secondary" onClick={startNew}><Plus size={14} /> New</button>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close interface studio"><X size={16} /></button>
        </div>
      </header>

      <div className="interface-contract-studio__body">
        <aside className="interface-contract-list">
          {stageContracts.length ? stageContracts.map((item) => (
            <button type="button" key={item.id} className={item.id === selectedId ? 'active' : ''} onClick={() => choose(item.id)}>
              <FileCode2 size={15} />
              <span><strong>{item.name}</strong><small>{item.protocol} · {item.lifecycleStatus}</small></span>
            </button>
          )) : <p>No interface contracts exist for this stage. Create the first contract from the current model.</p>}
        </aside>

        <div className="interface-contract-form">
          <label className="interface-field interface-field--wide"><span>Contract name</span><input value={draft.name} onChange={(e) => patch('name', e.target.value)} /></label>
          <label className="interface-field"><span>Provider</span><select value={draft.providerNodeId} onChange={(e) => patch('providerNodeId', e.target.value)}><option value="">Select provider</option>{stageNodes.map((node) => <option key={node.id} value={node.id}>{node.label} · {node.kind}</option>)}</select></label>
          <label className="interface-field"><span>Consumer</span><select value={draft.consumerNodeIds[0] ?? ''} onChange={(e) => patch('consumerNodeIds', e.target.value ? [e.target.value] : [])}><option value="">Select consumer</option>{project.nodes.filter((node) => node.id !== draft.providerNodeId).map((node) => <option key={node.id} value={node.id}>{node.label} · {node.kind}</option>)}</select></label>
          <label className="interface-field"><span>Interaction</span><select value={draft.interactionStyle} onChange={(e) => patch('interactionStyle', e.target.value as ArchitectureInterface['interactionStyle'])}>{['request-response','event','stream','batch','file-transfer','database'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="interface-field"><span>Protocol</span><input value={draft.protocol} onChange={(e) => patch('protocol', e.target.value)} /></label>
          <label className="interface-field interface-field--wide"><span>Operation, event or channel</span><input value={draft.operationOrEvent} onChange={(e) => patch('operationOrEvent', e.target.value)} /></label>
          <label className="interface-field"><span>Version</span><input value={draft.version} onChange={(e) => patch('version', e.target.value)} /></label>
          <label className="interface-field"><span>Schema / contract reference</span><input value={draft.schemaRef ?? ''} onChange={(e) => patch('schemaRef', e.target.value)} placeholder="openapi.yaml#/paths/... or asyncapi channel" /></label>
          <label className="interface-field"><span>Authentication</span><input value={draft.authentication} onChange={(e) => patch('authentication', e.target.value)} /></label>
          <label className="interface-field"><span>Authorization</span><input value={draft.authorization} onChange={(e) => patch('authorization', e.target.value)} /></label>
          <label className="interface-field"><span>Encryption</span><input value={draft.encryption} onChange={(e) => patch('encryption', e.target.value)} /></label>
          <label className="interface-field"><span>Timeout (ms)</span><input type="number" value={draft.timeoutMs ?? ''} onChange={(e) => patch('timeoutMs', e.target.value ? Number(e.target.value) : undefined)} /></label>
          <label className="interface-field interface-field--wide"><span>Retry policy</span><textarea value={draft.retryPolicy} onChange={(e) => patch('retryPolicy', e.target.value)} /></label>
          <label className="interface-field"><span>Idempotency</span><input value={draft.idempotency} onChange={(e) => patch('idempotency', e.target.value)} /></label>
          <label className="interface-field"><span>Ordering</span><input value={draft.ordering} onChange={(e) => patch('ordering', e.target.value)} /></label>
          <label className="interface-field"><span>Delivery guarantee</span><input value={draft.deliveryGuarantee} onChange={(e) => patch('deliveryGuarantee', e.target.value)} /></label>
          <label className="interface-field"><span>Dead-letter policy</span><input value={draft.deadLetterPolicy} onChange={(e) => patch('deadLetterPolicy', e.target.value)} /></label>
          <label className="interface-field"><span>Replay policy</span><input value={draft.replayPolicy} onChange={(e) => patch('replayPolicy', e.target.value)} /></label>
          <label className="interface-field"><span>SLO</span><input value={draft.slo} onChange={(e) => patch('slo', e.target.value)} /></label>
          <label className="interface-field"><span>Data classification</span><select value={draft.dataClassification} onChange={(e) => patch('dataClassification', e.target.value as ArchitectureInterface['dataClassification'])}>{['public','internal','confidential','restricted'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="interface-field"><span>Owner</span><input value={draft.owner} onChange={(e) => patch('owner', e.target.value)} /></label>
          <label className="interface-field"><span>Lifecycle</span><select value={draft.lifecycleStatus} onChange={(e) => patch('lifecycleStatus', e.target.value as ArchitectureInterface['lifecycleStatus'])}>{['proposed','active','deprecated','retired'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="interface-field interface-field--wide"><span>Evidence IDs</span><input value={draft.evidenceIds.join(', ')} onChange={(e) => patch('evidenceIds', e.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="ADR-001, REQ-012, SRC-OPENAPI" /></label>
        </div>
      </div>
      <footer className="interface-contract-studio__footer">
        <div><CheckCircle2 size={15} /><span>Saved contracts become part of the canonical project, review evidence and SDD interface register.</span></div>
        {selected ? <button type="button" className="button button--danger" onClick={() => { remove(selected.id); startNew(); }}><Trash2 size={14} /> Remove</button> : null}
        <button type="button" className="button button--primary" disabled={completeness < 7} onClick={() => { upsert(draft); setSelectedId(draft.id); }}><Save size={14} /> Save contract</button>
      </footer>
    </section>
  );
}
