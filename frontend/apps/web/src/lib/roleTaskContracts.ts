export interface RoleTaskContract {
  id: string;
  title: string;
  caption: string;
  primaryAction: string;
  steps: string[];
  inputs: string[];
  outputs: string[];
  completion: string;
  lens?: string;
}

const contracts: Record<string, RoleTaskContract> = {
  portfolio: {
    id: "portfolio", title: "Portfolio overview", caption: "Scan cross-project architecture health, investment exposure and standards posture.",
    primaryAction: "Open highest portfolio exposure", steps: ["Scan portfolio", "Rank exposure", "Assign owner", "Track decision"],
    inputs: ["Project models", "Costs", "Standards", "Dependencies"], outputs: ["Portfolio scorecard", "Prioritised actions"], completion: "Material portfolio exposure has an accountable action.", lens: "overview",
  },
  risks: {
    id: "risks", title: "Risk concentration", caption: "Investigate architecture, delivery and technology concentration across the portfolio.",
    primaryAction: "Disposition highest risk", steps: ["Filter risk", "Inspect drivers", "Assess blast radius", "Record disposition"],
    inputs: ["Risk heatmap", "Dependencies", "Criticality", "Findings"], outputs: ["Risk disposition", "Mitigation owner"], completion: "The selected risk has an owner, due date and accepted treatment.", lens: "risk-concentration",
  },
  reuse: {
    id: "reuse", title: "Reuse candidates", caption: "Identify duplicated capabilities and governed components that can be reused safely.",
    primaryAction: "Evaluate top reuse candidate", steps: ["Find duplicates", "Compare fit", "Assess constraints", "Approve reuse"],
    inputs: ["Project graphs", "Pattern DNA", "Component catalogue", "Ownership"], outputs: ["Reuse decision", "Adoption plan"], completion: "The candidate is adopted, deferred or rejected with rationale.", lens: "reuse-candidates",
  },
  standards: {
    id: "standards", title: "Standards impact", caption: "Assess the portfolio impact of a standards change before approval.",
    primaryAction: "Run standards impact", steps: ["Select standard", "Analyse blast radius", "Sequence migration", "Approve change"],
    inputs: ["Standards catalogue", "Project technologies", "Dependencies"], outputs: ["Impact report", "Migration waves"], completion: "The standards change has a reviewed impact and migration decision.", lens: "standards-impact",
  },
  releases: {
    id: "releases", title: "Release impact", caption: "Assess which portfolio decisions must be re-evaluated after a governed knowledge or standards release.",
    primaryAction: "Review affected initiatives", steps: ["Select release", "Trace dependencies", "Rank impact", "Assign re-evaluation"],
    inputs: ["Pinned release", "Pattern lineage", "Standards links", "Project decisions"], outputs: ["Impact register", "Re-evaluation actions"], completion: "Every materially affected project has a named re-evaluation action.", lens: "release-impact",
  },
  governance: {
    id: "governance", title: "Governance decisions", caption: "Disposition obligations, policy findings, exceptions and approval readiness.",
    primaryAction: "Disposition highest-severity item", steps: ["Review policy", "Inspect evidence", "Decide", "Record expiry"],
    inputs: ["Policies", "Findings", "ADRs", "Evidence"], outputs: ["Approval", "Request changes", "Waiver"], completion: "Every material governance item has a traceable disposition.", lens: "approvals",
  },
  conformance: {
    id: "conformance", title: "Conformance assessment", caption: "Evaluate architecture fitness controls against repository and runtime evidence.",
    primaryAction: "Run conformance assessment", steps: ["Generate controls", "Collect evidence", "Evaluate", "Gate"],
    inputs: ["Fitness tests", "Repository evidence", "Runtime evidence"], outputs: ["Assessment", "Gate result", "Remediation plan"], completion: "Required controls have current evidence and disposition.", lens: "assessment",
  },
  evidence: {
    id: "evidence", title: "Evidence ledger", caption: "Inspect provenance, checksum, age, expiry and control coverage for review evidence.",
    primaryAction: "Inspect expiring evidence", steps: ["Filter evidence", "Verify provenance", "Check expiry", "Link disposition"],
    inputs: ["Evidence envelopes", "Checksums", "Control links", "Expiry policy"], outputs: ["Verified evidence set", "Evidence request"], completion: "Evidence required for the selected decision is current and independently verifiable.", lens: "evidence-ledger",
  },
  findings: {
    id: "findings", title: "Review findings", caption: "Triage deterministic blockers, advisory risks and missing evidence.",
    primaryAction: "Disposition highest-severity finding", steps: ["Filter queue", "Inspect model", "Review evidence", "Disposition"],
    inputs: ["Findings", "Architecture views", "Evidence", "Policies"], outputs: ["Finding disposition", "Change request"], completion: "Every material finding has an owner and governed disposition.", lens: "findings",
  },
  disposition: {
    id: "disposition", title: "Review disposition", caption: "Approve, request changes or reject the submitted architecture baseline.",
    primaryAction: "Record review disposition", steps: ["Inspect baseline", "Verify blockers", "Check evidence", "Decide"],
    inputs: ["Immutable baseline", "Findings", "ADRs", "Evidence"], outputs: ["Approval decision", "Board record"], completion: "The submitted baseline has a signed and auditable disposition.", lens: "disposition",
  },
  audit: {
    id: "audit", title: "Review audit", caption: "Reconstruct project changes, baseline submissions and review decisions in chronological order.",
    primaryAction: "Inspect latest review event", steps: ["Filter timeline", "Verify actor", "Trace revision", "Confirm outcome"],
    inputs: ["Activity events", "Approval events", "Revision history"], outputs: ["Audit explanation", "Evidence request"], completion: "The selected review decision is reconstructable from retained events.", lens: "review-audit",
  },
  security: {
    id: "security", title: "Security architecture", caption: "Assess trust boundaries, security controls, sensitive interfaces and unresolved design obligations.",
    primaryAction: "Review highest-risk security gap", steps: ["Inspect trust zones", "Check controls", "Review interfaces", "Disposition gap"],
    inputs: ["Canonical model", "Interface contracts", "Data classifications", "Security findings"], outputs: ["Security posture", "Control action"], completion: "Material security responsibilities are explicit and traceable in the model.", lens: "security-design",
  },
  drift: {
    id: "drift", title: "Intended versus observed", caption: "Compare the approved model with observed runtime topology and produce governed remediation.",
    primaryAction: "Analyse latest inventory", steps: ["Load inventory", "Compare topology", "Classify drift", "Prepare remediation"],
    inputs: ["Canonical model", "Runtime inventory", "Telemetry"], outputs: ["Drift report", "Remediation change set"], completion: "Material drift is remediated, waived or accepted.", lens: "drift",
  },
  runtime: {
    id: "runtime", title: "Observed architecture", caption: "Run collectors and inspect current runtime inventory and inferred topology.",
    primaryAction: "Run collector", steps: ["Select collector", "Collect", "Infer topology", "Approve evidence"],
    inputs: ["Collector configuration", "Telemetry", "Inventory"], outputs: ["Observed topology", "Evidence snapshot"], completion: "A current observed architecture snapshot exists.", lens: "observed",
  },
  ops: {
    id: "ops", title: "Operational intelligence", caption: "Correlate SLOs, failure signals and topology with the intended architecture.",
    primaryAction: "Review breached SLO", steps: ["Observe", "Correlate", "Assess failure path", "Act"],
    inputs: ["SLOs", "Telemetry", "Runtime topology"], outputs: ["Operational risk", "Remediation"], completion: "Critical operational risk has an owner and action.", lens: "slo-risk",
  },
  mindFactory: {
    id: "mindFactory", title: "Mind Factory pipeline", caption: "Triage source intake, candidate claims and release readiness without operating infrastructure.",
    primaryAction: "Review the next pipeline blocker", steps: ["Inspect source queue", "Review claims", "Resolve conflicts", "Stage release"],
    inputs: ["Source snapshots", "Candidate claims", "Contradictions", "Reviewer assignments"], outputs: ["Reviewed knowledge set", "Release readiness"], completion: "Pipeline blockers have accountable curation actions.", lens: "mind-factory-pipeline",
  },
  sources: {
    id: "sources", title: "Knowledge sources", caption: "Review source authority, licence, freshness and coverage before requesting refresh.",
    primaryAction: "Review stale source", steps: ["Inspect authority", "Check licence", "Assess freshness", "Request refresh"],
    inputs: ["Source catalogue", "Refresh cadence", "Review history"], outputs: ["Refresh request", "Source disposition"], completion: "Stale or weak sources have a governed next action.", lens: "knowledge-sources",
  },
  claims: {
    id: "claims", title: "Claim review queue", caption: "Review candidate architecture claims before they can influence production recommendations.",
    primaryAction: "Review next claim", steps: ["Inspect source", "Compare evidence", "Edit semantics", "Decide"],
    inputs: ["Source snapshot", "Atomic claim", "Contradictions", "Licence"], outputs: ["Approved claim", "Rejection rationale"], completion: "The claim has provenance, reviewer and permitted-use disposition.", lens: "claim-review",
  },
  contradictions: {
    id: "contradictions", title: "Contradiction resolution", caption: "Resolve or contextualise conflicting architecture claims without hiding disagreement.",
    primaryAction: "Resolve highest-impact contradiction", steps: ["Compare claims", "Inspect context", "Choose posture", "Record rationale"],
    inputs: ["Conflicting claims", "Sources", "Context tags"], outputs: ["Resolution", "Context split", "Escalation"], completion: "The contradiction remains visible with an approved contextual resolution.", lens: "contradictions",
  },
  normalize: {
    id: "normalize", title: "Vocabulary normalisation", caption: "Merge duplicates, aliases and vendor realizations into canonical architecture records.",
    primaryAction: "Review next duplicate cluster", steps: ["Group records", "Compare semantics", "Choose canonical", "Redirect aliases"],
    inputs: ["Candidate records", "Aliases", "Provider mappings"], outputs: ["Canonical record", "Alias map"], completion: "Duplicate records are consolidated without losing provenance.", lens: "normalisation",
  },
  workers: {
    id: "workers", title: "Worker operations", caption: "Operate durable jobs, heartbeats, retries, cancellation and dead-letter recovery.",
    primaryAction: "Resolve failed job", steps: ["Inspect queue", "Diagnose failure", "Retry or cancel", "Verify recovery"],
    inputs: ["Job queue", "Worker heartbeat", "DLQ", "Logs"], outputs: ["Recovered job", "Incident record"], completion: "Failed work is recovered or safely cancelled with evidence.", lens: "worker-operations",
  },
  readiness: {
    id: "readiness", title: "Production promotion", caption: "Close mandatory blockers across identity, durability, signing, telemetry and recovery.",
    primaryAction: "Resolve mandatory blocker", steps: ["Assess", "Run probe", "Attach evidence", "Promote or block"],
    inputs: ["Acceptance probes", "Environment evidence", "Policies"], outputs: ["Promotion decision", "Blocker register"], completion: "Production is promoted only when mandatory evidence passes.", lens: "production-readiness",
  },
};

export function roleTaskContract(taskId?: string | null): RoleTaskContract | undefined {
  return taskId ? contracts[taskId] : undefined;
}
