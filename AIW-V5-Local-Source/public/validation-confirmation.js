import {confirmationCandidates,confirmationPlan} from './validation-confirmation-domain.js';
export {confirmationCandidates,confirmationPlan} from './validation-confirmation-domain.js';
// Explicit human confirmation of existing records, through their existing domain commands.
// No chapter check stamp, decision acceptance, external approval or measured result is synthesized.
import {digest} from './brain-integrity.js';
import {esc} from './html-escape.js';
import {openDialog,closeDialog,showDialogError,setDialogBusy} from './dialog.js';
import {projectURL} from './project-context.js';
import {reviewSourceUrl} from './review-domain.js';

export function openConfirmationReview(store,chapter,{ids=null}={}) {
  const p=store.value.document,basis=digest(p),revision=store.value.revision,all=confirmationCandidates(p,chapter,{ids}),rows=all.slice(0,20);
  if(!rows.length)return null;
  let busy=false,dirty=false;
  const cancel=()=>{if(busy)return;if(dirty){dialog.querySelector('[data-discard-review]').hidden=false;dialog.querySelector('[data-keep-review]').focus();}else closeDialog(dialog);};
  const fields=r=>Object.entries(r).filter(([k,v])=>!['history','review','sourceSnapshot','proposed','library','recorded','approval'].includes(k)&&v!==''&&v!=null).map(([k,v])=>k+': '+(typeof v==='object'?JSON.stringify(v,null,2):String(v))).join('\n');
  const dialog=openDialog({className:'l-dialog vx-confirm-panel',labelledBy:'vx-confirm-title',onCancel:cancel,html:`<header><h2 id="vx-confirm-title">Confirm selected after review</h2><button type="button" class="btn" data-close-review aria-label="Close review">×</button></header><p>Inspect each definition, then tick only those you have reviewed. This records your confirmation through the existing domain rules. It does not approve the SDD or invent evidence.</p><p>${rows.length} of ${all.length} eligible records in the current findings${all.length>20?'; review this set, then reopen for the next set':''}.</p><form><div role="alert" data-dialog-error hidden></div>${rows.map(x=>`<fieldset><legend>${esc(x.ref+' · '+x.title)}</legend><details><summary>Read the saved definition</summary><pre>${esc(fields(x.record))}</pre><a href="${esc(projectURL(reviewSourceUrl(chapter,x.id,'work'),p.id))}">Open this record in Work</a></details><label><input type="checkbox" name="record" value="${esc(x.id)}"> I reviewed this record: ${esc(x.label)}.</label></fieldset>`).join('')}<label>Reviewer name<input name="reviewer" required maxlength="180" autocomplete="name"></label><label>Review basis or evidence reference<textarea name="evidence" required maxlength="2000"></textarea></label><label><input type="checkbox" name="reviewed" required> I am recording my own review of the selected definitions and their current inputs.</label><div class="l-dialog-actions"><button type="button" class="btn" data-close-review>Cancel</button><button type="submit" class="btn primary">Confirm selected after review</button></div></form><div data-discard-review hidden><p>Discard this unsaved review entry?</p><button type="button" class="btn" data-keep-review>Keep reviewing</button><button type="button" class="btn" data-discard-confirm>Discard entry</button></div>`});
  dialog.addEventListener('input',()=>{dirty=true;});
  dialog.addEventListener('click',e=>{if(e.target.closest('[data-close-review]'))cancel();if(e.target.closest('[data-keep-review]'))dialog.querySelector('[data-discard-review]').hidden=true;if(e.target.closest('[data-discard-confirm]')){dirty=false;cancel();}});
  dialog.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();if(busy||!e.target.reportValidity())return;const data=new FormData(e.target);
    try{if(store.value.revision!==revision||store.value.document.id!==p.id)throw Error('The project changed. Reopen the review and inspect the current records.');
      const command=confirmationPlan(store.value.document,chapter,data.getAll('record'),{basis,allowedIds:ids,reviewed:data.get('reviewed')==='on',reviewer:data.get('reviewer'),evidence:data.get('evidence')});
      busy=true;setDialogBusy(dialog,'saving');await store.command(command);dirty=false;closeDialog(dialog);document.dispatchEvent(new CustomEvent('aiw:external-project'));
    }catch(error){busy=false;setDialogBusy(dialog,false);showDialogError(dialog,error.message);}
  });
  return dialog;
}
