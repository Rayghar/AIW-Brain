import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Gauge,
  Layers3,
  ListChecks,
  LockKeyhole,
  Play,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";
import {
  assessDeliveryStage,
  currentDeliveryStageId,
  deliveryStages,
  nextDeliveryStageId,
  previousDeliveryStageId,
  type DeliveryStageAssessment,
  type DeliveryStageId,
} from "../lib/guidedDelivery";
import { GuidedDeliveryTaskProvider } from "../lib/guidedDeliveryContext";
import { can } from "../lib/roleAccess";
import { SddDeliveryWorkspace } from "./guided-delivery/SddDeliveryWorkspace";
import { StageOutputEvidence } from "./guided-delivery/StageOutputEvidence";

interface GuidedDeliveryShellProps {
  children: ReactNode;
  onOpenCoArchitect: (prompt: string) => void;
  onOpenDecisionRadar: () => void;
  onOpenInfoCenter: () => void;
}

type DeliveryPane = "plan" | "work" | "outputs" | "validation";

const statusCopy = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "inputs-complete": "Inputs complete",
  validated: "Validated",
  submitted: "Submitted",
  approved: "Approved",
  delivered: "Delivered",
  blocked: "Changes required",
} as const;

function stagePrompt(assessment: DeliveryStageAssessment) {
  return `Act as a senior software architect and help me complete ${assessment.definition.title}.\nPurpose: ${assessment.definition.purpose}\nCurrent blockers: ${assessment.blockers.map((item) => item.label).join("; ") || "none"}.\nGuide me through the next concrete action without changing the architecture silently.`;
}

