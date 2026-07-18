import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Filter, Focus, Pause, Play, RefreshCw, ShieldAlert, ZoomIn, ZoomOut } from "lucide-react";
import type { ArchitectureProject, RequirementsSequenceDiagram } from "@aiw/domain";
import { postJson } from "../../lib/apiClient";
import { useWorkspaceStore } from "../../store/workspaceStore";
import "./sequence-intelligence.css";

type GenerateResponse = { authority: "candidate"; persisted: boolean; sequences: RequirementsSequenceDiagram[]; projectRevision: number };

export function SequenceIntelligenceWorkspace({ project, compact = false }: { project: ArchitectureProject; compact?: boolean }) {
  const hydrateProject = useWorkspaceStore((state) => state.hydrateProject);
  const [sequences, setSequences] = useState(project.requirementsIntelligence?.sequenceDiagrams ?? []);
  const [activeId, setActiveId] = useState(sequences.find((item) => item.status !== "superseded")?.id ?? "");
  const [scale, setScale] = useState(1);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [requirementFilter, setRequirementFilter] = useState("");
  const [trustOnly, setTrustOnly] = useState(false);
  const [failureOnly, setFailureOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setSequences(project.requirementsIntelligence?.sequenceDiagrams ?? []);
  }, [project.requirementsIntelligence?.sequenceDiagrams]);

  const active = sequences.find((item) => item.id === activeId) ?? sequences.find((item) => item.status !== "superseded") ?? sequences[0];
  const filteredMessages = useMemo(() => (active?.messages ?? []).filter((message) => {
    if (requirementFilter && !message.requirementRefs.includes(requirementFilter)) return false;
    if (trustOnly && !message.trustBoundaryCrossing) return false;
    if (failureOnly && !active?.fragments.some((fragment) => ["failure", "recovery"].includes(fragment.kind) && fragment.messageRefs.includes(message.id))) return false;
    return true;
  }), [active, failureOnly, requirementFilter, trustOnly]);

  useEffect(() => {
    if (!playing || !filteredMessages.length) return;
    const timer = window.setInterval(() => setStep((current) => current >= filteredMessages.length - 1 ? 0 : current + 1), 1200);
    return () => window.clearInterval(timer);
  }, [filteredMessages.length, playing]);

  async function generate(persisted: boolean) {
    setBusy(true); setNotice(null);
    try {
      const result = await postJson<GenerateResponse>(`/api/projects/${project.id}/branches/${project.branch.id}/sequences/generate`, { expectedRevision: project.revision, preview: !persisted });
      setSequences(result.sequences);
      setActiveId(result.sequences[0]?.id ?? "");
      setNotice(persisted ? `Saved ${result.sequences.length} candidate sequence version(s).` : `Previewed ${result.sequences.length} evidence-derived sequence(s).`);
      if (persisted) {
        const refreshed = await fetch(`/api/projects/${project.id}/branches/${project.branch.id}`).then((response) => response.json()) as ArchitectureProject;
        hydrateProject(refreshed);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sequence generation failed safely.");
    } finally { setBusy(false); }
  }

  async function decide(decision: "accepted"|"rejected"|"deferred") {
    if (!active) return;
    setBusy(true); setNotice(null);
    try {
      const result = await postJson<{ project: ArchitectureProject }>(`/api/projects/${project.id}/branches/${project.branch.id}/sequences/${active.id}/decision`, { expectedRevision: project.revision, decision, rationale: `${decision} through the governed sequence workspace` });
      hydrateProject(result.project);
      setNotice(`Sequence ${decision}; project candidate state updated.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Decision failed safely."); }
    finally { setBusy(false); }
  }

  if (!active) return <section className="sequence-empty" aria-label="Sequence intelligence"><div><strong>Interaction intelligence</strong><p>Generate sequence candidates from accepted requirements and journey paths. Unsupported participants and messages remain unresolved rather than invented.</p></div><div className="sequence-empty__actions"><button className="button" disabled={busy} onClick={() => void generate(false)}>Preview sequences</button><button className="button button--ai" disabled={busy} onClick={() => void generate(true)}>Generate candidate versions</button></div>{notice ? <p role="status">{notice}</p> : null}</section>;

  const participantIndex = new Map(active.participants.map((participant, index) => [participant.id, index]));
  const width = Math.max(840, active.participants.length * 190);
  const height = Math.max(420, filteredMessages.length * 74 + 170);
  const x = (id: string) => 100 + (participantIndex.get(id) ?? 0) * 190;

  return <section className={`sequence-workspace${compact ? " sequence-workspace--compact" : ""}`} aria-label="Requirements-derived sequence intelligence">
    <header className="sequence-workspace__header"><div><span className="eyebrow">Candidate sequence · revision {active.revision}</span><h3>{active.title}</h3><p>{active.scenario}</p></div><div className="sequence-workspace__status"><span data-status={active.status}>{active.status}</span><small>{active.requirementRefs.length} requirements · {active.interfaceRefs.length} interfaces</small></div></header>
    {!compact ? <div className="sequence-toolbar" role="toolbar" aria-label="Sequence controls">
      <select aria-label="Sequence version" value={active.id} onChange={(event) => { setActiveId(event.target.value); setStep(0); }}>{sequences.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.status}</option>)}</select>
      <select aria-label="Filter by requirement" value={requirementFilter} onChange={(event) => setRequirementFilter(event.target.value)}><option value="">All requirements</option>{active.requirementRefs.map((ref) => <option key={ref} value={ref}>{ref}</option>)}</select>
      <button aria-pressed={trustOnly} title="Trust-boundary crossings" onClick={() => setTrustOnly((value) => !value)}><ShieldAlert size={16}/> Trust</button>
      <button aria-pressed={failureOnly} title="Failure and recovery" onClick={() => setFailureOnly((value) => !value)}><Filter size={16}/> Failure</button>
      <button title="Zoom out" onClick={() => setScale((value) => Math.max(.6, value - .1))}><ZoomOut size={16}/></button><button title="Fit to view" onClick={() => setScale(1)}><Focus size={16}/></button><button title="Zoom in" onClick={() => setScale((value) => Math.min(1.5, value + .1))}><ZoomIn size={16}/></button>
      <button title={playing ? "Pause sequence" : "Play sequence"} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button>
      <button title="Previous message" onClick={() => setStep((value) => Math.max(0, value - 1))}><ChevronLeft size={16}/></button><button title="Next message" onClick={() => setStep((value) => Math.min(filteredMessages.length - 1, value + 1))}><ChevronRight size={16}/></button>
    </div> : null}
    <div className="sequence-canvas" tabIndex={0}><svg width={width * scale} height={height * scale} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${active.title} with ${active.participants.length} participants and ${filteredMessages.length} messages`}>
      {active.participants.map((participant) => <g key={participant.id}><rect className={`sequence-participant sequence-participant--${participant.boundary}`} x={x(participant.id) - 72} y={24} width={144} height={58} rx={10}/><text x={x(participant.id)} y={49} textAnchor="middle">{participant.name.slice(0, 22)}</text><text className="sequence-muted" x={x(participant.id)} y={68} textAnchor="middle">{participant.type}</text><line className="sequence-lifeline" x1={x(participant.id)} x2={x(participant.id)} y1={82} y2={height - 36}/></g>)}
      {filteredMessages.map((message, index) => { const y = 128 + index * 74; const from = x(message.fromParticipantId); const to = x(message.toParticipantId); const selected = index === step; return <g key={message.id} className={selected ? "is-active" : ""} tabIndex={0}><line className={`sequence-message sequence-message--${message.semantics}${message.trustBoundaryCrossing ? " sequence-message--trust" : ""}`} x1={from} x2={to} y1={y} y2={y}/><polygon points={`${to},${y} ${to + (from < to ? -10 : 10)},${y - 5} ${to + (from < to ? -10 : 10)},${y + 5}`}/><text x={(from + to) / 2} y={y - 10} textAnchor="middle">{index + 1}. {message.label.slice(0, 52)}</text>{message.requirementRefs.length ? <text className="sequence-muted" x={(from + to) / 2} y={y + 18} textAnchor="middle">{message.requirementRefs.join(", ")}</text> : null}</g>; })}
    </svg></div>
    {!compact ? <footer className="sequence-workspace__footer"><div><strong>Lineage</strong><span>{active.journeyRefs.join(", ")}</span><span>{active.fingerprint.slice(0, 16)}…</span></div><div className="sequence-decisions"><button disabled={busy} onClick={() => void generate(false)}><RefreshCw size={15}/> Preview regeneration</button><button disabled={busy} onClick={() => void decide("deferred")}>Defer</button><button disabled={busy} onClick={() => void decide("rejected")}>Reject</button><button className="button button--primary" disabled={busy} onClick={() => void decide("accepted")}><Check size={15}/> Accept for project</button></div></footer> : null}
    {notice ? <p className="sequence-notice" role="status">{notice}</p> : null}
  </section>;
}
