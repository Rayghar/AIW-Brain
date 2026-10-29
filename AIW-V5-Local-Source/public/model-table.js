// The Table view of a chapter model (round 3, D): the chapter's own records as one sortable, filterable table —
// reference, title, the record's key fields (as record-fields.js names them), its open checks (the error and warning
// findings on it, the checks chapter-reasoning.js reads), and how many relationships connect it in the one model.
// The sidebar's layer filter applies; a row selects the record; "Open in Work" opens its editor. A long table draws a
// page of 50 rows and offers "Show more" (round 4, scale). The first column stays in view while the table scrolls
// sideways inside its card. A reading of the saved document: nothing here writes.
// Round 12 (G, GR-UX-06): a chapter that lists requirements (Chapter 1) shows what a workbook import leaves on each, its
// external id, domain, requirement groups and delivery state, and its filter reads the text every requirement search
// reads (requirement-groups.js requirementSearchIndex: the register's search text and the groups), so a requirement is
// found here by its workbook id, its domain or its group, as it is in the register.
import {RECORD_TYPES} from './chapter-reasoning.js';
import {fieldsFor} from './record-fields.js';
import {architectureModel, OBJECT_TYPES} from './architecture-model.js';
import {inheritedFindings} from './review-domain.js';
import {layerOfType} from './notation-model.js';
import {layerForLevel} from './chapter-names.js';
import {perDocument} from './document-memo.js';
import {esc} from './html-escape.js';
import {list, fewNames} from './util.js';
import {requirementGroups, groupIndex, requirementSearchIndex} from './requirement-groups.js';
import {chapterRecordSet} from './chapter-records.js';
import {typeInfo} from './requirements-domain.js';
import {selectionLabel} from './technology-realisation-domain.js';

// The record types a chapter's table lists, in order: the chapter's own (RECORD_TYPES), Chapter 3's decisions.
const TYPES_OF = chapter => (Number(chapter) === 3 ? ['decision'] : Object.entries(RECORD_TYPES).filter(([, T]) => T.chapter === Number(chapter)).map(([k]) => k));
// The architecture model's type for a record type, for its layer and its relationships.
const MODEL_TYPE = {driver: 'quality', realisation: 'technology', plan: 'runtime', narrative: 'evidence', action: 'evidence'};
const SHORT = new Set(['text', 'select', 'number', 'checkbox', 'date', 'ids']);
const REGISTER_COMMAND = {module: 'logical.group', need: 'technology.needs', boundary: 'technology.boundary', party: 'interfaces.party', risk: 'security.risk', environment: 'runtime.environment', zone: 'runtime.zone', instance: 'runtime.placement', path: 'runtime.path'};
const FALLBACK_FIELDS = [{name: 'owner', label: 'Owner', kind: 'text'}, {name: 'status', label: 'Status', kind: 'text'}, {name: 'description', label: 'Description', kind: 'text'}];
const ARTEFACT_FIELDS = {requirement: ['priority', 'owner', 'source'], constraint: ['owner', 'source', 'priority'], actor: ['role', 'owner', 'source'], stakeholder: ['role', 'owner', 'source'], scope: ['scopeMode', 'owner', 'source'], journey: ['order', 'owner', 'source'], outcome: ['measure', 'target', 'owner'], assumption: ['owner', 'source', 'confirmed'], rule: ['value', 'unit', 'authority']};
const descriptors = command => fieldsFor(command).filter(d => !d.proposalOnly && !d.form && d.kind !== 'perItem');
function keyDescriptors(command, type) {
  const all = descriptors(command);
  if (command === 'artefact') return (ARTEFACT_FIELDS[type] || ['owner', 'source', 'description']).map(name => all.find(d => d.name === name)).filter(Boolean);
  return (all.length ? all : FALLBACK_FIELDS).filter(d => SHORT.has(d.kind) && !['title', 'name', 'question', 'confirmed'].includes(d.name) && !d.measure).slice(0, 3);
}
// The columns a requirement adds (round 12, G, GR-UX-06); a record of another kind leaves them empty.
const REQUIREMENT_COLUMNS = [{key: 'ext', label: 'External ID'}, {key: 'domain', label: 'Domain'}, {key: 'group', label: 'Group'}, {key: 'delivery', label: 'Delivery'}];
const REQUIREMENT_KEYS = new Set(REQUIREMENT_COLUMNS.map(c => c.key));
const GROUPS_SHOWN = 2;
// Chapter-specific fields retain their names across mixed record types. An unrelated
// field can never appear beneath the first record type's heading.
const FIELDS = {
  component: ['kind', 'owner', 'responsibilityIds'],
  realisation: ['owner', 'operationsPlan', 'resiliencePlan', 'interfacePlan'],
  contract: ['operation', 'protocol', 'requestData', 'responseData', 'idempotencyKey', 'failurePolicy'],
  data: ['classification', 'owner', 'authorityId', 'retentionPolicy'],
  plan: ['assetId', 'minReady', 'maxReplicas', 'monitoring'],
};
const SHORT_LABEL = {operationsPlan: 'Operating obligations', resiliencePlan: 'Recovery obligations', interfacePlan: 'Interface obligations', requestData: 'Request payload', responseData: 'Response payload', failurePolicy: 'Failure promise', minReadyReplicas: 'Minimum ready replicas'};
// Open checks per record: the error and warning findings on it (the same reading chapter-reasoning.js gives Sol).
const openChecks = perDocument(p => {
  const by = new Map();
  let all = []; try { all = inheritedFindings(p) || []; } catch { all = []; }
  for (const f of all) {
    if (!['error', 'warning'].includes(f.level)) continue;
    for (const id of new Set([f.objectId, ...list(f.objectIds)].filter(Boolean))) { const x = by.get(id) || []; x.push(f); by.set(id, x); }
  }
  return by;
});
const linkCounts = perDocument(p => {
  const M = architectureModel(p), by = new Map();
  for (const e of M.relationships.values ? M.relationships.values() : M.relationships) for (const id of [e.from, e.to]) by.set(id, (by.get(id) || 0) + 1);
  return {by, M};
});
const fmt = (v, names) => {
  if (v == null || v === '') return '';
  if (Array.isArray(v)) return v.map(x => names(x)).filter(Boolean).join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return names(String(v));
};

