// A bounded, read-only architecture branch. A scenario can change several recorded driver
// priorities/targets and the wording of directly linked constraints together. It reads each
// linked decision again (the decision reading, round 25) with all priority changes at once: the
// lead on the drivers before and after, how firmly it holds after, and what a hard constraint rules
// out; and applies the existing target checks to recorded support facts. The output is a review
// map, never a proposed edit, approval, product substitution, or prediction of a service level.
import {reasoningSource, driverChain, tuneDriver} from './design-reasoning.js';
import {readDecision, readingLines, READING_NOTE, WEIGHT} from './decision-reading.js';
import {driverPriority} from './quality-domain.js';
import {linkedRequirementIds} from './requirement-links.js';
import {decisionImplications} from './decision-impact.js';
import {CHAPTER_TITLES} from './chapter-names.js';
import {list, uniq, joinAnd} from './util.js';

export const WHATIF_LIMITS = Object.freeze({drivers: 4, constraints: 2});
const PRIORITIES = new Set(['High', 'Medium', 'Low']);
const plain = x => String(x ?? '').trim();
const title = x => x?.title || x?.question || x?.id || '';
const numeric = x => x !== '' && x != null && Number.isFinite(Number(x)) && Number(x) >= 0;

function normalize(p, scenario) {
  const requested = list(scenario?.drivers), premises = list(scenario?.constraints);
  if (requested.length > WHATIF_LIMITS.drivers || premises.length > WHATIF_LIMITS.constraints) throw Error('Compare at most four drivers and two constraints in one branch.');
  const D = new Map(list(p?.quality?.drivers).map(d => [d.id, d]));
  const C = new Map(list(p?.artefacts).filter(a => a.type === 'constraint').map(a => [a.id, a]));
  const seenD = new Set(), seenC = new Set(), drivers = [], constraints = [];
  for (const row of requested) {
    const id = plain(row?.id), d = D.get(id);
    if (!d || seenD.has(id)) throw Error('Choose each existing driver once.');
    seenD.add(id);
    const priority = row.priority == null || row.priority === '' ? driverPriority(d) : plain(row.priority);
    if (!PRIORITIES.has(priority)) throw Error('Use High, Medium, or Low for ' + id + '.');
    const targetValue = row.targetValue == null || row.targetValue === '' ? plain(d.targetValue) : plain(row.targetValue);
    const movedTarget = targetValue !== plain(d.targetValue);
    if (movedTarget && (!numeric(targetValue) || !numeric(plain(d.targetValue)))) throw Error(id + ' needs a recorded numeric target and a proposed non-negative numeric target for comparison.');
    if (priority !== driverPriority(d) || movedTarget) drivers.push({id, priority, targetValue, beforePriority: driverPriority(d), beforeTarget: plain(d.targetValue), targetConfirmed: !!d.targetConfirmed, unit: d.unit || ''});
  }
  for (const row of premises) {
    const id = plain(row?.id), c = C.get(id);
    if (!c || seenC.has(id)) throw Error('Choose each existing constraint once.');
    seenC.add(id);
    const description = plain(row.description);
    if (description.length > 4000) throw Error(id + ' is too long to compare.');
    if (description && description !== plain(c.description)) constraints.push({id, title: title(c), before: plain(c.description), after: description, sourceConfirmed: !!c.confirmed});
  }
  if (!drivers.length && !constraints.length) throw Error('Change at least one priority, target, or constraint statement to preview a branch.');
  return {drivers, constraints};
}

