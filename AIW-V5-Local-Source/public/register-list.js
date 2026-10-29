import {esc} from './html-escape.js';
import {lensHolds} from './module-lens.js';
import {shellLens} from './project-context.js';

// A small, bounded register view. Filtering updates only the rows, so typing does not
// rebuild the chapter shell, lose keyboard focus, or draw thousands of records at once.
// Round 24 (D-24-08): while the shell holds a module scope, a register lists what the scope shows (project-context.js, module-lens.js: its
// records and the shared ones it touches; a link row when the records at both its ends are shown) and says so.
export function createRegisterList(prefix,actionAttribute,size=40){
 const queries=new Map(),limits=new Map();
 const id=key=>'register-'+prefix+'-'+key.replace(/[^a-z0-9-]/gi,'-');
 function page(items,key,searchText){
  const lens=shellLens(),scoped=lens?items.filter(item=>lensHolds(lens,item)):items;
  const term=(queries.get(key)||'').trim().toLocaleLowerCase();
  const matched=term?scoped.filter(item=>String(searchText(item)||'').toLocaleLowerCase().includes(term)):scoped;
  const count=Math.max(size,limits.get(key)||size);
  return {rows:matched.slice(0,count),total:matched.length,hidden:Math.max(0,matched.length-count),key,query:term,scope:lens?.title||''};
 }
 function wrap(page,key,label,rows){
  const count=page.rows.length,summary=page.total===0?(page.query?'No matching '+label.toLocaleLowerCase():'No '+label.toLocaleLowerCase()+' yet')+(page.scope?' in '+page.scope:'')+'.':`Showing ${count} of ${page.total} ${label.toLocaleLowerCase()}${page.scope?' in '+page.scope:''}.`;
  const more=page.hidden?`<p class="l-pager"><button type="button" class="btn" ${actionAttribute}="register-more" data-register-more="${esc(prefix+':'+key)}">Show ${Math.min(size,page.hidden)} more</button><small>${page.hidden} remaining</small></p>`:'';
  return `<section data-register-key="${esc(prefix+':'+key)}"><label class="l-field"><span>Find ${esc(label.toLocaleLowerCase())}</span><input type="search" data-register-search="${esc(prefix+':'+key)}" value="${esc(queries.get(key)||'')}" placeholder="Search by name, reference, or detail" aria-controls="${id(key)}" autocomplete="off"></label><p class="l-note" data-register-summary role="status">${esc(summary)}</p><div id="${id(key)}" data-register-rows>${rows}${more}</div></section>`;
 }
 function update(control,render){
  const key=(control.dataset.registerSearch||control.dataset.registerMore||'').slice(prefix.length+1);
  const container=control.closest('[data-register-key]');
  if(!container||container.dataset.registerKey!==prefix+':'+key)return false;
  if(control.dataset.registerSearch){queries.set(key,control.value);limits.set(key,size)}
  else limits.set(key,(limits.get(key)||size)+size);
  const fragment=document.createElement('template');fragment.innerHTML=render(key);
  const next=[...fragment.content.querySelectorAll('[data-register-key]')].find(el=>el.dataset.registerKey===prefix+':'+key);
  if(!next)return false;
  container.querySelector('[data-register-summary]').textContent=next.querySelector('[data-register-summary]').textContent;
  container.querySelector('[data-register-rows]').innerHTML=next.querySelector('[data-register-rows]').innerHTML;
  return true;
 }
 return {page,wrap,update,prefix};
}
