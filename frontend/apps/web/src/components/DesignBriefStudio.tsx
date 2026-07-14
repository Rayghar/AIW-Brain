import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  CheckCircle2,
  CircleHelp,
  ClipboardPaste,
  FileText,
  HeartPulse,
  Loader2,
  Network,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UsersRound,
  WandSparkles,
  Workflow,
} from "lucide-react";
import type { ArchitectureBrainProposalReceipt, ArchitectureProject, RequirementConflict, RequirementSourceKind, RequirementsDistillationProposal, SolutionJourney } from "@aiw/domain";
import type { RequirementsSourceInput } from "@aiw/engine";
import { useWorkspaceStore } from "../store/workspaceStore";
import { postJson } from "../lib/apiClient";
import { JourneySequenceDiagram } from "./requirements/JourneySequenceDiagram";
import "./requirements/requirements-genesis.css";

interface IntakeSource extends RequirementsSourceInput {
  localId: string;
  warnings: string[];
}

type GenesisView = "sources" | "requirements" | "journeys" | "stakeholders" | "questions" | "manual";
type BrainRequirementsProposal = RequirementsDistillationProposal & { brainReceipt?: ArchitectureBrainProposalReceipt };

function toLines(items: string[] = []) { return items.join("\n"); }
function unique(items: string[]) { return [...new Set(items.map((item) => item.trim()).filter(Boolean))]; }

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + 0x8000, bytes.length)));
  return btoa(binary);
}

function sourceKind(file: File): RequirementSourceKind {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".md")) return "markdown";
  if (name.endsWith(".csv") || name.endsWith(".xlsx")) return "spreadsheet";
  return "text";
}

function selectedProposal(proposal: RequirementsDistillationProposal, selected: Set<string>): RequirementsDistillationProposal {
  const requirements = proposal.requirements.filter((item) => selected.has(item.id));
  const requirementIds = new Set(requirements.map((item) => item.id));
  const stakeholders = proposal.stakeholders.filter((item) => selected.has(item.id) || requirements.some((requirement) => requirement.stakeholderRefs.includes(item.id)));
  const stakeholderIds = new Set(stakeholders.map((item) => item.id));
  const journeys = proposal.journeys.filter((item) => selected.has(item.id) || item.requirementRefs.some((ref) => requirementIds.has(ref)));
  const journeyIds = new Set(journeys.map((item) => item.id));
  const conflicts = (proposal.conflicts ?? []).filter((item) => requirementIds.has(item.leftRef) && requirementIds.has(item.rightRef));
  return {
    ...proposal,
    requirements: requirements.map((item) => ({ ...item, stakeholderRefs: item.stakeholderRefs.filter((ref) => stakeholderIds.has(ref)), journeyRefs: item.journeyRefs.filter((ref) => journeyIds.has(ref)) })),
    stakeholders,
    journeys: journeys.map((item) => ({ ...item, requirementRefs: item.requirementRefs.filter((ref) => requirementIds.has(ref)) })),
    openQuestions: proposal.openQuestions.filter((item) => !item.relatedRequirementRefs.length || item.relatedRequirementRefs.some((ref) => requirementIds.has(ref))),
    contextPackages: proposal.contextPackages.map((item) => ({ ...item, requirementRefs: item.requirementRefs.filter((ref) => requirementIds.has(ref)), stakeholderRefs: item.stakeholderRefs.filter((ref) => stakeholderIds.has(ref)), journeyRefs: item.journeyRefs.filter((ref) => journeyIds.has(ref)) })),
    conflicts,
    summary: `Selected ${requirements.length} requirement(s), ${stakeholders.length} stakeholder(s) and ${journeys.length} journey(s) for governed acceptance.`,
  };
}

