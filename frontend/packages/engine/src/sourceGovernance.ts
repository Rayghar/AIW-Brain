// =============================================================================
// SOURCE GOVERNANCE (Sprint 8.8.1) — pure validation for the Knowledge Source
// registry and Repository Connector registry. The constitution, applied to
// source administration:
//   * posture transitions are a ladder, never a leap;
//   * GPL-family licences are locked to discovery posture;
//   * approval requires licence + named owner;
//   * repository writes are DISABLED BY DEFAULT and PR creation always
//     requires explicit human approval — the engine refuses configurations
//     that say otherwise.
// =============================================================================

export type SourcePosture = 'discovery' | 'candidate' | 'approved-advisory' | 'approved-production' | 'deprecated' | 'blocked';

const LADDER: SourcePosture[] = ['discovery', 'candidate', 'approved-advisory', 'approved-production'];
const GPL = /\bA?GPL\b/i;

export interface SourceRegistration {
  id: string;
  title: string;
  sourceType: string;
  url?: string | undefined;
  licence?: string | undefined;
  owner?: string | undefined;
  posture: SourcePosture;
  refreshCadenceDays?: number | undefined;
}

export function validateSourceRegistration(input: Partial<SourceRegistration>): { valid: boolean; reasons: string[]; normalized?: SourceRegistration } {
  const reasons: string[] = [];
  if (!input.id?.trim()) reasons.push('source id required');
  if (!input.title?.trim()) reasons.push('title required');
  if (!input.sourceType?.trim()) reasons.push('sourceType required');
  const posture: SourcePosture = 'discovery'; // registrations ALWAYS enter at discovery
  if (input.posture && input.posture !== 'discovery') reasons.push('new sources enter at discovery posture; climb the ladder via posture transitions');
  if (reasons.length) return { valid: false, reasons };
  return {
    valid: true, reasons: [],
    normalized: { id: input.id!.trim(), title: input.title!.trim(), sourceType: input.sourceType!.trim(), url: input.url, licence: input.licence, owner: input.owner, posture, refreshCadenceDays: input.refreshCadenceDays ?? 180 },
  };
}

export function validatePostureTransition(
  source: { posture: SourcePosture; licence?: string | undefined; owner?: string | undefined },
  target: SourcePosture,
  actor: string,
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!actor || actor.trim().length < 2) reasons.push('a named actor is required for posture changes');
  if (target === 'blocked' || target === 'deprecated') return { valid: reasons.length === 0, reasons }; // always reachable, audited
  const from = LADDER.indexOf(source.posture);
  const to = LADDER.indexOf(target);
  if (to === -1) reasons.push(`unknown posture '${target}'`);
  else if (from === -1) reasons.push(`source is ${source.posture}; reinstate to discovery first`);
  else if (to > from + 1) reasons.push(`ladder violation: ${source.posture} → ${target} skips ${LADDER[from + 1]}`);
  if ((target === 'approved-advisory' || target === 'approved-production')) {
    if (!source.licence?.trim()) reasons.push('licence must be recorded before approval');
    if (!source.owner?.trim()) reasons.push('a review owner must be assigned before approval');
    if (source.licence && GPL.test(source.licence)) reasons.push('GPL-family licences are locked to discovery posture (facts may be corroborated; content never enters approved records)');
  }
  return { valid: reasons.length === 0, reasons };
}

export interface ConnectorRegistration {
  id: string;
  provider: 'github' | 'gitlab' | 'azure-devops' | 'bitbucket';
  repositoryUrl: string;
  allowedPaths: string[];
  writeEnabled: boolean;          // must be false at registration
  prRequiresApproval: boolean;    // must be true, always
  evidenceKinds: string[];        // adr | openapi | asyncapi | terraform | kubernetes | docs | ci
}

export function validateConnectorRegistration(input: Partial<ConnectorRegistration>): { valid: boolean; reasons: string[]; normalized?: ConnectorRegistration } {
  const reasons: string[] = [];
  if (!input.id?.trim()) reasons.push('connector id required');
  if (!['github', 'gitlab', 'azure-devops', 'bitbucket'].includes(String(input.provider))) reasons.push('unsupported provider');
  if (!input.repositoryUrl?.trim()) reasons.push('repository url required');
  if (input.writeEnabled === true) reasons.push('repository writes are disabled by default; enable later via an audited policy change, never at registration');
  if (input.prRequiresApproval === false) reasons.push('PR creation always requires explicit human approval — non-negotiable');
  if (reasons.length) return { valid: false, reasons };
  return {
    valid: true, reasons: [],
    normalized: {
      id: input.id!.trim(), provider: input.provider as ConnectorRegistration['provider'], repositoryUrl: input.repositoryUrl!.trim(),
      allowedPaths: (input.allowedPaths ?? []).map(String).filter(Boolean),
      writeEnabled: false, prRequiresApproval: true,
      evidenceKinds: (input.evidenceKinds ?? []).map(String).filter(Boolean),
    },
  };
}
