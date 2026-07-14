import { lazy, Suspense, type ReactNode } from "react";
import { BrainCircuit } from "lucide-react";
import type { ArchitectureProject, ArchitectureStage } from "@aiw/domain";
import type { WorkspaceModeId } from "../lib/experienceProfiles";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { PageSkeleton } from "./PageShell";


const AdminControlPlaneWorkspace = lazy(() => import("../features/admin").then((module) => ({ default: module.AdminControlPlaneWorkspace })));
const GuidedJourneyWorkspace = lazy(() => import("../features/guided-journey").then((module) => ({ default: module.GuidedJourneyWorkspace })));
const KnowledgeOpsWorkbench = lazy(() => import("../features/knowledge-ops").then((module) => ({ default: module.KnowledgeOpsWorkbench })));
const ProCanvasViewSystem = lazy(() => import("../features/canvas").then((module) => ({ default: module.ProCanvasViewSystem })));
const CollaborationWorkspace = lazy(() => import("./CollaborationWorkspace").then((module) => ({ default: module.CollaborationWorkspace })));
const ComparisonWorkspace = lazy(() => import("./ComparisonWorkspace").then((module) => ({ default: module.ComparisonWorkspace })));
const ConformanceWorkspace = lazy(() => import("./ConformanceWorkspace").then((module) => ({ default: module.ConformanceWorkspace })));
const DesignBriefStudio = lazy(() => import("./DesignBriefStudio").then((module) => ({ default: module.DesignBriefStudio })));
const DriftWorkspace = lazy(() => import("./DriftWorkspace").then((module) => ({ default: module.DriftWorkspace })));
const EnterpriseRuntimeWorkspace = lazy(() => import("./EnterpriseRuntimeWorkspace").then((module) => ({ default: module.EnterpriseRuntimeWorkspace })));
const GovernanceWorkspace = lazy(() => import("./GovernanceWorkspace").then((module) => ({ default: module.GovernanceWorkspace })));
const OperationalIntelligenceWorkspace = lazy(() => import("./OperationalIntelligenceWorkspace").then((module) => ({ default: module.OperationalIntelligenceWorkspace })));
const PilotEvaluationWorkspace = lazy(() => import("./PilotEvaluationWorkspace").then((module) => ({ default: module.PilotEvaluationWorkspace })));
const PortfolioWorkspace = lazy(() => import("./PortfolioWorkspace").then((module) => ({ default: module.PortfolioWorkspace })));
const ProjectCockpit = lazy(() => import("./ProjectCockpit").then((module) => ({ default: module.ProjectCockpit })));
const QualityAttributeStudio = lazy(() => import("./QualityAttributeStudio").then((module) => ({ default: module.QualityAttributeStudio })));
const SecurityWorkspace = lazy(() => import("./SecurityWorkspace").then((module) => ({ default: module.SecurityWorkspace })));

const ArchitectureSynthesisWorkspace = lazy(() =>
  import("./ArchitectureSynthesisWorkspace").then((module) => ({
    default: module.ArchitectureSynthesisWorkspace,
  })),
);
const PatternIntelligenceWorkspace = lazy(() =>
  import("./PatternIntelligenceWorkspace").then((module) => ({
    default: module.PatternIntelligenceWorkspace,
  })),
);
const ArchitectureReviewStudio = lazy(() =>
  import("../features/review-studio").then((module) => ({
    default: module.ArchitectureReviewStudio,
  })),
);

function LazyWorkspace({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <section className="workspace-loading">
          <BrainCircuit size={28} />
          <strong>Loading architecture intelligence workspace…</strong>
          <PageSkeleton title="Preparing studio surface" />
        </section>
      }
    >
      {children}
    </Suspense>
  );
}

function activeContent(stage: ArchitectureStage) {
  if (stage === "designIntent") return <LazyWorkspace><DesignBriefStudio /></LazyWorkspace>;
  if (stage === "validationRealization") {
    return (
      <LazyWorkspace>
        <ArchitectureReviewStudio />
      </LazyWorkspace>
    );
  }
  return <LazyWorkspace><ProCanvasViewSystem /></LazyWorkspace>;
}

export function WorkspaceRouter({
  workspaceMode,
  project,
}: {
  workspaceMode: WorkspaceModeId;
  project: ArchitectureProject;
}): ReactNode {
  if (workspaceMode === "cockpit") return <LazyWorkspace><ProjectCockpit /></LazyWorkspace>;
  if (workspaceMode === "activation") {
    return (
      <>
        <LocaleSwitcher />
        <LazyWorkspace><GuidedJourneyWorkspace /></LazyWorkspace>
      </>
    );
  }
  if (workspaceMode === "admin") return <LazyWorkspace><AdminControlPlaneWorkspace /></LazyWorkspace>;
  if (workspaceMode === "quality") return <LazyWorkspace><QualityAttributeStudio /></LazyWorkspace>;
  if (workspaceMode === "portfolio") return <LazyWorkspace><PortfolioWorkspace /></LazyWorkspace>;
  if (workspaceMode === "governance") return <LazyWorkspace><GovernanceWorkspace /></LazyWorkspace>;
  if (workspaceMode === "comparison") return <LazyWorkspace><ComparisonWorkspace /></LazyWorkspace>;
  if (workspaceMode === "collaboration") return <LazyWorkspace><CollaborationWorkspace /></LazyWorkspace>;
  if (workspaceMode === "security") return <LazyWorkspace><SecurityWorkspace /></LazyWorkspace>;
  if (workspaceMode === "drift") return <LazyWorkspace><DriftWorkspace /></LazyWorkspace>;
  if (workspaceMode === "conformance") return <LazyWorkspace><ConformanceWorkspace /></LazyWorkspace>;
  if (workspaceMode === "operations") return <LazyWorkspace><OperationalIntelligenceWorkspace /></LazyWorkspace>;
  if (workspaceMode === "runtime") return <LazyWorkspace><EnterpriseRuntimeWorkspace /></LazyWorkspace>;
  if (workspaceMode === "pilot") return <LazyWorkspace><PilotEvaluationWorkspace /></LazyWorkspace>;
  if (workspaceMode === "synthesis") {
    return (
      <LazyWorkspace>
        <ArchitectureSynthesisWorkspace />
      </LazyWorkspace>
    );
  }
  if (workspaceMode === "patterns") {
    return (
      <LazyWorkspace>
        <PatternIntelligenceWorkspace />
      </LazyWorkspace>
    );
  }
  if (workspaceMode === "knowledge") return <LazyWorkspace><KnowledgeOpsWorkbench /></LazyWorkspace>;
  if (project.activeStage === "logicalApplication" && project.qualityPriorities.length === 0) {
    return <LazyWorkspace><QualityAttributeStudio /></LazyWorkspace>;
  }
  return activeContent(project.activeStage);
}