export function DesignBriefStudio() {
  const project = useWorkspaceStore((state) => state.project);
  const hydrateProject = useWorkspaceStore((state) => state.hydrateProject);
  const serverPersistenceEnabled = useWorkspaceStore((state) => state.serverPersistenceEnabled);
  const setProjectText = useWorkspaceStore((state) => state.setProjectText);
  const setListField = useWorkspaceStore((state) => state.setListField);
  const setContextField = useWorkspaceStore((state) => state.setContextField);
  const [view, setView] = useState<GenesisView>("sources");
  const [idea, setIdea] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [sources, setSources] = useState<IntakeSource[]>([]);
  const [proposal, setProposal] = useState<BrainRequirementsProposal | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflictDrafts, setConflictDrafts] = useState<Record<string, { status: Exclude<RequirementConflict["status"], "open">; resolution: string }>>({});
  const fileInput = useRef<HTMLInputElement | null>(null);

  const accepted = project.requirementsIntelligence;
  const displayedJourneys = proposal?.journeys ?? accepted?.journeys ?? [];
  const activeJourney = displayedJourneys.find((item) => item.id === activeJourneyId) ?? displayedJourneys[0] ?? null;
  const allSelected = proposal ? proposal.requirements.every((item) => selected.has(item.id)) && proposal.journeys.every((item) => selected.has(item.id)) : false;
  const health = proposal?.health ?? accepted?.health;
  const visibleConflicts = proposal?.conflicts ?? accepted?.conflicts ?? [];

  const metrics = useMemo(() => ({
    sources: proposal?.sourceRecords.length ?? accepted?.sources.length ?? sources.length,
    requirements: proposal?.requirements.length ?? accepted?.requirements.length ?? 0,
    journeys: proposal?.journeys.length ?? accepted?.journeys.length ?? 0,
  }), [accepted, proposal, sources.length]);

  function addTextSource(name: string, kind: RequirementSourceKind, text: string) {
    const clean = text.trim();
    if (clean.length < 20) { setMessage("Add enough context for Sol to understand the problem, actors and intended outcome."); return; }
    setSources((current) => [...current, { localId: `source-${crypto.randomUUID()}`, name, kind, mediaType: "text/plain", classification: "internal", text: clean, warnings: [] }]);
    setMessage(null);
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true); setMessage(null);
    try {
      const next: IntakeSource[] = [];
      for (const file of Array.from(files).slice(0, 12)) {
        const kind = sourceKind(file);
        if (file.size > 7 * 1024 * 1024) { next.push({ localId: `source-${crypto.randomUUID()}`, name: file.name, kind, mediaType: file.type, classification: "internal", text: "", warnings: ["File exceeds the 7 MB governed intake limit."] }); continue; }
        if (["text", "markdown", "spreadsheet"].includes(kind) && !file.name.toLowerCase().endsWith(".xlsx")) {
          next.push({ localId: `source-${crypto.randomUUID()}`, name: file.name, kind, mediaType: file.type || "text/plain", classification: "internal", text: await file.text(), warnings: [] });
          continue;
        }
        try {
          const extracted = await postJson<{ text: string; warnings: string[]; kind: RequirementSourceKind; mediaType: string }>("/api/requirements-intelligence/extract-source", {
            filename: file.name, mediaType: file.type || "application/octet-stream", base64: arrayBufferToBase64(await file.arrayBuffer()), classification: "internal",
          });
          next.push({ localId: `source-${crypto.randomUUID()}`, name: file.name, kind: extracted.kind, mediaType: extracted.mediaType || file.type, classification: "internal", text: extracted.text, warnings: extracted.warnings });
        } catch (cause) {
          next.push({ localId: `source-${crypto.randomUUID()}`, name: file.name, kind, mediaType: file.type, classification: "internal", text: "", warnings: [cause instanceof Error ? cause.message : "Document extraction failed."] });
        }
      }
      setSources((current) => [...current, ...next]);
    } finally { setLoading(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function distill() {
    const activeSources = sources.filter((item) => item.text.trim().length >= 20);
    if (!activeSources.length) { setMessage("Describe the solution, paste source text or upload a text-enabled requirements document first."); return; }
    setLoading(true); setMessage(null);
    try {
      const result = await postJson<BrainRequirementsProposal>("/api/requirements-intelligence/distill", {
        projectId: project.id,
        branchId: project.branch.id,
        expectedRevision: project.revision,
        sources: activeSources.map(({ localId: _localId, warnings: _warnings, ...item }) => item),
        intelligenceMode: "hybrid",
        knowledgeReleaseId: "CAMBRIDGE-SA-1.0",
      });
      setProposal(result);
      setSelected(new Set([...result.requirements.map((item) => item.id), ...result.stakeholders.map((item) => item.id), ...result.journeys.map((item) => item.id)]));
      setActiveJourneyId(result.journeys[0]?.id ?? null);
      setView("requirements");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "The Architecture Brain is unavailable. No browser-generated requirements substitute was used.");
    } finally { setLoading(false); }
  }

  function updateRequirement(id: string, statement: string) {
    setProposal((current) => current ? { ...current, requirements: current.requirements.map((item) => item.id === id ? { ...item, statement, title: statement.split(/\s+/).slice(0, 9).join(" "), updatedAt: new Date().toISOString() } : item) } : current);
  }

  function updateProposalConflict(id: string, patch: Partial<Pick<RequirementConflict, "status" | "resolution">>) {
    setProposal((current) => current ? { ...current, conflicts: (current.conflicts ?? []).map((item) => item.id === id ? { ...item, ...patch } : item) } : current);
  }

  async function resolveAcceptedConflict(conflict: RequirementConflict) {
    const draft = conflictDrafts[conflict.id];
    if (!draft || draft.resolution.trim().length < 8) { setMessage("Record a clear resolution before saving the conflict disposition."); return; }
    setLoading(true); setMessage(null);
    try {
      const next = await postJson<ArchitectureProject>(`/api/projects/${project.id}/branches/${project.branch.id}/requirements-intelligence/conflicts/${encodeURIComponent(conflict.id)}/resolve`, {
        expectedRevision: project.revision,
        status: draft.status,
        resolution: draft.resolution.trim(),
      });
      hydrateProject(next, true);
      setConflictDrafts((current) => { const nextDrafts = { ...current }; delete nextDrafts[conflict.id]; return nextDrafts; });
      setMessage(`Recorded ${draft.status} disposition for ${conflict.summary}.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "The governed conflict disposition failed.");
    } finally { setLoading(false); }
  }

  async function acceptSelection() {
    if (!proposal) return;
    const reviewed = selectedProposal(proposal, selected);
    if (!reviewed.requirements.length) { setMessage("Select at least one requirement before accepting the project-understanding model."); return; }
    if ((reviewed.conflicts ?? []).some((item) => item.status === "open")) { setMessage("Resolve or explicitly disposition every selected conflict before accepting the canonical requirements model."); return; }
    setLoading(true); setMessage(null);
    try {
      if (!serverPersistenceEnabled) {
        setMessage("Connect the governed AIW backend before accepting the requirements model. The browser is not an alternative architecture authority.");
        return;
      }
      const next = await postJson<ArchitectureProject>(`/api/projects/${project.id}/branches/${project.branch.id}/requirements-intelligence/apply`, {
        expectedRevision: project.revision,
        proposal: reviewed,
        knowledgeReleaseId: "CAMBRIDGE-SA-1.0",
      });
      hydrateProject({ ...next, activeStage: "designIntent" }, true);
      setProposal(null); setSelected(new Set()); setView("journeys");
      setMessage(`Accepted ${reviewed.requirements.length} requirements and ${reviewed.journeys.length} major journey(s). Stage context packages are ready for Quality Drivers and System Context.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "The governed acceptance failed. No local mutation was applied.");
    } finally { setLoading(false); }
  }

  const navigation: Array<{ id: GenesisView; label: string; icon: React.ReactNode; count?: number | undefined }> = [
    { id: "sources", label: "Sources", icon: <Upload size={14} />, count: sources.length },
    { id: "requirements", label: "Requirements", icon: <BookOpenCheck size={14} />, count: proposal?.requirements.length ?? accepted?.requirements.length },
    { id: "journeys", label: "Journey Atlas", icon: <Workflow size={14} />, count: displayedJourneys.length },
    { id: "stakeholders", label: "Stakeholders", icon: <UsersRound size={14} />, count: proposal?.stakeholders.length ?? accepted?.stakeholders.length },
    { id: "questions", label: "Questions", icon: <CircleHelp size={14} />, count: proposal?.openQuestions.length ?? accepted?.openQuestions.length },
    { id: "manual", label: "Manual details", icon: <FileText size={14} /> },
  ];

  return <section className="requirements-genesis" data-testid="requirements-genesis-studio">
    <header className="genesis-hero">
      <div><span className="eyebrow"><WandSparkles size={14} /> Sol Architecture Genesis</span><h2>Turn an idea or document into architecture-ready project understanding</h2><p>Generate, distil and reconcile requirements, stakeholders and major solution journeys. Every proposal carries evidence and remains outside the canonical model until you accept it.</p></div>
      <div className="genesis-hero__metrics"><div><strong>{metrics.sources}</strong><span>governed sources</span></div><div><strong>{metrics.requirements}</strong><span>requirements</span></div><div><strong>{metrics.journeys}</strong><span>major journeys</span></div></div>
    </header>

    <nav className="genesis-workflow" aria-label="Requirements intelligence workflow">
      {navigation.map((item) => <button type="button" key={item.id} className={view === item.id ? "is-active" : ""} onClick={() => setView(item.id)}>{item.icon}{item.label}{item.count != null ? <b>{item.count}</b> : null}</button>)}
    </nav>

    {message ? <div className="genesis-notice" role="status">{message}</div> : null}
    {proposal?.brainReceipt ? <section className="genesis-authority-receipt" aria-label="Architecture Brain proposal receipt">
      <div><span className="eyebrow"><ShieldCheck size={12}/> One Brain authority</span><strong>{proposal.brainReceipt.task}</strong></div>
      <span>Kernel {proposal.brainReceipt.manifest.kernelVersion}</span>
      <span>Knowledge {proposal.brainReceipt.manifest.knowledgeReleaseId}</span>
      <span>Pattern DNA {proposal.brainReceipt.manifest.patternDnaReleaseId}</span>
      <span>Cambridge {proposal.brainReceipt.manifest.cambridgeRulesetId}</span>
      <span>{proposal.brainReceipt.llm.used ? `LLM ${proposal.brainReceipt.llm.model ?? "governed"}` : proposal.brainReceipt.llm.requested ? "Deterministic fallback" : "Deterministic only"}</span>
    </section> : null}

    {view === "sources" ? <>
      <div className="genesis-intake-grid">
        <article className="genesis-intake-card"><span><Sparkles size={18} /></span><h3>Describe the solution</h3><p>Start with a business idea. Sol will generate a specification and ask only architecture-significant questions.</p><textarea value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Example: Build an agency banking platform for onboarding agents and customers, processing cash-in/cash-out and integrating with the core banking platform…"/><button type="button" className="button button--secondary" onClick={() => { addTextSource("Solution idea", "idea", idea); setIdea(""); }}><Plus size={14}/> Add idea as source</button></article>
        <article className="genesis-intake-card"><span><ClipboardPaste size={18} /></span><h3>Paste existing content</h3><p>Use meeting notes, an existing specification, workshop output, an email or a current-state description.</p><textarea value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder="Paste requirements or stakeholder notes here…"/><button type="button" className="button button--secondary" onClick={() => { addTextSource("Pasted requirements", "paste", pastedText); setPastedText(""); }}><Plus size={14}/> Add pasted source</button></article>
        <article className="genesis-intake-card"><span><Upload size={18} /></span><h3>Upload source documents</h3><p>DOCX, text-enabled PDF, Markdown, text and CSV are distilled with source evidence. Multiple files may be combined.</p><input ref={fileInput} type="file" multiple accept=".docx,.pdf,.txt,.md,.csv,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(event) => void handleFiles(event.target.files)} /><button type="button" className="button button--secondary" disabled={loading} onClick={() => fileInput.current?.click()}>{loading ? <Loader2 className="spin" size={14}/> : <Upload size={14}/>} Choose documents</button><small>Scanned PDFs need a text-enabled source. XLSX registers should be exported as CSV in this release.</small></article>
      </div>
      {sources.length ? <section className="genesis-panel"><header><div><h3>Source library</h3><p>Sources remain immutable inputs; removing one removes it only from the pending distillation batch.</p></div><span className="genesis-chip">Internal</span></header><div className="genesis-source-list">{sources.map((source) => <article className="genesis-source" key={source.localId}><span><FileText size={15}/></span><div><strong>{source.name}</strong><small>{source.kind} · {source.text.length.toLocaleString()} characters{source.warnings.length ? ` · ${source.warnings.join(" ")}` : ""}</small></div><button type="button" aria-label={`Remove ${source.name}`} onClick={() => setSources((current) => current.filter((item) => item.localId !== source.localId))}><Trash2 size={15}/></button></article>)}</div></section> : null}
      <div className="genesis-distill-bar"><div><strong>Architecture Context Compiler</strong><small>Sol first proposes structured records, then deterministic Cambridge rules compile stage-specific context. Nothing is accepted silently.</small></div><button type="button" className="button button--ai" disabled={loading || !sources.some((item) => item.text.trim().length >= 20)} onClick={() => void distill()}>{loading ? <Loader2 className="spin" size={15}/> : <WandSparkles size={15}/>} Generate requirements & journeys</button></div>
    </> : null}

    {view === "requirements" ? <>
      {visibleConflicts.length ? <section className="genesis-conflicts" aria-label="Requirements reconciliation conflicts">
        <header><div><span className="eyebrow"><AlertTriangle size={12}/> Governed reconciliation</span><h3>Source and requirement conflicts</h3><p>AIW never chooses a winner silently. Each selected conflict needs an explicit, auditable disposition.</p></div><span className={`genesis-chip ${visibleConflicts.some((item) => item.status === "open") ? "is-warning" : ""}`}>{visibleConflicts.filter((item) => item.status === "open").length} open</span></header>
        <div>{visibleConflicts.map((conflict) => {
          const draft = conflictDrafts[conflict.id] ?? { status: "resolved" as const, resolution: conflict.resolution ?? "" };
          return <article key={conflict.id} className={conflict.status === "open" ? "is-open" : "is-resolved"}><div className="genesis-conflict__summary"><div><strong>{conflict.summary}</strong><p>{conflict.rationale}</p><small>{conflict.leftRef} ↔ {conflict.rightRef} · {conflict.kind} · {conflict.severity}</small></div><span className={`genesis-chip ${conflict.status === "open" ? "is-warning" : ""}`}>{conflict.status}</span></div>{proposal ? <div className="genesis-conflict__adjudication"><label><span>Disposition</span><select value={conflict.status === "open" ? "" : conflict.status} onChange={(event) => updateProposalConflict(conflict.id, { status: (event.target.value || "open") as RequirementConflict["status"] })}><option value="">Select…</option><option value="resolved">Resolved — canonical statement confirmed</option><option value="accepted-variance">Accepted variance — both contexts remain valid</option><option value="false-positive">False positive — records do not conflict</option></select></label><label className="is-wide"><span>Resolution and rationale</span><textarea rows={2} value={conflict.resolution ?? ""} onChange={(event) => updateProposalConflict(conflict.id, { resolution: event.target.value })} placeholder="Explain which claim is authoritative, why the variance is valid, or why this is a false positive."/></label></div> : conflict.status === "open" ? <div className="genesis-conflict__adjudication"><label><span>Disposition</span><select value={draft.status} onChange={(event) => setConflictDrafts((current) => ({ ...current, [conflict.id]: { ...draft, status: event.target.value as Exclude<RequirementConflict["status"], "open"> } }))}><option value="resolved">Resolved</option><option value="accepted-variance">Accepted variance</option><option value="false-positive">False positive</option></select></label><label className="is-wide"><span>Resolution and rationale</span><textarea rows={2} value={draft.resolution} onChange={(event) => setConflictDrafts((current) => ({ ...current, [conflict.id]: { ...draft, resolution: event.target.value } }))}/></label><button type="button" className="button button--secondary" disabled={loading || draft.resolution.trim().length < 8} onClick={() => void resolveAcceptedConflict(conflict)}>Record disposition</button></div> : <small>{conflict.resolution}</small>}</article>;
        })}</div>
      </section> : null}
      {proposal?.contextGraph ? <section className="genesis-context-graph-summary" aria-label="Architecture Context Graph summary"><Network size={16}/><div><strong>Architecture Context Graph compiled</strong><small>{proposal.contextGraph.nodes.length} typed nodes · {proposal.contextGraph.edges.length} lineage edges · {proposal.contextGraph.stageSlices.length} stage slices</small></div></section> : null}
      <RequirementsReview proposal={proposal} accepted={accepted?.requirements ?? []} selected={selected} setSelected={setSelected} updateRequirement={updateRequirement} health={health} allSelected={allSelected} onToggleAll={() => proposal && setSelected(allSelected ? new Set() : new Set([...proposal.requirements.map((item) => item.id), ...proposal.stakeholders.map((item) => item.id), ...proposal.journeys.map((item) => item.id)]))} onAccept={() => void acceptSelection()} loading={loading} />
    </> : null}

    {view === "journeys" ? <JourneyAtlas journeys={displayedJourneys} active={activeJourney} onSelect={setActiveJourneyId} /> : null}

    {view === "stakeholders" ? <section className="genesis-panel"><header><div><h3>Stakeholders and concerns</h3><p>These records shape priorities, approval, context actors and architecture explanations.</p></div></header><div className="genesis-list">{(proposal?.stakeholders ?? accepted?.stakeholders ?? []).map((item) => <article className="genesis-requirement" key={item.id}><input type="checkbox" checked={!proposal || selected.has(item.id)} disabled={!proposal} onChange={() => setSelected((current) => { const next = new Set(current); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })}/><div className="genesis-requirement__body"><strong>{item.name} · {item.role}</strong><p>{item.concerns.join(" · ")}</p><div className="genesis-requirement__meta"><span className="genesis-chip">{item.origin}</span>{item.decisionRights.map((right) => <span className="genesis-chip" key={right}>{right}</span>)}</div></div><UsersRound size={16}/></article>)}</div></section> : null}

    {view === "questions" ? <section className="genesis-questions">{(proposal?.openQuestions ?? accepted?.openQuestions ?? []).map((item) => <article className="genesis-question" key={item.id}><span><CircleHelp size={17}/></span><div><strong>{item.question}</strong><p>{item.whyItMatters}</p></div><span className={`genesis-chip ${item.impact === "critical" || item.impact === "high" ? "is-warning" : ""}`}>{item.impact}</span></article>)}</section> : null}

    {view === "manual" ? <section className="genesis-manual"><div><span className="eyebrow">Direct editing</span><h3>Review and refine accepted project intent</h3><p>Use this advanced editor for confirmed facts. Sol proposals and uploaded-source evidence remain visible in the other workflow views.</p></div><div className="genesis-manual-grid"><label className="field is-wide"><span>Project name</span><input value={project.name} onChange={(event) => setProjectText("name", event.target.value)}/></label><label className="field is-wide"><span>Problem statement</span><textarea rows={5} value={project.description} onChange={(event) => setProjectText("description", event.target.value)}/></label><label className="field"><span>Objectives — one per line</span><textarea rows={8} value={toLines(project.objectives)} onChange={(event) => setListField("objectives", event.target.value)}/></label><label className="field"><span>Constraints — one per line</span><textarea rows={8} value={toLines(project.constraints)} onChange={(event) => setListField("constraints", event.target.value)}/></label><label className="field"><span>Assumptions — one per line</span><textarea rows={7} value={toLines(project.assumptions)} onChange={(event) => setListField("assumptions", event.target.value)}/></label><label className="field"><span>Stakeholders — one per line</span><textarea rows={7} value={toLines(project.context.stakeholders ?? [])} onChange={(event) => setContextField("stakeholders", unique(event.target.value.split("\n")))}/></label><label className="field"><span>In-scope capabilities</span><textarea rows={7} value={toLines(project.context.inScopeCapabilities ?? [])} onChange={(event) => setContextField("inScopeCapabilities", unique(event.target.value.split("\n")))}/></label><label className="field"><span>Out-of-scope capabilities</span><textarea rows={7} value={toLines(project.context.outOfScopeCapabilities ?? [])} onChange={(event) => setContextField("outOfScopeCapabilities", unique(event.target.value.split("\n")))}/></label><label className="field"><span>Existing systems</span><textarea rows={7} value={toLines(project.context.existingSystems ?? [])} onChange={(event) => setContextField("existingSystems", unique(event.target.value.split("\n")))}/></label></div></section> : null}
  </section>;
}

