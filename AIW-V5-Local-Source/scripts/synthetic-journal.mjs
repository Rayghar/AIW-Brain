// A synthetic change history of a drafted design's shape (round 12, PS-12), for the size-and-speed suite and the journal
// archive suite. No client text: every change is generated from the project's own records, with the shapes the trackers
// record — a requirement's change listing its affected records with the standard reasons (changes-domain.js), an
// interface or data definition's change listing them with their reasons (interface-impact.js) — and most records changed
// more than once, so that most changes are superseded, as in a design drafted and corrected for weeks. Some affected
// records of the latest changes carry a review (current, stale or a follow-up), so the journal's states are all present.
//   addSyntheticJournal(p, {events, sources, items, reviewed, seed}) adds the changes to p (in place) and
//   answers what it added: {events, superseded, items}.
import {changeTargetStamp,CHANGE_REASONS,withChanges} from '../public/changes-domain.js';
import {CHAPTER_TITLES} from '../public/chapter-names.js';
import {memoPass} from '../public/document-memo.js';

const LISTS={2:p=>p.quality?.drivers,3:p=>p.decisions?.records,4:p=>p.logical?.responsibilities,5:p=>p.realisation?.components,6:p=>p.technology?.capabilities,7:p=>p.technologyRealisation?.records,8:p=>[...(p.interfaces?.contracts||[]),...(p.interfaces?.data||[])],9:p=>p.security?.controls,10:p=>p.runtime?.plans};
const INTERFACE_REASONS=['This data definition is changing. Review its meaning, stable keys, classification, and dictionary.','This recorded payload or derivation is linked to the changed definition. Review its mapping and meaning.','This participant calls the changed contract. Review the payload and response assumptions at this boundary.','This requirement is traced through the participating application. Check that the proposed exchange still supports its acceptance criteria.','This control names an affected boundary, data definition, or application. Review enforcement, data exposure, and verification scope.','This operating plan supports an affected participant. Review rollout order, compatibility, monitoring, and rollback obligations.'];
// A small deterministic generator (the same seed, the same history).
function random(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

export function addSyntheticJournal(p,{events=4000,sources=1500,items=25,reviewed=0.02,seed=12,at='2026-10-02T09:00:00.000Z'}={}){
  const rnd=random(seed),pick=xs=>xs[Math.floor(rnd()*xs.length)];
  withChanges(p);
  const requirements=p.artefacts.filter(a=>a.type==='requirement'),interfaces=[...(p.interfaces?.contracts||[]).map(r=>({r,kind:'contract'})),...(p.interfaces?.data||[]).map(r=>({r,kind:'data'}))];
  if(!requirements.length)throw Error('The project needs requirements to change.');
  const records=Object.fromEntries(Object.entries(LISTS).map(([c,f])=>[c,(f(p)||[]).filter(r=>r?.id)]));
  const chapters=Object.keys(records).filter(c=>records[c].length).map(Number);
  // The records that change: requirements and interface definitions, each changed once or more (most more than once).
  // A fifth of them interface and data definitions, the rest requirements; each changed once, then the remaining changes
  // fall on records already changed, which supersedes their earlier change.
  const ints=Math.min(interfaces.length,Math.round(sources/5)),reqs=Math.min(requirements.length,sources-ints);
  const pool=[...requirements.slice(0,reqs).map(r=>({r,kind:'requirement'})),...interfaces.slice(0,ints)];
  const order=[];for(let i=0;i<events;i++)order.push(i<pool.length?pool[i]:pick(pool));
  const stamps=new Map(),stampOf=(chapter,id)=>{const key=chapter+':'+id;if(!stamps.has(key))stamps.set(key,changeTargetStamp(p,{chapter,id}));return stamps.get(key);};
  const time=n=>new Date(Date.parse(at)+n*60000).toISOString();
  let total=0;
  const made=memoPass(p,()=>order.map((s,n)=>{
    const count=rnd()<0.3?0:Math.max(1,Math.round(items*(0.2+rnd()*1.6)*(rnd()<0.05?8:1))),seen=new Set(),list=[];
    for(let k=0;k<count*3&&list.length<count;k++){const chapter=pick(chapters),r=pick(records[chapter]);const key=chapter+':'+r.id;if(seen.has(key))continue;seen.add(key);
      const via=[s.r.ref||s.r.id,r.ref||r.id];
      if(s.kind==='requirement')list.push({id:r.id,ref:r.ref||r.id,title:r.title||r.question||r.id,via,chapter,chapterTitle:CHAPTER_TITLES[chapter],key,why:CHANGE_REASONS[chapter],capturedStamp:stampOf(chapter,r.id),reviews:[]});
      else{const reasons=[pick(INTERFACE_REASONS),...(rnd()<0.3?[pick(INTERFACE_REASONS)]:[])].filter((x,i,a)=>a.indexOf(x)===i);list.push({key,chapter,chapterTitle:CHAPTER_TITLES[chapter],id:r.id,ref:r.ref||r.id,title:r.title||r.question||r.id,why:reasons.join(' '),reasons,via,capturedStamp:stampOf(chapter,r.id),reviews:[]});}
    }
    list.sort((a,b)=>a.chapter-b.chapter||String(a.ref).localeCompare(String(b.ref)));total+=list.length;
    const title=s.r.title||s.r.id,before={title,description:'Wording '+n+' (synthetic)'},after={title,description:'Wording '+(n+1)+' (synthetic)'};
    const fields=[{key:'description',label:'Required behaviour',before:before.description,after:after.description}];
    return s.kind==='requirement'
      ?{requirementId:s.r.id,title,at:time(n),before,after,fields,items:list,actor:'synthetic-architect'}
      :{source:{chapter:8,id:s.r.id,ref:s.r.ref||s.r.id,kind:s.kind,title},title,at:time(n),before,after,fields,items:list,preview:{reviewed:true,findings:{introduced:[],resolved:[],existing:0},signals:[]},actor:'synthetic-architect'};
  }));
  for(const e of made)p.changes.events.push({id:'CHG-'+String(++p.changes.counter).padStart(3,'0'),...e});
  // Reviews on some affected records of the latest changes: current, stale (recorded against an earlier stamp) and
  // follow-ups, so every state the journal reads is present.
  const last=new Map();p.changes.events.forEach((e,i)=>last.set(JSON.stringify(e.source?[e.source.chapter,e.source.id]:[1,e.requirementId]),i));
  let k=0;for(const i of last.values()){const e=p.changes.events[i];for(const item of e.items){if(rnd()>=reviewed)continue;k++;const kind=k%3;item.reviews.push({at:time(events+k),outcome:kind===2?'follow-up':'unchanged',reviewer:'Synthetic reviewer',rationale:'Synthetic review of a generated change.',evidence:'Synthetic',owner:kind===2?'Synthetic owner':'',action:kind===2?'Synthetic follow-up':'',targetStamp:kind===1?'stale:'+item.capturedStamp:item.capturedStamp});}}
  return {events:made.length,superseded:p.changes.events.length-last.size,items:total};
}
