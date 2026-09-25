// The product choice, drawn: options against the criteria with recorded and suggested judgements,
// the weighing, the sensitivity points and the switch point; and recording suggestions as Chapter
// 7's own assessments. Shared by Chapter 7's options view and the review desk.
import {describeChoice, suggestionCommands} from './product-choice.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const SYM = {supports: '✓', tension: '⚠', neutral: '·', unknown: '?'};
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

export function choiceSummaryHTML(C) {
  if (!C) return '';
  const name = id => C.options.find(o => o.option.id === id)?.option.product || id;
  const cl = C.ceiling;
  return `<p>${esc(describeChoice(C))}</p>${cl ? `<p class="ch-ceil ${cl.passed ? 'past' : ''}"><b>${esc(cl.what)}.</b> ${esc(cl.passed ? `At ${cl.demand.toLocaleString('en-GB', {maximumFractionDigits: 0})} ${cl.unitName} the objective is past the ${cl.limit.toLocaleString('en-GB')} a second assumed for ${cl.label} (planned at the desk's utilisation). ${cl.advice}` : `It holds to ${cl.holdsText} on the ${cl.limit.toLocaleString('en-GB')} ${cl.unitName} assumed for ${cl.label}; past that: ${cl.advice[0].toLowerCase() + cl.advice.slice(1)}`)} <a href="${esc(cl.src)}" target="_blank" rel="noopener noreferrer">Documented</a></p>` : ''}${C.sens.length ? `<p class="cm-muted">Sensitivity: ${esc(C.sens.map(s => `${s.driver} at ${s.to} would ${s.lean ? 'tip the lean to ' + name(s.lean) : 'leave no lean'}`).join('; '))}.</p>` : ''}`;
}

export function choiceTableHTML(C) {
  if (!C) return '';
  const head = C.options.map(o => `<th class="${o.reading ? 'reading' : ''}${C.leanAll === o.option.id ? ' lean' : ''}"><b>${esc(o.option.product || o.option.title)}</b><small>${esc(o.option.id)}${o.reading ? ' · in the design' : ''}${C.leanAll === o.option.id ? ' · ★ lean' : ''}</small></th>`).join('');
  const rows = C.criteria.map((c, i) => `<tr class="${c.kind}"><th title="${esc(c.detail || '')}"><b>${esc(c.kind === 'driver' ? c.id : c.title)}</b><small>${esc(c.kind === 'driver' ? c.title : c.kind === 'objective' ? c.detail : '')}${c.weight ? ` · ×${c.weight}` : ' · not weighed'}</small></th>${C.options.map(o => { const x = o.cells[i], why = x.recorded ? x.recorded.reason : x.suggested?.reasons.map(r => r.text + ' (' + r.src + ')').join(' ') || ''; return `<td class="${x.effect} ${x.source}${x.suggested?.weak ? ' weak' : ''}"${why ? ` title="${esc(why)}"` : ''}><i>${SYM[x.effect] || '?'}</i>${x.source === 'suggested' ? `<small>${x.suggested.weak ? 'named · not weighed' : 'suggested'}</small>` : x.source === 'recorded' ? '<small>recorded</small>' : ''}</td>`; }).join('')}</tr>`).join('');
  const foot = `<tr class="sum"><th><b>As the drivers weigh them</b><small>priority × effect</small></th>${C.options.map(o => `<td class="${C.leanAll === o.option.id ? 'lean' : ''}"><b>${signed(o.score)}</b><small>recorded ${signed(o.recordedScore)}</small></td>`).join('')}</tr>`;
  return `<table class="ch-table"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}${foot}</tbody></table><p class="cm-muted">${C.counts.recorded} recorded judgement${C.counts.recorded === 1 ? '' : 's'}; ${C.counts.suggested} suggested from what each product is documented to do — hover a cell for the mechanism and its source. A lean, not a choice.</p>`;
}

// Record suggestions as Chapter 7 assessments, each through Chapter 7's own command.
export function recordSuggestions(C, {onDone} = {}) {
  const store = window.aiwProjectStore, all = suggestionCommands(C);
  if (!all.length) return;
  document.querySelector('.ch-dialog')?.remove();
  const d = document.createElement('dialog'); d.className = 'l-dialog dk-dialog ch-dialog'; d.setAttribute('aria-labelledby', 'ch-dialog-title');
  d.innerHTML = `<header><div><span class="eyebrow">Chapter 7 · ${esc(C.record.ref)}</span><h2 id="ch-dialog-title">Record suggested judgements</h2></div><button type="button" class="btn" data-ch-close aria-label="Close">×</button></header><div class="l-error ch-err" role="alert" hidden></div>
   <form class="dk-form"><p>Each becomes a Chapter 7 judgement of the option against the criterion, with the documented mechanism as its reason and the documentation as its evidence. Leave out any that do not hold for this design.</p>
   <fieldset class="dk-items">${all.map((x, i) => `<label class="l-checkbox"><input type="checkbox" name="s" value="${i}" ${x.weak ? '' : 'checked'}><span><b>${esc(x.option.product)} · ${esc(x.crit.kind === 'driver' ? x.crit.id + ' ' + x.crit.title : x.crit.title)} — ${x.effect === 'supports' ? 'supports' : 'creates a trade-off'}${x.weak ? ' (named by the playbook only)' : ''}</b><small>${esc(x.reason)}</small><small>${esc(x.evidence)}</small></span></label>`).join('')}</fieldset>
   <label class="l-checkbox"><input type="checkbox" name="reviewed" required> I have read each reason and it holds for this design.</label>
   <div class="l-dialog-actions"><button type="button" class="btn" data-ch-close>Cancel</button><button type="submit" class="btn primary">Record them</button></div></form>`;
  document.body.append(d);
  d.addEventListener('click', e => { if (e.target.closest('[data-ch-close]')) { e.preventDefault(); d.close(); } });
  d.addEventListener('close', () => d.remove());
  d.showModal();
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
    d.close();
    document.dispatchEvent(new CustomEvent('aiw:external-project'));
    onDone?.(n);
  });
}