// The rows of a chapter's table, and the columns it shows.
export function tableModel(p, chapter) {
  if (!p) return {rows: [], columns: [], types: []};
  const types = TYPES_OF(chapter), {by: links, M} = linkCounts(p), checks = openChecks(p);
  const names = id => { const o = M.objects.get(id); return o ? (o.ref && o.ref !== o.title ? o.ref : o.title) : id; };
  const command = t => (t === 'decision' ? 'decision.save' : RECORD_TYPES[t]?.command);
  const fields = new Map(), namedFields = new Map();
  for (const t of types) {
    const defs = descriptors(command(t)).filter(d => !['title', 'name', 'question', 'confirmed'].includes(d.name) && !d.measure);
    const named = FIELDS[t] ? FIELDS[t].map(name => defs.find(d => d.name === name)).filter(Boolean) : defs.filter(d => SHORT.has(d.kind)).slice(0, 3);
    namedFields.set(t, named);
    fields.set(t, [...named, ...keyDescriptors(command(t), t).filter(d => !named.some(n => n.name === d.name))]);
  }
  const reqs = types.includes('requirement'), search = reqs ? requirementSearchIndex(p) : null;
  const groupTitles = reqs ? (() => { const of = groupIndex(p).of, titles = new Map(requirementGroups(p).map(g => [g.id, g.title || g.id])); return id => (of.get(id) || []).map(g => titles.get(g) || g); })() : null;
  const words = v => (v == null ? '' : String(v).trim());
  const rows = [], present = new Set(), canonical = chapterRecordSet(p, chapter), canonicalIds = new Set(canonical.records.map(r => r.id));
  const addRow = (t, r, o, cmd) => {
    if (!r || !r.id || present.has(r.id)) return;
    present.add(r.id);
    const mt = MODEL_TYPE[t] || t, cs = checks.get(r.id) || [], ds = fields.get(t) || keyDescriptors(cmd, r.type || t);
    fields.set(t, ds); if (!types.includes(t)) types.push(t);
    const artefact = cmd === 'artefact', searchFields = descriptors(cmd), named = namedFields.get(t) || [];
    const values = Object.fromEntries(named.map(d => [d.name, fmt(r[d.name], ['ids', 'select'].includes(d.kind) ? names : x => x)]));
    if (t === 'realisation') {
      const selected = list(r.options).find(option => option.id === r.selectedOptionId);
      values.selectedOption = selected ? [selected.product || selected.title, selected.version, selected.serviceTier].filter(Boolean).join(' · ') : '';
      values.selectionState = selectionLabel(p, r);
    }
    const fieldPairs = ds.map(d => [d.label, fmt(r[d.name], ['ids', 'select'].includes(d.kind) ? names : x => x)]);
    const extraFields = ds.filter(d => !named.some(n => n.name === d.name)).map(d => [d.label, fmt(r[d.name], ['ids', 'select'].includes(d.kind) ? names : x => x)]);
    if (t === 'realisation') fieldPairs.unshift(['Preferred product / version / tier', values.selectedOption], ['Decision status', values.selectionState]);
    rows.push({id: r.id, ref: r.ref || r.id, title: r.title || r.question || r.name || o?.title || r.id, type: t, typeLabel: (artefact ? typeInfo(r.type)?.name : '') || OBJECT_TYPES[mt]?.label || RECORD_TYPES[t]?.noun || t, layer: layerOfType(o?.type || mt, r) || layerForLevel(o?.level),
      values, fieldLabels: Object.fromEntries(named.map(d => [d.name, d.label])), fields: fieldPairs, extraFields, checks: cs.length, errors: cs.filter(f => f.level === 'error').length, checkTitles: [...new Set(cs.map(f => f.title))].slice(0, 4), links: links.get(r.id) || 0,
      req: t === 'requirement' ? {ext: words(r.externalId), domain: words(r.domain), groups: groupTitles(r.id), delivery: words(r.assessment?.delivery)} : null,
      description: r.description || r.purpose || o?.description || '', status: o?.status || r.status || r.state || '',
      search: [search?.get(String(r.id)) || '', ...searchFields.map(d => d.label + ' ' + fmt(r[d.name], names)), o?.description || '', o?.status || ''].join(' ')});
  };
  for (const t of types) {
    const coll = t === 'decision' ? list(p.decisions?.records) : list(RECORD_TYPES[t].coll(p));
    for (const r of coll) addRow(t, r, M.objects.get(r.id), command(t));
  }
  // Sol's assessable types are only part of a chapter's inventory. Include every canonical
  // saved chapter record too: actors, journey steps, groups, needs, zones, placements and evidence.
  // Keep the existing SDD narrative and delivery actions even though those are not graph collections.
  for (const x of canonical.records) {
    if (present.has(x.id)) continue;
    const o = M.objects.get(x.id), r = o?.record; if (!r) continue;
    const cmd = String(o.source).startsWith('artefacts[') ? 'artefact' : x.type === 'evidence' ? (String(o.source).startsWith('security.') ? 'security.evidence' : 'runtime.evidence') : REGISTER_COMMAND[x.type] || '';
    addRow(cmd === 'artefact' ? r.type || x.type : x.type, r, o, cmd);
  }
  // Keep Round 27's named, sortable columns and preference/decision status. Supporting
  // records and additional key fields carry their own labels in one compact column.
  const keyFields = new Set(rows.map(r => r.type)).size > 1 ? [{key: 'kind', label: 'Record type'}] : [];
  const labels = new Map();
  for (const defs of namedFields.values()) for (const d of defs) {
    if (!labels.has(d.name)) labels.set(d.name, new Set());
    labels.get(d.name).add(d.label.split(' · ')[0]);
  }
  for (const [name, meanings] of labels) {
    // A shared sortable field cannot inherit one record type's label. For example,
    // Threat category and Control category share Category, with exact cell labels retained.
    const neutral = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
    keyFields.push({key: 'field:' + name, label: SHORT_LABEL[name] || (meanings.size > 1 ? neutral : [...meanings][0])});
  }
  if (types.includes('realisation')) keyFields.unshift({key: 'field:selectedOption', label: 'Preferred product / version / tier'}, {key: 'field:selectionState', label: 'Decision status'});
  if (rows.some(r => r.extraFields.length)) keyFields.push({key: 'details', label: 'Additional fields'});
  const columns = [{key: 'ref', label: 'Reference'}, {key: 'title', label: 'Title'}, ...keyFields, ...(reqs ? REQUIREMENT_COLUMNS : []), {key: 'checks', label: 'Open checks'}, {key: 'links', label: 'Linked'}];
  return {rows, columns, types, registerCount: canonical.total, additionalCount: rows.filter(r => !canonicalIds.has(r.id)).length};
}
// The table includes saved containers and supporting records that a chapter's native picture
// may not draw. A selection still deserves its own reading and the shared dossier/Work action.
export function tableRecordHTML(T, id) {
  const r = T.rows.find(x => x.id === id); if (!r) return '';
  const rows = [['Reference', r.ref], ...r.fields, ['Status', r.status]].filter(([, value]) => value !== '' && value != null);
  return `<section class="cm-spec nt-table-spec" data-nt-record="${esc(id)}"><h4 aria-level="3">${esc(r.typeLabel)}</h4><p class="cm-spec-t"><b>${esc(r.title)}</b></p>${r.description ? `<p>${esc(r.description)}</p>` : ''}<dl class="cm-dl">${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>`;
}
const reqCell = (r, key) => (!r.req ? '' : key === 'group' ? fewNames(r.req.groups, {max: GROUPS_SHOWN}) : r.req[key]);
const cell = (r, key) => (key === 'ref' ? r.ref : key === 'title' ? r.title : key === 'kind' ? r.typeLabel : key === 'details' ? r.extraFields.map(([label, value]) => label + ': ' + value).join(' · ') : key === 'checks' ? r.checks : key === 'links' ? r.links : REQUIREMENT_KEYS.has(key) ? reqCell(r, key) : key.startsWith('field:') ? r.values?.[key.slice(6)] ?? '' : (r.fields[Number(key.slice(1))] || [])[1] || '');
export const tableColumns = (T, showEmpty = false) => T.columns.filter(c => showEmpty || ['ref', 'title', 'kind', 'checks', 'links', 'field:selectionState', 'field:selectedOption'].includes(c.key) || T.rows.some(r => cell(r, c.key) !== ''));
// Sort and filter: numbers numerically, words naturally; the filter reads the reference, title and every field shown,
// and a requirement's search text (its workbook id, domain, description and groups among it).
export function tableRows(T, {sort = 'ref', dir = 1, filter = '', layers = null} = {}) {
  if (!T.columns.some(c => c.key === sort)) sort = 'ref';
  const q = String(filter || '').trim().toLowerCase(), keep = Array.isArray(layers) ? new Set(layers) : null;
  const shown = T.rows.filter(r => (!keep || !r.layer || keep.has(r.layer)) && (!q || [r.ref, r.title, r.typeLabel, ...r.fields.flat(), r.search, ...(r.req ? [r.req.delivery] : [])].join(' ').toLowerCase().includes(q)));
  const hiddenByLayers = keep ? T.rows.filter(r => r.layer && !keep.has(r.layer)).length : 0;
  const num = sort === 'checks' || sort === 'links';
  shown.sort((a, b) => { const x = cell(a, sort), y = cell(b, sort); return (num ? x - y : String(x).localeCompare(String(y), undefined, {numeric: true, sensitivity: 'base'})) * dir || String(a.ref).localeCompare(String(b.ref), undefined, {numeric: true}); });
  return {shown, hiddenByLayers};
}
// One page of rows (round 4, scale): a table longer than this draws its first page and offers the next.
export const TABLE_PAGE = 50;
// `limit` is how many rows are drawn; `reveal` is a record that must be among them (the selection), so the page grows
// to hold it.
export function tableHTML(T, {sort = 'ref', dir = 1, filter = '', layers = null, sel = null, chapter = null, layerNames = {}, limit = TABLE_PAGE, reveal = null, showEmpty = false} = {}) {
  const columns = tableColumns(T, showEmpty), hiddenColumns = T.columns.length - tableColumns(T).length;
  if (!columns.some(c => c.key === sort)) sort = 'ref';
  const {shown: all, hiddenByLayers} = tableRows(T, {sort, dir, filter, layers});
  const at = reveal || sel ? all.findIndex(r => r.id === (reveal || sel)) : -1;
  const upto = Math.max(Number(limit) || TABLE_PAGE, at >= 0 ? Math.ceil((at + 1) / TABLE_PAGE) * TABLE_PAGE : 0), shown = all.slice(0, upto), rest = all.length - shown.length;
  const head = columns.map(c => { const on = c.key === sort; return `<th scope="col" aria-sort="${on ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" data-nt="sort" data-id="${esc(c.key)}" title="Sort by ${esc(c.label.toLowerCase())}">${esc(c.label)}${on ? `<span aria-hidden="true">${dir > 0 ? ' ▲' : ' ▼'}</span>` : ''}</button></th>`; }).join('');
  const body = shown.map(r => `<tr class="${r.id === sel ? 'sel' : ''}${r.errors ? ' has-error' : r.checks ? ' has-check' : ''}" data-nt-row="${esc(r.id)}" tabindex="0" aria-selected="${r.id === sel}">${columns.map(c => {
    const v = cell(r, c.key);
    if (c.key === 'ref') return `<th scope="row"><span class="nt-tref">${esc(v)}</span>${r.layer ? `<small class="nt-tlayer">${esc(layerNames[r.layer] || r.layer)}</small>` : ''}</th>`;
    if (c.key === 'checks') return `<td class="num${v ? ' warn' : ''}" title="${esc(r.checkTitles.join(' · '))}">${v ? `${v}${r.errors ? ` <small>${r.errors} to fix</small>` : ''}` : '<span class="nt-none">none</span>'}</td>`;
    if (c.key === 'links') return `<td class="num">${v}</td>`;
    if (c.key === 'details') return `<td><dl class="nt-table-fields">${r.extraFields.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${value === '' ? '<span class="nt-none">not recorded</span>' : esc(value)}</dd></div>`).join('')}</dl></td>`;
    if (REQUIREMENT_KEYS.has(c.key) && !r.req) return '<td></td>';
    if (c.key === 'group') return v === '' ? '<td><span class="nt-none">none</span></td>' : `<td${r.req.groups.length > GROUPS_SHOWN ? ` title="${esc(r.req.groups.join(', '))}"` : ''}>${esc(v)}</td>`;
    const label = c.key.startsWith('field:') ? r.fieldLabels?.[c.key.slice(6)] : '';
    return `<td${label ? ` title="${esc(label)}" aria-label="${esc(label + ': ' + (v === '' ? 'not recorded' : v))}"` : ''}>${v === '' ? '<span class="nt-none">not recorded</span>' : esc(v)}</td>`;
  }).join('')}</tr>`).join('');
  const total = T.rows.length;
  const status = `${all.length} of ${total} record${total === 1 ? '' : 's'}${T.additionalCount ? ` · ${T.registerCount} chapter records + ${T.additionalCount} review entries` : ''}${rest ? ` · first ${shown.length} shown` : ''}${hiddenByLayers ? ` · ${hiddenByLayers} hidden by layers` : ''}${filter ? ' · filtered' : ''}`;
  const more = rest ? `<div class="nt-tmore"><button type="button" class="cm-btn" data-nt="tmore">Show more</button><span>${shown.length} of ${all.length} shown · ${Math.min(TABLE_PAGE, rest)} more</span></div>` : '';
  return `<div class="nt-sheet-bar"><label class="nt-find nt-tfind"><span>Filter</span><input type="search" data-nt-field="tfilter" value="${esc(filter)}" placeholder="${T.types?.includes('requirement') ? 'reference, title, external id, domain or group' : 'reference, title or field'}" aria-label="Filter the records"></label><p class="nt-sheet-status" role="status">${esc(status)}</p>${hiddenColumns ? `<button type="button" class="cm-btn" data-nt="empty-columns" aria-pressed="${showEmpty}">${showEmpty ? 'Hide' : 'Show'} ${hiddenColumns} empty columns</button>` : ''}${hiddenByLayers ? '<button type="button" class="cm-btn" data-nt="layers-all">Show every layer</button>' : ''}</div>`
    + (total ? `<div class="nt-tcard"><div class="nt-table-wrap" tabindex="0" role="region" aria-label="Chapter ${esc(chapter)} records, scrolls sideways"><table class="nt-table nt-records"><caption class="cm-sr">Chapter ${esc(chapter)} records. Select a row to read it beside the table.</caption><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length}" class="nt-empty-row">No record matches${filter ? ' the filter' : ''}${hiddenByLayers ? ' with these layers' : ''}.</td></tr>`}</tbody></table></div><p class="nt-scroll-hint" aria-hidden="true">Scroll sideways for more columns →</p></div>${more}`
      : `<p class="nt-sheet-empty">Chapter ${esc(chapter)} records nothing yet. Its Work tab creates the first record.</p>`);
}
