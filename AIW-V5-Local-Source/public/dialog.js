// One dialog primitive for the chapter studios and the workbench (audit F2-10). A native <dialog> opened
// with showModal(): Escape and the close control go through one close path that the opener supplies (so an
// editor can ask about unsaved changes); everything outside the dialog is inert while it is open; Tab
// stays inside; the opener is remembered by a stable locator (its tag and data attributes) so focus returns
// to it, or to the row of the record just saved, after the page has been rebuilt (F2-02); a busy state names
// what the person is waiting for (F2-01); invalid fields get inline messages instead of browser bubbles
// (F2-24). Nothing here reads or writes the project.
import {decorateLinkPickers} from './link-pickers.js';
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const visible=el=>!el.hidden&&!el.closest('[hidden]')&&(typeof el.getClientRects!=='function'||el.getClientRects().length>0||typeof window==='undefined'||!('innerWidth' in window));
const cssEscape=v=>typeof CSS!=='undefined'&&CSS.escape?CSS.escape(v):String(v).replace(/["\\]/g,'\\$&');
const dataAttribute=k=>'data-'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());

// The element that opened a dialog, described so it can be found again after a re-render: its tag, its
// id and its data attributes. The live element is kept too, for the common case where it survives.
export function rememberOpener(el=typeof document==='undefined'?null:document.activeElement){
  if(!el||!el.tagName||el===document.body)return null;
  const data=Object.entries(el.dataset||{}).filter(([,v])=>typeof v==='string'&&v.length<=200);
  return {el,tag:el.tagName,id:el.id||'',data};
}
export function findOpener(opener,root=document){
  if(!opener)return null;
  if(opener.el?.isConnected)return opener.el;
  if(opener.id){const byId=root.querySelector('#'+cssEscape(opener.id));if(byId)return byId;}
  if(!opener.data.length)return null;
  const [[k0,v0]]=opener.data;
  return [...root.querySelectorAll(`${opener.tag}[${dataAttribute(k0)}="${cssEscape(v0)}"]`)].find(e=>opener.data.every(([k,v])=>e.dataset[k]===v))||null;
}
// Focus returns to the opener (re-queried), else to a control that names one of the given record ids through
// one of the given data attributes (the saved record's row), else to the first fallback selector that
// matches. Returns the element that took focus, or null.
export function returnFocus(opener,{ids=[],attributes=['data-select'],fallbacks=[]}={}){
  const candidates=[()=>findOpener(opener)];
  for(const id of ids.filter(v=>typeof v==='string'&&v))for(const a of attributes)candidates.push(()=>document.querySelector(`${a}`.startsWith('data-')?`[${a}="${cssEscape(id)}"]`:a));
  for(const f of fallbacks)candidates.push(()=>typeof f==='string'?document.querySelector(f):f);
  for(const find of candidates){
    let el=null;try{el=find();}catch{el=null;}
    if(!el||!el.isConnected||el.disabled||!visible(el))continue;
    try{el.focus({preventScroll:true});}catch{continue;}
    if(document.activeElement===el)return el;
  }
  return null;
}

// Marks everything beside the dialog inert and remembers what it marked, so a nested dialog restores only
// what it changed. A dialog that leaves the DOM by any other route than closeDialog (a module that removes
// its element by hand, a page rebuild that drops it) releases its marks too: the native close event and a
// childList observer on <body> both call the release, and opening a dialog first purges the marks of any
// earlier dialog that is no longer connected.
const marks=new Set();
function inertOthers(dialog){
  for(const m of marks)if(!m.dialog.isConnected)m.release();
  const marked=[];
  for(const child of document.body.children){if(child===dialog||child.hasAttribute('inert'))continue;child.setAttribute('inert','');marked.push(child);}
  let released=false,observer=null;
  const release=()=>{if(released)return;released=true;marks.delete(entry);observer?.disconnect();for(const el of marked)el.removeAttribute('inert');};
  const entry={dialog,release};marks.add(entry);
  dialog.addEventListener('close',release);
  if(typeof MutationObserver==='function'){observer=new MutationObserver(()=>{if(!dialog.isConnected)release();});observer.observe(document.body,{childList:true});}
  return release;
}
// Releases every inert mark left by dialogs that are no longer in the DOM. Exported for shells that rebuild the page.
export function releaseStaleInert(){for(const m of marks)if(!m.dialog.isConnected)m.release();}
function trapTab(dialog,e){
  if(e.key!=='Tab')return;
  const items=[...dialog.querySelectorAll(FOCUSABLE)].filter(visible);if(!items.length)return;
  const first=items[0],last=items[items.length-1],active=document.activeElement;
  if(e.shiftKey&&(active===first||!dialog.contains(active))){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&active===last){e.preventDefault();first.focus();}
}

// Opens a modal dialog. `onCancel` runs for Escape and the close control and decides whether to close (an
// editor with unsaved changes asks first); `closeDialog` is the one way out. Returns the <dialog> element,
// with `dialog.opener` (the remembered opener) and `dialog.closeDialog()`.
export function openDialog({className='dialog',label='',labelledBy='',html='',onCancel=null,opener=rememberOpener(),closeSelector='[data-dialog-close]',initialFocus='input:not([type=checkbox]):not([type=radio]),textarea,select,button:not([data-dialog-close])',novalidate=true}={}){
  const dialog=document.createElement('dialog');
  dialog.className=className;
  if(labelledBy)dialog.setAttribute('aria-labelledby',labelledBy);else if(label)dialog.setAttribute('aria-label',label);
  dialog.innerHTML=html;
  dialog.opener=opener;
  if(novalidate)for(const form of dialog.querySelectorAll('form'))form.noValidate=true;
  document.body.append(dialog);
  decorateLinkPickers(dialog,typeof window==='undefined'?null:window.aiwProjectStore?.value?.document);
  const release=inertOthers(dialog);
  let closed=false;
  // While a change preview is shown inside the dialog (workbench-ui.js reviewChangeInDialog), Escape and the
  // close request mean "back to editing", wherever focus is, never "close the editor".
  const backFromReview=()=>{const back=dialog.querySelector('[data-dialog-review] [data-wb-action="back-to-editing"]');if(back){back.click();return true;}return false;};
  const cancel=event=>{event?.preventDefault?.();if(dialog.hidden||closed)return;if(backFromReview())return;if(typeof onCancel==='function')onCancel(event);else closeDialog(dialog);};
  dialog.addEventListener('cancel',cancel);
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();e.stopPropagation();cancel(e);return;}trapTab(dialog,e);});
  if(closeSelector)dialog.addEventListener('click',e=>{if(e.target.closest?.(closeSelector))cancel(e);});
  // Forms are novalidate so the browser's bubbles never show; the same constraints are checked here, before any
  // submit handler of the opener runs (capture phase), and an invalid form is not submitted: its fields get inline
  // messages and the first one takes focus. Handlers that validate again see the same result.
  if(novalidate)dialog.addEventListener('submit',e=>{const form=e.target;if(form?.tagName==='FORM'&&form.noValidate&&!validateForm(form)){e.preventDefault();e.stopPropagation();}},true);
  dialog.closeDialog=({restoreFocus=true}={})=>{
    if(closed)return;closed=true;
    release();
    try{if(dialog.open)dialog.close();}catch{/* already closed */}
    dialog.dispatchEvent(new CustomEvent('aiw:dialog-closed'));
    dialog.remove();
    if(restoreFocus)returnFocus(opener);
  };
  if(typeof dialog.showModal==='function'){try{dialog.showModal();}catch{dialog.setAttribute('open','');}}else dialog.setAttribute('open','');
  // The first visible field takes focus; a dialog without one focuses its first control other than a close button
  // (round 2, U2-16, U2-25: the studios' "×", labelled "Close dialog", came first in the markup and took focus).
  const candidates=initialFocus?[...dialog.querySelectorAll(initialFocus)].filter(el=>visible(el)&&!el.matches('[aria-label="Close dialog"]')):[];
  const first=candidates.find(el=>el.matches('input,textarea,select'))||candidates[0];
  (first||dialog.querySelector(FOCUSABLE)||dialog).focus?.({preventScroll:true});
  return dialog;
}
export function closeDialog(dialog,options){if(dialog?.closeDialog)dialog.closeDialog(options);else if(dialog){try{if(dialog.open)dialog.close();}catch{/* detached */}dialog.remove();}}

