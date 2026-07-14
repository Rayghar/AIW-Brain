// Store slice: guided lifecycle completion, stage handoff and artifact ledger.
// Kept separate so the core workspace store stays within its structure budget.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function createLifecycleFlowActions(set: any, get: any, helpers: {
  createId: (prefix: string) => string;
  hashContent: (value: unknown) => string;
  cloneProject: (project: any) => any;
  lifecycleKey: (project: any, stepId: any) => string;
  projectLifecycleArtifacts: (records: any[] | undefined, project: any) => any[];
  bump: (project: any) => void;
  updateDerived: (state: any, trigger: any, event?: any) => void;
}) {
  return {
    completeLifecycleStep: (input: any) => {
      let completed: any = null;
      set((state: any) => {
        const now = new Date().toISOString();
        const requiredItems = input.checklist.filter((item: any) => item.required !== false);
        const blockerCount = requiredItems.filter((item: any) => !item.done).length;
        if (blockerCount > 0) {
          state.notice = `${input.title} cannot be completed: ${blockerCount} required item(s) remain open.`;
          completed = null;
          return;
        }
        const snapshot = {
          id: helpers.createId('snapshot'), projectId: state.project.id, revision: state.project.revision,
          label: `${input.title} lifecycle handoff`, status: 'reviewed', createdAt: now,
          contentHash: helpers.hashContent({ project: state.project, checklist: input.checklist, artifacts: input.artifactNames }),
          project: helpers.cloneProject(state.project),
        };
        state.snapshots.unshift(snapshot);
        completed = {
          id: helpers.createId('handoff'), projectId: state.project.id, branchId: state.project.branch.id,
          stepId: input.stepId, title: input.title, status: 'completed', completedAt: now,
          completedBy: state.currentUserId, ...(input.handoffTo ? { handoffTo: input.handoffTo } : {}),
          ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}), snapshotId: snapshot.id,
          checklist: input.checklist.map((item: any) => ({ ...item })), artifactNames: [...input.artifactNames],
          blockerCount, revision: state.project.revision,
        };
        state.lifecycleCompletions[helpers.lifecycleKey(state.project, input.stepId)] = completed;
        const existing = new Set(helpers.projectLifecycleArtifacts(state.lifecycleArtifacts, state.project).filter((artifact: any) => artifact.stepId === input.stepId).map((artifact: any) => artifact.name));
        for (const name of input.artifactNames) {
          if (existing.has(name)) continue;
          state.lifecycleArtifacts.unshift({
            id: helpers.createId('artifact'), projectId: state.project.id, branchId: state.project.branch.id,
            stepId: input.stepId, name, type: input.stepId === 'sdd' ? 'sdd-pack' : input.stepId === 'review' ? 'review-pack' : 'stage-output',
            status: blockerCount === 0 ? 'generated' : 'planned', generatedAt: now,
            source: input.stepId === 'sdd' || input.stepId === 'review' ? 'deterministic' : 'manual', revision: state.project.revision,
          });
        }
        state.notice = `${input.title} completed and handed off${input.handoffTo ? ` to ${input.handoffTo}` : ''}.`;
      });
      return completed;
    },


    recordArchitectureReview: (review: any) => set((state: any) => {
      const severity = (value: string) => value === 'critical' || value === 'high' ? 'HARD' : value === 'medium' ? 'SIGNIFICANT' : 'ADVISORY';
      state.project.findings = state.project.findings.filter((item: any) => !String(item.ruleId).startsWith('review:'));
      for (const item of review.findings) {
        state.project.findings.push({
          id: item.id,
          ruleId: `review:${item.category}`,
          severity: severity(item.severity),
          title: item.title,
          message: item.issue,
          rationale: item.whyItMatters,
          affectedNodeIds: [...item.affectedNodeIds],
          affectedEdgeIds: [],
          mitigations: item.recommendedFix ? [item.recommendedFix] : [],
          canOverride: severity(item.severity) !== 'HARD',
        });
      }
      const existing = state.project.aiReviewHistory.find((item: any) => item.id === review.id);
      const record = {
        id: review.id,
        createdAt: review.generatedAt,
        stage: 'validationRealization',
        source: 'deterministic',
        summary: review.executiveSummary,
        healthScore: review.deliveryReadinessScore,
        proposalCount: review.recommendationCount,
        findingCount: review.findings.length,
      };
      if (existing) Object.assign(existing, record); else state.project.aiReviewHistory.unshift(record);
      helpers.bump(state.project);
      helpers.updateDerived(state, 'canvas-change', { kind: 'review-recorded', subjectIds: [review.id] });
      state.notice = `${review.findings.length} review finding(s) and the review scorecard were recorded against the governed project baseline.`;
    }),

    recordReviewOutputs: (decisions: any[], artifactNames: string[]) => set((state: any) => {
      const addedDecisionIds: string[] = [];
      for (const decision of decisions) {
        const duplicate = state.project.decisions.some((item: any) => item.id === decision.id ||
          (item.title.trim().toLowerCase() === decision.title.trim().toLowerCase() && item.decision.trim() === decision.decision.trim()));
        if (!duplicate) { state.project.decisions.push(helpers.cloneProject(decision)); addedDecisionIds.push(decision.id); }
      }
      const now = new Date().toISOString();
      let addedArtifacts = 0;
      for (const name of artifactNames.map((item) => item.trim()).filter(Boolean)) {
        const duplicate = state.lifecycleArtifacts.some((item: any) => item.projectId === state.project.id &&
          item.branchId === state.project.branch.id && item.revision === state.project.revision && item.name === name);
        if (duplicate) continue;
        state.lifecycleArtifacts.push({ id: helpers.createId('artifact'), projectId: state.project.id,
          branchId: state.project.branch.id, stepId: 'review', name, type: 'review-pack', status: 'generated',
          generatedAt: now, source: 'deterministic', revision: state.project.revision });
        addedArtifacts += 1;
      }
      if (addedDecisionIds.length) {
        helpers.bump(state.project);
        helpers.updateDerived(state, 'canvas-change', { kind: 'decision-recorded', subjectIds: addedDecisionIds });
      }
      state.notice = addedDecisionIds.length || addedArtifacts
        ? `${addedDecisionIds.length} proposed ADR(s) and ${addedArtifacts} review artifact(s) recorded against the governed baseline.`
        : 'Review outputs were already recorded for this baseline.';
    }),

    reopenLifecycleStep: (stepId: string, reason?: string) => set((state: any) => {
      const record = state.lifecycleCompletions[helpers.lifecycleKey(state.project, stepId)];
      if (!record) { state.notice = 'No completed lifecycle handoff found for this stage.'; return; }
      record.status = 'reopened'; record.notes = reason?.trim() || 'Stage reopened for design update.';
      state.notice = `${record.title} reopened for update.`;
    }),

    markLifecycleArtifactDownloaded: (artifactId: string) => set((state: any) => {
      const artifact = state.lifecycleArtifacts.find((item: any) => item.id === artifactId);
      if (artifact) artifact.status = 'downloaded';
    }),
  };
}
