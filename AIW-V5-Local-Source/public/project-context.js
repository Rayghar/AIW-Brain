// The project this tab works on, read from the address once: a different tab cannot silently redirect this tab's saves.
// It changes in place only through the project store (round 4, A): once the store has read another project — the
// server checks the caller's access as for any load — it makes that project this tab's (adoptProject), and dispatches
// 'aiw:project-switched' so that every module keeping state for the project on screen lets it go (onProjectSwitch).
// Nothing else calls adoptProject; the address never changes it.
import {scopeLens, lensHolds, scopedDocument, realisingGroups} from './module-lens.js';
import {architectureModel} from './architecture-model.js';
export let activeProjectId=typeof location==='undefined'?'bank-payment':new URLSearchParams(location.search).get('project')||'bank-payment';
// A project id as the server accepts it (worker.js).
export const isProjectId=id=>typeof id==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(id);
export function adoptProject(id){if(!isProjectId(id))throw Error('Choose a valid project.');activeProjectId=id;}
export function onProjectSwitch(reset){if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('aiw:project-switched',reset);}
export function projectURL(path,id=activeProjectId){
  const url=new URL(path,typeof location==='undefined'?'http://aiw.local':location.origin);
  if(id!=='bank-payment')url.searchParams.set('project',id);
  return url.pathname+url.search+url.hash;
}
// Chapter and tab changes are history entries, so Back returns to the previous tab; other changes (a new
// selection) rewrite the current entry (audit F-13).
export function writeRoute(params){
  const url=projectURL(location.pathname+'?'+params),here=new URLSearchParams(location.search);
  const moved=here.has('tab')&&params.has('tab')&&(here.get('tab')!==params.get('tab')||here.get('chapter')!==params.get('chapter'));
  if(moved)history.pushState({},'',url);else history.replaceState({},'',url);
}
// Browser preferences are scoped per project, the reference project included (audit F2-13): a key reads
// `<name>:<project id>`. Preferences the reference project kept under the bare name before scoping are moved
// to their scoped key once, so nothing is lost and no project reads another project's row. Rows of projects
// that no longer exist are removed by forgetProjectPreferences / pruneProjectPreferences.
const storage=()=>{try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}};
const SCOPED=':';
export const projectPreferenceKey=key=>key+SCOPED+activeProjectId;
export function projectPreferenceKeys(id=activeProjectId){const s=storage();if(!s)return [];const suffix=SCOPED+id,keys=[];for(let i=0;i<s.length;i++){const k=s.key(i);if(k&&k.endsWith(suffix))keys.push(k);}return keys;}
export function forgetProjectPreferences(id){const s=storage();if(!s||!id)return 0;const keys=[...projectPreferenceKeys(id),'aiw-project-location:'+id];let removed=0;for(const k of keys){if(s.getItem(k)!==null){s.removeItem(k);removed++;}}return removed;}
// Removes every project-scoped row whose project is not in `liveIds` (the Projects page knows the list).
export function pruneProjectPreferences(liveIds){const s=storage();if(!s||!Array.isArray(liveIds))return 0;const live=new Set(liveIds.map(String)),stale=new Set();for(let i=0;i<s.length;i++){const k=s.key(i)||'';const at=k.lastIndexOf(SCOPED);if(at>0&&(k.startsWith('aiw-')||OTHER_SCOPED.has(k.slice(0,at)))&&!k.startsWith('aiw-project-location:')){const id=k.slice(at+1);if(id&&!live.has(id))stale.add(id);}else if(k.startsWith('aiw-project-location:')){const id=k.slice('aiw-project-location:'.length);if(id&&!live.has(id))stale.add(id);}}let removed=0;for(const id of stale)removed+=forgetProjectPreferences(id);return removed;}
// One-time migration of the reference project's pre-scoping rows: a bare `aiw-…` key with no ':' that has a
// scoped twin for no project yet is moved under ':bank-payment'. Keys that are global by design keep their bare
// name because their modules read them bare; they are listed here so the migration leaves them alone.
const GLOBAL_KEYS=new Set(['aiw-lens-position-v1','aiw-model-guide-collapsed','aiw-workspace-preferences-v1']);
// Scoped names that do not start with `aiw-` (brain-context-ui.js keeps the assistance panel state under this one).
const OTHER_SCOPED=new Set(['brain-assistance']);
export function migrateReferencePreferences(){
  const s=storage();if(!s)return 0;const moved=[];
  for(let i=0;i<s.length;i++){const k=s.key(i)||'';if(!(k.startsWith('aiw-')||OTHER_SCOPED.has(k))||k.includes(SCOPED)||GLOBAL_KEYS.has(k))continue;moved.push(k);}
  for(const k of moved){const scoped=k+SCOPED+'bank-payment';if(s.getItem(scoped)===null)s.setItem(scoped,s.getItem(k));s.removeItem(k);}
  return moved.length;
}
try{migrateReferencePreferences();}catch{/* storage unavailable: preferences simply do not persist */}
export function recordProjectLocation(){try{localStorage.setItem('aiw-project-location:'+activeProjectId,projectURL(location.pathname+location.search));}catch{/* storage unavailable */}}
export function resumeProjectURL(id){try{const raw=localStorage.getItem('aiw-project-location:'+id);if(raw&&raw.startsWith('/?chapter='))return projectURL(raw,id);}catch{/* storage unavailable */}return projectURL('/?chapter=1&tab=work',id);}
// A link that names its project keeps it (round 4, A: the shell opens another project in place); a link that names
// none is this project's.
const namesProject=href=>new URLSearchParams(href.split('#')[0].split('?')[1]||'').has('project');
// The module scope the shell holds (round 24, D-24-08: app.js keeps it in the address and the saved preference; '' is
// the whole design). An in-app link carries it as the project is carried: scopedHref sets the scope a link names to the
// one held now (or takes it out), unless the link was built to choose a scope of its own (data-scope-link). A link to
// another project carries none: a scope names a module of this project.
let scopeId='';
export const shellScopeId=()=>scopeId;
export function setShellScopeId(id){scopeId=typeof id==='string'?id:'';}
export function scopedHref(href,scope=scopeId){
  if(!href.startsWith('/?')||href.includes('view=projects'))return href;
  const [path,hash='']=href.split('#'),q=new URLSearchParams(path.slice(2));
  if((q.get('project')||'bank-payment')!==activeProjectId||(q.get('scope')||'')===scope)return href;
  if(scope)q.set('scope',scope);else q.delete('scope');
  return '/?'+q+(hash?'#'+hash:'');
}
export function scopeProjectLinks(root=document){if(new URLSearchParams(location.search).get('view')==='projects')return;for(const a of root.querySelectorAll('a[href]')){const href=a.getAttribute('href');let next=href;if((href.startsWith('/?')&&!href.includes('view=projects')&&!namesProject(href))||href.startsWith('/api/export'))next=projectURL(href);if(!a.hasAttribute('data-scope-link'))next=scopedHref(next);if(next!==href)a.setAttribute('href',next);}}
// A file from the export route, saved under the name the server gives it. The SDD's downloads come through here too
// (round 12, G, GR-UX-07), so the page can say it is building them while it waits. Round 26 (D-26-13): the one export
// mechanic for every Output document. A chapter's browser-only appendix (output-documents.js registerOutputAppendix: a
// private note, the view shown, candidates kept in this browser) is data it appends: `appendix.markdown` at the end of a
// Markdown file, `appendix.json` as the `browserExploration` member of a JSON file. Nothing of it becomes a saved record.
export async function downloadExport(path,fallback='AIW_Project',{appendix=null}={}){
  const response=await fetch(projectURL(path),{credentials:'same-origin'});
  if(!response.ok)throw Error('The export could not be prepared. Your saved project is unchanged.');
  let blob=await response.blob();
  if(appendix){const type=response.headers.get('Content-Type')||'';
    if(/markdown/.test(type)&&appendix.markdown)blob=new Blob([await blob.text(),appendix.markdown],{type});
    else if(/json/.test(type)&&appendix.json){try{const data=JSON.parse(await blob.text());if(data&&typeof data==='object'&&!Array.isArray(data)){data.browserExploration=appendix.json;blob=new Blob([JSON.stringify(data,null,2)],{type});}}catch{/* not a JSON object: saved as served */}}}
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]||fallback;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {bytes:blob.size,filename:a.download};
}
// A chapter's file by format, through the same mechanic (the workbench panel's contract and delivery exports).
export function exportProject(chapter,format){return downloadExport('/api/export?chapter='+chapter+'&format='+format,'AIW_Project.'+format);}