// The dialog's busy state: 'saving' while a save is in flight, 'review' while a person is reading a change
// preview, false otherwise. Submit controls are disabled while busy and the status line says why, so the
// word "Saving" never shows while the dialog waits for a person (audit F2-01).
export const BUSY_LABELS={saving:'Saving…',review:'Awaiting your review'};
export function setDialogBusy(dialog,state,label=BUSY_LABELS[state]||''){
  if(!dialog)return;
  const busy=!!state;
  dialog.toggleAttribute('aria-busy',busy);dialog.dataset.busy=state||'';
  for(const b of dialog.querySelectorAll('button[type=submit]'))b.disabled=busy;
  let status=dialog.querySelector('[data-dialog-status]');
  if(!status&&busy){status=document.createElement('p');status.className='dialog-status';status.setAttribute('data-dialog-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');(dialog.querySelector('[role=alert]')||dialog.querySelector('header'))?.after(status);}
  // A save says how long it has taken (round 12, G, GR-UX-07); waiting for a person does not.
  if(status){busyClock(status,busy?label:'',state==='saving');status.hidden=!busy;}
}
// Progress while waiting (round 12, G, GR-UX-07): a status line says what is under way and, from the first second on, how
// long it has taken ("Saving… 3 s"), until it is given another text or stopped. The seconds are not announced (the
// status's own words are); `target` is the element, or a function that finds it again when the page redraws it, and
// the clock stops when an element given itself leaves the page. `ticking` false sets the text alone. Returns the stop.
const clocks=new WeakMap();
// The workspace save label has one responsive structure across shell redraws and chapter editors.
// Updating its text must preserve the dot, the compact phone label and the accessible full status.
export function updateSaveState(label,target=typeof document==='undefined'?null:document.querySelector('.save-state')){
  if(!target)return null;
  const fullLabel=String(label||'');
  const shortLabel=/offline/i.test(fullLabel)?'Offline':/not saved/i.test(fullLabel)?'Not saved':/saving/i.test(fullLabel)?'Saving…':/newer version/i.test(fullLabel)?'New version':/connected again/i.test(fullLabel)?'Connected':'Saved';
  let full=target.querySelector('.save-state-full'),short=target.querySelector('.save-state-short');
  if(!full||!short){
    const dot=target.querySelector('.dot')||document.createElement('i');dot.className='dot';
    full=document.createElement('span');full.className='save-state-full';full.setAttribute('aria-hidden','true');
    short=document.createElement('span');short.className='save-state-short';short.setAttribute('aria-hidden','true');
    target.replaceChildren(dot,full,short);
  }
  target.querySelector('[data-load-latest]')?.remove();
  target.setAttribute('aria-label',fullLabel);
  full.textContent=fullLabel;short.textContent=shortLabel;
  return target;
}
export function busyClock(target,label,ticking=true){
  const get=typeof target==='function'?target:()=>target,el=get();
  clearInterval(clocks.get(target));clocks.delete(target);
  if(!el)return ()=>{};
  if(el.classList?.contains('save-state'))updateSaveState(label,el);else el.textContent=label;
  if(!label||!ticking)return ()=>{};
  const t0=Date.now(),timer=setInterval(()=>{
    const now=get();if(!now||(now===target&&!now.isConnected)||clocks.get(target)!==timer){clearInterval(timer);return;}
    // The words and the seconds in one inline run, so a flex status (the header's) keeps them on one line.
    let time=now.querySelector('.busy-clock');
    if(!time){time=document.createElement('span');time.className='busy-clock';time.setAttribute('aria-hidden','true');if(now.classList?.contains('save-state'))now.querySelector('.save-state-full')?.append(time);else{const words=document.createElement('span');words.textContent=label;words.append(time);now.replaceChildren(words);}}
    time.textContent=' '+Math.floor((Date.now()-t0)/1000).toLocaleString('en-GB')+' s';
  },1000);
  clocks.set(target,timer);
  return ()=>{if(clocks.get(target)===timer){clearInterval(timer);clocks.delete(target);}};
}
// The dialog's error slot, one per dialog, announced as an alert.
export function showDialogError(dialog,text,extraHTML=''){
  const slot=dialog?.querySelector('[role=alert]');if(!slot)return false;
  slot.hidden=false;slot.textContent='';const span=document.createElement('span');span.textContent=text;slot.append(span);if(extraHTML)slot.insertAdjacentHTML('beforeend',' '+extraHTML);
  slot.scrollIntoView?.({block:'nearest'});return true;
}

