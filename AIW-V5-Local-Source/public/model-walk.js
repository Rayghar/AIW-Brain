import {esc} from './html-escape.js';
// Tracks only stages actually rendered for the same saved model and scenario.
export function walkVisits() {
  let key = '', stages = new Set();
  return {see(identity, stage) { if (key !== identity) { key = identity; stages = new Set(); } if (Number.isInteger(stage) && stage >= 0 && stage < 4) stages.add(stage); return [...stages].sort(); }, clear() { key = ''; stages.clear(); }};
}
export function recordModelWalk({title, command, current, observations = false, onSaved}) {
  const dialog = document.createElement('dialog'); dialog.className = 'l-dialog cm-walk-review';
  dialog.innerHTML = `<form><h2>${esc(title)}</h2><p>Record this design walkthrough for the current model. It is a prediction from declared architecture, not a measured failure test or architecture approval.</p><p>Scenario duration: ${esc(command.payload.durationMinutes)} minutes (an explicit modelling assumption).</p>${observations ? '<label class="l-field"><span>Your observations and follow-up actions</span><textarea name="observations" required maxlength="4000" rows="4"></textarea></label>' : ''}<label class="l-field"><span><input name="reviewed" type="checkbox" required> I reviewed all four stages and the stated scenario assumptions.</span></label><p role="alert" class="cm-walk-error"></p><div class="l-dialog-actions"><button type="button" data-cancel>Cancel</button><button type="submit" class="btn primary">Record this walkthrough</button></div></form>`;
  document.body.append(dialog); dialog.showModal();
  const close = () => { dialog.close(); dialog.remove(); }; dialog.querySelector('[data-cancel]').onclick = close;
  dialog.addEventListener('cancel', () => dialog.remove());
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault(); const form = event.currentTarget, button = form.querySelector('[type=submit]'), error = form.querySelector('[role=alert]');
    if (!form.reportValidity()) return;
    if (!current()) { error.textContent = 'The model or scenario changed. Close this form and restart the walkthrough.'; return; }
    button.disabled = true;
    try { const store = window.aiwProjectStore; if (!store?.command) throw Error('Project saving is unavailable. Reopen this project and try again.'); const payload = {...command.payload, reviewed: true, ...(observations ? {observations: new FormData(form).get('observations').trim()} : {})}; await store.command({...command, payload}); close(); onSaved?.(); }
    catch (e) { error.textContent = e.message || 'The walkthrough could not be saved. Your input is retained.'; button.disabled = false; }
  };
}