export function compareArchitectureScenario(p, scenario) {
  const branch = normalize(p, scenario), R = reasoningSource(p), changedPriorities = Object.fromEntries(branch.drivers.map(d => [d.id, d.priority]));
  const changedDrivers = new Set(branch.drivers.map(d => d.id)), affectedDrivers = new Set(changedDrivers);
  const affectedRequirements = new Set(), constraintLinks = [], warnings = [];
  const linked = id => uniq(list(p?.relationships).filter(e => (e.from === id || e.to === id)).map(e => e.from === id ? e.to : e.from).filter(k => p.artefacts.some(a => a.id === k && a.type === 'requirement')));
  for (const c of branch.constraints) {
    const requirements = linked(c.id); constraintLinks.push({id: c.id, requirements});
    if (!requirements.length) warnings.push(`${c.id} has no directly linked requirement. Trace the changed premise manually before accepting a design decision.`);
    requirements.forEach(id => affectedRequirements.add(id));
  }
  for (const d of R.drivers) if (linkedRequirementIds(p, d).some(id => affectedRequirements.has(id))) affectedDrivers.add(d.id);
  const impactedDecisions = new Set(), decisions = [];
  for (const d of R.decisions) {
    const viaDriver = list(d.driverIds).filter(id => affectedDrivers.has(id));
    const viaRequirement = list(d.requirementIds).filter(id => affectedRequirements.has(id));
    if (!viaDriver.length && !viaRequirement.length) continue;
    impactedDecisions.add(d.id);
    // The decision reading before and with the branch's priorities (round 25): an alternative a hard constraint rules out
    // keeps its arithmetic in the rows and takes no part in the lead.
    const before = readDecision(p, d), after = readDecision(p, d, {priorities: changedPriorities});
    const gaps = list(d.alternatives).flatMap(a => list(d.driverIds).filter(id => {
      const row = a.assessments?.[id]; return !row || row.effect === 'unknown' || !plain(row.reason) || !plain(row.evidence);
    }).map(id => `${a.id} / ${id}`));
    const rowScores = after.rows.map(row => ({id: row.alt.id, title: row.alt.title, before: before.rows.find(r => r.alt.id === row.alt.id)?.score ?? null, after: row.score, out: row.out, breaks: row.breaks}));
    // The lead before and with the branch (a tie names the tied), and how firmly the lead holds with it, in the reading's
    // own sentence (readingLines), alternatives named by title. Read, never saved; the working choice is unchanged.
    const firm = readingLines(after, {alt: x => list(d.alternatives).find(a => a.id === x)?.title || x}).find(l => l.kind === 'firmness');
    decisions.push({id: d.id, title: d.question, selected: d.selectedAlternativeId || null, beforeLead: before.lead, afterLead: after.lead, beforeTied: before.tied, afterTied: after.tied, changedLean: before.lead !== after.lead, afterFirmness: after.firmness?.level ?? null, afterFirmnessText: firm?.text || null, viaDriver, viaRequirement, scores: rowScores, evidenceGaps: gaps, provisional: !!gaps.length, status: d.status || 'draft'});
  }
  decisions.sort((a, b) => Number(b.changedLean) - Number(a.changedLean) || a.id.localeCompare(b.id));

  const impacts = new Map();
  const add = (chapter, record, why, by, override = {}) => {
    if (!record?.id || !CHAPTER_TITLES[chapter]) return;
    const key = chapter + ':' + record.id, found = impacts.get(key);
    if (found) { if (!found.reasons.includes(why)) found.reasons.push(why); if (by && !found.sources.includes(by)) found.sources.push(by); return; }
    impacts.set(key, {chapter, chapterTitle: CHAPTER_TITLES[chapter], id: record.id, ref: record.ref || record.id, title: title(record), reasons: [why], sources: by ? [by] : [], ...override});
  };
  const artefacts = new Map(list(p?.artefacts).map(a => [a.id, a]));
  for (const c of branch.constraints) {
    add(1, artefacts.get(c.id), 'Hypothetical constraint wording; no downstream design value is inferred from its text.', c.id);
    for (const id of constraintLinks.find(x => x.id === c.id).requirements) add(1, artefacts.get(id), 'Directly linked to the changed constraint; review its acceptance and scope.', c.id);
  }
  const touched = new Set();
  for (const id of affectedDrivers) {
    const chain = driverChain(R, id); if (!chain) continue;
    const direct = changedDrivers.has(id), why = direct ? 'Its priority or target changes in the branch.' : 'A changed constraint directly links to one of its requirements.';
    add(2, chain.driver, why, id);
    for (const r of chain.requirements) add(1, r, 'The driver cites this requirement; recheck its scenario and acceptance.', id);
    for (const r of chain.responsibilities) add(4, r, 'Carries the affected driver; review its boundary and obligations.', id);
    for (const r of chain.components) { add(5, r, 'Realizes a responsibility on the driver path; review its design.', id); touched.add(r.id); }
    for (const r of chain.capabilities) { add(6, r, 'Supports a component on the driver path; review capacity, isolation, or recovery as relevant.', id); touched.add(r.id); }
    for (const r of chain.realisations) { add(7, r.record, 'Implements a linked capability; selected product and version remain recorded, with suitability requiring review.', id, {product: r.product?.product || null, version: r.product?.version || null}); touched.add(r.record.id); }
    for (const r of chain.contracts) { add(8, r, 'Interface on the driver path; review timeout, delivery, and data obligations.', id); touched.add(r.id); }
    for (const r of chain.plans) { add(10, r.plan, 'Operating plan on the driver path; recheck recorded placement and recovery facts.', id); touched.add(r.plan.id); }
  }
  for (const d of decisions) {
    const record = R.decisions.find(x => x.id === d.id);
    add(3, record, d.changedLean ? 'The combined priority changes alter which alternative leads on the drivers; the working choice is unchanged.' : 'Linked to a changed input; inspect the recorded alternatives and their evidence.', d.id);
    const implication = decisionImplications(p, d.id);
    for (const item of [...(implication?.upstream || []), ...(implication?.downstream || [])]) {
      add(item.chapter, item, 'Recorded decision trace: ' + item.why, d.id);
      if (item.chapter >= 5) touched.add(item.id);
    }
  }
  for (const r of list(p?.interfaces?.data).filter(x => touched.has(x.authorityId))) add(8, r, 'Authoritative data sits on an affected support path; confirm its ownership and contract.', r.authorityId);
  for (const r of list(p?.security?.controls).filter(x => list(x.targetIds).some(id => touched.has(id)))) add(9, r, 'Control targets an affected asset; review coverage and evidence.', list(r.targetIds).find(id => touched.has(id)));
  for (const r of list(p?.runtime?.plans).filter(x => touched.has(x.assetId))) add(10, r, 'Operating plan belongs to an affected asset; recheck placement, recovery, and monitoring.', r.assetId);

  const measured = branch.drivers.filter(d => d.targetValue !== d.beforeTarget).map(d => {
    const t = tuneDriver(R, d.id, {targetValue: d.targetValue});
    const checks = list(t?.effects).filter(x => ['plan', 'capability', 'path', 'product'].includes(x.kind)).map(x => ({chapter: x.chapter, id: x.id, ref: x.ref, title: x.title, was: x.was, state: x.state, why: x.why}));
    return {id: d.id, before: d.beforeTarget, after: d.targetValue, unit: d.unit, confirmed: d.targetConfirmed, method: t?.budget?.text || '', beforeBudget: t?.budget?.before ?? null, afterBudget: t?.budget?.after ?? null, budgetUnit: t?.budget?.unit || null, checks};
  });
  for (const t of measured) for (const x of t.checks) if (impacts.has(x.chapter + ':' + x.id)) impacts.get(x.chapter + ':' + x.id).targetCheck = [...(impacts.get(x.chapter + ':' + x.id).targetCheck || []), {driver: t.id, was: x.was, state: x.state, why: x.why}];
  const records = [...impacts.values()].sort((a, b) => a.chapter - b.chapter || a.ref.localeCompare(b.ref));
  const method = `Ordinal decision reading: High ×${WEIGHT.High}, Medium ×${WEIGHT.Medium}, Low ×${WEIGHT.Low}; supports +1, tension −1, neutral or unknown 0; an alternative that breaks a hard constraint takes no part in the lead. Unknown or unsupported assessments are flagged, not treated as evidence. ${READING_NOTE} The lead on the drivers is not an architecture approval. Target checks use only recorded facts and the existing Chapter 2 methods; neither a changed constraint nor a priority supplies a measured capacity, cost, availability, or product outcome.`;
  return {branch, decisions, measured, records, warnings, method, changedDecisionCount: decisions.filter(x => x.changedLean).length, affectedChapters: uniq(records.map(x => x.chapter)), approval: 'Read-only scenario. No project records, working choices, SDD sections, or approvals were changed.'};
}