function RequirementsReview({ proposal, accepted, selected, setSelected, updateRequirement, health, allSelected, onToggleAll, onAccept, loading }: { proposal: RequirementsDistillationProposal | null; accepted: ArchitectureProject["requirementsIntelligence"] extends infer _T ? any[] : never; selected: Set<string>; setSelected: React.Dispatch<React.SetStateAction<Set<string>>>; updateRequirement: (id: string, statement: string) => void; health: RequirementsDistillationProposal["health"] | undefined; allSelected: boolean; onToggleAll: () => void; onAccept: () => void; loading: boolean }) {
  const requirements = proposal?.requirements ?? accepted;
  if (!requirements.length) return <section className="genesis-panel"><div className="genesis-health"><HeartPulse size={20}/><h3>No requirements model yet</h3><p>Open Sources and generate the first governed requirements and Journey Atlas.</p></div></section>;
  return <div className="genesis-review-layout"><section className="genesis-panel"><header><div><h3>Canonical requirements proposal</h3><p>Review evidence status, ambiguity and acceptance criteria. Edit wording before acceptance where needed.</p></div>{proposal ? <button type="button" className="button button--secondary" onClick={onToggleAll}>{allSelected ? "Clear selection" : "Select all"}</button> : <span className="genesis-chip"><Check size={12}/> Accepted</span>}</header><div className="genesis-list">{requirements.map((item: RequirementsDistillationProposal["requirements"][number]) => <article className="genesis-requirement" key={item.id}><input type="checkbox" checked={!proposal || selected.has(item.id)} disabled={!proposal} onChange={() => setSelected((current) => { const next = new Set(current); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })}/><div className="genesis-requirement__body"><strong>{item.title}</strong>{proposal ? <textarea rows={3} value={item.statement} onChange={(event) => updateRequirement(item.id, event.target.value)}/> : <p>{item.statement}</p>}<div className="genesis-requirement__meta"><span className="genesis-chip">{item.type}</span><span className="genesis-chip">{item.priority}</span><span className="genesis-origin"><ShieldCheck size={11}/>{item.origin} · {Math.round(item.confidence * 100)}% confidence</span>{item.ambiguityFlags.map((flag) => <span className="genesis-chip is-warning" key={flag}>{flag}</span>)}</div>{item.acceptanceCriteria.length ? <p><b>Acceptance:</b> {item.acceptanceCriteria[0]}</p> : null}</div><CheckCircle2 size={16}/></article>)}</div>{proposal ? <footer className="genesis-action-footer"><div><strong>{selected.size} selected record(s)</strong><small>Only reviewed records will enter the canonical project-understanding model.</small></div><button type="button" className="button button--primary" disabled={loading || Boolean(proposal.conflicts?.some((item) => item.status === "open" && selected.has(item.leftRef) && selected.has(item.rightRef)))} onClick={onAccept}>{loading ? <Loader2 className="spin" size={15}/> : <CheckCircle2 size={15}/>} Accept selected model</button></footer> : null}</section><HealthPanel health={health}/></div>;
}

