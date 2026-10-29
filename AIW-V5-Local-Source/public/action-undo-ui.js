// Undo uses only the server receipt for this tab's latest saved action, checked again against actor and revision.
let pending=false,error='',seen=null,seenProject=null;
const names={'quality.intake':'input review','quality.move':'driver order','decision.intake':'input review','decision.choose':'working choice','technology.simulation':'capability walkthrough','runtime.simulation':'runtime walkthrough','techrealisation.preference':'working preference','techrealisation.clear-preference':'cleared preference'};
export function refreshActionUndo(){
  const store=window.aiwProjectStore,available=store?.undoAvailable,anchor=document.querySelector('.top-actions .save-state');
  if(!anchor)return;
  const project=store?.value?.document?.id||null;if(project!==seenProject){error='';seen=null;seenProject=project;}
  let host=document.getElementById('action-undo');
  if(!host){host=document.createElement('span');host.id='action-undo';host.className='action-undo';anchor.after(host);}
  const id=available?.id||null;if(id&&id!==seen){error='';seen=id;}
  host.replaceChildren();host.hidden=!available&&!error;if(host.hidden)return;
  if(available){const button=document.createElement('button');button.type='button';button.className='btn action-undo-button';button.textContent=pending?'Undoing…':'Undo';button.disabled=pending;button.setAttribute('aria-label','Undo last saved '+(names[available.type]||'action'));button.title='Only the latest saved action can be undone. Later changes make this receipt unavailable.';
    button.addEventListener('click',async()=>{if(pending)return;pending=true;error='';refreshActionUndo();try{await store.undoLastAction();document.dispatchEvent(new CustomEvent('aiw:redraw'));window.dispatchEvent(new CustomEvent('aiw:notice',{detail:{message:'Last action undone. Its original history remains recorded.'}}));const current=document.querySelector('.top-actions .save-state');current?.setAttribute('tabindex','-1');current?.focus();}catch(e){error=e?.message||'This action could not be undone. Your saved project is unchanged.';}finally{pending=false;refreshActionUndo();}});host.append(button);}
  if(error){const message=document.createElement('span');message.className='action-undo-error';message.setAttribute('role','alert');message.textContent=error;host.append(message);}
}
if(typeof document!=='undefined')document.addEventListener('aiw:action-undo',refreshActionUndo);
