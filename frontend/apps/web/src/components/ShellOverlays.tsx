import { lazy, Suspense, useMemo, useState } from "react";
import { BrainCircuit, Compass, Filter, Map, Search, UserCog, ListTree, Crosshair, Eye, RotateCcw } from "lucide-react";
import { experienceProfiles } from "../lib/experienceProfiles";
import { capabilityRegistry, type CapabilityLane, type CapabilityStatus } from "../lib/capabilityRegistry";
import { featureUiRegistry } from "../lib/pageObjectiveRegistry";
import { projectRoleJourneys } from "../lib/roleJourneys";
const PatternExplorer = lazy(() => import("./PatternExplorer").then((module) => ({ default: module.PatternExplorer })));

const capabilityLanes: CapabilityLane[] = ["Orient", "Design", "Assure", "Operate"];
const capabilityStatuses: Array<"All" | CapabilityStatus> = ["All", "Visible", "Exposed", "API-backed", "Brain hook"];

const laneDescriptions: Record<CapabilityLane, string> = {
  Orient: "Find project status, cockpit views, persistence posture and the right place to continue.",
  Design: "Author the architecture through brief, drivers, model, patterns, synthesis and canvas decisions.",
  Assure: "Review decisions, evidence, conformance, ADRs, fitness tests and delivery readiness.",
  Operate: "Run the AIW platform substrate: routes, repos, workers, knowledge releases, security and readiness.",
};

