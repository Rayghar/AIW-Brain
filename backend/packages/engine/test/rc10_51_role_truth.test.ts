import { describe, expect, it } from 'vitest';
import { hasPermission, permissionsForRole } from '../src/index.js';

describe('rc.10.51 role truth', () => {
  it('separates review disposition from delivery-pack generation', () => {
    expect(hasPermission({ roles: ['architecture-reviewer'] }, 'review.run').ok).toBe(true);
    expect(hasPermission({ roles: ['architecture-reviewer'] }, 'review.disposition').ok).toBe(true);
    expect(hasPermission({ roles: ['architecture-reviewer'] }, 'artifact.generate').ok).toBe(false);
    expect(hasPermission({ roles: ['solution-architect'] }, 'artifact.generate').ok).toBe(true);
    expect(permissionsForRole('reviewer')).not.toContain('artifact.generate');
  });

  it('keeps architecture mutation least privilege', () => {
    expect(hasPermission({ roles: ['solution-architect'] }, 'architecture.write').ok).toBe(true);
    expect(hasPermission({ roles: ['platform-architect'] }, 'architecture.write').ok).toBe(true);
    expect(hasPermission({ roles: ['architecture-reviewer'] }, 'architecture.write').ok).toBe(false);
    expect(hasPermission({ roles: ['knowledge-curator'] }, 'architecture.write').ok).toBe(false);
  });

  it('enforces least-privilege read surfaces for admin, knowledge, releases and audit', () => {
    expect(hasPermission({ roles: ['platform-admin'] }, 'admin.control-plane.read').ok).toBe(true);
    expect(hasPermission({ roles: ['knowledge-curator'] }, 'admin.control-plane.read').ok).toBe(false);
    expect(hasPermission({ roles: ['knowledge-curator'] }, 'knowledge.read').ok).toBe(true);
    expect(hasPermission({ roles: ['knowledge-curator'] }, 'release.read').ok).toBe(true);
    expect(hasPermission({ roles: ['enterprise-architect'] }, 'release.read').ok).toBe(true);
    expect(hasPermission({ roles: ['architecture-reviewer'] }, 'knowledge.read').ok).toBe(false);
    expect(hasPermission({ roles: ['architecture-reviewer'] }, 'audit.read').ok).toBe(true);
    expect(hasPermission({ roles: ['solution-architect'] }, 'audit.read').ok).toBe(false);
    expect(hasPermission({ roles: ['platform-architect'] }, 'repository.read').ok).toBe(true);
  });

});
