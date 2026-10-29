import {chapterOfRecord} from './chapter-records.js';
import {CHAPTER_TITLES} from './chapter-names.js';
import {architectureModel,typedRecordedRelationships} from './architecture-model.js';

const SOURCES={4:['logical','connections'],5:['realisation','connections'],6:['technology','dependencies']};
// Read the same relationship typing as Model and Validate on a temporary candidate.
// No command, record, choice, or endpoint is changed by this projection.
export function relationshipVerbOptions(p,{chapter,from,to,values=[]}){
  const path=SOURCES[chapter];if(!path)return values.map(value=>({value,allowed:true,known:false}));
  const objects=architectureModel(p).objects,a=objects.get(from),b=objects.get(to);
  if(!a||!b)return values.map(value=>({value,allowed:true,known:false,reason:'Choose two recorded endpoints to check their relationship types.'}));
  return values.map(value=>{
    let reason=from===to?'Choose two different records.':'';
    // These endpoint restrictions are the owning domain command's rules, before notation typing.
    if(chapter===4&&![a.type,b.type].includes('responsibility'))reason='A logical connection must include a responsibility.';
    if(chapter===5&&![a.type,b.type].includes('component'))reason='An application interaction must include a component.';
    if(chapter===6&&![a.type,b.type].includes('capability'))reason='A technology connection must include a capability.';
    if(chapter===6&&['dependency','trust','resilience'].includes(value)&&![a,b].every(o=>o.type==='capability'))reason='Required service, trust and recovery links connect two capabilities. Use application mappings for support.';
    const record={id:'__link_picker_candidate__',from,to,...(chapter===4?{kind:value}:chapter===5?{interaction:value,kind:['sync','event','scheduled'].includes(value)?'flow':'trace'}:{type:value})};
    const candidate={...p,[path[0]]:{...p[path[0]],[path[1]]:[record]}};
    const typed=typedRecordedRelationships(candidate,{chapter}).find(r=>r.id===record.id&&r.source===path.join('.'));
    if(typed&&!typed.archimate.valid)reason=typed.archimate.rule;
    return {value,allowed:!reason,known:!!typed,reason,relationship:typed?.archimate.type||null};
  });
}
function filterRelationshipVerbs(dialog,p){
  for(const [id,chapter,field] of [['l-connection-form',4,'kind'],['a-interaction-form',5,'interaction'],['t-dependency-form',6,'type']]){
    const form=dialog.querySelector('#'+id),from=form?.querySelector('[name="from"]'),to=form?.querySelector('[name="to"]'),verb=form?.querySelector('[name="'+field+'"]');
    if(!from||!to||!verb||verb.dataset.typedPicker)continue;
    verb.dataset.typedPicker='true';const options=[...verb.options];
    const status=document.createElement('small');status.className='link-picker-status';status.setAttribute('role','status');verb.after(status);
    const update=()=>{
      const selected=verb.value,read=relationshipVerbOptions(p,{chapter,from:from.value,to:to.value,values:options.map(o=>o.value)}),byValue=new Map(read.map(r=>[r.value,r]));
      for(const option of options){const r=byValue.get(option.value);option.hidden=!!r&&!r.allowed&&option.value!==selected;option.disabled=!!r&&!r.allowed&&option.value!==selected;}
      // Keep even a formerly valid selection visible; require an explicit correction rather than silently replacing it.
      verb.value=selected;const held=byValue.get(selected),valid=read.filter(r=>r.allowed);
      const problem=held&&!held.allowed?'This relationship does not fit the selected endpoints. '+held.reason:'';
      verb.setCustomValidity(problem);status.textContent=problem||(read.some(r=>!r.known)?'Choose two recorded endpoints to check their relationship types.':valid.length+' relationship types fit these endpoints under the recorded model rules. This does not establish design suitability.');
    };
    from.addEventListener('change',update);to.addEventListener('change',update);verb.addEventListener('change',update);update();
  }
}

// Keep native selects and their exact submitted IDs; search and chapter groups only narrow the visible choices.
export function decorateLinkPickers(dialog,p){
  if(!p||!dialog?.querySelectorAll)return;
  const here=Number(new URLSearchParams(typeof location==='undefined'?'':location.search).get('chapter')||1);
  for(const select of dialog.querySelectorAll('select[name="from"],select[name="to"]')){
    if(select.dataset.groupedPicker)return;
    const entries=[...select.options].map(o=>({node:o,chapter:chapterOfRecord(p,o.value)}));
    if(!entries.some(x=>x.chapter))continue;
    const selected=select.value;select.dataset.groupedPicker='true';const groups=new Map();
    for(const e of entries){if(!e.node.value)continue;const ch=e.chapter||0;if(!groups.has(ch))groups.set(ch,[]);groups.get(ch).push(e.node);}
    for(const [ch,options] of [...groups].sort(([a],[b])=>(a===here?-1:0)-(b===here?-1:0)||(a||99)-(b||99))){const group=document.createElement('optgroup');group.label=ch?'Chapter '+ch+' · '+(CHAPTER_TITLES[ch]||'Records'):'Other connected objects';for(const option of options)group.append(option);select.append(group);}
    select.value=selected;
    const search=document.createElement('input');search.type='search';search.className='link-picker-search';search.placeholder='Find a reference or record name';search.setAttribute('aria-label','Find '+(select.name==='from'?'source':'destination')+' object');
    const status=document.createElement('small');status.className='link-picker-status';status.setAttribute('role','status');
    const filter=()=>{const words=search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);let count=0;for(const {node} of entries){const on=!node.value||node.value===select.value||words.every(w=>(node.textContent+' '+node.value).toLowerCase().includes(w));node.hidden=!on;if(on&&node.value)count++;}for(const group of select.querySelectorAll('optgroup'))group.hidden=![...group.children].some(o=>!o.hidden);status.textContent=count+' matching records. The current choice stays visible.';};
    search.addEventListener('input',filter);select.addEventListener('change',filter);select.before(search);select.after(status);filter();
  }
  filterRelationshipVerbs(dialog,p);
}
