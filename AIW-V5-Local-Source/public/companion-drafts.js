const snapshots=new Map();let active='';
const selectors='.guide-step input,.guide-step textarea,.guide-step select,[data-assurance-form] input,[data-assurance-form] textarea,[data-assurance-form] select';
const key=n=>n.name||[...n.attributes].find(a=>a.name.startsWith('data-guide-'))?.name;
export function captureCompanionDrafts(panel){if(!panel||!active)return;const values={};for(const n of panel.querySelectorAll(selectors)){if(n.type==='checkbox')continue;const k=key(n);if(k)values[k]=n.value;}snapshots.set(active,values);}
export function restoreCompanionDrafts(panel,context){active=context;const values=snapshots.get(active);if(!values)return;for(const n of panel.querySelectorAll(selectors)){const k=key(n);if(k in values&&n.type!=='checkbox')n.value=values[k];}}
export function clearCompanionDrafts(){snapshots.delete(active);}
if(typeof window!=='undefined')window.addEventListener('beforeunload',e=>{const inputs=[...document.querySelectorAll('.guide-step textarea,[data-assurance-form] textarea,[data-assurance-form] input[name=title]')];if(inputs.some(n=>n.value)){e.preventDefault();e.returnValue='';}});