export const projectFetch=(path,options)=>fetch(projectURL(path),options);
// A background request or a part of the page that could not load (audit F2-15): the cause goes to the console and,
// unless `quiet` (the page already says what failed), the person is told on the page's notice line, which entry.js
// draws for the 'aiw:notice' event. Nothing is retried here.
export function reportFailure(message,error,{quiet=false}={}){
  if(typeof console!=='undefined')console.warn(message,error?.message||error||'');
  if(!quiet&&typeof window!=='undefined'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('aiw:notice',{detail:{message}}));
}
// The project document this page shows (audit F2-09, F2-26): the store's settled document. Every page creates its
// store through project-store.js, which registers it as window.aiwProjectStore; the former second name for the same
// document (the former aiwCurrentProject global) is gone.
export const currentProject=()=>typeof window==='undefined'?null:window.aiwProjectStore?.value?.document||null;
// The chapter in the page address (1 when none is given).
export const currentChapter=()=>Number(new URLSearchParams(location.search).get('chapter')||1);
// Links are scoped to the active project as they are followed. Installed once per page, removable (audit F2-05).
let linkScoping=null;
export function installProjectLinkScoping(){if(linkScoping||typeof document==='undefined')return;linkScoping=new AbortController();for(const event of ['click','auxclick'])document.addEventListener(event,e=>{const a=e.target.closest?.('a[href]');if(a)scopeProjectLinks({querySelectorAll:()=>[a]});},{capture:true,signal:linkScoping.signal});}
export function uninstallProjectLinkScoping(){linkScoping?.abort();linkScoping=null;}
installProjectLinkScoping();