export function ShellOverlays(props: any) {
  const {
    roleJourneyOpen,
    setRoleJourneyOpen,
    activeRoleJourney,
    activeRoleStepId,
    experienceProfileId,
    setExperienceProfile,
    enterJourneyTarget,
    capabilityMapOpen,
    setCapabilityMapOpen,
    openCapability,
    decisionRadarOpen,
    setDecisionRadarOpen,
    commandOpen,
    setCommandOpen,
    commandQuery,
    setCommandQuery,
    commandItems,
  } = props;

  const [capabilityQuery, setCapabilityQuery] = useState("");
  const [capabilityLane, setCapabilityLane] = useState<"All" | CapabilityLane>("All");
  const [capabilityStatus, setCapabilityStatus] = useState<"All" | CapabilityStatus>("All");

  const resetCapabilityFilters = () => {
    setCapabilityQuery("");
    setCapabilityLane("All");
    setCapabilityStatus("All");
  };

  const focusCapabilityLane = (lane: CapabilityLane, onlyLane = false) => {
    if (onlyLane) {
      setCapabilityQuery("");
      setCapabilityLane(lane);
      setCapabilityStatus("All");
    }
    window.setTimeout(() => {
      document.getElementById(`capability-lane-${lane.toLowerCase()}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  };

  const filteredCapabilities = useMemo(() => {
    const query = capabilityQuery.trim().toLowerCase();
    return capabilityRegistry.filter((item) => {
      const matchesQuery = !query || [item.label, item.purpose, item.surface, item.lane, item.status].join(" ").toLowerCase().includes(query);
      const matchesLane = capabilityLane === "All" || item.lane === capabilityLane;
      const matchesStatus = capabilityStatus === "All" || item.status === capabilityStatus;
      return matchesQuery && matchesLane && matchesStatus;
    });
  }, [capabilityLane, capabilityQuery, capabilityStatus]);

  const statusCounts = useMemo(() => capabilityRegistry.reduce<Record<CapabilityStatus, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, { Visible: 0, Exposed: 0, "API-backed": 0, "Brain hook": 0 }), []);

  return (
    <>
      {roleJourneyOpen ? (
        <div className="role-journey-backdrop" role="dialog" aria-modal="true" aria-label="AIW role and customer journey map">
          <section className="role-journey-panel role-journey-panel--compact">
            <header>
              <div>
                <span className="eyebrow"><Compass size={14}/> Role and customer journey analysis</span>
                <h2>Choose the accountable role, then follow the right work path</h2>
                <p>Roles change the work tools and recommended path. The design lifecycle remains available because every role still needs to understand where the architecture sits from intent to SDD.</p>
              </div>
              <button onClick={() => setRoleJourneyOpen(false)}>Close</button>
            </header>

            <div className="role-journey-current role-journey-current--compact">
              <article>
                <span className="eyebrow">Active journey</span>
                <h3>{activeRoleJourney.label}</h3>
                <p>{activeRoleJourney.mission}</p>
                <dl className="role-journey-definition-list">
                  <div><dt>Success</dt><dd>{activeRoleJourney.success}</dd></div>
                  <div><dt>Guardrail</dt><dd>{activeRoleJourney.watchFor}</dd></div>
                </dl>
              </article>
              <nav aria-label="Active role journey steps">
                {activeRoleJourney.path.map((step: any, index: number) => (
                  <button key={`modal-${step.id}`} className={activeRoleStepId === step.id ? "active" : ""} onClick={() => { const detail = { title: step.label, caption: step.detail, taskId: step.id }; window.sessionStorage.setItem("aiw.activeRoleTask", step.id); window.dispatchEvent(new CustomEvent("aiw:task-lens", { detail })); setRoleJourneyOpen(false); enterJourneyTarget(step.target); window.setTimeout(() => window.dispatchEvent(new CustomEvent("aiw:role-task", { detail })), 0); }}>
                    <b>{index + 1}</b>
                    <span><strong>{step.label}</strong><small>{step.detail}</small></span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="role-switch-table" aria-label="Available AIW accountable roles">
              {experienceProfiles.map((profile) => {
                const journey = props.roleJourneyCatalog[profile.id];
                const active = profile.id === experienceProfileId;
                return (
                  <button key={profile.id} className={active ? "active" : ""} onClick={() => setExperienceProfile(profile.id)}>
                    <UserCog size={15}/>
                    <span><strong>{journey.label}</strong><small>{journey.roleFamily}</small></span>
                    <em>{journey.path.slice(0, 5).map((step: any) => step.label).join(" → ")}</em>
                    <b>{active ? "Active" : "Select"}</b>
                  </button>
                );
              })}
            </div>

            <section className="role-journey-collaboration">
              <header>
                <h3>Project collaboration roles</h3>
                <p>Use these shortcuts when you are acting as a sponsor, reviewer, contributor or governance participant inside a project.</p>
              </header>
              <div className="project-role-grid project-role-grid--compact">
                {projectRoleJourneys.map((item) => (
                  <button key={item.role} onClick={() => { setRoleJourneyOpen(false); enterJourneyTarget(item.bestStart); }}>
                    <strong>{item.label}</strong>
                    <small>{item.primaryNeed}</small>
                    <em>{item.uxRisk}</em>
                  </button>
                ))}
              </div>
            </section>
          </section>
        </div>
      ) : null}

      {capabilityMapOpen ? (
        <div className="capability-map-backdrop" role="dialog" aria-modal="true" aria-label="AIW capability map">
          <section className="capability-map-panel capability-map-panel--strong">
            <header>
              <div>
                <span className="eyebrow"><Map size={14}/> Capability map</span>
                <h2>Find every AIW capability without crowding the role rail</h2>
                <p>The role rail stays task-focused. Use this searchable map to find built product capabilities, their current surface, status, and where they belong in the workflow.</p>
              </div>
              <button onClick={() => setCapabilityMapOpen(false)}>Close</button>
            </header>

            <div className="capability-map-toolbar" aria-label="Capability map filters">
              <label>
                <Search size={14} />
                <input value={capabilityQuery} onChange={(event) => setCapabilityQuery(event.target.value)} placeholder="Search capability, task, API, surface…" />
              </label>
              <div className="capability-filter-group" aria-label="Lane filters">
                <button className={capabilityLane === "All" ? "active" : ""} onClick={() => setCapabilityLane("All")}>All lanes</button>
                {capabilityLanes.map((lane) => <button key={lane} className={capabilityLane === lane ? "active" : ""} onClick={() => setCapabilityLane(lane)}>{lane}</button>)}
              </div>
              <div className="capability-filter-group capability-filter-group--status" aria-label="Status filters">
                <Filter size={13} />
                {capabilityStatuses.map((status) => <button key={status} className={capabilityStatus === status ? "active" : ""} onClick={() => setCapabilityStatus(status)}>{status}</button>)}
              </div>
            </div>

            <div className="capability-map-sticky-nav capability-map-sticky-nav--actions" aria-label="Capability map quick navigation and lane actions">
              <span><ListTree size={13} /> Jump to</span>
              {capabilityLanes.map((lane) => (
                <button key={lane} type="button" className={capabilityLane === lane ? "active" : ""} onClick={() => focusCapabilityLane(lane, false)}>{lane}</button>
              ))}
              <button type="button" onClick={() => document.getElementById("feature-ui-registry")?.scrollIntoView({ block: "start", behavior: "smooth" })}>Feature → UI registry</button>
              <button type="button" className="capability-map-reset" onClick={resetCapabilityFilters}><RotateCcw size={12} /> Reset</button>
            </div>

            <div className="capability-map-lane-actions" aria-label="Show only one capability lane">
              <span><Eye size={13} /> Show only</span>
              {capabilityLanes.map((lane) => (
                <button key={lane} type="button" className={capabilityLane === lane ? "active" : ""} onClick={() => focusCapabilityLane(lane, true)}>{lane}</button>
              ))}
              <button type="button" onClick={resetCapabilityFilters}>All capabilities</button>
            </div>

            <div className="capability-map-summary" aria-label="Capability map summary">
              <span><strong>{filteredCapabilities.length}</strong> matching capabilities</span>
              <span><strong>{statusCounts.Visible}</strong> visible</span>
              <span><strong>{statusCounts.Exposed}</strong> exposed</span>
              <span><strong>{statusCounts["API-backed"]}</strong> API-backed</span>
              <span><strong>{statusCounts["Brain hook"]}</strong> brain hooks</span>
            </div>

            <div className="capability-map-grid capability-map-grid--strengthened">
              {capabilityLanes.map((lane) => {
                const laneItems = filteredCapabilities.filter((item) => item.lane === lane);
                return (
                  <article key={lane} id={`capability-lane-${lane.toLowerCase()}`} className="capability-lane capability-lane--strengthened capability-lane--actionable">
                    <header className="capability-lane__header">
                      <div>
                        <h3>{lane}<small>{laneItems.length}</small></h3>
                        <p>{laneDescriptions[lane]}</p>
                      </div>
                      <div className="capability-lane__actions">
                        <button type="button" onClick={() => focusCapabilityLane(lane, true)}><Crosshair size={12}/> Show only</button>
                        {capabilityLane === lane ? <button type="button" onClick={resetCapabilityFilters}>Show all</button> : null}
                      </div>
                    </header>
                    {laneItems.length ? laneItems.map((item) => (
                      <button key={item.id} onClick={() => openCapability(item.id)}>
                        <span><strong>{item.label}</strong><small>{item.purpose}</small><em>{item.surface}</em></span>
                        <b>{item.status}</b>
                      </button>
                    )) : <p className="capability-lane-empty">No capabilities match the current filters.</p>}
                  </article>
                );
              })}
            </div>

            <section id="feature-ui-registry" className="feature-ui-registry-surface" aria-label="Feature to UI registry">
              <header>
                <h3>Feature → UI placement registry</h3>
                <p>Use this to verify built backend/frontend capabilities appear in the right role, stage or workspace instead of becoming left-rail clutter.</p>
              </header>
              <div>
                {featureUiRegistry.map((item) => (
                  <article key={item.feature}>
                    <strong>{item.feature}</strong>
                    <span>{item.ui}</span>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      ) : null}

      {decisionRadarOpen ? (
        <div className="decision-radar-backdrop" role="dialog" aria-modal="true" aria-label="AIW Decision Radar">
          <section className="decision-radar-drawer">
            <header>
              <div>
                <span className="eyebrow">Contextual co-authoring</span>
                <h2>Decision Radar</h2>
                <p>Styles, patterns, obligations, evidence, questions and anti-pattern signals for the current context.</p>
              </div>
              <button onClick={() => setDecisionRadarOpen(false)}>Close</button>
            </header>
            <Suspense fallback={<div className="lazy-workspace-skeleton">Loading Decision Radar…</div>}><PatternExplorer /></Suspense>
          </section>
        </div>
      ) : null}

      {commandOpen ? (
        <div className="command-palette-backdrop" role="dialog" aria-modal="true" aria-label="AIW command palette">
          <section className="command-palette">
            <header>
              <BrainCircuit size={18} />
              <input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Search workspaces, actions and modelling commands…" />
              <button onClick={() => setCommandOpen(false)}>Esc</button>
            </header>
            <div>
              {commandItems.slice(0, 12).map((item: any) => (
                <button key={item.id} onClick={() => { item.action(); setCommandOpen(false); setCommandQuery(""); }}>
                  <Search size={14}/>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
