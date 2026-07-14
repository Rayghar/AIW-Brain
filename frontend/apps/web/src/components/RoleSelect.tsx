import { Compass, Building2, Server, ShieldCheck, Brain, Settings2, ArrowRight } from "lucide-react";
import type { ExperienceProfileId } from "../lib/experienceProfiles";

// First-run role selection (customer-journey front door). rc.10.42 made AIW
// role-scoped, but a new user still entered silently as Solution Architect and
// had to DISCOVER the role switcher to reach the other five journeys. This screen
// puts the choice of journey in front of the user at the natural moment — right
// after a project exists — so every role lands in the work that is theirs.
// Copy is taken verbatim from the in-app roleJourneyCatalog (not invented).

interface RoleCard {
  id: ExperienceProfileId;
  label: string;
  icon: typeof Compass;
  mission: string;
  steps: string[];
}

const ROLE_CARDS: RoleCard[] = [
  { id: "solution-architect", label: "Solution Architect", icon: Compass,
    mission: "Convert intent into a complete, defensible architecture model with decisions, trade-offs and review evidence.",
    steps: ["Orient", "Activate", "Brief", "Drivers", "Model", "Patterns", "Synthesize", "Realize"] },
  { id: "enterprise-architect", label: "Enterprise Architect", icon: Building2,
    mission: "Assess fit to enterprise standards, reuse opportunities, governance posture and strategic risk across projects.",
    steps: ["Orient", "Portfolio", "Compare", "Govern", "Patterns", "Pilot", "Release"] },
  { id: "platform-architect", label: "Platform Architect", icon: Server,
    mission: "Connect technology choices, topology, runtime evidence, security, drift and conformance into an operable architecture.",
    steps: ["Orient", "Capabilities", "Topology", "Secure", "Drift", "Conform", "Operate", "Runtime"] },
  { id: "reviewer", label: "Architecture Reviewer", icon: ShieldCheck,
    mission: "Inspect evidence, validate decisions, record findings and approve only when risk and traceability are acceptable.",
    steps: ["Orient", "Review", "Governance", "Compare", "Evidence", "Threads", "Audit"] },
  { id: "knowledge-curator", label: "Knowledge Curator", icon: Brain,
    mission: "Operate the architecture brain: curate claims, resolve contradictions and promote governed knowledge releases.",
    steps: ["Orient", "Mind Factory", "Claims", "Conflicts", "Normalize", "Pattern DNA", "Release"] },
  { id: "administrator", label: "Administrator", icon: Settings2,
    mission: "Configure secure operations for AIW: tenants, RBAC, model routes, repos, workers, audit and production readiness.",
    steps: ["Control", "Security", "Routes", "Repos", "Workers", "Tenant", "Readiness"] },
];

interface RoleSelectProps {
  currentRole: ExperienceProfileId;
  onSelect: (role: ExperienceProfileId) => void;
  onSkip: () => void;
}

export function RoleSelect({ currentRole, onSelect, onSkip }: RoleSelectProps) {
  return (
    <div className="role-select" role="dialog" aria-label="Choose your role">
      <div className="role-select__inner">
        <header className="role-select__head">
          <span className="role-select__eyebrow">Welcome to your architecture studio</span>
          <h1>What is your role on this project?</h1>
          <p>AIW scopes the workspace to the job you are doing — so you see your work first, not every module at once. The full product stays one click away, and you can change role anytime from the header.</p>
        </header>

        <div className="role-select__grid">
          {ROLE_CARDS.map((card) => {
            const Icon = card.icon;
            const active = card.id === currentRole;
            return (
              <button
                key={card.id}
                type="button"
                className={`role-card${active ? " role-card--active" : ""}`}
                onClick={() => onSelect(card.id)}
              >
                <div className="role-card__top">
                  <span className="role-card__icon"><Icon size={20} aria-hidden /></span>
                  <strong>{card.label}</strong>
                  {active ? <span className="role-card__current">current</span> : null}
                </div>
                <p className="role-card__mission">{card.mission}</p>
                <div className="role-card__steps">
                  {card.steps.map((step, i) => (
                    <span key={step} className="role-card__step">{step}{i < card.steps.length - 1 ? <ArrowRight size={9} aria-hidden /> : null}</span>
                  ))}
                </div>
                <span className="role-card__cta">Start this journey <ArrowRight size={13} aria-hidden /></span>
              </button>
            );
          })}
        </div>

        <footer className="role-select__foot">
          <button type="button" className="role-select__skip" onClick={onSkip}>
            Skip for now — continue as {ROLE_CARDS.find((r) => r.id === currentRole)?.label ?? "Solution Architect"}
          </button>
          <span className="role-select__note">Role changes navigation and guidance. Authorization remains enforced by your assigned permissions.</span>
        </footer>
      </div>
    </div>
  );
}