export function GuidedDeliveryShell({ children, onOpenCoArchitect, onOpenDecisionRadar, onOpenInfoCenter }: GuidedDeliveryShellProps) {
  const project = useWorkspaceStore((state) => state.project);
  const workspaceMode = useWorkspaceStore((state) => state.workspaceMode);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const activeLifecycleStep = useWorkspaceStore((state) => state.activeLifecycleStep);
  const setActiveLifecycleStep = useWorkspaceStore((state) => state.setActiveLifecycleStep);
  const lifecycleCompletions = useWorkspaceStore((state) => state.lifecycleCompletions);
  const lifecycleArtifacts = useWorkspaceStore((state) => state.lifecycleArtifacts);
  const completeLifecycleStep = useWorkspaceStore((state) => state.completeLifecycleStep);
  const requestStageApproval = useWorkspaceStore((state) => state.requestStageApproval);
  const experienceProfile = useWorkspaceStore((state) => state.experienceProfile);
  const [pane, setPane] = useState<DeliveryPane>("plan");
  const [message, setMessage] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const stageId = currentDeliveryStageId(workspaceMode, project.activeStage, activeLifecycleStep);
  const lifecycle = useMemo(() => ({
    completions: lifecycleCompletions,
    artifacts: lifecycleArtifacts.filter((item) => item.projectId === project.id && item.branchId === project.branch.id),
    projectId: project.id,
    branchId: project.branch.id,
  }), [lifecycleCompletions, lifecycleArtifacts, project.id, project.branch.id]);
  const assessments = useMemo(() => deliveryStages.map((stage) => assessDeliveryStage(project, stage.id, lifecycle)), [project, lifecycle]);
  const assessment = assessments.find((item) => item.definition.id === stageId)!;
  const previousId = previousDeliveryStageId(stageId);
  const nextId = nextDeliveryStageId(stageId);
  const reviewApproval = [...project.stageApprovals].reverse().find((item) => item.stage === "validationRealization");
  const activeTask = assessment.definition.tasks.find((task) => task.id === activeTaskId) ?? assessment.definition.tasks.find((task) => task.checkIds.some((checkId) => assessment.blockers.some((blocker) => blocker.id === checkId))) ?? assessment.definition.tasks[0];
  const activeTaskChecks = activeTask?.checkIds.map((checkId) => assessment.checks.find((check) => check.id === checkId)).filter((check): check is NonNullable<typeof check> => Boolean(check)) ?? [];
  const reviewPreApprovalBlockers = stageId === "review" ? assessment.blockers.filter((item) => item.id !== "approval") : assessment.blockers;
  const isOwner = can(experienceProfile, "architecture.write");

  useEffect(() => {
    setPane("plan");
    setMessage(null);
    const firstIncomplete = assessment.definition.tasks.find((task) =>
      task.checkIds.some((checkId) => assessment.checks.some((check) => check.id === checkId && !check.done)),
    );
    setActiveTaskId(firstIncomplete?.id ?? assessment.definition.tasks[0]?.id ?? null);
  }, [stageId]);

  function navigate(stage: DeliveryStageId) {
    const definition = deliveryStages.find((item) => item.id === stage)!;
    setMessage(null);
    setActiveLifecycleStep(stage);
    if (definition.workspace === "quality") {
      setWorkspaceMode("quality");
    } else {
      setWorkspaceMode("design");
      if (definition.architectureStage) setActiveStage(definition.architectureStage);
    }
    window.setTimeout(() => document.getElementById("guided-stage-top")?.focus(), 0);
  }

  function completeAndContinue() {
    if (!isOwner) {
      setMessage("This role can inspect the lifecycle but cannot complete an architecture-authoring stage.");
      return;
    }
    if (stageId === "review") {
      if (reviewApproval?.status === "approved") {
        navigate("sdd");
        return;
      }
      if (reviewApproval?.status === "pending") {
        setMessage("The immutable baseline is awaiting reviewer disposition. Switch to Architecture Reviewer to approve or request changes.");
        return;
      }
      if (reviewPreApprovalBlockers.length) {
        setPane("validation");
        setMessage(`Resolve ${reviewPreApprovalBlockers.length} required review item(s) before submitting the baseline.`);
        return;
      }
      completeLifecycleStep({
        stepId: stageId,
        title: assessment.definition.title,
        handoffTo: "Independent architecture review",
        checklist: assessment.checks.filter((item) => item.id !== "approval").map((item) => ({ label: item.label, done: item.done, required: item.required, ...(item.evidence ? { evidence: item.evidence } : {}) })),
        artifactNames: assessment.definition.outputs,
        notes: "Validated architecture baseline prepared for independent disposition.",
      });
      requestStageApproval("validationRealization", "Solution Architect");
      setMessage("The validated baseline was submitted for independent architecture review.");
      return;
    }
    if (stageId === "sdd") {
      setPane("work");
      return;
    }
    if (assessment.blockers.length) {
      setPane("validation");
      setMessage(`This stage cannot be completed yet. Resolve ${assessment.blockers.length} required item(s) first.`);
      return;
    }
    completeLifecycleStep({
      stepId: stageId,
      title: assessment.definition.title,
      handoffTo: nextId ? deliveryStages.find((item) => item.id === nextId)?.title : undefined,
      checklist: assessment.checks.map((item) => ({ label: item.label, done: item.done, required: item.required, ...(item.evidence ? { evidence: item.evidence } : {}) })),
      artifactNames: assessment.definition.outputs,
      notes: "All required stage checks passed before handoff.",
    });
    if (nextId) navigate(nextId);
  }

  const primaryLabel = (() => {
    if (stageId === "sdd") return "Open delivery generator";
    if (stageId === "review" && reviewApproval?.status === "pending") return "Awaiting reviewer disposition";
    if (stageId === "review" && reviewApproval?.status === "approved") return "Continue to SDD Pack";
    if (stageId === "review") return "Submit baseline for review";
    if (assessment.blockers.length) return `Resolve ${assessment.blockers.length} required item${assessment.blockers.length === 1 ? "" : "s"}`;
    return nextId ? `Complete stage → ${deliveryStages.find((item) => item.id === nextId)?.shortTitle}` : "Complete stage";
  })();

  return (
    <section className="guided-delivery" aria-label="Guided architecture delivery flow">
      <aside className="guided-delivery__rail" aria-label="Architecture delivery stages">
        <div className="guided-delivery__brand">
          <span><Route size={17} /></span>
          <div><strong>Delivery flow</strong><small>{project.name}</small></div>
        </div>
        <nav>
          {assessments.map((item) => {
            const active = item.definition.id === stageId;
            return (
              <button key={item.definition.id} type="button" className={active ? "is-active" : ""} onClick={() => navigate(item.definition.id)} aria-current={active ? "step" : undefined}>
                <span className={`guided-stage-index status-${item.status}`}>
                  {item.status === "approved" || item.status === "delivered" ? <BadgeCheck size={14} /> : item.status === "validated" || item.status === "submitted" || item.status === "inputs-complete" ? <CheckCircle2 size={14} /> : item.definition.index}
                </span>
                <span><strong>{item.definition.shortTitle}</strong><small>{statusCopy[item.status]}</small></span>
                <ChevronRight size={14} />
              </button>
            );
          })}
        </nav>
        <div className="guided-delivery__rail-note"><ShieldCheck size={14} /><span>Stages may be inspected at any time. Completion and final generation remain evidence-gated.</span></div>
      </aside>

      <div className="guided-delivery__main">
        <header className="guided-stage-hero" id="guided-stage-top" tabIndex={-1}>
          <div className="guided-stage-hero__identity">
            <span className="guided-kicker">Stage {assessment.definition.index} of {deliveryStages.length}</span>
            <h1>{assessment.definition.title}</h1>
            <p>{assessment.definition.purpose}</p>
            <div className="guided-stage-outcome"><Target size={15} /><span><strong>Done means:</strong> {assessment.definition.outcome}</span></div>
          </div>
          <div className="guided-stage-hero__status">
            <span className={`guided-status status-${assessment.status}`}>{statusCopy[assessment.status]}</span>
            <strong>{assessment.requiredPassed}/{assessment.requiredTotal}</strong>
            <small>required checks passed</small>
            <div className="guided-progress"><span style={{ width: `${assessment.progress}%` }} /></div>
            <button type="button" onClick={() => setPane("validation")}><Gauge size={14} /> Review readiness</button>
          </div>
        </header>

        <section className="guided-next-action" aria-label="Recommended next action">
          <div><span>Next action</span><strong>{assessment.nextAction}</strong><small>{assessment.blockers[0]?.description ?? "Review the stage output, complete the evidence gate and hand off to the next stage."}</small></div>
          <button className="button button--ai" type="button" onClick={() => onOpenCoArchitect(stagePrompt(assessment))}><BrainCircuit size={15} /> Ask AIW for guidance</button>
        </section>

        <nav className="guided-pane-tabs" aria-label="Stage workspace views">
          <button type="button" className={pane === "plan" ? "is-active" : ""} onClick={() => setPane("plan")}><ListChecks size={15} /> Task plan</button>
          <button type="button" className={pane === "work" ? "is-active" : ""} onClick={() => setPane("work")}><Wrench size={15} /> Work area</button>
          <button type="button" className={pane === "outputs" ? "is-active" : ""} onClick={() => setPane("outputs")}><Layers3 size={15} /> Outputs</button>
          <button type="button" className={pane === "validation" ? "is-active" : ""} onClick={() => setPane("validation")}><ClipboardCheck size={15} /> Validation <span>{assessment.blockers.length}</span></button>
        </nav>

        {pane === "plan" ? (
          <section className="guided-task-plan">
            <div className="guided-task-plan__intro">
              <span className="guided-kicker"><ListChecks size={14} /> How to complete this stage</span>
              <h2>Complete these four tasks</h2>
              <p>Work from top to bottom. Each task produces a reviewable output, and only required evidence controls handoff.</p>
            </div>
            <div className="guided-task-grid">
              {assessment.definition.tasks.map((task, index) => {
                const taskChecks = task.checkIds.map((checkId) => assessment.checks.find((check) => check.id === checkId)).filter((check): check is NonNullable<typeof check> => Boolean(check));
                const taskBlockers = taskChecks.filter((check) => check.required && !check.done);
                const taskWarnings = taskChecks.filter((check) => !check.required && !check.done);
                const taskDone = taskChecks.length > 0 && taskChecks.every((check) => check.done);
                const taskReady = taskBlockers.length === 0 && !taskDone;
                const taskActive = activeTaskId === task.id;
                return (
                  <article key={task.id} className={`${taskDone ? "is-done" : taskActive ? "is-current" : taskReady ? "is-ready" : ""}`}>
                    <span className="guided-task-number">{taskDone ? <CheckCircle2 size={16} /> : index + 1}</span>
                    <div>
                      <div className="guided-task-title-row"><strong>{task.title}</strong><span>{taskDone ? "Complete" : taskBlockers.length ? `${taskBlockers.length} required` : taskWarnings.length ? "Review recommended" : "Ready"}</span></div>
                      <p>{task.description}</p><small><b>Output:</b> {task.success}</small>
                      {taskBlockers[0] ? <small className="guided-task-gap"><AlertTriangle size={12} /> Next: {taskBlockers[0].actionLabel ?? taskBlockers[0].label}</small> : null}
                    </div>
                    <button type="button" onClick={() => { setActiveTaskId(task.id); setPane(taskDone ? "outputs" : "work"); }}>
                      {taskDone ? "Review output" : taskActive ? "Continue task" : "Open task"} <ArrowRight size={13} />
                    </button>
                  </article>
                );
              })}
            </div>
            <div className="guided-plan-actions">
              <button className="button button--primary" type="button" onClick={() => setPane("work")}><Play size={15} /> Start or continue this stage</button>
              <button type="button" onClick={onOpenDecisionRadar}><Sparkles size={15} /> Review decisions</button>
              <button type="button" onClick={onOpenInfoCenter}><BookOpenCheck size={15} /> Open evidence and explanations</button>
            </div>
          </section>
        ) : null}

        {pane === "work" ? (
          <section className="guided-delivery-workarea" aria-label="Stage work area">
            <div className="guided-workarea-heading">
              <div><span className="guided-kicker"><Wrench size={14} /> Work area</span><h2>{activeTask?.title ?? "Complete the current task"}</h2><p>{activeTask?.description ?? "Primary inputs and modelling tools are shown here. Advanced intelligence and specialist tools remain available on demand."}</p></div>
              <button type="button" onClick={() => onOpenCoArchitect(stagePrompt(assessment))}><BrainCircuit size={15} /> Stage assistant</button>
            </div>
            {activeTask ? <div className="guided-active-task-contract" role="region" aria-label="Active task contract">
              <div><span>Produce</span><strong>{activeTask.success}</strong></div>
              <div><span>Evidence required</span><div>{activeTaskChecks.map((check) => <b key={check.id} className={check.done ? "is-done" : check.required ? "is-open" : "is-recommended"}>{check.done ? "✓ " : ""}{check.label}</b>)}</div></div>
              <div><span>Task state</span><strong>{activeTaskChecks.length && activeTaskChecks.every((check) => check.done) ? "Output ready for review" : `${activeTaskChecks.filter((check) => !check.done && check.required).length} required item(s) remain`}</strong></div>
            </div> : null}
            {stageId === "sdd" ? <SddDeliveryWorkspace assessment={assessment} /> : (
              <GuidedDeliveryTaskProvider value={{ stageId, taskId: activeTaskId }}>
                {children}
              </GuidedDeliveryTaskProvider>
            )}
          </section>
        ) : null}

        {pane === "outputs" ? (
          <StageOutputEvidence
            stageId={stageId}
            assessment={assessment}
            onFixCheck={(checkId) => {
              const task = assessment.definition.tasks.find((item) => item.checkIds.includes(checkId));
              setActiveTaskId(task?.id ?? null);
              setPane("work");
            }}
          />
        ) : null}

        {pane === "validation" ? (
          <section className="guided-validation-view">
            <div className="guided-task-plan__intro"><span className="guided-kicker"><ClipboardCheck size={14} /> Evidence gate</span><h2>{assessment.blockers.length ? `${assessment.blockers.length} required item(s) block handoff` : "This stage is ready for handoff"}</h2><p>A stage is not complete because its page was opened. It is complete only when required model and evidence checks pass.</p></div>
            <div className="guided-validation-list">
              {assessment.checks.map((check) => (
                <article key={check.id} className={check.done ? "is-done" : check.required ? "is-blocker" : "is-warning"}>
                  <span>{check.done ? <CheckCircle2 size={17} /> : check.required ? <AlertTriangle size={17} /> : <Circle size={17} />}</span>
                  <div><strong>{check.label}</strong><p>{check.description}</p>{check.evidence ? <small>{check.evidence}</small> : null}</div>
                  <b>{check.required ? "Required" : "Recommended"}</b>
                  {!check.done ? <button type="button" onClick={() => { const task = assessment.definition.tasks.find((item) => item.checkIds.includes(check.id)); setActiveTaskId(task?.id ?? null); setPane("work"); }}>{check.actionLabel ?? "Fix in work area"} <ArrowRight size={13} /></button> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {message ? <div className="guided-delivery-message" role="status"><AlertTriangle size={15} /><span>{message}</span><button type="button" onClick={() => setMessage(null)}>Dismiss</button></div> : null}

        <footer className="guided-stage-footer">
          <button type="button" disabled={!previousId} onClick={() => previousId && navigate(previousId)}><ArrowLeft size={15} /> Previous stage</button>
          <div><span>{assessment.definition.shortTitle}</span><strong>{assessment.blockers.length ? `${assessment.blockers.length} blocker(s) remain` : "Required evidence is complete"}</strong></div>
          <button className="button button--primary" type="button" disabled={stageId === "review" && reviewApproval?.status === "pending"} onClick={completeAndContinue}>
            {assessment.blockers.length && stageId !== "review" ? <LockKeyhole size={15} /> : <CheckCircle2 size={15} />} {primaryLabel}
          </button>
        </footer>
      </div>
    </section>
  );
}
