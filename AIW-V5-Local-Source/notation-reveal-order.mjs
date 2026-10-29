// The order in which a stepped connection level opens and reveals its paths, restated for the suites (rc41 close, C33).
// The product rule (rc41 W1, audit/rc41/w1/NOTE.md §1; public/notation-view.js orderedConnections and emphasisFor): the
// picture's relation roles are its relationship families between two lanes (a role level on the Diagram's layered
// pictures, a concern band elsewhere: layers-view.js laneIndex), ordered by the scene's preferred families, ties in source
// order; the paths are taken one of each role, then the second of each, and so on (round-robin), so a dense family never
// crowds the others out. A stepped level whose own paths exceed the budget of 12 opens with the first 12 of its own paths
// in that order; Reveal next adds six at a time, the level's own paths first, then the paths beyond it, in the same order.
// This module is an independent restatement, not an export of the view: a regression in the view's order (paths in source
// order, a role dropped or crowded out) disagrees with it. What a reader sees is a set at each step (12, 18, 24 …), so the
// preferred families matter only where a round of the round-robin is cut; on the reference project no cut separates them
// (a copy of the view that ignores them passes), so that table is restated here but not proven by the suites.
import {styleOf} from './public/notation-model.js';
import {laneIndex, connectionLevelOf, levelRank} from './public/layers-view.js';

export const LEVEL_BUDGET = 12, REVEAL_STEP = 6;
// The families each scene leads with (rc41 W1); Layers reads as the connected model.
export const PREFERRED_FAMILIES = Object.freeze({
  connected: ['realization', 'influence', 'serving', 'flow'], motivation: ['influence', 'realization'], drivers: ['influence', 'realization'],
  rationale: ['influence', 'realization'], logical: ['flow', 'realization'], application: ['realization', 'serving', 'composition'],
  solution: ['serving', 'dependency'], stack: ['realization', 'serving', 'dependency'], integration: ['flow', 'dependency'],
  cooperation: ['flow', 'dependency'], data: ['access'], lineage: ['access'], security: ['protection', 'threat'],
  deployment: ['assignment', 'path'], usage: ['realization', 'assignment', 'serving']
});

// The reveal order of a diagram D at a stepped level: {roles, levelRoles, inLevel, beyond}. `roles` lists the relation
// roles in order ({key, family, ids}), `levelRoles` those of the level (a role's paths join the same two lanes in one
// family, so a role is wholly inside the level or wholly beyond it); `inLevel` the level's own paths and `beyond` the
// others, each in round-robin order. `off` names relationship families the reader switched off (they take no part).
export function revealOrder(D, {scene = D?.scene?.id, layers = false, level, off = []} = {}) {
  const lanes = laneIndex(D), preferred = PREFERRED_FAMILIES[layers ? 'connected' : scene] || [], groups = new Map();
  for (const e of D?.edges || []) {
    const family = styleOf(e.kind).family; if (off.includes(family)) continue;
    const key = `${family}|${lanes.get(e.from)}|${lanes.get(e.to)}`;
    if (!groups.has(key)) groups.set(key, {key, family, ids: []});
    groups.get(key).ids.push(e.id);
  }
  const rank = f => (preferred.includes(f) ? preferred.indexOf(f) : 99);
  const roles = [...groups.values()].sort((a, b) => rank(a.family) - rank(b.family)), order = [];
  for (let i = 0; roles.some(g => g.ids.length > i); i++) for (const g of roles) if (g.ids[i]) order.push(g.ids[i]);
  const levels = connectionLevelOf(D), own = id => levelRank(levels.get(id)) <= levelRank(level);
  return {roles, levelRoles: roles.filter(g => g.ids.every(own)), inLevel: order.filter(own), beyond: order.filter(id => !own(id))};
}

// The paths a stepped level opens with: all its own when they are within the budget, else the first LEVEL_BUDGET of them.
export function openingPaths(D, options) {
  const {inLevel} = revealOrder(D, options);
  return inLevel.slice(0, inLevel.length > LEVEL_BUDGET ? LEVEL_BUDGET : inLevel.length);
}
