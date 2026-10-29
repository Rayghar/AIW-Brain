import {projectURL,activeProjectId,adoptProject,isProjectId} from './project-context.js';
import {settleDocument} from './document-memo.js';
// A random request key; getRandomValues also works where randomUUID does not (plain http on a LAN).
const requestKey=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// A request that has no answer after 45 seconds is abandoned and treated like a lost connection (audit F-12),
// so the page stops waiting; a save is then retried once with the same key. A request names its project: this tab's
// unless the caller names another (the store reading or saving the project it holds).
async function requestJSON(path,options,fallback='The project could not be saved.',project=activeProjectId){
  let response;const controller=typeof AbortController==='function'?new AbortController():null,timer=controller&&setTimeout(()=>controller.abort(),45000);
  try{response=await fetch(projectURL(path,project),{credentials:'same-origin',...options,...(controller?{signal:controller.signal}:{})});}
  catch{const error=new Error(controller?.signal.aborted?'The workbench did not answer in time. Your input is still here.':'The workbench could not reach its server. Your input is still here.');error.network=true;throw error;}
  finally{clearTimeout(timer);}
  let data;
  try{data=await response.json()}catch{throw Error('Project storage returned an unexpected response. Your input is still here.')}
  if(!response.ok){const error=new Error(data.error||fallback);error.conflict=response.status===409;error.status=response.status;throw error}
  return data;
}
// A POST to one of the service routes that keep receipts (reviews, discussions, attachments, lifecycle,
// operations, connections, jobs, intake, access, organisations, recovery; round 2, B2-20). It carries its own
// Idempotency-Key, and when the answer is lost on the way back it is sent once more with the same key, so the
// server answers from its receipt instead of doing the work twice. `body` is JSON unless `raw` is given; `fallback` is
// the message when the server gives no reason.
export async function servicePost(path,body,{raw=null,headers={},fallback='The request could not be completed.'}={}){
  const project=activeProjectId,key=requestKey(),send=()=>requestJSON(path,{method:'POST',headers:{...(raw?{}:{'Content-Type':'application/json'}),...headers,'Idempotency-Key':key},body:raw??JSON.stringify(body??{})},fallback,project);
  try{return await send();}
  catch(error){if(!error.network)throw error;await pause(800);return send();}
}
// What a saved command changed (audit F2-22): its type, the record ids it named or created (a reviewed workspace
// command names those of the changes it carries) and the revision now current. Sent as the detail of the
// `aiw:project-command` event after every save, so a surface can skip a re-render that the change cannot affect.
export function commandChangeDetail(command,result){const ids=new Set();const inner=command?.type==='workspace.apply'||command?.type==='workspace.alternative'?command.payload?.commands||[]:[command];for(const c of inner)if(c?.payload?.id)ids.add(String(c.payload.id));if(result?.selected)ids.add(String(result.selected));return {type:command?.type||'',ids:[...ids],revision:result?.revision??null};}
// A save answers with the sections of the document the command changed (?response=sections, round 2 B2-13):
// each replaces that key of the document this tab holds, and null removes it. A replayed answer (the same
// request key sent again) still carries the whole document, which is then taken as it is.
// The change journal answers with what the command did to it (round 12, PS-07: the journal is most of a large project):
// the changes it replaced, by position, and the changes it added, applied to the journal this tab holds (journalAfter).
export function mergeSaved(previous,answer){
  if(answer?.document&&typeof answer.document==='object')return {document:answer.document,selected:answer.selected??null,revision:answer.revision,updatedAt:answer.updatedAt};
  if(!answer?.sections||typeof answer.sections!=='object'||!previous||!Number.isFinite(answer.revision))throw Error('Project storage returned an unexpected response. Your input is still here.');
  const document={...previous};
  for(const [key,value] of Object.entries(answer.sections)){if(value===null)delete document[key];else document[key]=key==='changes'&&value.delta?journalAfter(previous.changes,value):value;}
  for(const [key,delta] of Object.entries(answer.deltas||{}))document[key]=sectionAfter(previous[key],delta);
  return {document,selected:answer.selected??null,revision:answer.revision,updatedAt:answer.updatedAt};
}
// A section's delta (round 12, GR-PERF-12: worker.js sectionDelta) applied to the section this tab holds, which is never
// changed: the records the save replaced, removed or added, the entries a history gained, the keys of an object that
// changed. A section that is not the one the delta was made from (another length, another record at a place) cannot
// take it, and the project is read again (journalMismatch, as for the journal).
const heldMismatch=()=>Object.assign(Error('The project held here is not the one saved. Reload the latest project.'),{journalMismatch:true});
const isPlainSection=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function sectionAfter(held,d){
  if(!d||typeof d!=='object')throw heldMismatch();
  if(Object.hasOwn(d,'val'))return d.val;
  if(d.grow){if(!Array.isArray(held)||held.length!==d.grow.since)throw heldMismatch();return held.concat(d.grow.add);}
  if(d.rec){
    if(!Array.isArray(held))throw heldMismatch();
    let out;
    if(d.rec.ids){const byId=new Map(held.map(x=>[x?.id,x])),put=new Map(d.rec.put||[]);out=d.rec.ids.map(id=>put.has(id)?put.get(id):byId.get(id));if(out.some(x=>x===undefined))throw heldMismatch();}
    else{
      const del=new Set(d.rec.del||[]);out=held.filter(x=>!del.has(x?.id));if(held.length-out.length!==del.size)throw heldMismatch();
      for(const [i,x] of d.rec.at||[]){if(out[i]?.id!==x?.id)throw heldMismatch();out[i]=x;}
      out.push(...(d.rec.add||[]));
    }
    if(out.length!==d.rec.n)throw heldMismatch();
    return out;
  }
  if(d.obj){
    if(!isPlainSection(held))throw heldMismatch();
    const set=d.obj.set||{},gone=new Set(d.obj.del||[]),keys=d.obj.keys||[...Object.keys(held).filter(k=>held[k]!==undefined&&!gone.has(k)),...Object.keys(set).filter(k=>held[k]===undefined)],out={};
    for(const k of keys){const v=Object.hasOwn(set,k)?sectionAfter(held[k],set[k]):held[k];if(v===undefined)throw heldMismatch();if(k==='__proto__')Object.defineProperty(out,k,{value:v,enumerable:true,writable:true,configurable:true});else out[k]=v;}
    return out;
  }
  throw heldMismatch();
}
// A journal delta ({since, removed?:[position], replaced:[[position, change]], added:[change]}) applied to the journal it
// was made from: the changes removed (archived: round 12, GR-PERF-13), then those replaced, by their position after the
// removals, then those added. A journal that is not that one (another length, another change at a place) cannot take it,
// and the project is read again (journalMismatch).
export function journalAfter(held,{delta,...rest}){
  const events=held?.events||[],mismatch=()=>Object.assign(Error('The change history held here is not the one saved. Reload the latest project.'),{journalMismatch:true});
  if(!delta||events.length!==delta.since)throw mismatch();
  const gone=new Set(delta.removed||[]),next=gone.size?events.filter((_,i)=>!gone.has(i)):events.slice();
  if(events.length-next.length!==gone.size)throw mismatch();
  for(const [at,event] of delta.replaced){if(next[at]?.id!==event?.id)throw mismatch();next[at]=event;}
  next.push(...delta.added);
  return {...rest,events:next};
}
// The parts of frozen baselines (round 12, GR-PERF-13): a project read carries each baseline's metadata, not its parts. A
// view that compares with a baseline or reads it gets the part here, read once per baseline and SHA-256 (the server
// checks it against its SHA-256) and announced with 'aiw:baseline-part', so the view draws again when it arrives; the
// last few read are kept. A baseline the document holds whole (stored before round 12) answers with its own part.
const heldParts=new Map(),HELD_PARTS=4;
const partKey=(p,b,part)=>(p?.id||'')+'|'+b.id+'|'+(b.frozen?.parts?.[part]?.sha256||part);
export function baselinePart(p,b,part='source'){
  if(!b)return Promise.resolve(null);
  if(!b.frozen)return Promise.resolve(b[part]??null);
  const key=partKey(p,b,part),held=heldParts.get(key);
  if(held){heldParts.delete(key);heldParts.set(key,held);return held.read;}
  const read=requestJSON('/api/baselines?action=open&id='+encodeURIComponent(b.id)+'&part='+encodeURIComponent(part),undefined,'The frozen baseline could not be read.',p?.id).then(value=>{const h=heldParts.get(key);if(h)h.value=value;if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('aiw:baseline-part',{detail:{baselineId:b.id,part}}));return value;},error=>{heldParts.delete(key);throw error;});
  heldParts.set(key,{read});while(heldParts.size>HELD_PARTS)heldParts.delete(heldParts.keys().next().value);
  return read;
}
// A project with every frozen baseline whole, as it was frozen (part 'whole'), for a package that carries them.
export async function withWholeBaselines(p){const list=p?.finalReview?.baselines||[];if(!list.some(b=>b?.frozen))return p;return {...p,finalReview:{...p.finalReview,baselines:await Promise.all(list.map(b=>b?.frozen?baselinePart(p,b,'whole'):b))}};}
// The part when it is held, else null: it is read meanwhile and announced when it arrives.
export function baselinePartNow(p,b,part='source'){
  if(!b)return null;if(!b.frozen)return b[part]??null;
  const held=heldParts.get(partKey(p,b,part));if(held&&'value' in held)return held.value;
  baselinePart(p,b,part).catch(()=>{});return null;
}
// Whether a caller applies due repository notices before reading: owners and editors do; viewers and reviewers
// may not (the server refuses them, round 2 B2-08), so they do not send the request; an unknown role tries.
export const appliesNotices=role=>!role||['owner','editor'].includes(role);
export function createProjectStore(){
  // The project this store holds (round 4, A): the tab's, until the store adopts another one in place.
  let current=null,status='saved',role=null,projectId=activeProjectId,switching=false;
  let lastUndo=null;
  const undoAvailable=()=>status==='saved'&&lastUndo&&current?.revision===lastUndo.revision&&current?.document?.workbench?.history?.at(-1)?.undo?.id===lastUndo.id?{...lastUndo}:null;
  function announce(value){status=value;if(typeof document!=='undefined'){document.dispatchEvent(new CustomEvent('aiw:save',{detail:{status}}));document.dispatchEvent(new CustomEvent('aiw:action-undo',{detail:{available:undoAvailable()}}));}}
  // Tabs of this browser tell each other when they save this project (audit F-14). A tab that falls behind says
  // so, and offers the latest version, before its next save would meet a conflict. Saves by other people still
  // meet the revision check on the server. The channel is the held project's: a project opened in place listens on its own.
  let channel=null;
  function listen(id){
    channel?.close?.();channel=typeof BroadcastChannel==='function'?new BroadcastChannel('aiw-project:'+id):null;
    channel?.addEventListener('message',event=>{const revision=Number(event.data?.revision);if(current&&revision>current.revision)announce('behind');});
    channel?.unref?.(); // outside a browser (the DOM suites run in Node), the channel must not keep the process alive
  }
  listen(projectId);
  // Signed repository revocations due for a project are applied first, by a POST, so that reading the
  // project never writes. Only owners and editors may apply them (round 2, B2-08): the caller's role is read
  // first, and a viewer or reviewer does not send a POST the server would refuse. Best effort: reading goes
  // ahead whatever either request answers; an unknown role tries the POST as before.
  // The reference project is always the caller's own (each account materialises its own copy the first time it
  // opens it, so it may not exist yet and /api/access would answer 404); any other project says the role.
  // Answers the project as read and the caller's role in it; nothing in the store changes here.
  async function readProject(id){
    let access=null;
    if(id==='bank-payment')access='owner';
    else try{const answer=await requestJSON('/api/access',undefined,undefined,id);access=typeof answer?.role==='string'?answer.role:null;}catch{access=null;}
    if(appliesNotices(access))try{await (await fetch(projectURL('/api/knowledge/corpus?view=notices',id),{method:'POST',credentials:'same-origin'})).arrayBuffer();}catch{/* reading continues */}
    return {role:access,loaded:await requestJSON('/api/project',undefined,undefined,id)};
  }
  // Every save carries its own request key (audit C-27). When the response is lost on the way back, the same
  // request is sent once more with the same key: the server returns the saved outcome instead of applying the
  // change twice or reporting a conflict with itself.
  async function save(command,project){
    const key=requestKey(),base=current,send=()=>requestJSON('/api/commands?response=sections',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({revision:base.revision,command})},undefined,project);
    let answer;
    try{answer=await send();}
    catch(error){if(!error.network)throw error;await pause(800);answer=await send();}
    try{return mergeSaved(base.document,answer);}
    catch(error){if(!error.journalMismatch)throw error;const loaded=await requestJSON('/api/project',undefined,undefined,project);return {document:loaded.document,selected:answer.selected??null,revision:loaded.revision,updatedAt:loaded.updatedAt};}
  }
  // Commands are sent one at a time (audit F2-12): a second command waits for the first and then carries the
  // revision that first save produced, instead of racing it to a conflict. A tab that knows it is behind
  // refuses to send until the latest project is loaded; the refusal reads as a conflict, so the editors offer
  // their "Load latest project" control. The review of an ordinary change happens before the queue, since it
  // waits for a person, and is skipped when the caller already reviewed (a workspace.* command). The status
  // reads "saving" from the moment a command is queued until the last queued command has an answer, and never
  // while a person is still reviewing.
  let queue=Promise.resolve(),queued=0;
  const behindError=()=>{const error=new Error('A newer version of this project was saved in another tab. Load the latest project, then save again.');error.conflict=true;error.behind=true;return error;};
  // A command is sent to the project it was made in, against that project's revision; one made in another project
  // than the store now holds is refused (defence in depth: the store adopts another project only with nothing queued).
  const otherProjectError=()=>{const error=new Error('This change was made in another project. Nothing was saved; your input is still here.');error.conflict=true;return error;};
  async function sendQueued(command,project,expectedRevision){
    if(project!==projectId)throw otherProjectError();
    if(expectedRevision!==undefined&&current.revision!==expectedRevision){const error=Object.assign(Error('Another save finished before Undo. Review the current record instead.'),{conflict:true});announce('error');throw error;}
    if(status==='behind')throw behindError();
    if(status!=='saving')announce('saving');
    try{const result=await save(command,project);current=result;const receipt=current.document.workbench?.history?.at(-1)?.undo;lastUndo=receipt&&!receipt.used&&receipt.revision===current.revision&&command.type!=='action.undo'?{id:receipt.id,type:receipt.type,revision:receipt.revision}:null;settleDocument(current.document);if(queued===1)announce('saved');channel?.postMessage({revision:current.revision});if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('aiw:project-command',{detail:commandChangeDetail(command,result)}));return result}
    catch(error){announce('error');throw error}
  }
  const store={get value(){return current},get status(){return status},get role(){return role},
    // A load that answers after another project was adopted is not this store's any more and is dropped.
    async load(){const id=projectId;try{const next=await readProject(id);if(id!==projectId)return current;role=next.role;current=next.loaded;settleDocument(current.document);announce('saved');return current}catch(error){if(id===projectId)announce('error');throw error}},
    // Another project, in place (round 4, A). It is read as any project is read — the caller's role, the due notices an
    // owner or editor applies, then the document; the server checks the caller's access — while this tab stays on its
    // own project: a refusal or a lost connection changes nothing. Saves already on their way finish first, in the
    // project they were made in, and none is sent while the other project is read. The answer's adopt() makes that
    // project this tab's: its document, its role and its tabs' channel, every later request and save, and
    // 'aiw:project-switched' for the modules that keep state for the project on screen. abandon() keeps this one.
    async prepareProject(id){
      if(!isProjectId(id))throw Error('Choose a valid project.');
      if(switching)throw Error('Another project is already opening.');
      switching=true;
      try{await queue;const next=await readProject(id);await queue;
        let settled=false;const done=()=>{if(settled)throw Error('This project was already opened or set aside.');settled=true;switching=false;};
        return {name:next.loaded?.document?.name||'',
          adopt(){done();const from=projectId;adoptProject(id);projectId=id;role=next.role;current=next.loaded;settleDocument(current.document);status='saved';listen(id);
            if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('aiw:project-switched',{detail:{from,to:id}}));return current;},
          abandon(){done();}};
      }catch(error){switching=false;throw error}
    },
    get undoAvailable(){return undoAvailable();},
    async undoLastAction(){const receipt=undoAvailable();if(!receipt)throw Error('Only the latest saved action can be undone.');return store.command({type:'action.undo',payload:{receiptId:receipt.id}},{expectedRevision:receipt.revision});},
    async command(command,{expectedRevision}={}){
      if(!current)throw Error('Open your project first.');
      if(switching)throw Error('Another project is opening. Nothing was saved; your input is still here.');
      if(status==='behind')throw behindError();
      if(expectedRevision!==undefined&&current.revision!==expectedRevision)throw behindError();
      const project=projectId;
      if(typeof window!=='undefined'&&window.aiwReviewOrdinaryChange){command=await window.aiwReviewOrdinaryChange(current?.document,command);if(!command)throw Error('The change was not applied. Your input is retained.');}
      if(switching)throw Error('Another project is opening. Nothing was saved; your input is still here.');
      if(project!==projectId)throw otherProjectError();
      if(status==='behind')throw behindError();
      // With nothing in flight the request leaves at once (the status and the request are synchronous with the
      // call, as before the queue); otherwise it waits for the commands ahead of it.
      const idle=queued===0;queued++;if(status!=='saving')announce('saving');
      // The caller receives a failure through `run`; the queue only waits for it to settle (not a swallowed error).
      const run=(idle?sendQueued(command,project,expectedRevision):queue.then(()=>sendQueued(command,project,expectedRevision))).finally(()=>{queued--;});queue=run.catch(()=>{});return run;
    },
    get pending(){return queue},
    // A baseline's freeze (round 12, GR-STO-02): a job with a receipt (/api/baselines, baseline-service.js). The request
    // answers at once; the job is read until it ends, each reading handed to onProgress (its progress names the parts
    // built and the next), and the project is read again, holding the baseline as frozen. Answers the job as it ended.
    async freezeBaseline(raw,onProgress=()=>{}){
      if(!current)throw Error('Open your project first.');
      const project=projectId,started=await servicePost('/api/baselines?action=freeze',{requestId:'freeze-'+requestKey(),title:raw.title,reviewed:raw.reviewed===true,stamp:raw.stamp},{fallback:'The baseline could not be frozen.'});
      let job={id:started.id,status:started.status,progress:null};onProgress(job);
      for(;;){
        await pause(700);
        try{job=(await requestJSON('/api/baselines?action=status&id='+encodeURIComponent(started.id),undefined,'The freeze could not be read.',project)).job;}catch(error){if(!error.network)throw error;continue;}
        onProgress(job);if(!['queued','running'].includes(job?.status))break;
      }
      if(job?.status!=='completed')throw Error(job?.error||(job?.status==='cancelled'?'The freeze was cancelled. Nothing was saved.':'The freeze stopped before the baseline was saved. Freeze it again.'));
      if(project===projectId)await store.load();
      return job;
    }};
  if(typeof window!=='undefined')window.aiwProjectStore=store;
  return store;
}
