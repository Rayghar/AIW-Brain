// AIW Anatomy concept — model normalization and layout.
// One stable body (modules as columns), depth as strata (bands), lenses as overlays.
const AN={};
(function(){
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
AN.esc=esc;
AN.STRATA=[
 {id:'intent',label:'Intent',sub:'Why it exists — requirements, qualities and decisions',ch:1,color:'#8a6d3b'},
 {id:'logical',label:'Logical application',sub:'What each part must do',ch:4,color:'#286954'},
 {id:'application',label:'Application realization',sub:'The software that does it',ch:5,color:'#2f6177'},
 {id:'capability',label:'Logical technology',sub:'Platform support it stands on',ch:6,color:'#66733a'},
 {id:'technology',label:'Technology realization',sub:'Products that provide that support',ch:7,color:'#7a5f33'},
 {id:'runtime',label:'Runtime',sub:'Where it runs and what fails together',ch:10,color:'#3f6d86'}
];
AN.LENSES=[
 {id:'structure',label:'Structure',q:'What holds it together?',anatomy:'Skeleton',ch:1},
 {id:'flow',label:'Flow',q:'How does work move through it?',anatomy:'Muscles',ch:4},
 {id:'signals',label:'Signals',q:'How do parts talk — and react when a call fails?',anatomy:'Nervous system',ch:8},
 {id:'information',label:'Information',q:'Who owns which data, and where does it travel?',anatomy:'Circulation',ch:8},
 {id:'protection',label:'Protection',q:'What defends it, and what is still exposed?',anatomy:'Immune system',ch:9},
 {id:'operation',label:'Operation',q:'Where does it run, and what fails together?',anatomy:'Vital signs',ch:10},
 {id:'reasoning',label:'Reasoning',q:'Why is it shaped this way?',anatomy:'DNA',ch:1}
];
AN.CHAPTERS=[
 [1,'Requirements','It starts with needs. Requirements say what the solution must achieve — not yet how.'],
 [2,'Quality drivers','Qualities make “good” measurable — speed, integrity, availability. They will shape every layer below.'],
 [3,'Decisions','Decisions record the big choices and their trade-offs before any structure is drawn.'],
 [4,'Logical application','The body takes shape: responsibilities grouped into modules — what each part must do, independent of technology.'],
 [5,'Application realization','Software components wrap the responsibilities they realize. The logical design is now embedded in deployable parts.'],
 [6,'Logical technology','Beneath the components sits the platform they stand on. Shared capabilities form the skeleton across modules.'],
 [7,'Technology realization','Each capability is given a product. Hatched plates are choices not yet made.'],
 [8,'Interfaces & data','The nervous system appears: a contract on every interaction and an owner for every piece of data.'],
 [9,'Security','Protection wraps the body: trust boundaries, controls on contracts and data, and threats still uncovered.'],
 [10,'Deployment & runtime','The body is placed in the world: where each part runs, how many copies, and what fails together.'],
 [11,'Review & realize','The whole design with its remaining holes. Every gap is a question for the next design conversation.']
];
AN.CH={requirement:1,quality:2,decision:3,module:4,responsibility:4,component:5,party:5,capability:6,technology:7,contract:8,data:8,boundary:9,control:9,threat:9,runtime:10,instance:10,zone:10};
AN.TYPE_LABEL={requirement:'Requirement',quality:'Quality scenario',decision:'Decision',module:'Module',responsibility:'Responsibility',component:'Application component',party:'External participant',capability:'Technology capability',technology:'Technology realization',runtime:'Operating plan',instance:'Placement',zone:'Zone',contract:'Interface contract',data:'Data',control:'Control',threat:'Threat',boundary:'Trust boundary',option:'Option'};

AN.normalize=function(ds){
 const byId=new Map(ds.objects.map(o=>[o.id,{...o}]));
 const rels=[],seen=new Set();
 for(const r of ds.rels){if(!byId.has(r.from)||!byId.has(r.to))continue;const k=r.type+'|'+r.from+'|'+r.to;if(seen.has(k))continue;seen.add(k);rels.push(r);}
 const out=new Map(),inn=new Map(),push=(m,k,v)=>{if(!m.has(k))m.set(k,[]);m.get(k).push(v);};
 for(const r of rels){push(out,r.type+'|'+r.from,r);push(inn,r.type+'|'+r.to,r);}
 const O=(t,id)=>(out.get(t+'|'+id)||[]).map(r=>r.to),I=(t,id)=>(inn.get(t+'|'+id)||[]).map(r=>r.from),T=id=>byId.get(id)?.type;
 const of=t=>ds.objects.filter(o=>o.type===t).map(o=>byId.get(o.id));
 const M={ds,byId,rels,O,I,T,modules:of('module'),parties:of('party'),resp:of('responsibility'),comp:of('component'),cap:of('capability'),tech:of('technology'),run:of('runtime'),inst:of('instance'),zones:of('zone'),contracts:of('contract'),data:of('data'),controls:of('control'),threats:of('threat'),bounds:of('boundary'),reqs:of('requirement'),qds:of('quality'),adrs:of('decision')};
 const modSet=new Set(M.modules.map(m=>m.id));
 M.mod=new Map();
 for(const r of M.resp){const m=(r.modules||[]).find(x=>modSet.has(x))||O('memberOf',r.id).find(x=>modSet.has(x));if(m)M.mod.set(r.id,m);}
 for(const c of M.comp){let m=(c.modules||[]).find(x=>modSet.has(x));if(!m)m=M.mod.get(I('realizedBy',c.id)[0]);if(m)M.mod.set(c.id,m);}
 M.realizedBy=new Map(M.resp.map(r=>[r.id,O('realizedBy',r.id).filter(x=>T(x)==='component')]));
 M.realizes=new Map(M.comp.map(c=>[c.id,I('realizedBy',c.id).filter(x=>T(x)==='responsibility')]));
 M.needs=new Map(M.comp.map(c=>[c.id,O('requires',c.id).filter(x=>T(x)==='capability')]));
 M.capUsers=new Map(M.cap.map(c=>[c.id,I('requires',c.id).filter(x=>T(x)==='component')]));
 M.techOf=new Map(M.cap.map(c=>[c.id,O('implementedBy',c.id).find(x=>T(x)==='technology')]));
 M.capOf=new Map();for(const [c,t] of M.techOf)if(t)M.capOf.set(t,c);
 M.runsOf=new Map();for(const r of M.run){const a=I('operatedAs',r.id).find(x=>byId.has(x))||r.asset;r.asset=a;push(M.runsOf,a,r.id);}
 M.placements=new Map(M.run.map(r=>[r.id,O('placedAs',r.id).map(id=>byId.get(id)).filter(Boolean)]));
 for(const pl of M.inst)pl.zoneId=O('locatedIn',pl.id)[0]||pl.zone;
 const actor=id=>['component','party'].includes(T(id));
 M.flows=[];const fk=new Set();
 for(const r of rels.filter(r=>r.type==='interaction'&&actor(r.from)&&actor(r.to))){const k=r.from+'>'+r.to;if(fk.has(k))continue;fk.add(k);const c=M.contracts.find(c=>I('uses',c.id).includes(r.from)&&I('provides',c.id).includes(r.to));M.flows.push({id:'F:'+k,from:r.from,to:r.to,label:c?.title||r.label,contract:c?.id||null,async:/event|async/i.test(c?.style||'')});}
 M.lflows=[];for(const r of rels.filter(r=>r.type==='interaction'&&T(r.from)==='responsibility'&&T(r.to)==='responsibility')){const k=r.from+'>'+r.to;if(fk.has(k))continue;fk.add(k);M.lflows.push({id:'L:'+k,from:r.from,to:r.to,label:r.label});}
 M.owner=new Map();M.owned=new Map();for(const d of M.data){const a=I('owns',d.id).find(x=>byId.has(x))||d.authority;M.owner.set(d.id,a);if(a)push(M.owned,a,d.id);}
 M.exch=new Map(M.contracts.map(c=>[c.id,O('exchanges',c.id).filter(x=>T(x)==='data')]));
 M.protects=new Map();for(const c of M.controls)for(const t of O('protects',c.id))push(M.protects,t,c.id);
 M.threatsOn=new Map();for(const t of M.threats)for(const x of O('threatens',t.id))push(M.threatsOn,x,t.id);
 M.mitig=new Map(M.threats.map(t=>[t.id,I('mitigates',t.id)]));
 M.inBound=new Map();for(const b of M.bounds)for(const x of I('withinBoundary',b.id))push(M.inBound,x,b.id);
 M.why=id=>({reqs:I('fulfils',id).filter(x=>T(x)==='requirement'),qds:I('constrains',id).filter(x=>T(x)==='quality'),adrs:I('justifies',id).filter(x=>T(x)==='decision')});
 M.options=new Map(M.tech.map(t=>[t.id,O('considers',t.id).map(id=>byId.get(id)).filter(Boolean)]));
 const order=M.modules.map(m=>m.id);
 const side=p=>{const peers=[...O('interaction',p.id),...I('interaction',p.id)].map(x=>order.indexOf(M.mod.get(x))).filter(i=>i>=0);const avg=peers.length?peers.reduce((a,b)=>a+b,0)/peers.length:order.length;return avg<(order.length-1)/2?'L':'R';};
 const L=M.parties.filter(p=>side(p)==='L'),R=M.parties.filter(p=>side(p)==='R');
 M.cols=[...(L.length?[{id:'EXT-L',ext:true,title:'Outside the system',parties:L}]:[]),...M.modules.map(m=>({id:m.id,title:m.title,desc:m.description,mod:m})),...(R.length?[{id:'EXT-R',ext:true,title:'Outside the system',parties:R}]:[])];
 M.colOf=new Map();for(const c of M.cols)if(c.ext)for(const p of c.parties)M.colOf.set(p.id,c.id);
 for(const [id,m] of M.mod)M.colOf.set(id,m);
 M.zoneColor=new Map(M.zones.map((z,i)=>[z.id,['#3c7b8f','#7a6aa6','#b0843a','#5f8a4e'][i%4]]));
 M.boundColor=new Map(M.bounds.map((b,i)=>[b.id,['#3f7fa0','#8f5a76','#b07a2a','#5d7f3e','#7b6aa8'][i%5]]));
 M.scenarios=ds.scenarios||[];
 return M;
};

// ---- Layout -------------------------------------------------------------------------------
// Returns absolute rects in world coordinates for every drawable item.
AN.layout=function(S,viewW){
 const M=S.M,ch=S.chapter,shown=t=>ch>=(AN.CH[t]||1),G=150,GAP=10,items=[],R=new Map();
 const add=(it)=>{items.push(it);if(it.id&&!R.has(it.id))R.set(it.id,it);return it;};
 const cols=ch>=4?M.cols:[{id:'BRIEF',title:'The brief',brief:true}];
 const nMod=cols.filter(c=>!c.ext).length,nExt=cols.length-nMod,avail=Math.max(760,viewW-G-40);
 let base=Math.max(118,Math.min(330,(avail-nExt*160-GAP*(cols.length-1))/Math.max(1,nMod)));
 const extW=base>=170?160:Math.max(110,base);if(base<170)base=Math.max(118,Math.min(330,(avail-nExt*extW-GAP*(cols.length-1))/Math.max(1,nMod)));
 const others=(cols.length-1)*(72+GAP),focusW=Math.max(540,avail-others);
 const width=c=>c.brief?Math.max(760,avail):S.focus?(c.id===S.focus?focusW:72):(c.ext?extW:base);
 let x=G+14;const colX=new Map(),colW=new Map();
 for(const c of cols){colX.set(c.id,x);colW.set(c.id,width(c));x+=width(c)+GAP;}
 const worldW=x+20;
 const narrow=id=>colW.get(id)<170,spine=id=>colW.get(id)<100;
 const next=AN.STRATA.filter(s=>s.ch>ch).sort((a,b)=>a.ch-b.ch)[0]?.id||null;
 const mode=s=>{if(s.id==='intent')return (S.lens==='reasoning'||ch<=3||S.peel==='intent')?'full':'summary';if(ch<s.ch)return s.id===next?'next':'future';if(S.peel&&S.peel!==s.id)return 'compact';if(S.peel===s.id||(S.lens==='operation'&&s.id==='runtime'))return 'peel';return 'normal';};
 let y=12;
 // module header band
 const HH=S.focus?64:60;
 for(const c of cols){add({kind:'mhead',id:'H:'+c.id,col:c,x:colX.get(c.id),y,w:colW.get(c.id),h:HH,spine:spine(c.id)});}
 y+=HH+8;
 const bands=[];
 const inCol=(list,cid)=>list.filter(o=>M.colOf.get(o.id)===cid);
 // helpers for stacking items inside a column
 const stack=(cid,top,defs,itemH,m)=>{ // defs: [{obj,h}]
  const sp=spine(cid),w=colW.get(cid)-(sp?10:16),perRow=(!narrow(cid)&&w>=560)?(w>=860?3:2):1,cw=(w-(perRow-1)*8)/perRow;let yy=top,rowH=0,k=0;const placed=[];
  for(const d0 of defs){const d=sp?{...d0,spine:true,compact:true}:d0,h=sp?12:(d.h??itemH);const cx=colX.get(cid)+(sp?5:8)+(k%perRow)*(cw+8);placed.push({...d,x:cx,y:yy,w:cw,h});rowH=Math.max(rowH,h);k++;if(k%perRow===0){yy+=rowH+(sp?5:8);rowH=0;}}
  if(k%perRow)yy+=rowH+(sp?5:8);return {placed,bottom:yy};
 };
 const chipRows=(n,w)=>n?Math.ceil(n/Math.max(1,Math.floor((w-16)/118))):0;
 for(const s of AN.STRATA){
  const md=mode(s),top=y,pad=12;let h=0;const bandItems=[];
  if(md==='future'){h=30;}
  else if(s.id==='intent'){
   for(const c of cols){
    let objs;
    if(c.brief)objs=[...M.reqs,...M.qds,...M.adrs].filter(o=>shown(o.type));
    else if(c.ext)objs=[];
    else{const ids=new Set();for(const r of M.resp.filter(r=>M.mod.get(r.id)===c.id)){const w=M.why(r.id);[...w.reqs,...w.qds,...w.adrs].forEach(i=>ids.add(i));}
     objs=[...ids].map(i=>M.byId.get(i)).filter(o=>shown(o.type)).sort((a,b)=>['requirement','quality','decision'].indexOf(a.type)-['requirement','quality','decision'].indexOf(b.type));}
    if(md==='summary'){if(!objs.length)continue;const cnt={requirement:0,quality:0,decision:0};objs.forEach(o=>cnt[o.type]++);const label=[cnt.requirement&&cnt.requirement+' REQ',cnt.quality&&cnt.quality+' QD',cnt.decision&&cnt.decision+' ADR'].filter(Boolean).join(' · ');bandItems.push({kind:'count',id:'CNT:intent:'+c.id,x:colX.get(c.id)+8,y:top+pad,w:colW.get(c.id)-16,h:24,label,why:objs.map(o=>o.id)});h=Math.max(h,24);continue;}
    const nar=narrow(c.id);const st=stack(c.id,top+pad,objs.map(o=>({kind:'intent',obj:o,id:o.id,two:nar})),nar?34:24);bandItems.push(...st.placed);h=Math.max(h,st.bottom-top-pad);
   }
  }
  else if(s.id==='logical'){
   if(md==='next'){for(const c of cols.filter(c=>!c.ext&&!c.brief))bandItems.push({kind:'socket',next:true,id:'S:logical:'+c.id,x:colX.get(c.id)+8,y:top+pad,w:colW.get(c.id)-16,h:36,label:'Chapter 4 · What must this part do?'});if(ch<4)bandItems.push({kind:'socket',next:true,id:'S:logical:all',x:colX.get(cols[0].id)+8,y:top+pad,w:colW.get(cols[0].id)-16,h:36,label:'Chapter 4 · Responsibilities are grouped into modules — the body takes shape'});h=36;}
   else for(const c of cols.filter(c=>!c.ext)){const list=inCol(M.resp,c.id);const nar=narrow(c.id)&&md!=='compact',hh=md==='compact'?24:nar?36:md==='peel'?70:48;const st=stack(c.id,top+pad,list.map(o=>({kind:'resp',obj:o,id:o.id,compact:md==='compact'||nar,two:nar,peel:md==='peel'})),hh);bandItems.push(...st.placed);h=Math.max(h,st.bottom-top-pad);}
  }
  else if(s.id==='application'){
   for(const c of cols){
    if(c.ext){if(!shown('party'))continue;const nar=narrow(c.id)&&md!=='compact';const st=stack(c.id,top+pad,c.parties.map(o=>({kind:'party',obj:o,id:o.id,compact:md==='compact'||nar,two:nar})),md==='compact'?24:nar?36:44);bandItems.push(...st.placed);h=Math.max(h,st.bottom-top-pad);continue;}
    if(md==='next'){const n=inCol(M.resp,c.id).length;if(n)bandItems.push({kind:'socket',next:true,id:'S:app:'+c.id,x:colX.get(c.id)+8,y:top+pad,w:colW.get(c.id)-16,h:40,label:'Chapter 5 · Which component realizes '+(n===1?'this responsibility':'these '+n+' responsibilities')+'?'});h=Math.max(h,40);continue;}
    const list=inCol(M.comp,c.id),defs=[];const nar=narrow(c.id)&&md!=='compact',compact=md==='compact'||nar;const w=colW.get(c.id)-16;
    for(const o of list){const emb=(M.realizes.get(o.id)||[]).length,data=S.lens==='information'&&shown('data')?(M.owned.get(o.id)||[]).length:0;const hh=nar?36:compact?24:(md==='peel'?62:44)+chipRows(emb,w)*21+chipRows(data,w)*21;defs.push({kind:'comp',obj:o,id:o.id,compact,two:nar,peel:md==='peel',h:hh});}
    if(ch>=5)for(const r of inCol(M.resp,c.id))if(!(M.realizedBy.get(r.id)||[]).length)defs.push({kind:'socket',id:'GAP:realize:'+r.id,h:md==='compact'?24:nar?44:40,label:(nar?'No component for ':'No component realizes ')+r.title,gapFor:r.id,two:nar});
    const st=stack(c.id,top+pad,defs,44);bandItems.push(...st.placed);h=Math.max(h,st.bottom-top-pad);
   }
  }
  else if(s.id==='capability'||s.id==='technology'){
   if(md==='next'&&s.id==='capability'){for(const c of cols.filter(c=>!c.ext&&!c.brief)){if(inCol(M.comp,c.id).length)bandItems.push({kind:'socket',next:true,id:'S:cap:'+c.id,x:colX.get(c.id)+8,y:top+pad,w:colW.get(c.id)-16,h:34,label:'Chapter 6 · What platform support do these components need?'});}h=34;}
   else{
    const lanes=AN.capLanes(M,cols,colX,colW,ch);
    const hh=md==='compact'?22:md==='peel'?44:30;
    for(const L of lanes){
     const yy=top+pad+L.lane*(hh+6);
     if(s.id==='capability')bandItems.push({kind:'cap',obj:L.cap,id:L.cap.id,x:L.x,y:yy,w:L.w,h:hh,compact:md==='compact',peel:md==='peel',users:L.users,orphan:L.orphan,attach:L.attach});
     else{const t=M.techOf.get(L.cap.id);if(md==='next')bandItems.push({kind:'socket',next:true,id:'S:tech:'+L.cap.id,x:L.x,y:yy,w:L.w,h:hh,label:'Chapter 7 · Which product provides '+L.cap.title+'?'});
      else if(t)bandItems.push({kind:'tech',obj:M.byId.get(t),id:t,x:L.x,y:yy,w:L.w,h:hh,compact:md==='compact',peel:md==='peel'});
      else bandItems.push({kind:'socket',id:'GAP:tech:'+L.cap.id,x:L.x,y:yy,w:L.w,h:hh,label:'No technology realization for '+L.cap.title,gapFor:L.cap.id});}
    }
    h=lanes.length?(Math.max(...lanes.map(l=>l.lane))+1)*(hh+6)-6:24;
   }
  }
  else if(s.id==='runtime'){
   if(md==='next'){for(const c of cols.filter(c=>!c.ext&&!c.brief))if(inCol(M.comp,c.id).length)bandItems.push({kind:'socket',next:true,id:'S:run:'+c.id,x:colX.get(c.id)+8,y:top+pad,w:colW.get(c.id)-16,h:34,label:'Chapter 10 · Where will these run, and how many copies?'});h=34;}
   else{
    let colBottom=0;const compact=md==='compact';
    for(const c of cols.filter(c=>!c.ext)){const defs=[];for(const comp of inCol(M.comp,c.id)){const runs=M.runsOf.get(comp.id)||[];if(!runs.length){defs.push({kind:'socket',id:'GAP:run:'+comp.id,h:compact||narrow(c.id)?22:34,label:comp.title+' is not operated yet',gapFor:comp.id});continue;}for(const rid of runs)defs.push({kind:'run',obj:M.byId.get(rid),id:rid,compact:compact||narrow(c.id),peel:md==='peel',h:compact||narrow(c.id)?22:(md==='peel'?58:44)});}
     const st=stack(c.id,top+pad,defs,44);bandItems.push(...st.placed);colBottom=Math.max(colBottom,st.bottom-top-pad);}
    const lanes=AN.capLanes(M,cols,colX,colW,ch),hh=compact?22:30;let used=0;
    for(const L of lanes){const t=M.techOf.get(L.cap.id);const runs=t?(M.runsOf.get(t)||[]):[];if(!runs.length)continue;const yy=top+pad+colBottom+8+L.lane*(hh+6);bandItems.push({kind:'run',platform:true,obj:M.byId.get(runs[0]),extra:runs.slice(1),id:runs[0],x:L.x,y:yy,w:L.w,h:hh,compact:true});used=Math.max(used,L.lane+1);}
    h=colBottom+(used?8+used*(hh+6):0);
   }
  }
  h=Math.max(h,md==='future'?18:30);
  const bh=h+pad*2;
  bands.push({s,md,y:top,h:bh});
  add({kind:'bandbg',id:'BG:'+s.id,s,md,x:0,y:top,w:worldW,h:bh});
  add({kind:'blabel',id:'BL:'+s.id,s,md,x:0,y:top,w:G,h:bh});
  for(const it of bandItems){it.band=s.id;add(it);}
  y=top+bh;
 }
 for(const c of cols)add({kind:'col',id:'C:'+c.id,col:c,x:colX.get(c.id)-4,y:6,w:colW.get(c.id)+8,h:y-6});
 return {items,R,bands,cols,colX,colW,W:worldW,H:y+30,G};
};

// Capability lanes: a capability spans every module whose components require it.
// Narrow (module-specific) platforms sit nearest the components; widely shared ones form the base.
AN.capLanes=function(M,cols,colX,colW,ch){
 if(ch<6)return [];
 const idx=new Map(cols.map((c,i)=>[c.id,i])),list=[];
 for(const cap of M.cap){
  const users=(M.capUsers.get(cap.id)||[]),ci=[...new Set(users.map(u=>idx.get(M.colOf.get(u))).filter(i=>i!==undefined))].sort((a,b)=>a-b);
  let a,b,orphan=false;if(ci.length){a=ci[0];b=ci[ci.length-1];}else{orphan=true;const mods=cols.map((c,i)=>c.ext||c.brief?-1:i).filter(i=>i>=0);a=b=mods[mods.length-1];}
  list.push({cap,a,b,users,orphan,span:b-a+1});
 }
 list.sort((p,q)=>p.span-q.span||p.a-q.a);
 const lanes=[];
 for(const it of list){let lane=0;while((lanes[lane]||[]).some(o=>!(it.b<o.a||it.a>o.b)))lane++;(lanes[lane]??=[]).push(it);it.lane=lane;}
 for(const it of list){const A=cols[it.a],B=cols[it.b];it.x=colX.get(A.id)+6;it.w=colX.get(B.id)+colW.get(B.id)-6-it.x;it.attach=it.users;}
 return list;
};
})();