// The UI is loaded only when an architect opens Explore changes; the normal chapter route
// keeps its model and trade-off map light. Browser-only dependencies are passed by the caller.
export function openArchitectureWhatif({root, project, selectedDriver = '', drivers, esc, projectURL}) {
  let whatifResult = null, whatifShown = 0;
  const dialog = root.querySelector('.dx-whatif');
  dialog._whDispose?.();
  const controller = new AbortController();
  dialog._whDispose = () => controller.abort();
// A temporary branch of the project's recorded design. Its controls and results live in the
// Chapter 3 model, but never issue a store command or change the selected alternative.
const whOption = (id, label, selected = false) => `<option value="${esc(id)}" ${selected ? 'selected' : ''}>${esc(label)}</option>`;
function whatifDriverRow(selected = '') {
  const opts = drivers.map(d => whOption(d.id, `${d.id} · ${d.title} (${d.priority || 'priority open'})`, d.id === selected)).join('');
  return `<div class="dx-wh-row" data-wh-driver><label>Quality driver<select data-wh-id>${whOption('', 'Choose a driver', !selected)}${opts}</select></label><label>Priority<select data-wh-priority>${whOption('', 'Use recorded priority', true)}${['High', 'Medium', 'Low'].map(k => whOption(k, k)).join('')}</select></label><label>Target<input data-wh-target type="number" min="0" step="any" inputmode="decimal" placeholder="Use recorded target"></label><button type="button" class="cm-btn icon" data-dx="whatif-remove" aria-label="Remove driver row" title="Remove driver">×</button></div>`;
}
function whatifConstraintRow() {
  const opts = project().artefacts.filter(a => a.type === 'constraint').map(a => whOption(a.id, `${a.id} · ${a.title}`)).join('');
  return `<div class="dx-wh-row constraint" data-wh-constraint><label>Recorded constraint<select data-wh-id>${whOption('', 'Choose a constraint', true)}${opts}</select></label><label>Changed premise<textarea data-wh-description rows="2" maxlength="4000" placeholder="State the hypothetical constraint"></textarea></label><button type="button" class="cm-btn icon" data-dx="whatif-remove" aria-label="Remove constraint row" title="Remove constraint">×</button></div>`;
}
function openWhatif() {
  const dialog = root.querySelector('.dx-whatif');
  const focused = selectedDriver || '';
  whatifResult = null; whatifShown = 0;
  dialog.innerHTML = `<div class="dx-wh-head"><div><small>Chapter 3 · architecture branch</small><h2 id="dx-whatif-title">Explore changes</h2><p>Change several drivers or constraints together, then inspect the recorded design paths that need review. This comparison does not save or approve anything.</p></div><button type="button" class="cm-btn icon" data-dx="whatif-close" aria-label="Close comparison">×</button></div>
    <div class="dx-wh-form"><section><div class="dx-wh-label"><h3>Quality drivers</h3><button type="button" class="cm-btn" data-dx="whatif-add-driver">Add driver</button></div><p>Set a new priority, target, or both. Targets keep their recorded unit and measurement basis.</p><div data-wh-drivers>${whatifDriverRow(focused)}</div></section>
    <section><div class="dx-wh-label"><h3>Constraints</h3><button type="button" class="cm-btn" data-dx="whatif-add-constraint">Add constraint</button></div><p>Changed wording follows direct recorded requirement links. Its effect cannot be calculated from text alone.</p><div data-wh-constraints></div></section>
    <div class="dx-wh-actions"><button type="button" class="cm-btn primary" data-dx="whatif-compare">Compare branch</button><span>Up to ${WHATIF_LIMITS.drivers} drivers and ${WHATIF_LIMITS.constraints} constraints · working choices stay as recorded</span></div></div><p class="dx-wh-announcement" data-wh-status role="status" aria-live="polite"></p><div data-wh-result></div>`;
  dialog.showModal(); dialog.querySelector('[data-wh-id]')?.focus();
}
function scenarioFromDialog(dialog) {
  const drivers = [...dialog.querySelectorAll('[data-wh-driver]')].map(r => ({id: r.querySelector('[data-wh-id]').value, priority: r.querySelector('[data-wh-priority]').value, targetValue: r.querySelector('[data-wh-target]').value})).filter(r => r.id);
  const constraints = [...dialog.querySelectorAll('[data-wh-constraint]')].map(r => ({id: r.querySelector('[data-wh-id]').value, description: r.querySelector('[data-wh-description]').value})).filter(r => r.id);
  return {drivers, constraints};
}
const whAlt = (d, id) => d.scores.find(x => x.id === id)?.title || id;
// The lead on the drivers, in the reading's words: the alternative that leads, a tie of the tied, or none.
const whLead = (d, id, tied) => id ? whAlt(d, id) : tied?.length ? 'a tie of ' + joinAnd(tied.map(t => whAlt(d, t))) : 'no single alternative';
function whDecision(d) {
  const rows = d.scores.map(r => `<tr${r.out ? ' class="out"' : ''}><th scope="row">${esc(r.title)} <small>${esc(r.id)}${r.out ? ' · ruled out' : ''}</small></th><td>${r.before ?? '—'}</td><td>${r.after}</td></tr>`).join(''), out = d.scores.filter(r => r.out);
  return `<article class="dx-wh-decision ${d.changedLean ? 'changed' : ''}"><div class="dx-wh-decision-title"><a href="${esc(projectURL('/?chapter=3&tab=model&decision=' + encodeURIComponent(d.id)))}">${esc(d.id)} · ${esc(d.title)}</a><span>${d.changedLean ? 'The lead on the drivers changes' : 'Review linked choice'}</span></div><p><b>Leads on the drivers:</b> ${esc(whLead(d, d.beforeLead, d.beforeTied))} → ${esc(whLead(d, d.afterLead, d.afterTied))}. <b>Working choice:</b> ${esc(d.selected ? whAlt(d, d.selected) : 'None selected')} (unchanged).</p>${d.afterFirmnessText ? `<p><b>With the branch:</b> ${esc(d.afterFirmnessText)}</p>` : ''}${out.length ? `<p class="dx-wh-out"><b>Ruled out, not ranked:</b> ${esc(out.map(r => `${r.title} breaks ${joinAnd(r.breaks)}, a hard constraint`).join('; '))}.</p>` : ''}<p class="dx-wh-note">${d.provisional ? `Provisional: ${d.evidenceGaps.length} alternative/driver assessment${d.evidenceGaps.length === 1 ? '' : 's'} lack a judged effect, reason, or evidence.` : 'Recorded assessments have effect, reason, and evidence; the weights remain an ordinal reading.'}</p><details><summary>Arithmetic and trace</summary><table><thead><tr><th>Alternative</th><th>Recorded</th><th>Branch</th></tr></thead><tbody>${rows}</tbody></table><p>Linked via ${esc([...d.viaDriver, ...d.viaRequirement].join(', '))}.${d.evidenceGaps.length ? ' Open evidence: ' + esc(d.evidenceGaps.slice(0, 12).join(', ')) + (d.evidenceGaps.length > 12 ? ` and ${d.evidenceGaps.length - 12} more` : '') : ''}</p></details></article>`;
}
function whRecordLink(x) {
  const query = x.chapter === 1 ? `/?chapter=1&tab=work&artefact=${encodeURIComponent(x.id)}` : x.chapter === 2 ? `/?chapter=2&tab=model&driver=${encodeURIComponent(x.id)}` : x.chapter === 3 ? `/?chapter=3&tab=model&decision=${encodeURIComponent(x.id)}` : `/?chapter=${x.chapter}&tab=model&object=${encodeURIComponent(x.id)}`;
  return `<article class="dx-wh-record"><a href="${esc(projectURL(query))}">${esc(x.ref)} · ${esc(x.title)}</a>${x.product ? `<small>Recorded product: ${esc(x.product)} ${esc(x.version || '')} · suitability requires review</small>` : ''}<p>${esc(x.reasons.join(' '))}</p>${x.targetCheck?.length ? `<p class="dx-wh-check">${x.targetCheck.map(t => `${t.driver}: ${t.state} — ${t.why}`).map(esc).join('<br>')}</p>` : ''}<small>Through ${esc(x.sources.join(', '))}</small></article>`;
}
function whatifHTML(result) {
  const {branch, decisions, measured, records, warnings, affectedChapters, changedDecisionCount} = result;
  whatifShown = Math.min(20, decisions.length);
  const byChapter = affectedChapters.map(n => ({n, rows: records.filter(x => x.chapter === n)}));
  return `<section class="dx-wh-results"><header><small>Temporary comparison · ${branch.drivers.length} driver${branch.drivers.length === 1 ? '' : 's'} · ${branch.constraints.length} constraint${branch.constraints.length === 1 ? '' : 's'}</small><h3>${changedDecisionCount} lead${changedDecisionCount === 1 ? '' : 's'} on the drivers change${changedDecisionCount === 1 ? 's' : ''} · ${records.length} linked records for review</h3><p>${esc(result.approval)} ${esc(READING_NOTE)}</p></header>
    ${warnings.map(w => `<p class="dx-wh-warning">${esc(w)}</p>`).join('')}
    <section><h4>Changed inputs</h4>${branch.drivers.map(d => `<p><b>${esc(d.id)}</b> · ${esc(d.beforePriority)} → ${esc(d.priority)}; ${esc(d.beforeTarget)} → ${esc(d.targetValue)} ${esc(d.unit)}${d.targetConfirmed ? '' : ' · original target unconfirmed'}</p>`).join('')}${branch.constraints.map(c => `<details><summary>${esc(c.id)} · ${esc(c.title)} · hypothetical wording</summary><p><b>Recorded:</b> ${esc(c.before)}</p><p><b>Branch:</b> ${esc(c.after)}</p></details>`).join('')}</section>
    <section data-wh-decisions><h4>Decision reading <span>${decisions.length}</span></h4><div data-wh-decision-list>${decisions.slice(0, whatifShown).map(whDecision).join('') || '<p>No recorded decision is connected to these inputs. Trace the missing link before relying on this branch.</p>'}</div>${decisions.length > whatifShown ? '<button type="button" class="cm-btn" data-dx="whatif-more-decisions">Show 20 more decisions</button>' : ''}</section>
    ${measured.length ? `<section><h4>Recorded target checks</h4>${measured.map(t => `<details><summary>${esc(t.id)} · ${esc(t.before)} → ${esc(t.after)} ${esc(t.unit)} · ${t.checks.length} checks</summary><p>${esc(t.method)}</p>${t.beforeBudget != null && t.afterBudget != null ? `<p>Method output: ${esc(t.beforeBudget)} → ${esc(t.afterBudget)} ${esc(t.budgetUnit || '')}. ${t.confirmed ? 'Original target recorded as confirmed.' : 'Original target is unconfirmed.'}</p>` : ''}<ul>${t.checks.map(x => `<li><b>${esc(x.ref || x.id)} · ${esc(x.state)}</b> — ${esc(x.why)}</li>`).join('') || '<li>No comparable support facts are recorded on this driver path.</li>'}</ul></details>`).join('')}</section>` : ''}
    <section><h4>Connected review paths <span>${records.length}</span></h4><p>Open a chapter to inspect its records. These are obligations to inspect, not simulated changes to the objects.</p>${byChapter.map(g => `<details data-wh-chapter="${g.n}"><summary>Chapter ${g.n} · ${esc(g.rows[0].chapterTitle)} <span>${g.rows.length}</span></summary><div data-wh-list></div></details>`).join('')}</section>
    <details class="dx-wh-method"><summary>Method and limits</summary><p>${esc(result.method)}</p><p>Constraint propagation follows direct requirement links, then recorded driver/decision paths. Unlinked records and operational outcomes remain unknown. The selected alternatives and products are never silently replaced.</p></details></section>`;
}
function loadWhatifChapter(details, more = false) {
  if (!whatifResult) return;
  const rows = whatifResult.records.filter(x => x.chapter === Number(details.dataset.whChapter)), host = details.querySelector('[data-wh-list]');
  const shown = more ? Number(details.dataset.whShown || 0) + 40 : 40;
  details.dataset.whShown = String(Math.min(shown, rows.length));
  host.innerHTML = rows.slice(0, shown).map(whRecordLink).join('') + (rows.length > shown ? `<button type="button" class="cm-btn" data-dx="whatif-more-records">Show 40 more · ${rows.length - shown} remaining</button>` : '');
}

  dialog.addEventListener('click', e => {
    const wh = e.target.closest('[data-dx]');
    if (!wh) return;
    e.stopPropagation();
    const k = wh.dataset.dx;
    if (k === 'whatif-close') { dialog.close(); return; }
    if (k === 'whatif-remove') { wh.closest('[data-wh-driver],[data-wh-constraint]')?.remove(); return; }
    if (k === 'whatif-add-driver') { if (dialog.querySelectorAll('[data-wh-driver]').length < WHATIF_LIMITS.drivers) dialog.querySelector('[data-wh-drivers]').insertAdjacentHTML('beforeend', whatifDriverRow()); return; }
    if (k === 'whatif-add-constraint') { if (dialog.querySelectorAll('[data-wh-constraint]').length < WHATIF_LIMITS.constraints) dialog.querySelector('[data-wh-constraints]').insertAdjacentHTML('beforeend', whatifConstraintRow()); return; }
    if (k === 'whatif-compare') { const box = dialog.querySelector('[data-wh-result]'), status = dialog.querySelector('[data-wh-status]'), source = project(); try { whatifResult = compareArchitectureScenario(source, scenarioFromDialog(dialog)); box.innerHTML = whatifHTML(whatifResult); status.textContent = `Comparison ready: ${whatifResult.changedDecisionCount} of the leads on the drivers change, ${whatifResult.records.length} linked records to review.`; const heading = box.querySelector('h3'); heading.tabIndex = -1; heading.focus(); } catch (error) { whatifResult = null; box.innerHTML = `<p class="dx-wh-warning">${esc(error.message)}</p>`; status.textContent = error.message; } return; }
    if (k === 'whatif-more-records') { loadWhatifChapter(wh.closest('[data-wh-chapter]'), true); return; }
    if (k === 'whatif-more-decisions' && whatifResult) { whatifShown = Math.min(whatifShown + 20, whatifResult.decisions.length); dialog.querySelector('[data-wh-decision-list]').innerHTML = whatifResult.decisions.slice(0, whatifShown).map(whDecision).join(''); if (whatifShown === whatifResult.decisions.length) wh.remove(); }
  }, {signal: controller.signal});
  dialog.addEventListener('toggle', e => { if (e.target.matches?.('[data-wh-chapter]') && e.target.open && !e.target.dataset.whShown) loadWhatifChapter(e.target); }, {capture: true, signal: controller.signal});
  openWhatif();
}
