import {
  BrainCircuit,
  ClipboardCheck,
  Download,
  Gauge,
  Info,
  Loader2,
  LockKeyhole,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useWorkspaceStore } from "../store/workspaceStore";
import { DesignGuide } from "./DesignGuide";
import { FullJourneyIntelligenceSurface } from "./WorkspaceIntelligenceMap";
import { postJson } from "../lib/apiClient";
import { RecommendationConfidenceDisclosure } from "./RecommendationConfidenceDisclosure";
import { useGuidedDeliveryTask } from "../lib/guidedDeliveryContext";

interface RankingExplanationResponse {
  available: boolean;
  degradedReason?: string;
  result?: {
    explanation: string;
    counterfactuals: string[];
    uncertainty: string[];
    rankingTop3: Array<{ styleId: string; styleName: string; score: number }>;
  };
  providerId?: string;
  model?: string;
  fallbackUsed?: boolean;
}

export function QualityAttributeStudio() {
  const guidedTask = useGuidedDeliveryTask();
  const guidedTaskId = guidedTask?.stageId === "quality" ? guidedTask.taskId : null;
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const recommendations = useWorkspaceStore((state) => state.recommendations);
  const setQualityWeight = useWorkspaceStore((state) => state.setQualityWeight);
  const addQualityScenario = useWorkspaceStore(
    (state) => state.addQualityScenario,
  );
  const updateQualityScenario = useWorkspaceStore(
    (state) => state.updateQualityScenario,
  );
  const deleteQualityScenario = useWorkspaceStore(
    (state) => state.deleteQualityScenario,
  );
  const [explanation, setExplanation] =
    useState<RankingExplanationResponse | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const downloadCalibrationPack = () => {
    const draftAttributes = library.qualityAttributes.filter(
      (attribute) => attribute.calibrated !== true,
    );
    const pack = {
      generatedAt: new Date().toISOString(),
      projectId: project.id,
      lifecycle: [
        "unrated",
        "draft-ai",
        "expert-reviewed",
        "benchmark-approved",
        "production",
        "deprecated",
      ],
      rule: "Only production or benchmark-approved attributes may influence deterministic style scoring.",
      attributes: draftAttributes.map((attribute) => ({
        id: attribute.id,
        name: attribute.name,
        definition: attribute.definition,
        measures: attribute.measures,
        currentStatus: attribute.calibrationStatus ?? "unrated",
        currentConfidence: attribute.calibrationConfidence ?? 0,
        expertReview: {
          reviewer: "",
          reviewedAt: "",
          evidenceIds: [],
          disagreements: [],
          proposedStyleRatings: {},
          notes: "",
        },
        benchmarkApproval: {
          scenarioIds: [],
          sensitivityPassed: false,
          antiPlaceboPassed: false,
          approvedBy: "",
          approvedAt: "",
        },
      })),
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aiw-quality-calibration-review-${project.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const explainRanking = async () => {
    setExplanationLoading(true);
    try {
      setExplanation(
        await postJson<RankingExplanationResponse>(
          "/api/design/explain-ranking",
          { project },
        ),
      );
    } catch (cause) {
      setExplanation({
        available: false,
        degradedReason:
          cause instanceof Error
            ? cause.message
            : "Ranking explanation failed.",
      });
    } finally {
      setExplanationLoading(false);
    }
  };

  const visibleAttributes = guidedTaskId ? library.qualityAttributes.filter((attribute) => attribute.calibrated || project.qualityPriorities.some((item) => item.attributeId === attribute.id && item.weight > 0)) : library.qualityAttributes;

  return (
    <section className={`studio-page quality-page guided-quality ${guidedTaskId ? `guided-quality--${guidedTaskId}` : "guided-quality--advanced"}`}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Design drivers</span>
          <h2>Quality Attribute Studio</h2>
          <p>
            Set calibrated priorities, then define measurable scenarios that
            make architecture outcomes testable.
          </p>
        </div>
        <div className="status-pill">
          <Gauge size={15} /> Deterministic scoring
        </div>
      </div>

      <section className="calibration-governance">
        <div>
          <ClipboardCheck size={18} />
          <span>
            <strong>Calibration governance</strong>
            <small>
              {
                library.qualityAttributes.filter(
                  (attribute) => attribute.calibrated,
                ).length
              }{" "}
              production-calibrated ·{" "}
              {
                library.qualityAttributes.filter(
                  (attribute) => !attribute.calibrated,
                ).length
              }{" "}
              awaiting expert and benchmark approval
            </small>
          </span>
        </div>
        <button
          className="button button--secondary"
          onClick={downloadCalibrationPack}
        >
          <Download size={15} /> Download expert review pack
        </button>
        <p>
          Pending attributes remain valid requirements and quality scenarios,
          but cannot influence deterministic ranking until expert review,
          sensitivity testing and benchmark approval are recorded.
        </p>
      </section>

      <DesignGuide placement="quality" />

      <FullJourneyIntelligenceSurface />

      <div className="quality-layout">
        <div className="quality-list">
          {visibleAttributes.map((attribute) => {
            const calibrated = attribute.calibrated === true;
            const weight =
              project.qualityPriorities.find(
                (item) => item.attributeId === attribute.id,
              )?.weight ?? 0;
            return (
              <article
                className={`quality-row ${calibrated ? "" : "quality-row--pending"}`}
                key={attribute.id}
              >
                <div>
                  <div className="quality-title">
                    <strong>{attribute.name}</strong>
                    <span>
                      {calibrated ? (
                        `${weight}/5`
                      ) : (
                        <>
                          <LockKeyhole size={12} /> Pending calibration
                        </>
                      )}
                    </span>
                  </div>
                  <p>{attribute.definition}</p>
                  <small>{attribute.measures}</small>
                  <em>
                    {calibrated
                      ? `Calibration confidence ${Math.round((attribute.calibrationConfidence ?? 0) * 100)}%`
                      : "Recorded as a requirement; excluded from style scoring until expert approval."}
                  </em>
                </div>
                <input
                  aria-label={`${attribute.name} priority${calibrated ? "" : " — pending calibration"}`}
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={weight}
                  disabled={!calibrated}
                  onChange={(event) =>
                    setQualityWeight(attribute.id, Number(event.target.value))
                  }
                />
              </article>
            );
          })}
        </div>

        <aside className="recommendation-preview">
          <div className="panel-heading">
            <Info size={17} />
            <strong>Current leading eligible styles</strong>
            <button
              className="icon-text-button"
              disabled={explanationLoading}
              onClick={() => void explainRanking()}
            >
              {explanationLoading ? (
                <Loader2 className="spin" size={14} />
              ) : (
                <BrainCircuit size={14} />
              )}{" "}
              Explain
            </button>
          </div>
          {recommendations
            .filter((item) => item.eligible)
            .slice(0, 4)
            .map((item, index) => (
              <article className="rank-card" key={item.styleId}>
                <div className="rank-card__top">
                  <span>#{index + 1}</span>
                  <strong>{item.styleName}</strong>
                  <b>{item.score.toFixed(1)}</b>
                </div>
                <p>
                  {item.strengths[0] ??
                    item.assumptions[0] ??
                    "Awaiting calibrated decision drivers."}
                </p>
                <small>
                  {item.calibratedWeight} calibrated weight ·{" "}
                  {item.contributions.length} contribution(s)
                </small>
                {item.tradeoffs[0] ? (
                  <small>Trade-off: {item.tradeoffs[0]}</small>
                ) : null}
                <RecommendationConfidenceDisclosure recommendation={item} compact />
              </article>
            ))}
          {recommendations.every((item) => !item.eligible) ? (
            <div className="empty-card">
              No style is eligible under the current applicability gates. Review
              the brief and context.
            </div>
          ) : null}
          {explanation ? (
            <section className="ranking-explanation">
              {explanation.available && explanation.result ? (
                <>
                  <span className="eyebrow">
                    Governed co-architect explanation
                  </span>
                  <p>{explanation.result.explanation}</p>
                  {explanation.result.counterfactuals.length ? (
                    <>
                      <strong>What could change the ranking?</strong>
                      <ul>
                        {explanation.result.counterfactuals.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {explanation.result.uncertainty.length ? (
                    <small>
                      Uncertainty: {explanation.result.uncertainty.join(" · ")}
                    </small>
                  ) : null}
                  <small>
                    {explanation.providerId ?? "configured provider"} ·{" "}
                    {explanation.model ?? "model"}
                  </small>
                </>
              ) : (
                <div className="advisor-degraded">
                  {explanation.degradedReason ??
                    "The LLM explanation route is unavailable."}{" "}
                  Deterministic contribution traces remain authoritative.
                </div>
              )}
            </section>
          ) : null}
        </aside>
      </div>

      <section className="quality-scenario-section">
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">Measurable outcomes</span>
            <h3>Quality scenarios</h3>
            <p>
              Describe the source, stimulus, environment, affected artifact,
              response and measurable result.
            </p>
          </div>
          <button
            className="button button--secondary"
            onClick={() => addQualityScenario()}
          >
            <Plus size={15} /> Add scenario
          </button>
        </div>
        {!project.qualityScenarios.length ? (
          <div className="empty-card">
            No measurable quality scenarios have been defined. Priorities guide
            ranking; scenarios guide validation.
          </div>
        ) : (
          <div className="quality-scenario-list">
            {project.qualityScenarios.map((scenario, index) => (
              <article className="quality-scenario-card" key={scenario.id}>
                <header>
                  <strong>Scenario {index + 1}</strong>
                  <button
                    className="icon-button"
                    onClick={() => deleteQualityScenario(scenario.id)}
                    title="Delete scenario"
                  >
                    <Trash2 size={15} />
                  </button>
                </header>
                <div className="quality-scenario-grid">
                  <label>
                    <span>Quality attribute</span>
                    <select
                      value={scenario.attributeId}
                      onChange={(event) =>
                        updateQualityScenario(scenario.id, {
                          attributeId: event.target.value,
                        })
                      }
                    >
                      {library.qualityAttributes.map((attribute) => (
                        <option key={attribute.id} value={attribute.id}>
                          {attribute.name}
                          {attribute.calibrated ? "" : " — requirement only"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Priority</span>
                    <select
                      value={scenario.weight}
                      onChange={(event) =>
                        updateQualityScenario(scenario.id, {
                          weight: Number(event.target.value),
                        })
                      }
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Source of stimulus</span>
                    <input
                      value={scenario.source}
                      onChange={(event) =>
                        updateQualityScenario(scenario.id, {
                          source: event.target.value,
                        })
                      }
                      placeholder="Customer, external provider, attacker…"
                    />
                  </label>
                  <label>
                    <span>Stimulus</span>
                    <input
                      value={scenario.stimulus}
                      onChange={(event) =>
                        updateQualityScenario(scenario.id, {
                          stimulus: event.target.value,
                        })
                      }
                      placeholder="Traffic spike, outage, data request…"
                    />
                  </label>
                  <label>
                    <span>Environment</span>
                    <input
                      value={scenario.environment}
                      onChange={(event) =>
                        updateQualityScenario(scenario.id, {
                          environment: event.target.value,
                        })
                      }
                      placeholder="Peak production traffic"
                    />
                  </label>
                  <label>
                    <span>Affected artifact</span>
                    <input
                      value={scenario.artifact}
                      onChange={(event) =>
                        updateQualityScenario(scenario.id, {
                          artifact: event.target.value,
                        })
                      }
                      placeholder="Checkout service or payment boundary"
                    />
                  </label>
                  <label className="field--wide">
                    <span>Expected response</span>
                    <textarea
                      rows={2}
                      value={scenario.response}
                      onChange={(event) =>
                        updateQualityScenario(scenario.id, {
                          response: event.target.value,
                        })
                      }
                      placeholder="Isolate the failure and preserve accepted work…"
                    />
                  </label>
                  <label className="field--wide">
                    <span>Measurable response</span>
                    <textarea
                      rows={2}
                      value={scenario.responseMeasure}
                      onChange={(event) =>
                        updateQualityScenario(scenario.id, {
                          responseMeasure: event.target.value,
                        })
                      }
                      placeholder="No confirmed transaction is lost; recovery within 60 seconds…"
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
