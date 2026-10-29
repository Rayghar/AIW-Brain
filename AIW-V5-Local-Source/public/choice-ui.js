// The product choice, drawn: options against the criteria with recorded and suggested judgements,
// the weighing, the sensitivity points and the switch point; and recording suggestions as Chapter
// 7's own assessments. Shared by Chapter 7's options view and the review desk.
import {describeChoice, suggestionCommands} from './product-choice.js';
// The decision reading's note (round 25): the totals are arithmetic on the judgements; they do not choose.
import {READING_NOTE, signed} from './decision-reading.js';
import {esc,safeUrl} from './html-escape.js';
import {formatNumber} from './format.js';
import {openDialog,closeDialog} from './dialog.js';

const SYM = {supports: '✓', tension: '⚠', violates: '×', neutral: '·', unknown: '?'};

export function choiceSummaryHTML(C) {
  if (!C) return '';
  const name = id => C.options.find(o => o.option.id === id)?.option.product || id;
  const cl = C.ceiling;
  return `<p>${esc(describeChoice(C))}</p>${cl ? `<p class="ch-ceil ${cl.passed ? 'past' : ''}"><b>${esc(cl.what)}.</b> ${esc(cl.passed ? `At ${formatNumber(cl.demand, {maximumFractionDigits: 0})} ${cl.unitName} the objective is past the ${formatNumber(cl.limit)} a second assumed for ${cl.label} (planned at the desk's utilisation). ${cl.advice}` : `It holds to ${cl.holdsText} on the ${formatNumber(cl.limit)} ${cl.unitName} assumed for ${cl.label}; past that: ${cl.advice[0].toLowerCase() + cl.advice.slice(1)}`)} <a href="${esc(safeUrl(cl.src))}" target="_blank" rel="noopener noreferrer">Documented</a></p>` : ''}${C.sens.length ? `<p class="cm-muted">Sensitivity: ${esc(C.sens.map(s => `${s.driver} at ${s.to} would ${s.lean ? 'tip the lean to ' + name(s.lean) : 'leave no lean'}`).join('; '))}.</p>` : ''}`;
}

export function choiceTableHTML(C) {
  if (!C) return '';
  const excluded = o => o.applicability?.state === 'excluded';
  const leaning = o => !excluded(o) && C.leanAll === o.option.id;
  const head = C.options.map(o => `<th class="${o.reading ? 'reading' : ''}${leaning(o) ? ' lean' : ''}${excluded(o) ? ' excluded' : ''}"><b>${esc(o.option.product || o.option.title)}</b><small>${esc(o.option.id)}${o.reading ? ' · in the design' : ''}${leaning(o) ? ' · ★ provisional lean' : ''}</small>${excluded(o) ? `<small>Excluded · ${esc(o.applicability.breaks.join(', '))}</small>` : o.applicability?.unknown?.length ? `<small>Hard constraints need review · ${esc(o.applicability.unknown.join(', '))}</small>` : ''}</th>`).join('');
  const rows = C.criteria.map((c, i) => `<tr class="${esc(c.kind)}"><th title="${esc(c.detail || '')}"><b>${esc(c.kind === 'driver' ? c.id : c.title)}</b><small>${esc(c.kind === 'driver' ? c.title : c.kind === 'objective' ? c.detail : '')}${c.hard ? ' · hard constraint' : c.weight ? ` · ×${c.weight}` : ' · not weighed'}</small></th>${C.options.map(o => {
    const x = o.cells[i], previous = x.previousAssessment;
    const why = x.stale ? ['Previous judgement: ' + (previous?.effect || 'unknown'), previous?.reason, previous?.evidence, previous?.reviewRequired || 'The recorded basis or its supporting knowledge changed.'].filter(Boolean).join(' · ') : x.recorded ? [x.recorded.reason, x.recorded.evidence].filter(Boolean).join(' · ') : x.suggested?.reasons.map(r => r.text + ' (' + r.src + ')').join(' ') || '';
    if (c.kind === 'obligation') return `<td class="unknown obligation" title="${esc([c.detail, why].filter(Boolean).join(' · '))}"><span>Verification pending</span><small>Implementation obligation · not weighed${x.stale ? ' · judgement needs review' : ''}</small></td>`;
    if (x.stale) return `<td class="unknown stale" title="${esc(why)}"><i>?</i><small>Needs re-review</small><small>Previous: ${esc(previous?.effect || 'unknown')}</small></td>`;
    return `<td class="${esc(x.effect)} ${esc(x.source)}${x.suggested?.weak ? ' weak' : ''}"${why ? ` title="${esc(why)}"` : ''}><i>${SYM[x.effect] || '?'}</i>${x.source === 'suggested' ? `<small>${x.suggested.weak ? 'named · not weighed' : 'suggested · declared context'}</small>` : x.source === 'recorded' ? '<small>recorded judgement</small>' : x.suggested?.applicability === 'excluded' ? '<small>Mechanism conditions conflict</small>' : '<small>Needs evidence</small>'}</td>`;
  }).join('')}</tr>`).join('');
  // Round 25 (D-25-11): on the recorded judgements alone, the range the unjudged criteria could move a total to, and the
  // option another dominates (at least as good on every criterion and better on one, whatever the unjudged turn out to be).
  const named = id => { const o = C.options.find(x => x.option.id === id)?.option; return o?.product || o?.title || id; };
  const foot = `<tr class="sum"><th><b>As the drivers weigh them</b><small>priority × effect</small></th>${C.options.map(o => `<td class="${leaning(o) ? 'lean' : ''}${!excluded(o) && o.dominatedBy ? ' dom' : ''}">${excluded(o) ? '<b>Outside preference ranking</b><small>Resolve the hard constraint before selecting.</small>' : `<b>${signed(o.score)}</b><small>recorded ${signed(o.recordedScore)}${o.bounds && o.bounds.low !== o.bounds.high ? `, between ${signed(o.bounds.low)} and ${signed(o.bounds.high)} once every criterion is judged` : ''}</small>${o.dominatedBy ? `<small class="ch-dom">Dominated by ${esc(named(o.dominatedBy))}: at least as good on every criterion and better on one</small>` : ''}`}</td>`).join('')}</tr>`;
  return `<table class="ch-table"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}${foot}</tbody></table><p class="cm-muted">${C.counts.recorded} recorded judgement${C.counts.recorded === 1 ? '' : 's'}; ${C.counts.suggested} suggested from documented mechanisms in the declared context${C.counts.stale ? '; ' + C.counts.stale + ' need re-review' : ''}. Hover a cell for its reason and source. Suggestions fill only unjudged cells; changed judgements remain open for review. Excluded options cannot lead the comparison. Matching configuration conditions and recording judgements do not verify quality targets or implementation obligations. ${esc(READING_NOTE)}</p>`;
}

