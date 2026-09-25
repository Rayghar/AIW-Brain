// The specification of a selected part, and the anti-patterns that concern it, as companion-panel
// sections shared by the chapter models (Chapters 4 to 10). Reads recorded facts through
// design-spec.js; every row links to the chapter that records it.
import {reasoningFor, specFor, detectAntiPatterns, antiPatternsFor, runsOn} from './design-spec.js';
import {productLabel} from './design-reasoning.js';
import {projectURL} from './project-context.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const OP = {'At least': '≥', 'At most': '≤', Exactly: '='};
const found = new WeakMap();
export function antiPatterns(p) { if (!p) return []; if (!found.has(p)) found.set(p, detectAntiPatterns(reasoningFor(p))); return found.get(p); }
const go = (ch, id, label, kind = 'object') => `<a class="sp-a" href="${esc(projectURL(`/?chapter=${ch}&tab=model&${kind}=${encodeURIComponent(id)}`))}">${esc(label)}</a>`;
const tier = f => {
  if (!f.placements.length) return '<em class="miss">not placed</em>';
  const bits = [`${f.active} active${f.standby ? ' · ' + f.standby + ' standby' : ''}`, `${f.zonesAll.length} zone${f.zonesAll.length === 1 ? '' : 's'}`, f.stateMode === 'Unspecified' ? 'state not said' : f.stateMode.toLowerCase(), f.minReady != null && f.maxReplicas != null ? `${f.minReady}–${f.maxReplicas} replicas` : '', f.recoveryStrategy !== 'Unspecified' ? f.recoveryStrategy.toLowerCase() : '', f.recoveryMinutes != null ? `recovers in ${f.recoveryMinutes} min` : 'recovery time not recorded', f.lossMinutes != null ? `loses at most ${f.lossMinutes} min` : ''];
  return bits.filter(Boolean).map(esc).join(' · ');
};

// The "Specification" section for a part selected in any chapter model.
export function specPanelHTML(p, id) {
  if (!p || !id) return '';
  let S;
  try { S = specFor(reasoningFor(p), id); } catch { S = null; }
  if (!S) return '';
  const rows = [];
  if (S.responsibilities.length) rows.push(['Logical|Ch 4', S.responsibilities.map(r => go(4, r.id, r.ref + ' ' + r.title)).join('')]);
  if (S.components.length) rows.push(['Component|Ch 5', S.components.map(c => go(5, c.id, c.ref + ' ' + c.title + (c.kind ? ' · ' + c.kind : ''))).join('')]);
  if (S.capabilities.length) rows.push(['Platform|Ch 6', S.capabilities.map(c => go(6, c.id, c.ref + ' ' + c.title)).join('')]);
  if (S.products.length) rows.push(['Products|Ch 7', S.products.map(x => { const pr = x.product; const name = pr?.product ? productLabel(pr) : 'no product named'; const meta = pr?.product ? [/ · /.test(pr.version || '') ? pr.version : '', pr.vendor || 'vendor not recorded', pr.operatingModel, pr.selected ? 'chosen' : 'candidate'].filter(Boolean).join(' · ') : x.realisation.title; return `<span class="sp-prod${pr?.product ? '' : ' miss'}">${go(7, x.realisation.id, name)}<small>${esc(x.realisation.ref + ' · ' + meta)}${x.realisation.capacityValue !== '' && x.realisation.capacityValue != null ? esc(' · capacity ' + x.realisation.capacityValue + ' ' + (x.realisation.capacityUnit || '')) : ''}</small></span>`; }).join('')]);
  if (S.plans.length) rows.push(['Runtime|Ch 10', S.plans.map(f => `<span class="sp-run">${go(10, f.plan.id, f.plan.ref + ' ' + f.plan.title)}<small>${tier(f)}</small></span>`).join('')]);
  if (S.drivers.length) rows.push(['Must meet|Ch 2', S.drivers.map(d => `<a class="sp-a drv" href="${esc(projectURL('/?chapter=2&tab=model&driver=' + encodeURIComponent(d.id)))}" title="${esc(d.title)}">${esc(d.id)} <b>${esc((OP[d.operator] || d.operator) + ' ' + d.targetValue + ' ' + d.unit)}</b></a>`).join('')]);
  if (S.decisions.length) rows.push(['Decided by|Ch 3', S.decisions.map(d => go(3, d.id, d.id + (d.selectedAlternativeId ? ' · chosen' : ' · open'), 'decision')).join('')]);
  // What it is part of: itself, the components that realise it, and where it runs.
  const own = [S.kind === 'plan' ? S.id : id, ...(S.kind === 'responsibility' ? S.components.map(c => c.id) : []), ...S.plans.map(f => f.plan.id)];
  const aps = own.flatMap(x => antiPatternsFor(antiPatterns(p), x));
  const uniqAps = [...new Map(aps.map(a => [a.id, a])).values()];
  return `<section class="sp"><h4>Specification<span>${esc(S.ref)}</span></h4><p class="cm-muted">What realises it, from the logical responsibility to where it runs.</p><dl class="sp-dl">${rows.map(([k, v]) => `<div><dt>${esc(k.split('|')[0])}<small>${esc(k.split('|')[1])}</small></dt><dd>${v}</dd></div>`).join('')}</dl>${S.gaps.length ? `<details class="sp-gaps"><summary>${S.gaps.length} thing${S.gaps.length === 1 ? '' : 's'} not yet specified</summary><ul>${S.gaps.map(g => `<li>${esc(g)}</li>`).join('')}</ul></details>` : ''}</section>${uniqAps.length ? antiPatternHTML(uniqAps, 'Anti-patterns it is part of') : ''}`;
}

export function antiPatternHTML(list, title = 'Anti-patterns in the design') {
  if (!list.length) return '';
  return `<section class="sp-ap"><h4>${esc(title)}<span>${list.length}</span></h4>${list.map(a => `<div class="sp-apx ${esc(a.severity)}"><b>${esc(a.name)}</b><p>${esc(a.text)}</p>${a.ask ? `<small>Ask: ${esc(a.ask)}</small>` : ''}<span class="sp-objs">${a.objects.slice(0, 6).map(o => go(o.chapter, o.id, o.ref)).join('')}</span>${a.playbook ? `<small class="sp-pb" title="${esc(a.playbook.src)}">SA Playbook: “${esc(a.playbook.text)}”</small>` : ''}</div>`).join('')}<p class="cm-muted">Found in recorded facts and named as the pattern catalogue names them. Prompts for review, not verdicts.</p></section>`;
}

// A short product label for a runtime plan or component: what it runs on.
export function runsOnLabel(p, assetId) {
  try { const r = runsOn(reasoningFor(p), assetId); return r ? (r.via ? 'on ' : '') + r.label : ''; } catch { return ''; }
}
export function productLabels(p, componentId) {
  try {
    const R = reasoningFor(p), out = new Map();
    for (const m of (p.technology?.needs || []).filter(n => n.applicationId === componentId)) {
      const map = (p.technology.mappings || []).find(x => x.needId === m.id), cap = map && R.caps.get(map.capabilityId);
      if (!cap) continue;
      const rid = (p.technologyRealisation?.mappings || []).find(x => x.capabilityId === cap.id)?.realizationId, r = rid && R.reals.get(rid);
      const o = r && ((r.options || []).find(x => x.id === r.selectedOptionId) || (r.options || []).find(x => x.product));
      if (o?.product) out.set(cap.id, o.product);
    }
    return out;
  } catch { return new Map(); }
}
