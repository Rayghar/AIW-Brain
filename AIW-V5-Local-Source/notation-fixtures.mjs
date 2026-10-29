// Fixtures for the notation suites: the reference project and a dense project of 49 responsibilities and 74 flows
// (the prototype's cap of 50; a workspace now keeps up to 500, which scale-validate.mjs builds), built through the
// chapter commands so nothing is invented.
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';

export const referenceProject = () => withFinalReview(seedProject());

// 44 responsibilities in the three modules joined by a long chain, fan-outs and cross links: the
// shape of a real programme's logical view, at the size of the prototype's cap of 50 (the layouts of this project
// are the ones the notation's identity checks hold still; the workspace now keeps up to 500).
export function stressProject({extra = 44, seed = 11} = {}) {
  let p = referenceProjectRaw();
  const groups = p.logical.groups.map(g => g.id), at = '2026-09-30T00:00:00.000Z';
  let r = seed; const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  const ids = [];
  for (let i = 0; i < extra; i++) {
    const g = groups[i % groups.length];
    const title = ['Validate', 'Enrich', 'Screen', 'Route', 'Settle', 'Notify', 'Reconcile', 'Archive', 'Authorise', 'Audit', 'Price', 'Hold'][i % 12] + ' ' + ['instruction', 'mandate', 'batch', 'exception', 'return', 'limit', 'ledger entry', 'statement', 'alert', 'report', 'fee', 'refund'][Math.floor(i / 12) % 12] + ' ' + (i + 1);
    const res = applyLogicalCommand(p, {type: 'logical.responsibility', payload: {title, purpose: 'Stress fixture responsibility ' + (i + 1) + ' for layout measurement.', boundary: 'Fixture', owner: 'Fixture team', source: 'Fixture', groupId: g, requirementIds: []}}, at);
    p = res.document; ids.push(res.selected);
  }
  const all = [...p.logical.responsibilities.map(x => x.id)];
  const connect = (from, to, label) => { try { p = applyLogicalCommand(p, {type: 'logical.connection', payload: {from, to, label, kind: 'flow'}}, at).document; } catch { /* duplicates and self-links are skipped */ } };
  // A chain through every new responsibility, then fan-outs from every fourth, then cross links.
  for (let i = 1; i < ids.length; i++) connect(ids[i - 1], ids[i], ['Hands over', 'Passes', 'Forwards', 'Returns'][i % 4]);
  for (let i = 0; i < ids.length; i += 4) for (let k = 1; k <= 2; k++) { const t = ids[(i + 7 * k) % ids.length]; if (t !== ids[i]) connect(ids[i], t, 'Notifies'); }
  for (let i = 0; i < 12; i++) { const a = all[Math.floor(rnd() * all.length)], b = all[Math.floor(rnd() * all.length)]; if (a !== b) connect(a, b, 'Checks'); }
  return withFinalReview(p);
}
function referenceProjectRaw() { return withFinalReview(seedProject()); }