// Record suggestions as Chapter 7 assessments, each through Chapter 7's own command.
export function recordSuggestions(C, {onDone} = {}) {
  const store = window.aiwProjectStore, all = suggestionCommands(C);
  if (!all.length) return;
  const open = document.querySelector('.ch-dialog'); if (open) closeDialog(open, {restoreFocus: false});
  const d = openDialog({className: 'l-dialog dk-dialog ch-dialog', labelledBy: 'ch-dialog-title', closeSelector: '[data-ch-close]', html: `<header><div><span class="eyebrow">Chapter 7 · ${esc(C.record.ref)}</span><h2 id="ch-dialog-title">Record suggested judgements</h2></div><button type="button" class="btn" data-ch-close aria-label="Close">×</button></header><div class="l-error ch-err" role="alert" hidden></div>
   <form class="dk-form"><p>Each becomes a Chapter 7 judgement of the option against the criterion, with the documented mechanism as its reason and the documentation as its evidence. Leave out any that do not hold for this design.</p>
   <fieldset class="dk-items">${all.map((x, i) => `<label class="l-checkbox"><input type="checkbox" name="s" value="${i}" ${x.weak ? '' : 'checked'}><span><b>${esc(x.option.product)} · ${esc(x.crit.kind === 'driver' ? x.crit.id + ' ' + x.crit.title : x.crit.title)} — ${x.effect === 'supports' ? 'supports' : 'creates a trade-off'}${x.weak ? ' (named by the playbook only)' : ''}</b><small>${esc(x.reason)}</small><small>${esc(x.evidence)}</small></span></label>`).join('')}</fieldset>
   <label class="l-checkbox"><input type="checkbox" name="reviewed" required> I have read each reason and it holds for this design.</label>
   <div class="l-dialog-actions"><button type="button" class="btn" data-ch-close>Cancel</button><button type="submit" class="btn primary">Record them</button></div></form>`});
  d.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target), chosen = fd.getAll('s').map(Number).map(i => all[i]).filter(Boolean);
    const err = m => { const x = d.querySelector('.ch-err'); x.hidden = false; x.textContent = m; };
    if (!chosen.length) return err('Choose at least one judgement to record.');
    if (!store?.command) return err('Open the project to record judgements.');
    const btn = d.querySelector('button[type=submit]'); btn.disabled = true;
    let n = 0;
    try { for (const x of chosen) { await store.command(x.command); n++; } }
    catch (e2) { btn.disabled = false; return err(`${n} recorded; then: ${e2?.message || 'the change could not be saved'}.`); }
    closeDialog(d);
    document.dispatchEvent(new CustomEvent('aiw:external-project'));
    onDone?.(n);
  });
}
