import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleDashed,
  KeyRound,
  Radio,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { validateProjectSecurity } from "@aiw/engine";
import { useWorkspaceStore } from "../store/workspaceStore";
import { getJson } from "../lib/apiClient";

interface AcceptanceCheck {
  id: string;
  name: string;
  category: string;
  status:
    "verified" | "configured" | "reference-only" | "not-configured" | "failed";
  detail: string;
  remediation: string;
  activeProbe: boolean;
}
interface AcceptanceReport {
  generatedAt: string;
  platformVersion: string;
  productionAccepted: boolean;
  verified: number;
  configured: number;
  open: number;
  checks: AcceptanceCheck[];
  boundary: string;
}

export function SecurityWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const findings = validateProjectSecurity(project);
  const enabledProviders = project.identityProviders.filter(
    (provider) => provider.enabled,
  );
  const [acceptance, setAcceptance] = useState<AcceptanceReport | null>(null);
  const [acceptanceError, setAcceptanceError] = useState<string | null>(null);
  const [acceptanceLoading, setAcceptanceLoading] = useState(false);
  const refreshAcceptance = async () => {
    setAcceptanceLoading(true);
    setAcceptanceError(null);
    try {
      setAcceptance(
        await getJson<AcceptanceReport>("/api/platform/acceptance"),
      );
    } catch (error) {
      setAcceptanceError(
        error instanceof Error
          ? error.message
          : "Acceptance report unavailable.",
      );
    } finally {
      setAcceptanceLoading(false);
    }
  };
  useEffect(() => {
    void refreshAcceptance();
  }, []);
  return (
    <section className="studio-page security-page">
      <div className="studio-hero">
        <div>
          <span className="eyebrow">Security architecture</span>
          <h1>Security & live collaboration</h1>
          <p>
            Tenant isolation, SSO-ready identity, provider-backed secret
            references, presence, activity delivery and audit retention.
          </p>
        </div>
        <div className="hero-metric">
          <ShieldCheck size={22} />
          <strong>
            {findings.length
              ? `${findings.length} finding${findings.length === 1 ? "" : "s"}`
              : "Model checks clear"}
          </strong>
          <small>Design-time posture · production acceptance is shown below</small>
        </div>
      </div>

      <div className="governance-grid">
        <article className="governance-card">
          <div className="card-title">
            <UsersRound size={18} />
            <div>
              <strong>Tenant boundary</strong>
              <small>{project.tenantId}</small>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>SSO required</dt>
              <dd>{project.securitySettings.requireSso ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Session maximum</dt>
              <dd>{project.securitySettings.sessionMaxAgeMinutes} minutes</dd>
            </div>
            <div>
              <dt>Audit retention</dt>
              <dd>{project.securitySettings.auditRetentionDays} days</dd>
            </div>
          </dl>
        </article>

        <article className="governance-card">
          <div className="card-title">
            <KeyRound size={18} />
            <div>
              <strong>Identity providers</strong>
              <small>{enabledProviders.length} enabled</small>
            </div>
          </div>
          <div className="stack-list">
            {enabledProviders.map((provider) => (
              <div className="list-row" key={provider.id}>
                <div>
                  <strong>{provider.name}</strong>
                  <small>
                    {provider.type.toUpperCase()} · {provider.issuer}
                  </small>
                </div>
                <span className={provider.type === "development" ? "status-pill status-pill--warning" : "status-pill status-pill--approved"}>
                  {provider.type === "development" ? "Reference only" : "Configured"}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="governance-card">
          <div className="card-title">
            <Radio size={18} />
            <div>
              <strong>Live delivery posture</strong>
              <small>Server-sent activity and editor presence</small>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Presence time-to-live</dt>
              <dd>{project.collaborationSettings.presenceTtlSeconds}s</dd>
            </div>
            <div>
              <dt>Concurrent editor ceiling</dt>
              <dd>{project.collaborationSettings.maxConcurrentEditors}</dd>
            </div>
            <div>
              <dt>Operation retries</dt>
              <dd>{project.collaborationSettings.operationRetryLimit}</dd>
            </div>
          </dl>
        </article>

        <article className="governance-card">
          <div className="card-title">
            <Activity size={18} />
            <div>
              <strong>Secret references</strong>
              <small>No secret values are stored in the model</small>
            </div>
          </div>
          <div className="stack-list">
            {project.secretReferences.map((secret) => (
              <div className="list-row" key={secret.id}>
                <div>
                  <strong>{secret.purpose}</strong>
                  <small>{secret.locator}</small>
                </div>
                <span className="status-pill">{secret.provider}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <section className="panel-card acceptance-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Production acceptance</span>
            <h2>Implemented, configured and verified are different states</h2>
          </div>
          <button
            className="button button--secondary"
            onClick={() => void refreshAcceptance()}
            disabled={acceptanceLoading}
          >
            <RefreshCw className={acceptanceLoading ? "spin" : ""} size={15} />{" "}
            Refresh probes
          </button>
        </div>
        {acceptance ? (
          <>
            <div className="acceptance-summary">
              <div>
                <strong>{acceptance.verified}</strong>
                <span>Verified here</span>
              </div>
              <div>
                <strong>{acceptance.configured}</strong>
                <span>Configured</span>
              </div>
              <div>
                <strong>{acceptance.open}</strong>
                <span>Open</span>
              </div>
              <div>
                <strong>{acceptance.productionAccepted ? "Yes" : "No"}</strong>
                <span>Production accepted</span>
              </div>
            </div>
            <p className="panel-intro">{acceptance.boundary}</p>
            <div className="acceptance-grid">
              {acceptance.checks.map((check) => (
                <article
                  key={check.id}
                  className={`acceptance-card acceptance-card--${check.status}`}
                >
                  <header>
                    {check.status === "verified" ? (
                      <CheckCircle2 size={17} />
                    ) : check.status === "failed" ? (
                      <TriangleAlert size={17} />
                    ) : (
                      <CircleDashed size={17} />
                    )}
                    <div>
                      <strong>{check.name}</strong>
                      <small>
                        {check.category} · {check.status.replaceAll("-", " ")}
                      </small>
                    </div>
                  </header>
                  <p>{check.detail}</p>
                  <small>{check.remediation}</small>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-card">
            {acceptanceError ?? "Loading platform acceptance status…"}
          </div>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Deterministic checks</span>
            <h2>Security findings</h2>
          </div>
        </div>
        {findings.length ? (
          <div className="stack-list">
            {findings.map((finding) => (
              <div className="finding-card" key={finding.id}>
                <div>
                  <strong>{finding.title}</strong>
                  <p>{finding.message}</p>
                </div>
                <span
                  className={`severity severity--${finding.severity.toLowerCase()}`}
                >
                  {finding.severity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-card">
            No tenant, identity-provider or secret-reference issues were
            detected.
          </div>
        )}
      </section>
    </section>
  );
}
