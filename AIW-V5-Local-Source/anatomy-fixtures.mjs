// Fixtures for the design anatomy checks.
// - coreBankingSource(): the hypothetical core-banking model used by the concept prototype.
//   It is illustrative, not the recorded SEABaaS architecture.
// - syntheticSource(): a generated large system for layout scale checks.
import fs from 'node:fs';
import vm from 'node:vm';

export function coreBankingSource() {
  const code = fs.readFileSync(new URL('./concepts/anatomy-src/core-banking.js', import.meta.url), 'utf8');
  const ctx = {window: {}};
  vm.runInNewContext(code, ctx);
  const ds = ctx.window.AIW_DATASETS.find(d => d.id === 'core-banking');
  return {id: ds.id, title: ds.title, objects: ds.objects, rels: ds.rels};
}

// A deterministic pseudo-random large system: modules, components, shared platform, flows.
export function syntheticSource({modules = 40, comps = 4, caps = 14, seed = 7} = {}) {
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const objects = [], rels = [];
  const o = (type, id, title, extra = {}) => { objects.push({id, ref: id, type, title, description: '', owner: '', modules: [], shared: false, ...extra}); return id; };
  const r = (type, from, to, label = '') => rels.push({type, from, to, label});
  o('party', 'P-IN', 'Customer channel'); o('party', 'P-OUT', 'External network');
  for (let k = 0; k < caps; k++) { o('capability', 'CAP' + k, 'Capability ' + k); o('technology', 'TR' + k, 'Capability ' + k + ' realization', {product: k % 3 ? 'Product ' + k : ''}); r('implementedBy', 'CAP' + k, 'TR' + k); }
  const allComps = [];
  for (let m = 0; m < modules; m++) {
    const mid = o('module', 'M' + m, 'Module ' + m, {modules: ['M' + m]});
    for (let c = 0; c < comps; c++) {
      const rid = o('responsibility', 'R' + m + '-' + c, 'Responsibility ' + m + '.' + c, {modules: [mid]}); r('memberOf', rid, mid);
      const cid = o('component', 'C' + m + '-' + c, 'Component ' + m + '.' + c, {modules: [mid]}); r('realizedBy', rid, cid); allComps.push(cid);
      const need = new Set([0, 1, 2 + Math.floor(rnd() * (caps - 2))]);
      for (const k of need) r('requires', cid, 'CAP' + k);
      const run = o('runtime', 'RUN' + m + '-' + c, 'Plan ' + m + '.' + c, {asset: cid}); r('operatedAs', cid, run);
      if (rnd() > 0.2) { const pl = o('instance', 'PL' + m + '-' + c, 'Placement ' + m + '.' + c, {replicas: 2}); r('placedAs', run, pl); }
    }
  }
  for (let i = 0; i < allComps.length; i++) {
    const a = allComps[i], n = 1 + Math.floor(rnd() * 2);
    for (let k = 0; k < n; k++) { const b = allComps[Math.min(allComps.length - 1, i + 1 + Math.floor(rnd() * 12))]; if (b !== a) r('interaction', a, b, 'call'); }
  }
  r('interaction', 'P-IN', allComps[0], 'enter'); r('interaction', allComps[allComps.length - 1], 'P-OUT', 'leave');
  return {id: 'synthetic', title: 'Synthetic ' + modules + '-module system', objects, rels};
}
