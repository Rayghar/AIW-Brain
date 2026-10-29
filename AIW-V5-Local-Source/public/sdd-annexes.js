// The SDD's annexes (round 12, workstream F; audit/round12/SDD-SPEC.md principle 1 and Appendix D): the registers the
// architecture edition never prints in its body, each a separate export the route serves. The requirement register by
// group, a page at a time (Markdown, CSV, JSON): every requirement once, under the first group that holds it, with its
// external id, statement, priority, the source's assertions and every group it is in. The traceability matrix (CSV, and
// JSON): every requirement against each layer of the design, the records that name it or its group (curated links,
// GR-SDD-16) apart from the records its trail reaches through them (review-domain.js reviewTrace). The register's last
// page lists the requirements retired from the design, with who retired each, when and why (round 12, D4's lifecycle).
// Pure and DOM-free; nothing here changes the project.
import {reviewRequirements, reviewTrace} from './review-domain.js';
import {requirementGroups, groupIndex} from './requirement-groups.js';
import {linksRequirement} from './requirement-links.js';
import {ASSESSMENT_FIELDS} from './intake-domain.js';
import {mdText, md, plural, groupLabel} from './sdd-architecture.js';
import {memoPass} from './document-memo.js';
import {retiredRecords} from './record-lifecycle.js';