export const projectFileName=name=>name.replace('AIW_Bank_Payment','AIW_'+(currentProject()?.name||'Project').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,100));

// The module scope the shell holds, as the screens read it (round 24, D-24-08; these lived in module-shell.js until the
// lead folded them in here, where the scope itself is kept, so a page loads one file fewer). app.js keeps the scope in
// the address, the saved preference and the history ('' is the whole design; shellScopeId); every surface reads it on
// the project on screen through these, and the lens itself is module-lens.js's, a function of the document that the
// server may load (module-lens.js never imports this file):
//   shellLens()                 -> the lens of the scope held now, or null for the whole design
//   inLens(list, keep)          -> a register's records the scope shows, the one shown now (`keep`) kept with them
//   scopedProject()             -> the project on screen as the Model tab reads it: its projection on the scope (the
//                                  saved document itself without one, so nothing changes without a scope)
//   followShell(S, {kind, has}) -> a chapter model's own module scope following the shell's (Chapters 4, 5, 6, 8, 10 and
//                                  the whole design): the group that realises the scope, while the reader has not
//                                  opened a part of it; never saved as the view's own (ownScope)

export const shellLens = () => scopeLens(currentProject(), shellScopeId());
export const inLens = (list, keep = null) => { const L = shellLens(); return L ? list.filter(x => (keep != null && x?.id === keep) || lensHolds(L, x)) : list; };
export const scopedProject = () => scopedDocument(currentProject(), shellScopeId());
export function followShell(S, {kind = 'module', has = id => architectureModel(scopedProject()).objects.has(id)} = {}) {
  const id = shellScopeId(), sc = S.scope || {kind: 'system'};
  if (!id) { if (sc.shell) S.scope = {kind: 'system'}; return S.scope; }
  if (sc.shell === id) return sc;
  if (sc.shell || sc.kind === 'system' || !has(sc.id)) {
    const groups = realisingGroups(currentProject(), id);
    S.scope = groups.length === 1 && has(groups[0]) ? {kind, id: groups[0], shell: id} : {kind: 'system', shell: id};
  }
  return S.scope;
}
export const ownScope = sc => (sc?.shell ? {kind: 'system'} : sc);
