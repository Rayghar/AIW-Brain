import { lazy, Suspense, type ReactNode } from "react";
import { BrainCircuit } from "lucide-react";
import type { ArchitectureProject, ArchitectureStage } from "@aiw/domain";
import type { WorkspaceModeId } from "../lib/experienceProfiles";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { PageSkeleton } from "./PageShell";
import { useWorkspaceStore } from "../store/workspaceStore";
import { TaskWorkspaceFrame } from "./TaskWorkspaceFrame";


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
const PlatformRuntimeWorkspace = lazy(() => import("./PlatformRuntimeWorkspace").then((module) => ({ default: module.PlatformRuntimeWorkspace })));
const GovernanceWorkspace = lazy(() => import("./GovernanceWorkspace").then((module) => ({ default: module.GovernanceWorkspace })));
const OperationalIntelligenceWorkspace = lazy(() => import("./OperationalIntelligenceWorkspace").then((module) => ({ default: module.OperationalIntelligenceWorkspace })));
const PilotEvaluationWorkspace = lazy(() => import("./PilotEvaluationWorkspace").then((module) => ({ default: module.PilotEvaluationWorkspace })));
const PortfolioWorkspace = lazy(() => import("./PortfolioWorkspace").then((module) => ({ default: module.PortfolioWorkspace })));
const ProjectCockpit = lazy(() => import("./ProjectCockpit").then((module) => ({ default: module.ProjectCockpit })));
const RoleCommandSurface = lazy(() => import("./RoleCommandSurface").then((module) => ({ default: module.RoleCommandSurface })));
const ReviewerAssuranceStudio = lazy(() => import("./ReviewerAssuranceStudio").then((module) => ({ default: module.ReviewerAssuranceStudio })));
const QualityAttributeStudio = lazy(() => import("./QualityAttributeStudio").then((module) => ({ default: module.QualityAttributeStudio })));
const SecurityWorkspace = lazy(() => import("./SecurityWorkspace").then((module) => ({ default: module.SecurityWorkspace })));
const SystemContextStudio = lazy(() => import("./SystemContextStudio").then((module) => ({ default: module.SystemContextStudio })));

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

function activeContent(stage: ArchitectureStage, roleId: string) {
  if (stage === "designIntent") return <LazyWorkspace><DesignBriefStudio /></LazyWorkspace>;
  if (stage === "validationRealization") {
    return (
      <LazyWorkspace>
        {roleId === "reviewer" ? <ReviewerAssuranceStudio /> : <ArchitectureReviewStudio />}
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
  const roleId = useWorkspaceStore((state) => state.experienceProfile);
  const activeLifecycleStep = useWorkspaceStore((state) => state.activeLifecycleStep);
  if (workspaceMode === "cockpit") return <LazyWorkspace>{
    roleId === "solution-architect" ? <ProjectCockpit /> :
    roleId === "reviewer" ? <ReviewerAssuranceStudio /> :
    <RoleCommandSurface />
  }</LazyWorkspace>;
  if (workspaceMode === "activation") {
    return (
      <>
        <LocaleSwitcher />
        <LazyWorkspace><GuidedJourneyWorkspace /></LazyWorkspace>
      </>
    );
  }
  if (workspaceMode === "admin") return <LazyWorkspace><TaskWorkspaceFrame mode="admin"><AdminControlPlaneWorkspace /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "quality") return <LazyWorkspace><TaskWorkspaceFrame mode="quality"><QualityAttributeStudio /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "portfolio") return <LazyWorkspace><TaskWorkspaceFrame mode="portfolio"><PortfolioWorkspace /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "governance") return <LazyWorkspace><TaskWorkspaceFrame mode="governance"><GovernanceWorkspace /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "comparison") return <LazyWorkspace><TaskWorkspaceFrame mode="comparison"><ComparisonWorkspace /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "collaboration") return <LazyWorkspace><TaskWorkspaceFrame mode="collaboration"><CollaborationWorkspace /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "security") return <LazyWorkspace><TaskWorkspaceFrame mode="security"><SecurityWorkspace /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "drift") return <LazyWorkspace><TaskWorkspaceFrame mode="drift"><DriftWorkspace /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "conformance") return <LazyWorkspace><TaskWorkspaceFrame mode="conformance"><ConformanceWorkspace /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "operations") return <LazyWorkspace><TaskWorkspaceFrame mode="operations"><OperationalIntelligenceWorkspace /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "runtime") return <LazyWorkspace><TaskWorkspaceFrame mode="runtime">{roleId === "platform-architect" ? <PlatformRuntimeWorkspace /> : <EnterpriseRuntimeWorkspace />}</TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "pilot") return <LazyWorkspace><TaskWorkspaceFrame mode="pilot"><PilotEvaluationWorkspace /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "synthesis") {
    return (
      <LazyWorkspace>
        <TaskWorkspaceFrame mode="synthesis"><ArchitectureSynthesisWorkspace /></TaskWorkspaceFrame>
      </LazyWorkspace>
    );
  }
  if (workspaceMode === "patterns") {
    return (
      <LazyWorkspace>
        <TaskWorkspaceFrame mode="patterns"><PatternIntelligenceWorkspace /></TaskWorkspaceFrame>
      </LazyWorkspace>
    );
  }
  if (workspaceMode === "knowledge") return <LazyWorkspace><TaskWorkspaceFrame mode="knowledge"><KnowledgeOpsWorkbench /></TaskWorkspaceFrame></LazyWorkspace>;
  if (workspaceMode === "design" && activeLifecycleStep === "context") return <LazyWorkspace><SystemContextStudio /></LazyWorkspace>;
  if (project.activeStage === "logicalApplication" && project.qualityPriorities.length === 0) {
    return <LazyWorkspace><QualityAttributeStudio /></LazyWorkspace>;
  }
  return activeContent(project.activeStage, roleId);
}
