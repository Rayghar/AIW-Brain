import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Database, ShieldCheck, Sparkles, UserRound, Workflow } from "lucide-react";
import type { JourneyInteraction, JourneyPathKind, SolutionJourney } from "@aiw/domain";

const pathLabels: Record<JourneyPathKind, string> = {
  happy: "Happy path",
  alternate: "Alternate",
  failure: "Failure",
  recovery: "Recovery",
};

function participantIcon(kind: SolutionJourney["participants"][number]["kind"]) {
  if (kind === "human" || kind === "team") return <UserRound size={15} />;
  if (kind === "data-store") return <Database size={15} />;
  return <Workflow size={15} />;
}

export function JourneySequenceDiagram({ journey, compact = false }: { journey: SolutionJourney; compact?: boolean }) {
  const availablePaths = journey.paths.filter((path) => path.interactions.length > 0);
  const [pathId, setPathId] = useState(availablePaths[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showQuality, setShowQuality] = useState(true);
  const [showTrust, setShowTrust] = useState(true);
  const path = availablePaths.find((item) => item.id === pathId) ?? availablePaths[0];
  const participants = useMemo(() => {
    const used = new Set(path?.interactions.flatMap((item) => [item.fromParticipantId, item.toParticipantId]) ?? []);
    return journey.participants.filter((item) => used.has(item.id));
  }, [journey.participants, path]);
  const selected = path?.interactions.find((item) => item.id === selectedId) ?? null;
  const participantMap = new Map(journey.participants.map((item) => [item.id, item]));
  const participantCount = Math.max(participants.length, 1);
  const trackWidth = Math.max(720, participantCount * 190);

  if (!path) return <div className="journey-sequence__empty">No interaction path has been generated for this journey.</div>;

  return (
    <section className={`journey-sequence ${compact ? "is-compact" : ""}`} aria-label={`${journey.name} sequence diagram`}>
      <header className="journey-sequence__header">
        <div>
          <span className="eyebrow"><Sparkles size={13} /> Interactive journey</span>
          <h3>{journey.name}</h3>
          <p>{journey.goal}</p>
        </div>
        <div className="journey-sequence__toggles">
          <label><input type="checkbox" checked={showQuality} onChange={(event) => setShowQuality(event.target.checked)} /> Quality hotspots</label>
          <label><input type="checkbox" checked={showTrust} onChange={(event) => setShowTrust(event.target.checked)} /> Trust crossings</label>
        </div>
      </header>

      {availablePaths.length > 1 ? <nav className="journey-sequence__paths" aria-label="Journey paths">
        {availablePaths.map((item) => <button key={item.id} type="button" className={item.id === path.id ? "is-active" : ""} onClick={() => { setPathId(item.id); setSelectedId(null); }}>
          {item.kind === "failure" ? <AlertTriangle size={13} /> : <Workflow size={13} />} {pathLabels[item.kind]}
        </button>)}
      </nav> : null}

      <div className="journey-sequence__viewport">
        <div className="journey-sequence__timeline" style={{ "--journey-track-width": `${trackWidth}px` } as React.CSSProperties}>
          <div className="journey-sequence__participant-shell">
            <span className="journey-sequence__side-label">Step</span>
            <div className="journey-sequence__participants" style={{ gridTemplateColumns: `repeat(${participantCount}, minmax(180px, 1fr))` }}>
              {participants.map((participant) => <div key={participant.id} className={`journey-participant is-${participant.kind}`}>
                <span>{participantIcon(participant.kind)}</span><strong>{participant.name}</strong><small>{participant.kind.replaceAll("-", " ")}</small>
              </div>)}
            </div>
            <span className="journey-sequence__side-label">Signals</span>
          </div>

          <div className="journey-sequence__body">
            <div className="journey-sequence__lane-shell" aria-hidden="true">
              <span />
              <div className="journey-sequence__lanes" style={{ gridTemplateColumns: `repeat(${participantCount}, minmax(180px, 1fr))` }}>
                {participants.map((participant) => <div key={participant.id} className="journey-sequence__lifeline" />)}
              </div>
              <span />
            </div>

            <div className="journey-sequence__messages">
              {[...path.interactions].sort((a, b) => a.sequence - b.sequence).map((interaction) => {
                const fromIndex = Math.max(0, participants.findIndex((item) => item.id === interaction.fromParticipantId));
                const toIndex = Math.max(0, participants.findIndex((item) => item.id === interaction.toParticipantId));
                const start = Math.min(fromIndex, toIndex);
                const end = Math.max(fromIndex, toIndex);
                const reverse = toIndex < fromIndex;
                const fromName = participantMap.get(interaction.fromParticipantId)?.name ?? interaction.fromParticipantId;
                const toName = participantMap.get(interaction.toParticipantId)?.name ?? interaction.toParticipantId;
                return <button key={interaction.id} type="button" className={`journey-message-row ${selectedId === interaction.id ? "is-selected" : ""}`} onClick={() => setSelectedId(interaction.id)}>
                  <span className="journey-message__sequence">{interaction.sequence}</span>
                  <span className="journey-message__track" style={{ gridTemplateColumns: `repeat(${participantCount}, minmax(180px, 1fr))` }}>
                    <span className={`journey-message__route ${reverse ? "is-reverse" : ""} ${start === end ? "is-loop" : ""}`} style={{ gridColumn: `${start + 1} / ${end + 2}` }}>
                      <span className="journey-message__label">
                        <small className="journey-message__participants-label">{fromName} <ArrowRight size={11} /> {toName}</small>
                        <strong>{interaction.label}</strong>
                        <small>{interaction.interactionKind.replaceAll("-", " ")}</small>
                      </span>
                    </span>
                  </span>
                  <span className="journey-message__signals">
                    {showTrust && interaction.trustBoundaryCrossing ? <span className="journey-message__signal is-trust" title="Trust-boundary crossing"><ShieldCheck size={12} /></span> : null}
                    {showQuality && interaction.qualityRefs.length ? <span className="journey-message__signal is-quality" title={`${interaction.qualityRefs.length} quality implication(s)`}>{interaction.qualityRefs.length}</span> : null}
                  </span>
                </button>;
              })}
            </div>
          </div>
        </div>
      </div>

      {selected ? <InteractionDetail interaction={selected} from={participantMap.get(selected.fromParticipantId)?.name ?? selected.fromParticipantId} to={participantMap.get(selected.toParticipantId)?.name ?? selected.toParticipantId} /> : null}
      {!compact ? <footer className="journey-sequence__footer">
        <div><span>Requirements</span><strong>{journey.requirementRefs.length}</strong></div>
        <div><span>Quality hotspots</span><strong>{journey.qualityHotspots.length}</strong></div>
        <div><span>Architecture obligations</span><strong>{journey.architectureObligations.length}</strong></div>
        <p>{journey.architectureObligations.slice(0, 2).join(" · ") || "Select an interaction to inspect its architecture implications."}</p>
      </footer> : null}
    </section>
  );
}

function InteractionDetail({ interaction, from, to }: { interaction: JourneyInteraction; from: string; to: string }) {
  return <aside className="journey-interaction-detail" aria-live="polite">
    <div><span>Selected interaction</span><strong>{from} → {to}</strong><p>{interaction.label}</p></div>
    <div className="journey-interaction-detail__facts">
      <span><b>{interaction.requirementRefs.length}</b> requirement link(s)</span>
      <span><b>{interaction.dataObjects.length}</b> data object(s)</span>
      <span><b>{interaction.qualityRefs.length}</b> quality implication(s)</span>
      <span><b>{interaction.trustBoundaryCrossing ? "Yes" : "No"}</b> trust crossing</span>
    </div>
    {interaction.failureBehaviour ? <p><AlertTriangle size={13} /> <strong>Failure behaviour:</strong> {interaction.failureBehaviour}</p> : null}
  </aside>;
}
