import type { KnowledgeLibrary } from "@aiw/domain";
import {
  approveKnowledgeReleaseCandidate,
  createKnowledgeReleaseCandidate,
  pinKnowledgeRelease,
  promoteKnowledgeReleaseCandidate,
  validateKnowledgeReleaseCandidate,
  type KnowledgeReleaseCandidateRecord,
  type KnowledgeReleaseManifest,
  type KnowledgeReleasePinRecord,
} from "./index.js";

export interface GovernedKnowledgeCycleActors {
  extractor: string;
  reviewer: string;
  promoter: string;
}

export interface GovernedKnowledgeCycleInput {
  currentLibrary: KnowledgeLibrary;
  proposedLibrary: KnowledgeLibrary;
  actors: GovernedKnowledgeCycleActors;
  releaseId: string;
  tenantId: string;
  openContradictions?: number;
  licenseBlockers?: number;
  regressionFailures?: number;
  candidateInfluencesProduction?: boolean;
  now?: Date;
}

export interface GovernedKnowledgeCycleResult {
  candidate: KnowledgeReleaseCandidateRecord;
  manifest: KnowledgeReleaseManifest;
  pin: KnowledgeReleasePinRecord;
  receipts: Array<{
    step: "extract" | "validate" | "approve" | "promote" | "pin";
    actor: string;
    status: "passed";
    at: string;
    detail: string;
  }>;
}

export class KnowledgeCycleGovernanceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "KnowledgeCycleGovernanceError";
  }
}

function assertSeparationOfDuties(actors: GovernedKnowledgeCycleActors): void {
  const values = [actors.extractor.trim(), actors.reviewer.trim(), actors.promoter.trim()];
  if (values.some((value) => !value))
    throw new KnowledgeCycleGovernanceError("ACTOR_REQUIRED", "Extractor, reviewer and promoter are required.");
  if (new Set(values).size !== values.length)
    throw new KnowledgeCycleGovernanceError(
      "SEPARATION_OF_DUTIES_REQUIRED",
      "Extractor, reviewer and promoter must be different principals.",
    );
}

export function runGovernedKnowledgeCycle(input: GovernedKnowledgeCycleInput): GovernedKnowledgeCycleResult {
  assertSeparationOfDuties(input.actors);
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  let candidate = createKnowledgeReleaseCandidate({
    currentLibrary: input.currentLibrary,
    proposedLibrary: input.proposedLibrary,
    actor: input.actors.extractor,
    now,
  });
  if (!candidate.changes.length)
    throw new KnowledgeCycleGovernanceError("NO_GOVERNED_CHANGES", "The proposed knowledge release contains no governed changes.");

  const validation = validateKnowledgeReleaseCandidate({
    candidate,
    currentReleaseId: input.currentLibrary.knowledgeReleaseId ?? input.currentLibrary.version,
    openContradictions: input.openContradictions ?? 0,
    licenseBlockers: input.licenseBlockers ?? 0,
    regressionFailures: input.regressionFailures ?? 0,
    candidateInfluencesProduction: input.candidateInfluencesProduction ?? false,
    now,
  });
  if (!validation.allowed)
    throw new KnowledgeCycleGovernanceError(
      "VALIDATION_BLOCKED",
      validation.checks.filter((check) => !check.ok).map((check) => check.id).join(", "),
    );
  candidate = { ...candidate, validation };
  candidate = approveKnowledgeReleaseCandidate(candidate, input.actors.reviewer, now);

  const promoted = promoteKnowledgeReleaseCandidate({
    candidate,
    actor: input.actors.promoter,
    releaseId: input.releaseId,
    now,
  });
  if ("error" in promoted)
    throw new KnowledgeCycleGovernanceError(promoted.error, `Promotion failed: ${promoted.error}`);

  const pin = pinKnowledgeRelease({
    scope: "tenant",
    scopeId: input.tenantId,
    releaseId: promoted.manifest.releaseId,
    actor: input.actors.promoter,
    now,
  });

  return {
    candidate: promoted.candidate,
    manifest: promoted.manifest,
    pin,
    receipts: [
      { step: "extract", actor: input.actors.extractor, status: "passed", at: timestamp, detail: `${candidate.changes.length} governed change(s) staged as candidate-only.` },
      { step: "validate", actor: input.actors.reviewer, status: "passed", at: timestamp, detail: "Contradiction, licence, regression and candidate-leakage gates passed." },
      { step: "approve", actor: input.actors.reviewer, status: "passed", at: timestamp, detail: "Independent reviewer approved the candidate." },
      { step: "promote", actor: input.actors.promoter, status: "passed", at: timestamp, detail: `Promoted ${promoted.manifest.releaseId}.` },
      { step: "pin", actor: input.actors.promoter, status: "passed", at: timestamp, detail: `Pinned tenant ${input.tenantId} to ${pin.releaseId}.` },
    ],
  };
}