export const ANNEXES = ['requirements', 'matrix', 'specifications', 'registers', 'figures'];
export const REGISTER_PAGE = 100;
const str = v => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));
// The requirements in register order by group: each under the first group that holds it, then those in no group.
function byGroup(p) {
  const reqs = reviewRequirements(p), byId = new Map(reqs.map(r => [r.id, r])), G = groupIndex(p), groups = requirementGroups(p), seen = new Set(), rows = [];
  for (const g of groups) for (const id of G.members.get(g.id) || []) { if (seen.has(id)) continue; const r = byId.get(id); if (!r) continue; seen.add(id); rows.push({group: g, r}); }
  for (const r of reqs) if (!seen.has(r.id)) rows.push({group: null, r});
  return {rows, G, groups};
}
const ASSERTION_WORDS = {category: 'category', delivery: 'delivery', validation: 'validation', reliability: 'reliability', manual: 'manual intervention', evidence: 'evidence', comments: 'comments', date: 'assessed', uatCount: 'UAT cases', uatPass: 'UAT passed', uatFail: 'UAT failed', uatBlocked: 'UAT blocked', userNeed: 'user need', outcome: 'outcome', priorityScore: 'score', priorityBand: 'band', pglLinked: 'post-go-live link', sourceBasis: 'source basis', mappingMethod: 'mapping method', sourceReference: 'source reference', sourceAuthority: 'source authority'};
// One page of the register as data.
// The requirements retired from the design (record-lifecycle.js retiredRecords, Chapter 1), oldest first.
function retiredRequirements(p) {
  const kept = Array.isArray(p?.retired?.records) ? p.retired.records : [], typeOf = x => kept.find(y => y.id === x.id && y.at === x.at)?.record;
  return retiredRecords(p, 1).map(x => [x, typeOf(x)]).filter(([, r]) => r?.type === 'requirement').map(([x, r]) => ({id: x.id, externalId: str(r.externalId), title: str(x.title), at: str(x.at).slice(0, 10), actor: str(x.actor), reason: str(x.reason)}));
}
export function requirementRegisterPage(p, {page = 1, size = REGISTER_PAGE} = {}) {
  return memoPass(p, () => {
    const {rows, G} = byGroup(p), pages = Math.max(1, Math.ceil(rows.length / size)), n = Math.min(Math.max(1, Math.floor(Number(page)) || 1), pages), slice = rows.slice((n - 1) * size, n * size);
    return {schema: 'aiw.requirement-register-page.v1', project: {id: p.id, name: p.name}, page: n, pages, pageSize: size, total: rows.length,
      requirements: slice.map(({group, r}) => ({id: r.id, externalId: str(r.externalId), title: str(r.title), statement: str(r.description), priority: str(r.priority), priorityBasis: str(r.priorityBasis), acceptance: str(r.acceptance), source: str(r.source), confirmed: !!r.confirmed, origin: str(r.origin), group: group ? {id: group.id, title: str(group.title)} : null, groups: G.of.get(r.id) || [], domain: str(r.domain), capability: str(r.capability), module: str(r.module), userGroup: str(r.userGroup), assessment: Object.fromEntries(ASSESSMENT_FIELDS.map(k => [k, str(r.assessment?.[k])]).filter(([, v]) => v))})), retired: n === pages ? retiredRequirements(p) : []};
  });
}
export function requirementRegisterMarkdown(p, options = {}) {
  const P = requirementRegisterPage(p, options);
  let out = '# Requirement register · ' + md(P.project.name || 'project') + '\n\nAn annex of the SDD (Appendix D): every requirement in scope once, under the first requirement group that holds it, with the source’s assertions as the import kept them. Page ' + P.page + ' of ' + P.pages + ' · ' + plural(P.total, 'requirement') + ' · ' + P.pageSize + ' a page. The assertions are the source’s, not verified delivery; nothing here is approved by being written down.\n\n';
  let group;
  for (const x of P.requirements) {
    const g = x.group ? x.group.id : '';
    if (g !== group) { group = g; out += '## ' + (x.group ? groupLabel(p, x.group) : 'In no requirement group') + '\n\n'; }
    out += '### ' + x.id + (x.externalId ? ' (' + md(x.externalId) + ')' : '') + ' · ' + md(x.title) + '\n\n';
    if (x.statement && x.statement !== x.title) out += mdText(x.statement) + '\n\n';
    out += 'Priority: ' + (x.priority || 'not stated') + (x.priorityBasis ? ' (' + x.priorityBasis + ')' : '') + ' · ' + (x.confirmed ? 'confirmed' : 'not confirmed') + ' · Groups: ' + (x.groups.join(', ') || 'none') + [['domain', 'Domain'], ['capability', 'Capability theme'], ['module', 'Module'], ['userGroup', 'User group']].filter(([k]) => x[k]).map(([k, l]) => ' · ' + l + ': ' + md(x[k])).join('') + '\n\n';
    const a = Object.entries(x.assessment);
    if (a.length) out += 'Source assertions: ' + a.map(([k, v]) => (ASSERTION_WORDS[k] || k) + ' ' + md(v)).join(' · ') + '\n\n';
    if (x.acceptance) out += 'Acceptance: ' + md(x.acceptance) + '\n\n';
    if (x.source) out += 'Source: ' + md(x.source) + '\n\n';
  }
  if (P.page === P.pages && P.retired?.length) out += '## Retired requirements\n\n' + plural(P.retired.length, 'requirement') + (P.retired.length === 1 ? ' is' : ' are') + ' retired from the design, kept with who retired ' + (P.retired.length === 1 ? 'it' : 'each') + ', when and why; none is counted above.\n\n' + P.retired.map(x => '- ' + x.id + (x.externalId ? ' (' + md(x.externalId) + ')' : '') + ' · ' + md(x.title) + ', retired' + (x.at ? ' on ' + x.at : '') + (x.actor ? ' by ' + md(x.actor) : '') + (x.reason ? ': ' + md(x.reason) : '')).join('\n') + '\n\n';
  return out + (P.page < P.pages ? 'Next page: ' + (P.page + 1) + ' of ' + P.pages + ' (page=' + (P.page + 1) + ').\n' : 'Last page.\n');
}
// A CSV cell as model-exchange.js writes one: quoted, and a value a spreadsheet would read as a formula kept as text.
const csv = v => { let s = String(v ?? ''); if (/^[\s]*[=+@-]/.test(s) || /^[\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
export function requirementRegisterCSV(p) {
  const P = requirementRegisterPage(p, {page: 1, size: 1e9});
  const rows = [['requirement', 'external id', 'title', 'statement', 'priority', 'confirmed', 'first group', 'groups', 'domain', 'capability theme', 'module', 'user group', ...ASSESSMENT_FIELDS.map(k => ASSERTION_WORDS[k] || k)]];
  for (const x of P.requirements) rows.push([x.id, x.externalId, x.title, x.statement, x.priority, x.confirmed ? 'yes' : 'no', x.group?.id || '', x.groups.join('; '), x.domain, x.capability, x.module, x.userGroup, ...ASSESSMENT_FIELDS.map(k => x.assessment[k] || '')]);
  return rows.map(r => r.map(csv).join(',')).join('\r\n') + '\r\n';
}

// The traceability matrix: per requirement and layer, the records that name it or its group, and those its trail reaches.
export const MATRIX_LAYERS = [['drivers', 'drivers'], ['decisions', 'decisions'], ['logical', 'responsibilities'], ['applications', 'components'], ['capabilities', 'capabilities'], ['realizations', 'realisations'], ['contracts', 'contracts'], ['data', 'data'], ['controls', 'controls'], ['runtime', 'runtime plans']];
export function traceabilityMatrix(p) {
  return memoPass(p, () => {
    const G = groupIndex(p);
    return reviewRequirements(p).map(r => {
      const t = reviewTrace(p, r.id) || {}, row = {id: r.id, externalId: str(r.externalId), title: str(r.title), groups: G.of.get(r.id) || [], delivery: str(r.assessment?.delivery), layers: {}};
      const respNamed = new Set((t.logical || []).filter(x => linksRequirement(p, x, r.id)).map(x => x.id));
      const realising = new Set((p.logical?.mappings || []).filter(m => respNamed.has(m.logicalId)).map(m => m.physicalId));
      for (const [k] of MATRIX_LAYERS) {
        const xs = t[k] || [], named = xs.filter(x => (k === 'applications' ? realising.has(x.id) || linksRequirement(p, x, r.id) : linksRequirement(p, x, r.id)));
        row.layers[k] = {named: named.map(x => x.ref || x.code || x.id), through: xs.filter(x => !named.includes(x)).map(x => x.ref || x.code || x.id)};
      }
      return row;
    });
  });
}
export function traceabilityMatrixCSV(p) {
  const rows = [['requirement', 'external id', 'title', 'groups', 'delivery', ...MATRIX_LAYERS.flatMap(([, l]) => [l + ' (named)', l + ' (through the design)'])]];
  for (const x of traceabilityMatrix(p)) rows.push([x.id, x.externalId, x.title, x.groups.join('; '), x.delivery, ...MATRIX_LAYERS.flatMap(([k]) => [x.layers[k].named.join('; '), x.layers[k].through.join('; ')])]);
  return rows.map(r => r.map(csv).join(',')).join('\r\n') + '\r\n';
}
