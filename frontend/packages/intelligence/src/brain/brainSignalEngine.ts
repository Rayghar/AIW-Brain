import type { BrainSignal, BrainSignalInputFinding } from './types.js';
import { deriveSurfacePolicy } from './surfacePolicy.js';

function stableId(finding: BrainSignalInputFinding): string {
  const basis = [finding.projectId, finding.stage, finding.objectId ?? 'global', finding.source, finding.title].join('|');
  let hash = 0;
  for (let i = 0; i < basis.length; i += 1) {
    hash = (hash * 31 + basis.charCodeAt(i)) >>> 0;
  }
  return `bs_${hash.toString(16)}`;
}

export class BrainSignalEngine {
  normalize(findings: BrainSignalInputFinding[], now = new Date()): BrainSignal[] {
    return findings.map((finding) => this.normalizeOne(finding, now));
  }

  normalizeOne(finding: BrainSignalInputFinding, now = new Date()): BrainSignal {
    const severity = finding.severity ?? this.inferSeverity(finding);
    const confidence = Math.max(0, Math.min(1, finding.confidence ?? 0.72));

    return {
      id: finding.id ?? stableId(finding),
      projectId: finding.projectId,
      stage: finding.stage,
      ...(finding.objectId ? { objectId: finding.objectId } : {}),
      source: finding.source,
      sourceType: finding.sourceType,
      severity,
      confidence,
      title: finding.title,
      shortMessage: finding.message,
      ...(finding.detail ? { detail: finding.detail } : {}),
      ...(finding.recommendedAction ? { recommendedAction: finding.recommendedAction } : {}),
      evidence: finding.evidence ?? [],
      surfacePolicy: deriveSurfacePolicy({ ...finding, severity, confidence }),
      dismissed: false,
      createdAt: now.toISOString(),
    };
  }

  private inferSeverity(finding: BrainSignalInputFinding) {
    const impact = finding.readinessImpact ?? 0;
    const tags = new Set(finding.tags ?? []);
    if (tags.has('blocker') || impact >= 0.9) return 'blocker' as const;
    if (tags.has('warning') || impact >= 0.6) return 'warning' as const;
    if (tags.has('recommendation')) return 'recommendation' as const;
    if (tags.has('review')) return 'review' as const;
    if (tags.has('evidence')) return 'evidence' as const;
    if (tags.has('handoff')) return 'handoff' as const;
    if (tags.has('silent')) return 'silent' as const;
    return 'hint' as const;
  }
}