// Programmatic validation with inline messages (audit F2-24). Forms opened through openDialog are
// novalidate; a submit handler calls validateForm first. Each invalid control gets a message beside it,
// `aria-invalid` and `aria-describedby`; the first one takes focus. checkValidity() still fires `invalid`
// on each control, so a wizard that listens for it opens the step that holds the field.
let messageCount=0;
export function clearFieldMessages(root){
  for(const m of root.querySelectorAll('.field-message'))m.remove();
  // A control described by its help (the kit's field-help) is described by it again once the message goes.
  for(const c of root.querySelectorAll('[aria-invalid]')){c.removeAttribute('aria-invalid');const prior=c.dataset.describedBy;if(prior)c.setAttribute('aria-describedby',prior);else c.removeAttribute('aria-describedby');delete c.dataset.describedBy;}
}
export function fieldMessage(control,text){
  const host=control.closest('label,.l-field,.brain-field,fieldset')||control.parentElement;if(!host)return null;
  let m=host.querySelector(':scope > .field-message');
  if(!m){m=document.createElement('small');m.className='field-message';m.id='field-message-'+(++messageCount);host.append(m);}
  if(control.dataset.describedBy==null){const prior=control.getAttribute('aria-describedby')||'';if(prior&&prior!==m.id)control.dataset.describedBy=prior;}
  m.textContent=text;control.setAttribute('aria-invalid','true');control.setAttribute('aria-describedby',m.id);
  return m;
}
export function validateControls(controls){
  const bad=[];
  for(const c of controls){if(typeof c.checkValidity!=='function'||!c.willValidate)continue;if(!c.checkValidity())bad.push(c);}
  for(const c of bad)fieldMessage(c,c.validationMessage||'Check this field.');
  if(bad.length){const first=bad.find(visible)||bad[0];try{first.focus({preventScroll:true});}catch{/* unfocusable */}}
  return bad.length===0;
}
export function validateForm(form){
  if(!form)return true;
  clearFieldMessages(form);
  return validateControls([...form.elements]);
}

// Wizard steps (F2-24): moving forward checks the fields of the step being left, with the same inline messages;
// moving back never does. `panelAttribute` names the studio's panel attribute (e.g. 'data-a-panel').
export function canLeaveStep(form,panelAttribute,target){
  if(!form)return true;
  const current=[...form.querySelectorAll('['+panelAttribute+']')].find(p=>!p.hidden);
  if(!current||Number(current.getAttribute(panelAttribute))>=Number(target))return true;
  clearFieldMessages(current);
  return validateControls([...current.querySelectorAll('input,select,textarea')]);
}