function HealthPanel({ health }: { health: RequirementsDistillationProposal["health"] | undefined }) {
  if (!health) return <section className="genesis-panel"><div className="genesis-health"><HeartPulse size={18}/><strong>Requirements health appears after distillation.</strong></div></section>;
  const scores = [["Completeness", health.completeness], ["Clarity", health.clarity], ["Testability", health.testability], ["Traceability", health.traceability], ["Journey coverage", health.journeyCoverage], ["Stakeholder coverage", health.stakeholderCoverage]] as const;
  return <section className="genesis-panel"><header><div><h3>Requirements health</h3><p>Evidence-backed gaps, not a cosmetic single score.</p></div><HeartPulse size={18}/></header><div className="genesis-health"><div className="genesis-health-grid">{scores.map(([label, score]) => <div key={label}><span>{label}</span><strong>{score}%</strong></div>)}</div>{health.gaps.slice(0, 7).map((gap) => <div className="genesis-gap" key={gap.id}><strong>{gap.title}</strong><p>{gap.detail}</p><small>{gap.recommendedAction}</small></div>)}</div></section>;
}

function JourneyAtlas({ journeys, active, onSelect }: { journeys: SolutionJourney[]; active: SolutionJourney | null; onSelect: (id: string) => void }) {
  if (!journeys.length) return <section className="genesis-panel"><div className="genesis-health"><Network size={20}/><h3>No solution journeys yet</h3><p>Generate requirements from an idea or source document to create the semantic Journey Atlas.</p></div></section>;
  return <div className="journey-atlas"><nav className="journey-atlas__list" aria-label="Solution journeys">{journeys.map((journey) => <button type="button" key={journey.id} className={journey.id === active?.id ? "is-active" : ""} onClick={() => onSelect(journey.id)}><strong>{journey.name}</strong><small>{journey.priority} · {journey.requirementRefs.length} requirement(s)</small></button>)}</nav>{active ? <JourneySequenceDiagram journey={active}/> : null}</div>;
}
