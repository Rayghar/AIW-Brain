// Store slice: conformance + operational-posture actions — extracted from
// workspaceStore honoring the 1780-line shrink-only budget (applyScenarioTemplate
// DI pattern). set/get injected; behavior byte-identical.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { executeCollector, deriveTopologyFromTelemetry, analyseOperationalDrift, createRemediationPlan, submitRemediationPlan, decideRemediationPlan, buildArchitectureConformancePlan, assessContinuousConformance, buildConformanceRemediationChangeSet, buildConformanceVisualModel } from '@aiw/engine';

export function createConformanceOpsActions(set: any, get: any, bump: (project: any, invalidateApprovals?: boolean) => void) {
  return {
    generateConformancePlan: () => {
      const plan = buildArchitectureConformancePlan(get().project);
      set((state: any) => {
        state.conformancePlan = plan;
        state.conformanceAssessment = null;
        state.conformanceRemediation = null;
        state.conformanceVisualModel = null;
        state.workspaceMode = 'conformance';
        state.notice = `Generated ${plan.controls.length} governed conformance controls and ${plan.artifacts.length} reviewable fitness artifacts.`;
      });
      return plan;
    },

    loadReferenceConformanceEvidence: () => set((state: any) => {
      const plan = state.conformancePlan ?? buildArchitectureConformancePlan(state.project);
      state.conformancePlan = plan;
      const archunitRule = plan.controls.find((control: any) => control.target === 'archunit')?.ruleId ?? 'reference:layering';
      const now = new Date().toISOString();
      state.conformanceEvidence = [
        {
          id: `CEV-ARCHUNIT-${state.project.revision}`,
          projectId: state.project.id,
          branchId: state.project.branch.id,
          sourceType: 'archunit',
          repositoryUrl: 'https://github.com/example/aiw-reference-implementation',
          commitSha: 'reference-commit',
          workflowRunId: `reference-${state.project.revision}`,
          environment: 'reference-ci',
          collectedAt: now,
          payload: { violations: [{ ruleId: archunitRule, status: 'failed', severity: 'error', message: 'Reference implementation crosses a governed module boundary.', remediation: 'Restore the approved dependency direction or review the architecture decision.' }] },
        },
        {
          id: `CEV-K8S-${state.project.revision}`,
          projectId: state.project.id,
          branchId: state.project.branch.id,
          sourceType: 'kubernetes',
          environment: 'reference-cluster',
          collectedAt: now,
          payload: { resources: [{ kind: 'Deployment', metadata: { name: 'order-api', labels: { 'aiw.io/architecture-object': 'deployable-order-api' }, annotations: { 'aiw.io/pattern': 'PAT-BOUNDED-CONTEXT' } }, spec: { replicas: 3 } }] },
        },
      ];
      state.notice = 'Loaded reference CI and Kubernetes evidence. Controls without matching evidence remain explicitly unverified.';
    }),

    assessConformanceNow: () => {
      const current = get();
      const plan = current.conformancePlan ?? buildArchitectureConformancePlan(current.project);
      const driftReport = current.project.driftReports[0];
      const assessment = assessContinuousConformance({ project: current.project, plan, evidence: current.conformanceEvidence, ...(driftReport ? { driftReport } : {}) });
      const visualModel = buildConformanceVisualModel(current.project, assessment);
      set((state: any) => {
        state.conformancePlan = plan;
        state.conformanceAssessment = assessment;
        state.conformanceVisualModel = visualModel;
        state.conformanceRemediation = null;
        state.workspaceMode = 'conformance';
        state.notice = assessment.gate.passed ? 'Continuous conformance gate passed.' : `Conformance gate requires attention: ${assessment.gate.reasons.join(' ')}`;
      });
      return assessment;
    },

    previewConformanceRemediation: () => {
      const assessment = get().conformanceAssessment;
      if (!assessment) return null;
      const changeSet = buildConformanceRemediationChangeSet(assessment);
      set((state: any) => {
        state.conformanceRemediation = changeSet;
        state.notice = `Prepared ${changeSet.actions.length} remediation actions. No architecture or repository mutation was applied.`;
      });
      return changeSet;
    },

    submitConformanceRemediation: () => set((state: any) => {
      if (!state.conformanceRemediation || state.conformanceRemediation.status !== 'draft') return;
      state.conformanceRemediation.status = 'pending-approval';
      state.notice = 'Conformance remediation submitted for human approval.';
    }),

    decideConformanceRemediation: (approved: boolean) => set((state: any) => {
      if (!state.conformanceRemediation || !['draft','pending-approval'].includes(state.conformanceRemediation.status)) return;
      state.conformanceRemediation.status = approved ? 'approved' : 'rejected';
      state.conformanceRemediation.actions.forEach((action: any) => { action.status = approved ? 'approved' : 'rejected'; });
      state.notice = approved ? 'Remediation change set approved for controlled implementation. Automatic mutation remains disabled.' : 'Remediation change set rejected.';
    }),

    runReferenceCollector: () => {
      const collector = get().project.inventoryCollectors[0];
      if (!collector) return null;
      const raw = collector.provider === 'kubernetes' ? { items: [
        { apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: 'managed-postgresql', namespace: 'commerce', labels: { 'aiw.node-id': 'physical-postgres', 'aiw.availability-zones': '1' } }, spec: { replicas: 1, template: { spec: { containers: [{ image: 'postgres:16.2' }] } } } },
      ] } : { resources: [] };
      const result = executeCollector(get().project, collector, raw, 'reference-run');
      set((state: any) => {
        state.project.runtimeInventories.unshift(result.inventory);
        state.project.collectorRuns.unshift(result.run);
        const index = state.project.inventoryCollectors.findIndex((item: any) => item.id === collector.id);
        if (index >= 0) state.project.inventoryCollectors[index] = result.collector;
        bump(state.project, false); state.workspaceMode = 'operations'; state.notice = result.run.message;
      });
      return result.inventory.id;
    },

    deriveReferenceTelemetryTopology: () => {
      const spans = [
        { traceId: 'trace-1', spanId: 'span-1', serviceName: 'Order API', peerService: 'Payment Worker', operation: 'submit-payment', protocol: 'messaging', status: 'ok' as const, durationMs: 80, observedAt: new Date().toISOString(), attributes: {} },
        { traceId: 'trace-2', spanId: 'span-2', serviceName: 'Order API', peerService: 'Payment Worker', operation: 'submit-payment', protocol: 'messaging', status: 'error' as const, durationMs: 520, observedAt: new Date().toISOString(), attributes: {} },
      ];
      const inventory = deriveTopologyFromTelemetry(get().project, 'Reference telemetry topology', spans);
      set((state: any) => { state.project.runtimeInventories.unshift(inventory); bump(state.project, false); state.workspaceMode = 'operations'; state.notice = `Derived ${inventory.resources.length} services and ${inventory.relationships.length} runtime relationships.`; });
      return inventory.id;
    },

    analyseOperationalPosture: (inventoryId: string) => {
      const inventory = get().project.runtimeInventories.find((item: any) => item.id === inventoryId); if (!inventory) return null;
      const report = analyseOperationalDrift(get().project, inventory);
      set((state: any) => { state.project.operationalDriftReports.unshift(report); bump(state.project, false); state.notice = `Operational analysis found ${report.findings.length} cost, capacity or resilience issue(s).`; });
      return report;
    },

    createOperationalRemediationPlan: (reportId: string) => {
      const report = get().project.operationalDriftReports.find((item: any) => item.id === reportId); if (!report) return null;
      const plan = createRemediationPlan(report, get().currentUserId);
      set((state: any) => { state.project.remediationPlans.unshift(plan); bump(state.project, false); state.notice = `Created remediation plan with ${plan.actions.length} action(s).`; });
      return plan;
    },

    submitOperationalRemediationPlan: (planId: string) => set((state: any) => {
      const index = state.project.remediationPlans.findIndex((item: any) => item.id === planId); if (index < 0) return;
      state.project.remediationPlans[index] = submitRemediationPlan(state.project.remediationPlans[index]!); bump(state.project, false); state.notice = 'Remediation plan submitted for approval.';
    }),

    decideOperationalRemediationPlan: (planId: string, approved: boolean) => set((state: any) => {
      const index = state.project.remediationPlans.findIndex((item: any) => item.id === planId); if (index < 0) return;
      try { state.project.remediationPlans[index] = decideRemediationPlan(state.project.remediationPlans[index]!, approved, state.currentUserId); bump(state.project, false); state.notice = approved ? 'Remediation plan approved.' : 'Remediation plan rejected.'; } catch (error) { state.notice = error instanceof Error ? error.message : 'Unable to decide remediation plan.'; }
    }),
  };
}
