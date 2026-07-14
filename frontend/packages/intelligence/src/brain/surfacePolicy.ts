import type { BrainSignalInputFinding, SurfacePolicy } from './types.js';

export function deriveSurfacePolicy(finding: BrainSignalInputFinding): SurfacePolicy {
  const tags = new Set(finding.tags ?? []);
  const severity = finding.severity ?? 'hint';

  if (tags.has('admin') || tags.has('provider') || tags.has('cost')) {
    return { primary: 'admin-only', secondary: ['info-center'], dismissible: true };
  }

  if (severity === 'silent') {
    return { primary: 'silent-ranking', dismissible: false };
  }

  if (severity === 'blocker') {
    return {
      primary: tags.has('drop') ? 'drop-preflight' : 'stage-gate',
      secondary: ['canvas-badge', 'info-center', 'decision-radar'],
      requiresUserAction: true,
      dismissible: false,
    };
  }

  if (severity === 'warning') {
    return {
      primary: finding.objectId ? 'canvas-badge' : 'stage-health-chip',
      secondary: ['info-center', 'decision-radar'],
      dismissible: true,
    };
  }

  if (severity === 'recommendation') {
    return {
      primary: tags.has('library') ? 'library-chip' : 'info-center',
      secondary: ['co-architect', 'bottom-dock'],
      dismissible: true,
    };
  }

  if (severity === 'review') {
    return {
      primary: 'decision-radar',
      secondary: ['info-center', 'stage-health-chip'],
      dismissible: true,
    };
  }

  if (severity === 'handoff') {
    return {
      primary: 'stage-gate',
      secondary: ['info-center'],
      requiresUserAction: true,
      dismissible: false,
    };
  }

  return {
    primary: finding.objectId ? 'canvas-badge' : 'bottom-dock',
    secondary: ['info-center'],
    dismissible: true,
  };
}
