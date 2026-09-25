// Capture once: a different tab cannot silently redirect this tab's saves.
export const activeProjectId=typeof location==='undefined'?'bank-payment':new URLSearchParams(location.search).get('project')||'bank-payment';
export function projectURL(path,id=activeProjectId){
  const url=new URL(path,typeof location==='undefined'?'http://aiw.local':location.origin);
  if(id!=='bank-payment')url.searchParams.set('project',id);
  return url.pathname+url.search+url.hash;
}
export const projectPreferenceKey=key=>activeProjectId==='bank-payment'?key:key+':'+activeProjectId;
export function recordProjectLocation(){try{localStorage.setItem('aiw-project-location:'+activeProjectId,projectURL(location.pathname+location.search));}catch{}}
export function resumeProjectURL(id){try{const raw=localStorage.getItem('aiw-project-location:'+id);if(raw&&raw.startsWith('/?chapter='))return projectURL(raw,id);}catch{}return projectURL('/?chapter=1&tab=work',id);}
export function scopeProjectLinks(root=document){if(new URLSearchParams(location.search).get('view')==='projects')return;for(const a of root.querySelectorAll('a[href]')){const href=a.getAttribute('href');if((href.startsWith('/?')&&!href.includes('view=projects'))||href.startsWith('/api/export'))a.setAttribute('href',projectURL(href));}}
export async function exportProject(chapter,format){
  const response=await fetch(projectURL('/api/export?chapter='+chapter+'&format='+format),{credentials:'same-origin'});
  if(!response.ok)throw Error('The export could not be prepared. Your saved project is unchanged.');
  const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]||'AIW_Project.'+format;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {bytes:blob.size,filename:a.download};
}

export const projectFetch=(path,options)=>fetch(projectURL(path),options);
if(typeof document!=='undefined')for(const event of ['click','auxclick'])document.addEventListener(event,e=>{const a=e.target.closest?.('a[href]');if(a)scopeProjectLinks({querySelectorAll:()=>[a]});},true);

export const projectFileName=name=>name.replace('AIW_Bank_Payment','AIW_'+(typeof window!=='undefined'?window.aiwCurrentProject?.name||'Project':'Project').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,100));
