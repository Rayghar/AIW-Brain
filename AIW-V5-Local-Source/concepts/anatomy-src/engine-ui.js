// AIW Anatomy concept — rendering, lenses, companion panel and story.
(function(){
const {esc,STRATA,LENSES,CHAPTERS,CH,TYPE_LABEL}=AN;
const $=s=>document.querySelector(s);
const P={structure:'M5 3h5v5H5zM14 16h5v5h-5zM7.5 8v5.5h9V16',flow:'M3 12h13m-4-5 5 5-5 5M3 5h6M3 19h6',signals:'M3 12h3l2-6 4 12 2-6h7',information:'M12 3c3 4 6 7 6 10.5A6 6 0 0 1 6 13.5C6 10 9 7 12 3z',protection:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z',operation:'M4 5h16v5H4zM4 14h16v5H4zM7 7.5h.01M7 16.5h.01',reasoning:'M8 3c0 6 8 6 8 12s-8 6-8 6M16 3c0 6-8 6-8 12s8 6 8 6M9 7h6M9 17h6',play:'M7 4v16l13-8z',pause:'M7 4h4v16H7zM13 4h4v16h-4z',component:'M6 4h14v16H6zM3 8h5v3H3zM3 13h5v3H3z',responsibility:'M4 6h16v12H4zM8 10h8M8 14h5',capability:'M3 15h18v4H3zM6 15V9h4v6M14 15V6h4v9',technology:'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01',runtime:'M5 4h14v5H5zM5 10h14v5H5zM5 16h14v4H5z',party:'M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6M6 20v-4a6 6 0 0 1 12 0v4',back:'m10 5-7 7 7 7M3 12h18',panel:'M4 4h16v16H4zM14 4v16',fit:'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n]||P.structure}"/></svg>`;
const S=window.AN_STATE={M:null,ds:null,lens:'structure',chapter:11,focus:null,peel:null,sel:null,hover:null,scenario:null,step:-1,zoom:1,px:0,py:0,panel:true,answer:null,story:false,intro:true};
let L=null,nodes=new Map(),animUntil=0,storyTimer=null,flowTimer=null,SCOPE=null;
const shown=t=>S.chapter>=(CH[t]||1),T=id=>S.M.byId.get(id)?.type,title=id=>S.M.byId.get(id)?.title||id,ref=id=>S.M.byId.get(id)?.ref||id;
const lensOk=l=>S.chapter>=l.ch;

// ---- Lineage: everything above (why/what) and below (how/where) a selected object --------
function lineage(id){
 const M=S.M,set=new Set([id]);if(!id)return set;
 const up=x=>{const t=T(x);let p=[];
  if(t==='component')p=M.realizes.get(x)||[];else if(t==='capability')p=M.capUsers.get(x)||[];else if(t==='technology')p=[M.capOf.get(x)].filter(Boolean);else if(t==='runtime')p=[M.byId.get(x).asset].filter(Boolean);else if(t==='instance')p=M.I('placedAs',x);else if(t==='responsibility'){const w=M.why(x);p=[...w.reqs,...w.qds,...w.adrs];}
  for(const q of p)if(!set.has(q)){set.add(q);up(q);}};
 const down=x=>{const t=T(x);let c=[];
  if(['requirement','quality','decision'].includes(t))c=[...M.O('fulfils',x),...M.O('constrains',x),...M.O('justifies',x)].filter(y=>['responsibility','capability'].includes(T(y)));
  else if(t==='responsibility')c=M.realizedBy.get(x)||[];else if(t==='component')c=[...(M.needs.get(x)||[]),...(M.runsOf.get(x)||[])];else if(t==='capability')c=[M.techOf.get(x)].filter(Boolean);else if(t==='technology')c=M.runsOf.get(x)||[];else if(t==='runtime')c=(M.placements.get(x)||[]).map(p=>p.id);else if(t==='module')c=[...M.resp.filter(r=>M.mod.get(r.id)===x).map(r=>r.id)];
  for(const q of c)if(!set.has(q)){set.add(q);down(q);}};
 up(id);down(id);
 if(T(id)==='module')for(const c of M.comp.filter(c=>M.mod.get(c.id)===id)){set.add(c.id);down(c.id);}
 if(['flow','signals','information'].includes(S.lens))for(const f of M.flows)if(f.from===id||f.to===id){set.add(f.from);set.add(f.to);set.add(f.id);}
 if(T(id)==='data'){set.add(M.owner.get(id));for(const f of M.flows)if(f.contract&&(M.exch.get(f.contract)||[]).includes(id)){set.add(f.from);set.add(f.to);set.add(f.id);}}
 return set;
}

function highlightSet(){
 const M=S.M;
 if(S.scenario&&S.step>=0){const sc=M.scenarios.find(s=>s.id===S.scenario);if(sc){const set=new Set();sc.steps.slice(0,S.step+1).forEach(([a,b])=>{set.add(a);set.add(b);set.add('F:'+a+'>'+b);});return set;}}
 if(S.sel)return lineage(S.sel);if(S.hover)return lineage(S.hover);return null;
}
function scopeSet(){
 if(!S.focus)return null;const M=S.M,s=lineage(S.focus);s.add(S.focus);
 for(const f of M.flows)if(M.mod.get(f.from)===S.focus||M.mod.get(f.to)===S.focus){s.add(f.from);s.add(f.to);s.add(f.id);}
 return s;
}
// ---- Render --------------------------------------------------------------------------------
function stageW(){return $('.stage').clientWidth;}
function render(){
 const M=S.M;L=AN.layout(S,stageW());
 const hl=highlightSet();SCOPE=scopeSet();
 const world=$('.world');world.style.width=L.W+'px';world.style.height=L.H+'px';
 const keep=new Set();
 for(const it of L.items){
  const key=it.kind+'|'+it.id;keep.add(key);
  let el=nodes.get(key);const fresh=!el;
  if(fresh){el=document.createElement('div');el.dataset.key=key;nodes.set(key,el);$(['bandbg','col'].includes(it.kind)?'.bg':'.nodes').appendChild(el);el.classList.add('enter');requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.remove('enter')));}
  const html=itemHTML(it);if(el._html!==html){el.innerHTML=html;el._html=html;}
  el.className='n '+itemClass(it,hl)+(fresh?' enter':'');
  if(it.obj||it.gapFor||it.kind==='mhead')el.dataset.id=it.obj?.id||it.gapFor||it.col.id;else delete el.dataset.id;
  el.dataset.kind=it.kind;if(it.kind==='blabel')el.dataset.band=it.s.id;
  Object.assign(el.style,{left:it.x+'px',top:it.y+'px',width:it.w+'px',height:it.h+'px'});
 }
 for(const [k,el] of nodes)if(!keep.has(k)){nodes.delete(k);el.classList.add('enter');setTimeout(()=>el.remove(),320);}
 // contract / data / threat pills on flows are positioned after edges
 animUntil=performance.now()+420;tick();
 renderChrome();renderPanel(hl);
}
function itemClass(it,hl){
 const o=it.obj,dim=hl&&o&&!hl.has(o.id)&&!(it.kind==='mhead')?' dim':(!hl&&SCOPE&&o&&!SCOPE.has(o.id)?' fade':'');
 const sel=o&&S.sel===o.id?' sel':'',h=o&&hl&&hl.has(o.id)&&S.sel!==o.id?' hl':'';
 switch(it.kind){
  case 'bandbg':return 'bandbg'+(it.md==='peel'?' peel':'')+(STRATA.indexOf(it.s)%2?' alt':'');
  case 'blabel':return 'blabel'+(it.md==='peel'?' peel':'')+(it.md==='future'||it.md==='next'?' future':'');
  case 'col':return 'col'+(it.col.ext?' ext':'')+(S.focus===it.col.id?' focus':'');
  case 'mhead':return 'mhead'+(it.col.ext?' ext':'')+(S.focus===it.col.id?' focus':'')+(it.w<170?' narrow':'')+(it.spine?' spine':'')+(hl&&!it.col.ext&&!it.col.brief&&!hl.has(it.col.id)&&S.sel&&T(S.sel)==='module'?' dim':'');
  case 'resp':return 'o resp'+(it.compact?' compact':'')+(it.two?' two':'')+(it.spine?' spine':'')+sel+h+dim;
  case 'comp':return 'o comp'+(it.compact?' compact':'')+(it.two?' two':'')+(it.spine?' spine':'')+sel+h+dim;
  case 'party':return 'o party'+(it.compact?' compact':'')+(it.two?' two':'')+(it.spine?' spine':'')+sel+h+dim;
  case 'cap':return 'o cap'+(it.w<170?' slim':'')+(it.compact?' compact':'')+(it.spine?' spine':'')+sel+h+dim;
  case 'tech':return 'o tech'+(it.w<170?' slim':'')+(it.obj.product?'':' unchosen')+(it.compact?' compact':'')+sel+h+dim;
  case 'run':return 'o run'+(it.spine?' spine':'')+((S.M.placements.get(it.obj.id)||[]).length?'':' unplaced')+(it.compact?' compact':'')+sel+h+dim;
  case 'intent':return 'o intent '+it.obj.type+(it.two?' two':'')+sel+h+dim;
  case 'count':return 'o count';
  case 'socket':return 'o socket'+(it.next?' next':'')+(it.spine?' spine':'')+(hl&&it.gapFor&&!hl.has(it.gapFor)?' dim':'');
 }
 return '';
}
function badges(o){
 const M=S.M,b=[];
 if(S.lens==='protection'&&shown('control')){const c=(M.protects.get(o.id)||[]).length,t=(M.threatsOn.get(o.id)||[]);if(c)b.push(`<span class="badge ctl" title="${c} control(s)">⛨${c}</span>`);if(t.length){const open=t.filter(x=>!(M.mitig.get(x)||[]).length).length;b.push(`<span class="badge thr ${open?'open':''}" title="${t.length} threat(s)${open?', '+open+' without a control':''}">!${t.length}</span>`);}
  for(const d of M.owned.get(o.id)||[]){const t=M.threatsOn.get(d)||[];if(t.some(x=>!(M.mitig.get(x)||[]).length))b.push('<span class="badge thr open" title="Owned data has an uncovered threat">!data</span>');}}
 if(S.lens==='reasoning'&&o.type==='responsibility'){const w=M.why(o.id),n=w.reqs.length+w.qds.length+w.adrs.length;if(n)b.push(`<span class="badge why" title="${w.reqs.length} requirement(s), ${w.qds.length} quality scenario(s), ${w.adrs.length} decision(s)">${w.reqs.length}R ${w.qds.length}Q ${w.adrs.length}D</span>`);}
 return b.length?`<span class="badges">${b.join('')}</span>`:'';
}
function itemHTML(it){
 const M=S.M,o=it.obj;
 switch(it.kind){
  case 'bandbg':case 'col':return '';
  case 'blabel':{const s=it.s;return `<b><i style="background:${s.color}"></i>${esc(s.label)}</b><small>${esc(s.sub)}</small><em>${it.md==='future'?'Designed in Chapter '+s.ch:it.md==='next'?'Next · Chapter '+s.ch:'Chapter '+s.ch+(s.id==='intent'?'–3':'')+(it.md==='peel'?' · opened':' · click to open')}</em>`;}
  case 'mhead':{const c=it.col;if(c.brief)return `<b>The brief</b><small>Needs, qualities and decisions — before any structure</small>`;if(c.ext)return `<b>${esc(c.title)}</b><small>${c.parties.length} external participant${c.parties.length===1?'':'s'}</small>`;const nr=M.resp.filter(r=>M.mod.get(r.id)===c.id).length,nc=M.comp.filter(x=>M.mod.get(x.id)===c.id).length;return `<b title="${esc(c.title)}">${esc(c.title)}</b><small>${it.w<170?nr+' resp · '+nc+' comp':esc(c.desc||'')+' · '+nr+' responsibilities · '+nc+' components'}</small>${it.w>=170?`<button class="go" data-act="${S.focus===c.id?'unfocus':'focus'}" data-col="${esc(c.id)}">${S.focus===c.id?'Zoom out':'Dissect ↘'}</button>`:`<button class="go mini" data-act="focus" data-col="${esc(c.id)}" title="Dissect ${esc(c.title)}" aria-label="Dissect ${esc(c.title)}">↘</button>`}`;}
  case 'resp':return `${badges(o)}<span class="k">${icon('responsibility')}${esc(o.ref)}</span><span class="t">${esc(o.title)}</span>${it.peel&&o.description?`<span class="d">${esc(o.description)}</span>`:''}`;
  case 'party':return `<span class="k">${icon('party')}External</span><span class="t">${esc(o.title)}</span>`;
  case 'comp':{const emb=(M.realizes.get(o.id)||[]).filter(x=>shown('responsibility')),data=S.lens==='information'&&shown('data')?(M.owned.get(o.id)||[]):[];return `${badges(o)}<span class="k">${icon('component')}${esc(o.ref)}${o.owner&&!it.compact?' · '+esc(o.owner):''}</span><span class="t">${esc(o.title)}</span>${it.peel&&o.description?`<span class="d">${esc(o.description)}</span>`:''}${!it.compact&&emb.length?`<span class="chips" title="Responsibilities this component realizes">${emb.map(r=>`<span class="chip" data-sel="${esc(r)}">◖ ${esc(title(r))}</span>`).join('')}</span>`:''}${!it.compact&&data.length?`<span class="chips">${data.map(d=>`<span class="chip drop" data-sel="${esc(d)}" title="Authoritative owner of ${esc(title(d))}">● ${esc(title(d))}</span>`).join('')}</span>`:''}`;}
  case 'cap':{const u=it.users.length;return `${badges(o)}<span class="k">${icon('capability')}${esc(o.ref)}</span><span class="t">${esc(o.title)}</span><span class="u">${it.orphan?'no component uses it':u+' component'+(u===1?'':'s')}</span>`;}
  case 'tech':{const opts=M.options.get(o.id)||[];return `<span class="k">${icon('technology')}${esc(o.ref)}</span><span class="t">${o.product?esc(o.product):'Choice not recorded'+(opts.length?' · '+opts.length+' options':'')}</span>`;}
  case 'run':{const pls=M.placements.get(o.id)||[];const pip=pls.map(p=>{const c=M.zoneColor.get(p.zoneId)||'#557';const n=Math.min(8,Number(p.replicas)||1);return `<span style="color:${c}" title="${esc(title(p.zoneId))} · ${n} ${p.role==='standby'?'standby':'active'}">${Array.from({length:n},()=>`<i class="${p.role==='standby'?'sb':''}"></i>`).join('')}${it.compact?'':' '+esc(shortZone(title(p.zoneId)))}</span>`;}).join('');return `${badges(o)}${it.compact?'':`<span class="k">${icon('runtime')}${esc(o.ref)}</span>`}<span class="t">${esc(it.platform?title(o.asset).replace(/ realization$/,''):o.title)}${it.extra?.length?' +'+it.extra.length:''}</span><span class="pips">${pip||'<span style="color:#9b7433">not placed</span>'}</span>`;}
  case 'intent':{const tag={requirement:'REQ',quality:'QD',decision:'ADR'}[o.type];return `<b class="tag">${tag}</b><span class="t" title="${esc(o.title)}">${esc(o.title)}</span>`;}
  case 'count':return esc(it.label);
  case 'socket':return `<span>${it.next?'◌':'○'}</span><b>${esc(it.label)}</b>`;
 }
 return '';
}
const shortZone=z=>String(z).replace(/^Primary site · /,'').replace(/ zone$/,'');

// ---- Edges (drawn from live element positions so they follow transitions) ------------------
let IDX=new Map();
function indexNodes(){IDX=new Map();for(const el of nodes.values()){const id=el.dataset.id;if(!id||['mhead','socket','blabel','bandbg','col','count'].includes(el.dataset.kind)||IDX.has(id))continue;IDX.set(id,el);}}
function rect(id){const el=IDX.get(id);if(!el||!el.isConnected)return null;return {x:el.offsetLeft,y:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight,el};}
function tick(){
 drawEdges();
 if(performance.now()<animUntil)requestAnimationFrame(tick);
}
function drawEdges(){
 indexNodes();const M=S.M,under=[],over=[],pills=[],hl=highlightSet(),scope=SCOPE;
 const cls=(base,a,b,extraId)=>{if(!hl)return base;const on=hl.has(a)&&hl.has(b)&&(!extraId||hl.has(extraId)||S.lens==='structure'||true);return base+(on?' hl':' dim');};
 const V=(x1,y1,x2,y2)=>`M${x1} ${y1}C${x1} ${(y1+y2)/2} ${x2} ${(y1+y2)/2} ${x2} ${y2}`;
 // lineage threads
 if(shown('component'))for(const c of M.comp){const rc=rect(c.id);if(!rc)continue;for(const r of M.realizes.get(c.id)||[]){const rr=rect(r);if(!rr)continue;const p=`<path class="${cls('e-line',r,c.id)}" d="${V(rr.x+rr.w/2,rr.y+rr.h,rc.x+rc.w/2,rc.y)}"/>`;(hl&&hl.has(r)&&hl.has(c.id)?over:under).push(p);}}
 if(shown('capability'))for(const c of M.comp){const rc=rect(c.id);if(!rc)continue;const needs=M.needs.get(c.id)||[];needs.forEach((cap,i)=>{const r2=rect(cap);if(!r2)return;let x=rc.x+rc.w*(i+1)/(needs.length+1);x=Math.max(r2.x+8,Math.min(r2.x+r2.w-8,x));const on=hl&&hl.has(c.id)&&hl.has(cap);const p=`<path class="${cls('e-line',c.id,cap)}" d="M${x} ${rc.y+rc.h}L${x} ${r2.y}"/>`;(on?over:under).push(p);if(!hl||on)over.push(`<circle class="pillar" cx="${x}" cy="${r2.y}" r="${on?3.6:2.6}"/>`);});}
 if(shown('technology'))for(const cap of M.cap){const t=M.techOf.get(cap.id);const a=rect(cap.id),b=t&&rect(t);if(!a||!b)continue;const on=hl&&hl.has(cap.id)&&hl.has(t);(on?over:under).push(`<path class="${cls('e-line',cap.id,t)}" d="M${a.x+a.w/2} ${a.y+a.h}L${b.x+b.w/2} ${b.y}"/>`);}
 if(shown('runtime')&&hl)for(const r of M.run){const a=rect(r.asset),b=rect(r.id);if(!a||!b)continue;if(hl.has(r.asset)&&hl.has(r.id))over.push(`<path class="e-line hl" d="M${a.x+a.w/2+6} ${a.y+a.h}L${b.x+b.w/2+6} ${b.y}"/>`);}
 // why threads (reasoning)
 if(S.lens==='reasoning'&&S.sel)for(const id of lineage(S.sel)){if(!['requirement','quality','decision'].includes(T(id)))continue;const a=rect(id);if(!a)continue;for(const t of [...M.O('fulfils',id),...M.O('constrains',id),...M.O('justifies',id)]){if(!lineage(S.sel).has(t))continue;const b=rect(t);if(b)over.push(`<path class="e-why" d="${V(a.x+a.w/2,a.y+a.h,b.x+b.w/2,b.y)}"/>`);}}
 // flows between components / parties (and responsibilities)
 const flowOn=shown('component');
 const flows=flowOn&&!(S.lens==='flow'&&S.peel==='logical')?M.flows:[];const lf=S.chapter>=4&&(!shown('component')||(S.lens==='flow'&&S.peel==='logical'))?M.lflows:[];
 const play=S.scenario&&S.step>=0?M.scenarios.find(s=>s.id===S.scenario)?.steps[S.step]:null;
 const seen=new Map();
 const flowPath=(a,b,k)=>{const off=(k%3-1)*7;if(Math.abs((a.x+a.w/2)-(b.x+b.w/2))<30){const x=Math.max(a.x+a.w,b.x+b.w)+18+k*6;return {d:`M${a.x+a.w} ${a.y+a.h/2}C${x} ${a.y+a.h/2} ${x} ${b.y+b.h/2} ${b.x+b.w} ${b.y+b.h/2}`,mx:x-4,my:(a.y+b.y+b.h)/2};}
  const ltr=a.x<b.x,x1=ltr?a.x+a.w:a.x,x2=ltr?b.x:b.x+b.w,y1=a.y+Math.min(a.h/2,22)+off,y2=b.y+Math.min(b.h/2,22)+off,dx=Math.max(40,Math.abs(x2-x1)/2);return {d:`M${x1} ${y1}C${x1+(ltr?dx:-dx)} ${y1} ${x2-(ltr?dx:-dx)} ${y2} ${x2} ${y2}`,mx:(x1+x2)/2,my:(y1+y2)/2};};
 for(const f of [...lf,...flows]){const a=rect(f.from),b=rect(f.to);if(!a||!b)continue;const k=(seen.get(f.from)||0);seen.set(f.from,k+1);const g=flowPath(a,b,k);
  const playing=play&&play[0]===f.from&&play[1]===f.to,on=hl&&hl.has(f.from)&&hl.has(f.to)&&(!S.scenario||S.step<0||hl.has(f.id)),inScope=!scope||scope.has(f.id)||(scope.has(f.from)&&scope.has(f.to));
  const detail=playing||on||(scope&&inScope&&!hl);
  let c=S.lens==='information'?'e-data':'e-flow'+(f.async?' async':'');
  if(S.lens==='signals'&&f.contract){const k=M.byId.get(f.contract);c+=(!k.timeout&&!f.async)||!(k.retry||k.failure)||!k.idempotency?' weak':' sound';}
  if(playing)c='e-flow play';else if(hl)c+=on?' hl':' dim';else if(scope&&!inScope)c+=' dim';
  const prominent=['flow','signals','information'].includes(S.lens)||playing||on;
  const path=`<path class="${c}" d="${g.d}" marker-end="url(#${S.lens==='information'?'ad':'af'})" style="${prominent?'':'opacity:.28'}"/>`;
  (prominent?over:under).push(path);
  if(!detail&&!playing){}
  else if(S.lens==='signals'&&f.contract&&shown('contract'))pills.push(contractPill(f,g));
  else if(S.lens==='information'&&f.contract&&shown('data')){const ds=M.exch.get(f.contract)||[];if(ds.length)pills.push({id:'P:'+f.id,x:g.mx,y:g.my,cls:'',html:'● '+ds.map(d=>esc(title(d))).join(', '),sel:ds[0],dim:hl&&!on});}
  else if(S.lens==='protection'&&f.contract&&shown('threat')){const t=S.M.threatsOn.get(f.contract)||[],c2=S.M.protects.get(f.contract)||[];if(t.length||c2.length){const open=t.filter(x=>!(M.mitig.get(x)||[]).length);pills.push({id:'P:'+f.id,x:g.mx,y:g.my,cls:open.length?'thr':'ok',html:(c2.length?'⛨'+c2.length+' ':'')+(t.length?'!'+t.length+(open.length?' open':''):''),sel:f.contract,dim:hl&&!on});}}
  else if(playing||(S.lens==='flow'&&on))pills.push({id:'P:'+f.id,x:g.mx,y:g.my,cls:'',html:esc(f.label||''),sel:f.contract||f.to,dim:false});
 }
 // protection rings
 const rings=[];
 if(S.lens==='protection'&&shown('boundary'))for(const [id,bs] of M.inBound){const r=rect(id);if(!r)continue;bs.forEach((b,i)=>rings.push(`<div class="ring" style="left:${r.x-4-i*4}px;top:${r.y-4-i*4}px;width:${r.w+8+i*8}px;height:${r.h+8+i*8}px;border-color:${M.boundColor.get(b)}" title="${esc(title(b))}"></div>`));}
 $('.edges.under').innerHTML=defs()+under.join('');
 $('.edges.over').innerHTML=defs()+over.join('');
 $('.rings').innerHTML=rings.join('');
 $('.pills').innerHTML=pills.map(p=>`<div class="n pill ${p.cls}" data-pill="${esc(p.sel||'')}" style="left:${p.x}px;top:${p.y}px;transform:translate(-50%,-50%);${p.dim?'opacity:.2':''}">${p.html}</div>`).join('');
}
function contractPill(f,g){
 const c=S.M.byId.get(f.contract),ok=[c.timeout,c.retry||c.failure,c.idempotency].filter(Boolean).length,need=f.async?2:3,missing=[!c.timeout&&!f.async&&'timeout',!(c.retry||c.failure)&&'failure policy',!c.idempotency&&'duplicate handling'].filter(Boolean);
 const hl=S.sel?lineage(S.sel):null,on=!hl||(hl.has(f.from)&&hl.has(f.to));
 return {id:'P:'+f.id,x:g.mx,y:g.my,cls:missing.length?'warn':'ok',html:(f.async?'⚡ ':'⇄ ')+esc(c.ref)+(missing.length?' · ?'+missing.length:' ✓'),sel:c.id,dim:!on};
}
const defs=()=>'<defs><marker id="af" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#2d6450"/></marker><marker id="ad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6f5a93"/></marker></defs>';

// ---- Chrome: crumbs, lens rail, depth list, story bar, overlays -----------------------------
function renderChrome(){
 const M=S.M;
 const sel=S.sel&&M.byId.get(S.sel);
 $('.crumbs').innerHTML=`<button class="${!S.focus&&!sel?'here':''}" data-act="system">${esc(M.ds.title)}</button>${S.focus?`<span>›</span><button class="${sel?'':'here'}" data-act="focus" data-col="${esc(S.focus)}">${esc(M.byId.get(S.focus)?.title||'Outside')}</button>`:''}${sel?`<span>›</span><button class="here" data-act="noop">${esc(sel.ref&&sel.ref!==sel.id?sel.ref+' · ':'')}${esc(sel.title)}</button>`:''}`;
 $('.lensbar .lenses').innerHTML=LENSES.map(l=>`<button class="lens" data-lens="${l.id}" aria-pressed="${S.lens===l.id}" ${lensOk(l)?'':'disabled'} title="${esc(l.q+' — like the '+l.anatomy.toLowerCase()+(lensOk(l)?'':' · available from Chapter '+l.ch))}"><i>${icon(l.id)}</i>${l.label}</button>`).join('');
 $('.lensbar .depth').innerHTML='<span class="lbl">Open layer</span>'+`<button class="dep" data-peel="" aria-pressed="${!S.peel}" title="See every layer at once"><i style="background:linear-gradient(${STRATA.map(s=>s.color).join(',')})"></i>All</button>`+STRATA.map(s=>`<button class="dep" data-peel="${s.id}" aria-pressed="${S.peel===s.id}" ${S.chapter>=s.ch?'':'disabled'} title="${esc(s.label+' — '+s.sub)}"><i style="background:${s.color}"></i>${esc({intent:'Intent',logical:'Logical',application:'Application',capability:'Platform',technology:'Product',runtime:'Runtime'}[s.id])}</button>`).join('');
 $('.steps').innerHTML=CHAPTERS.map(([n,t])=>`<button class="step ${n<S.chapter?'done':''} ${n===S.chapter?'cur':''}" data-ch="${n}" title="${esc(t)}"><small>${n}</small><span>${esc(t)}</span></button>`).join('');
 $('.story .play').innerHTML=icon(S.story?'pause':'play');$('.story .play').setAttribute('aria-label',S.story?'Pause the design story':'Play the design story');
 $('.story .note').textContent=CHAPTERS[S.chapter-1][2];
 const l=LENSES.find(x=>x.id===S.lens);
 $('.key .cap').innerHTML=`<b>${esc(l.label)} · ${esc(l.q)}</b>`;
 const scen=S.lens==='flow'&&M.scenarios.length&&shown('component');
 $('.scenario').hidden=!scen;
 if(scen){const sc=M.scenarios.find(s=>s.id===S.scenario);const st=sc&&S.step>=0?sc.steps[S.step]:null;const f=st&&M.flows.find(f=>f.from===st[0]&&f.to===st[1]);const c=f?.contract&&M.byId.get(f.contract);
  $('.scenario').innerHTML=`<div class="row"><select class="tsel" data-f="scenario"><option value="">Follow a scenario…</option>${M.scenarios.map(s=>`<option value="${s.id}" ${S.scenario===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}</select>${sc?`<button class="tbtn" data-act="step-prev" aria-label="Previous step">‹</button><button class="tbtn primary" data-act="step-next">${S.step<0?'Start':S.step>=sc.steps.length-1?'Restart':'Next ›'}</button>`:''}</div>${st?`<p><b>Step ${S.step+1} of ${sc.steps.length}.</b> ${esc(title(st[0]))} → ${esc(title(st[1]))}${f?': '+esc(f.label):''}${c&&shown('contract')?` <span style="color:#76866f">(${esc(c.style||'request')}${c.timeout?', timeout '+esc(c.timeout):''}${c.failure?'; on failure: '+esc(c.failure):''})</span>`:''}</p>`:sc?'<p>Press Start to walk the path one interaction at a time.</p>':''}`;}
 $('.legend').innerHTML=legend();
 $('.main').classList.toggle('no-panel',!S.panel);
 $('[data-act="panel"]').setAttribute('aria-pressed',S.panel);
 document.querySelectorAll('[data-ds]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ds===S.ds.id));
}
function lensCaption(){
 const M=S.M;
 switch(S.lens){
  case 'structure':return 'Columns are the body’s parts (modules). Each band is one layer deeper: responsibilities, the components that realize them, the platform beneath, the products, and where it runs. Threads show what realizes what.';
  case 'flow':return 'Arrows are recorded interactions. Pick a scenario to watch work move through the body step by step.';
  case 'signals':return 'Every interaction carries a contract. ✓ means timeout, failure and duplicate handling are recorded; ?n counts what is still undefined.';
  case 'information':return 'Droplets sit with the component that owns the data. Dotted lines show which data travels on each interaction.';
  case 'protection':return 'Coloured rings are trust boundaries. ⛨ counts controls; ! marks threats — red when no control covers them.';
  case 'operation':return 'The runtime layer is opened: dots are running copies per zone (hollow = standby). Dashed plans are not placed anywhere yet.';
  case 'reasoning':return 'The intent layer is opened. Select a responsibility to trace the requirements, qualities and decisions that shaped it.';
 }
}
function legend(){
 const L=[['var(--c-resp)','Responsibility'],['var(--c-comp)','Component'],['var(--c-cap)','Capability'],['var(--c-tech)','Technology'],['var(--c-run)','Runtime']].filter((x,i)=>S.chapter>=[4,5,6,7,10][i]).map(([c,t])=>`<span><i style="background:${c}"></i>${t}</span>`);
 L.push('<span><i class="l" style="border-color:#9bb3a3"></i>realized by / needs</span>');
 if(S.chapter>=5)L.push('<span><i class="l" style="border-color:#2d6450"></i>interaction</span><span><i class="l" style="border-color:#2d6450;border-top-style:dashed"></i>event</span>');
 L.push('<span><i style="border:1.5px dashed var(--c-gap);background:#fffaf0"></i>gap / next design question</span>');
 if(S.lens==='protection')for(const b of S.M.bounds)L.push(`<span><i style="border:2px solid ${S.M.boundColor.get(b.id)};background:none"></i>${esc(b.title)}</span>`);
 if(S.lens==='operation')for(const z of S.M.zones)L.push(`<span><i style="background:${S.M.zoneColor.get(z.id)};border-radius:50%;width:10px"></i>${esc(z.title)}</span>`);
 return L.join('');
}

// ---- Companion panel: where you are, what you see, what is worth noticing ------------------
function scopeIds(){const M=S.M;if(!S.focus)return null;return new Set([S.focus,...[...M.mod].filter(([,m])=>m===S.focus).map(([id])=>id)]);}
function counts(scope){
 const M=S.M,inS=id=>!scope||scope.has(id);
 const resp=M.resp.filter(r=>inS(r.id)),comp=M.comp.filter(c=>inS(c.id)),caps=new Set(comp.flatMap(c=>M.needs.get(c.id)||[])),capList=scope?[...caps].map(id=>M.byId.get(id)):M.cap,techs=capList.map(c=>M.techOf.get(c.id)).filter(Boolean),chosen=techs.filter(t=>M.byId.get(t).product),runs=[...comp.flatMap(c=>M.runsOf.get(c.id)||[]),...(scope?[]:techs.flatMap(t=>M.runsOf.get(t)||[]))],placed=runs.filter(r=>(M.placements.get(r)||[]).length);
 const shared=capList.filter(c=>new Set((M.capUsers.get(c.id)||[]).map(u=>M.mod.get(u))).size>1);
 return {resp,comp,capList,techs,chosen,runs,placed,shared};
}
function narrative(){
 const M=S.M,ch=S.chapter;
 if(S.sel){const o=M.byId.get(S.sel);return selectionSentence(o);}
 const scope=scopeIds(),c=counts(scope),name=S.focus?M.byId.get(S.focus)?.title:M.ds.title;
 if(ch<4)return `${esc(M.ds.title)} is still a brief: ${M.reqs.length} requirements${ch>=2?', '+M.qds.length+' quality scenarios':''}${ch>=3?' and '+M.adrs.length+' decisions':''}. No structure exists yet — that begins in Chapter 4.`;
 const parts=[`<b>${esc(name)}</b>: ${c.resp.length} responsibilit${c.resp.length===1?'y':'ies'}${!S.focus?' in '+M.modules.length+' modules':''}`];
 if(ch>=5)parts.push(`realized by ${c.comp.length} component${c.comp.length===1?'':'s'}`);
 if(ch>=6)parts.push(`standing on ${c.capList.length} platform capabilit${c.capList.length===1?'y':'ies'}${c.shared.length?' ('+c.shared.length+' shared with other modules)':''}`);
 if(ch>=7)parts.push(`${c.chosen.length} of ${c.capList.length} with a chosen product`);
 if(ch>=10)parts.push(`${c.placed.length} of ${c.runs.length} operating plans placed`);
 let s=parts.join(', ')+'.';
 const x=lensSentence(scope);if(x)s+=' '+x;
 return s;
}
function lensSentence(scope){
 const M=S.M,inS=id=>!scope||scope.has(id);
 const fl=M.flows.filter(f=>inS(f.from)||inS(f.to));
 switch(S.lens){
  case 'flow':return fl.length?`${fl.length} interactions touch this scope${M.scenarios.length?'; follow a scenario to see them in order':''}.`:'';
  case 'signals':{const cs=fl.filter(f=>f.contract).map(f=>M.byId.get(f.contract)),weak=cs.filter(c=>!c.timeout||!(c.retry||c.failure)||!c.idempotency);return cs.length?`${cs.length} contracts; ${weak.length} still miss a timeout, failure or duplicate rule.`:'';}
  case 'information':{const ds=M.data.filter(d=>inS(M.owner.get(d.id))||!scope);const ext=ds.filter(d=>T(M.owner.get(d.id))==='party');return ds.length?`${ds.length} data definitions${ext.length?'; '+ext.map(d=>esc(d.title)).join(', ')+' is owned outside the system':''}.`:'';}
  case 'protection':{const open=M.threats.filter(t=>!(M.mitig.get(t.id)||[]).length);return `${M.bounds.length} trust boundaries, ${M.controls.length} controls; ${open.length} threat${open.length===1?'':'s'} without a mitigating control.`;}
  case 'operation':{const zones=new Set(M.inst.map(p=>p.zoneId));return `${zones.size} zone${zones.size===1?'':'s'} in use.`+(zones.size===1?' Everything placed runs in one failure domain.':'');}
  case 'reasoning':return `${M.reqs.length} requirements, ${M.qds.length} quality scenarios and ${M.adrs.length} decisions shape this design.`;
 }
 return '';
}
function selectionSentence(o){
 const M=S.M,t=o.type,list=ids=>ids.map(i=>'<b>'+esc(title(i))+'</b>').join(', ');
 if(t==='responsibility'){const cs=M.realizedBy.get(o.id)||[];if(!cs.length)return `<b>${esc(o.title)}</b> is a responsibility no component realizes yet — a hole in the application layer.`;const caps=[...new Set(cs.flatMap(c=>M.needs.get(c)||[]))];return `<b>${esc(o.title)}</b> is realized by ${list(cs)}${S.chapter>=6&&caps.length?', which stands on '+caps.length+' platform capabilities':''}. Follow the gold thread down to see how it is implemented and where it runs.`;}
 if(t==='component'){const r=M.realizes.get(o.id)||[],caps=M.needs.get(o.id)||[],runs=M.runsOf.get(o.id)||[];const pl=runs.flatMap(x=>M.placements.get(x)||[]);return `<b>${esc(o.title)}</b> realizes ${r.length?list(r):'no recorded responsibility'}. ${S.chapter>=6?'It needs '+caps.length+' capabilities'+(caps.length?' — '+caps.slice(0,4).map(c=>esc(title(c))).join(', ')+(caps.length>4?' and '+(caps.length-4)+' more':''):'')+'.':''} ${S.chapter>=10?(pl.length?'It runs as '+pl.reduce((a,p)=>a+(Number(p.replicas)||1),0)+' copies across '+new Set(pl.map(p=>p.zoneId)).size+' zone(s).':'It is not placed anywhere yet.'):''}`;}
 if(t==='capability'){const u=M.capUsers.get(o.id)||[],mods=new Set(u.map(x=>M.mod.get(x))),tr=M.techOf.get(o.id),tech=tr&&M.byId.get(tr);return `<b>${esc(o.title)}</b> supports ${u.length} component${u.length===1?'':'s'} across ${mods.size} module${mods.size===1?'':'s'}${mods.size>2?' — a shared part of the skeleton; its failure is felt everywhere above it':''}. ${S.chapter>=7?(tech?(tech.product?'It is provided by <b>'+esc(tech.product)+'</b>.':'No product has been chosen yet.'):'No technology realization exists yet.'):''}`;}
 if(t==='technology'){const opts=M.options.get(o.id)||[];return `<b>${esc(o.title)}</b> ${o.product?'uses <b>'+esc(o.product)+'</b>':'has no chosen product'}${opts.length?' · options considered: '+opts.map(x=>esc(x.title)).join(', '):''}.`;}
 if(t==='runtime'){const pl=M.placements.get(o.id)||[];return `<b>${esc(o.title)}</b> ${pl.length?'runs in '+pl.map(p=>esc(title(p.zoneId))+' ×'+(p.replicas||1)+(p.role==='standby'?' (standby)':'')).join(', '):'has no placement yet'}${o.minReady?' · needs '+o.minReady+' ready':''}.`;}
 if(['requirement','quality','decision'].includes(t)){const d=[...M.O('fulfils',o.id),...M.O('constrains',o.id),...M.O('justifies',o.id)].filter(x=>['responsibility','capability'].includes(T(x)));return `<b>${esc(o.title)}</b> shapes ${d.length?list(d):'no modelled part yet'}. Select one of them to follow it down through the layers.`;}
 if(t==='party')return `<b>${esc(o.title)}</b> is outside the system. ${M.flows.filter(f=>f.from===o.id||f.to===o.id).length} recorded interactions cross the boundary here.`;
 if(t==='data'){const ow=M.owner.get(o.id);return `<b>${esc(o.title)}</b> is owned by <b>${esc(title(ow))}</b>${o.classification?' · '+esc(o.classification):''}.`;}
 if(t==='contract'){return `<b>${esc(o.ref)} · ${esc(o.title)}</b> (${esc(o.style||'request')}). Timeout: ${esc(o.timeout||'not recorded')}. On failure: ${esc(o.failure||o.retry||'not recorded')}. Duplicates: ${esc(o.idempotency||'not recorded')}.`;}
 return `<b>${esc(o.title)}</b>`;
}
function insights(){
 const M=S.M,ch=S.chapter,out=[],scope=scopeIds(),inS=id=>!scope||scope.has(id);
 if(ch>=5)for(const r of M.resp.filter(r=>inS(r.id)&&!(M.realizedBy.get(r.id)||[]).length))out.push(['gap',`${r.title} has no implementing component.`,r.id,'Chapter 5']);
 if(ch>=6){const hot=M.cap.map(c=>({c,n:new Set((M.capUsers.get(c.id)||[]).map(u=>M.mod.get(u))).size,u:(M.capUsers.get(c.id)||[]).length})).filter(x=>x.n>=3).sort((a,b)=>b.u-a.u).slice(0,2);for(const h of hot)out.push(['info',`${h.c.title} carries ${h.u} components in ${h.n} modules — a load-bearing part of the skeleton. Check its recovery and isolation.`,h.c.id]);
  for(const c of M.cap.filter(c=>!(M.capUsers.get(c.id)||[]).length))out.push(['info',`${c.title} is not used by any component. Keep it, or remove it?`,c.id]);}
 if(ch>=7){const un=M.cap.filter(c=>!M.techOf.get(c.id));for(const c of un)out.push(['gap',`${c.title} has no technology realization.`,c.id,'Chapter 7']);const nc=M.tech.filter(t=>!t.product);if(nc.length)out.push(['gap',`${nc.length} technology realization${nc.length===1?' has':'s have'} no chosen product yet.`,nc[0].id,'Chapter 7']);}
 if(ch>=8){const weak=M.flows.filter(f=>f.contract&&(inS(f.from)||inS(f.to))).map(f=>M.byId.get(f.contract)).filter(c=>!c.timeout&&!/event/i.test(c.style||'')||!(c.retry||c.failure));if(weak.length)out.push(['gap',`${weak.length} contract${weak.length===1?' does':'s do'} not say what happens on timeout or failure (e.g. ${weak[0].ref} ${weak[0].title}).`,weak[0].id,'Chapter 8']);}
 if(ch>=9){for(const t of M.threats.filter(t=>!(M.mitig.get(t.id)||[]).length))out.push(['risk',`Threat “${t.title}” has no mitigating control.`,M.O('threatens',t.id)[0]||t.id,'Chapter 9']);}
 if(ch>=10){const unp=M.run.filter(r=>!(M.placements.get(r.id)||[]).length&&inS(r.asset));if(unp.length)out.push(['gap',`${unp.length} operating plan${unp.length===1?' is':'s are'} not placed in any zone.`,unp[0].id,'Chapter 10']);const zones=new Set(M.inst.map(p=>p.zoneId));if(zones.size===1)out.push(['risk','Every placement shares one zone: a single failure domain.',M.inst[0]?.id]);const single=M.run.filter(r=>{const pl=M.placements.get(r.id)||[];return pl.length&&new Set(pl.map(p=>p.zoneId)).size===1&&M.T(r.asset)==='component';}).filter(r=>inS(r.asset));if(single.length&&zones.size>1)out.push(['info',`${single.length} component plan${single.length===1?'':'s'} run in one zone only (no standby).`,single[0].id]);}
 return out.slice(0,7);
}
function specimen(o){
 const M=S.M,li=(label,ids,color)=>ids.length?`<li style="--dot:${color}"><small>${label}</small>${ids.map(i=>`<button data-sel="${esc(i)}">${esc(ref(i)!==i?ref(i)+' · ':'')}${esc(title(i))}</button>`).join('<br>')}</li>`:'',gap=(label,text)=>`<li class="gap" style="--dot:#e2c07f"><small>${label}</small>${esc(text)}</li>`;
 const t=o.type,rows=[];
 if(t==='responsibility'){const w=M.why(o.id);rows.push(li('Why · requirements',w.reqs,'#587448'),li('Why · quality',w.qds,'#987431'),li('Why · decisions',w.adrs,'#805d83'));const cs=M.realizedBy.get(o.id)||[];rows.push(cs.length?li('Realized by',cs,'#2f6177'):gap('Realized by','No component yet'));const caps=[...new Set(cs.flatMap(c=>M.needs.get(c)||[]))];rows.push(li('Stands on',caps,'#66733a'));}
 if(t==='component'){rows.push(li('Realizes',M.realizes.get(o.id)||[],'#286954'),li('Needs',M.needs.get(o.id)||[],'#66733a'));const runs=M.runsOf.get(o.id)||[];rows.push(runs.length?li('Runs as',runs,'#3f6d86'):S.chapter>=10?gap('Runs as','Not operated yet'):'');rows.push(li('Owns data',M.owned.get(o.id)||[],'#6f5a93'),li('Calls',M.flows.filter(f=>f.from===o.id).map(f=>f.to),'#2d6450'),li('Called by',M.flows.filter(f=>f.to===o.id).map(f=>f.from),'#2d6450'));}
 if(t==='capability'){rows.push(li('Supports',M.capUsers.get(o.id)||[],'#2f6177'));const tr=M.techOf.get(o.id);rows.push(tr?li('Provided by',[tr],'#7a5f33'):gap('Provided by','No technology realization'));}
 if(t==='technology'){rows.push(li('Realizes',[M.capOf.get(o.id)].filter(Boolean),'#66733a'),li('Options considered',(M.options.get(o.id)||[]).map(x=>x.id),'#b18d42'),li('Runs as',M.runsOf.get(o.id)||[],'#3f6d86'));}
 if(t==='runtime'){rows.push(li('Operates',[o.asset].filter(Boolean),'#2f6177'));rows.push(`<li style="--dot:#3f6d86"><small>Placements</small>${(M.placements.get(o.id)||[]).map(p=>esc(title(p.zoneId))+' · '+(p.replicas||1)+' '+(p.role||'active')).join('<br>')||'None yet'}</li>`);}
 if(['requirement','quality','decision'].includes(t))rows.push(li('Shapes',[...M.O('fulfils',o.id),...M.O('constrains',o.id),...M.O('justifies',o.id)].filter(x=>['responsibility','capability'].includes(T(x))),'#286954'));
 if(t==='party')rows.push(li('Interacts with',[...new Set(M.flows.filter(f=>f.from===o.id||f.to===o.id).map(f=>f.from===o.id?f.to:f.from))],'#2d6450'));
 if(t==='data')rows.push(li('Owned by',[M.owner.get(o.id)].filter(Boolean),'#6f5a93'),li('Protected by',M.protects.get(o.id)||[],'#8f5a76'),li('Threatened by',M.threatsOn.get(o.id)||[],'#b0493a'));
 if(t==='contract')rows.push(li('Provider',M.I('provides',o.id),'#2f6177'),li('Consumer',M.I('uses',o.id),'#2f6177'),li('Carries',M.exch.get(o.id)||[],'#6f5a93'),li('Protected by',M.protects.get(o.id)||[],'#8f5a76'),li('Threatened by',M.threatsOn.get(o.id)||[],'#b0493a'));
 if(S.lens==='protection'||S.chapter>=9){if(['component','capability'].includes(t))rows.push(li('Inside boundary',M.inBound.get(o.id)||[],'#936180'));}
 return `<div class="spec"><div class="ref">${esc(TYPE_LABEL[t]||t)}${o.ref&&o.ref!==o.id?' · '+esc(o.ref):''}${o.owner?' · '+esc(o.owner):''}</div><h5>${esc(o.title)}</h5>${o.description?`<p style="margin-top:6px;font-size:13px;color:var(--ink2)">${esc(o.description)}</p>`:''}<ul class="lin">${rows.join('')}</ul>${['component','responsibility','capability','technology'].includes(t)?`<div class="asks" style="margin-top:10px"><button data-act="dissect-sel">Dissect this part ↘</button></div>`:''}</div>`;
}
function renderPanel(){
 const M=S.M,l=LENSES.find(x=>x.id===S.lens),o=S.sel&&M.byId.get(S.sel);
 const depth=S.peel?STRATA.find(s=>s.id===S.peel).label+' opened':'all layers (cross-section)';
 const ins=insights();
 $('.panel').innerHTML=`<section><h4>Where you are</h4><div class="where"><b>${esc(S.focus?M.byId.get(S.focus)?.title||'Outside':'Whole system')}</b> · ${esc(depth)} · <b>${esc(l.label)}</b> lens · Chapter ${S.chapter} of 11</div><p class="where" style="margin-top:6px">${esc(lensCaption())}</p></section>
 <section><h4>What you are looking at</h4><p class="narr">${narrative()}</p></section>
 ${o?`<section><h4>Selected</h4>${specimen(o)}</section>`:''}
 <section><h4>Design with AIW</h4><div class="asks"><button class="sol" data-ask="explain">Sol · explain this slice</button><button data-ask="missing">What’s missing here?</button><button data-ask="compare">Mind Factory · alternatives</button></div>${S.answer?`<div class="answer">${S.answer}<small>Concept preview · written from the model by rules. In AIW this runs through Sol’s reviewed source packet and never changes the model without your review.</small></div>`:''}</section>
 <section><h4>Worth noticing</h4>${ins.length?`<div class="ins">${ins.map(([k,t,id,chap])=>`<button class="insight ${k==='info'?'info':k==='risk'?'risk':''}" data-sel="${esc(id||'')}"><i></i><span>${esc(t)}${chap?` <small style="color:#9b7433">· ${chap}</small>`:''}</span></button>`).join('')}</div>`:'<p style="color:var(--muted);font-size:13px">Nothing stands out at this stage.</p>'}</section>
 <section><h4>About this model</h4><p style="font-size:12.5px;color:var(--ink2)">${esc(M.ds.note)}</p></section>`;
}
function ask(kind){
 const M=S.M,o=S.sel&&M.byId.get(S.sel);
 if(kind==='explain'){const lens=LENSES.find(x=>x.id===S.lens);S.answer=`<p><b>${esc(lens.label)} view of ${esc(o?o.title:S.focus?M.byId.get(S.focus).title:M.ds.title)}.</b> ${narrative()}</p><p>${esc(lensCaption())}</p>`;}
 if(kind==='missing'){const ins=insights().filter(i=>i[0]!=='info');S.answer=ins.length?`<p><b>Open questions in this scope</b></p><ol>${ins.map(i=>`<li>${esc(i[1])}${i[3]?' <i>('+i[3]+')</i>':''}</li>`).join('')}</ol>`:'<p>No structural gaps are visible at this stage. Evidence and review still need to be recorded before approval.</p>';}
 if(kind==='compare'){
  if(o?.type==='technology'){const opts=M.options.get(o.id)||[];S.answer=opts.length?`<p><b>${esc(o.title)}</b> — options recorded:</p><ul>${opts.map(x=>`<li>${esc(x.title)}</li>`).join('')}</ul><p>Mind Factory would compare them against the qualities this capability carries (${esc([...new Set((M.capUsers.get(M.capOf.get(o.id))||[]).flatMap(c=>(M.realizes.get(c)||[]).flatMap(r=>M.why(r).qds)))].map(title).slice(0,3).join('; ')||'no linked quality yet')}) and show what each would change in the layers above.</p>`:`<p>No options are recorded for ${esc(o.title)} yet. Start by naming two candidates in Chapter 7.</p>`;}
  else if(o?.type==='component'||o?.type==='responsibility'){const fl=M.flows.filter(f=>f.from===o.id||f.to===o.id);S.answer=`<p>For <b>${esc(o.title)}</b>, Mind Factory would compare a <b>direct request</b> with <b>durable queued work</b> on its ${fl.length} interaction${fl.length===1?'':'s'}, and a <b>cohesive</b> versus <b>separate</b> boundary — showing the proposed objects in place on this same canvas as ghosts before anything changes.</p>`;}
  else S.answer='<p>Select a component, responsibility or technology realization to compare alternatives for that part.</p>';}
 renderPanel();requestAnimationFrame(()=>$('.panel .answer')?.scrollIntoView({block:'nearest',behavior:'smooth'}));
}

// ---- Interaction -----------------------------------------------------------------------------
function setView(){const w=$('.world');w.style.transform=`translate(${S.px}px,${S.py}px) scale(${S.zoom})`;}
function revealBand(id){if(!L)return;const b=L.bands.find(x=>x.s.id===id);if(!b)return;const st=$('.stage'),z=S.zoom,top=b.y*z+S.py,bottom=(b.y+b.h)*z+S.py;if(top<0||bottom>st.clientHeight-40){S.py=Math.min(8,Math.max(st.clientHeight-40-L.H*z,-(b.y*z)+70));$('.world').style.transition='transform .45s cubic-bezier(.2,.7,.2,1)';setView();setTimeout(()=>{$('.world').style.transition='';},480);}}
function fit(){const st=$('.stage');if(!L)return;const z=Math.min(1.15,Math.max(.35,(st.clientWidth-24)/L.W));S.zoom=z;S.px=Math.max(8,(st.clientWidth-L.W*z)/2);S.py=8;setView();}
function select(id){S.sel=id&&S.M.byId.has(id)?id:null;S.answer=null;render();}
function setChapter(n){S.chapter=Math.max(1,Math.min(11,n));const l=LENSES.find(x=>x.id===S.lens);if(!lensOk(l))S.lens='structure';if(S.peel&&S.chapter<STRATA.find(s=>s.id===S.peel).ch)S.peel=null;render();}
function storyStep(){
 if(S.chapter>=11){stopStory();return;}
 const n=S.chapter+1;S.chapter=n;
 S.peel=n<=3?'intent':n===4?'logical':n===5?'application':n===6?'capability':n===7?'technology':n===10?'runtime':null;
 S.lens=n===8?'signals':n===9?'protection':n===10?'operation':n<=3?'reasoning':'structure';
 if(n===11){S.peel=null;S.lens='structure';}
 render();
 if(n<11)storyTimer=setTimeout(storyStep,3200);else stopStory();
}
function startStory(){S.story=true;S.sel=null;S.focus=null;S.chapter=0;storyStep();requestAnimationFrame(fit);}
function stopStory(){S.story=false;clearTimeout(storyTimer);renderChrome();}
function loadDataset(id){
 const ds=window.AIW_DATASETS.find(d=>d.id===id)||window.AIW_DATASETS[0];
 S.ds=ds;S.M=AN.normalize(ds);S.sel=null;S.focus=null;S.peel=null;S.scenario=null;S.step=-1;S.answer=null;
 for(const el of nodes.values())el.remove();nodes.clear();
 render();requestAnimationFrame(()=>{fit();render();});
}
function tip(e){
 const el=e.target.closest('[data-id]'),t=$('.tip');
 if(!el||el.dataset.kind==='mhead'){t.hidden=true;if(S.hover){S.hover=null;if(!S.sel)softHighlight();}return;}
 const id=el.dataset.id,o=S.M.byId.get(id);if(!o){t.hidden=true;return;}
 t.innerHTML=`<b>${esc(o.title)}</b>${esc(TYPE_LABEL[o.type]||o.type)}${o.ref&&o.ref!==o.id?' · '+esc(o.ref):''}<small>${selectionSentence(o).replace(/<[^>]+>/g,'')}</small>`;
 t.hidden=false;t.style.left=Math.min(innerWidth-300,e.clientX+14)+'px';t.style.top=Math.min(innerHeight-140,e.clientY+14)+'px';
 if(!S.sel&&S.hover!==id){S.hover=id;softHighlight();}
}
function softHighlight(){ // hover highlight without re-layout
 const hl=S.hover?lineage(S.hover):null;
 for(const [,el] of nodes){const id=el.dataset.id;if(!id||['mhead','blabel','bandbg','col'].includes(el.dataset.kind))continue;el.classList.toggle('dim',!!hl&&!hl.has(id));el.classList.toggle('hl',!!hl&&hl.has(id)&&S.hover!==id);}
 drawEdges();
}
function bind(){
 const st=$('.stage');let drag=null,moved=false;
 st.addEventListener('pointerdown',e=>{if(e.target.closest('.zoombar,.scenario,.key'))return;drag={x:e.clientX,y:e.clientY,px:S.px,py:S.py};moved=false;});
 addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4){moved=true;st.classList.add('panning');}if(moved){S.px=drag.px+dx;S.py=drag.py+dy;setView();}}else tip(e);});
 addEventListener('pointerup',()=>{drag=null;st.classList.remove('panning');});
 st.addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey||e.metaKey){const r=st.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,z0=S.zoom,z=Math.max(.3,Math.min(2,z0*Math.exp(-e.deltaY*.0022)));S.px=mx-(mx-S.px)*z/z0;S.py=my-(my-S.py)*z/z0;S.zoom=z;}else{S.px-=e.deltaX;S.py-=e.deltaY;}setView();},{passive:false});
 document.addEventListener('click',e=>{
  const a=e.target.closest('[data-act]'),lens=e.target.closest('[data-lens]'),peel=e.target.closest('[data-peel]'),chb=e.target.closest('[data-ch]'),sel=e.target.closest('[data-sel]'),pill=e.target.closest('[data-pill]'),askb=e.target.closest('[data-ask]'),dsb=e.target.closest('[data-ds]');
  if(dsb){loadDataset(dsb.dataset.ds);return;}
  if(a){const act=a.dataset.act;
   if(act==='focus'){S.focus=a.dataset.col;S.answer=null;render();requestAnimationFrame(fit);return;}
   if(act==='unfocus'||act==='system'){S.focus=null;if(act==='system')S.sel=null;render();requestAnimationFrame(fit);return;}
   if(act==='fit'){fit();return;}if(act==='zin'||act==='zout'){const z=Math.max(.3,Math.min(2,S.zoom*(act==='zin'?1.15:1/1.15)));const r=$('.stage').getBoundingClientRect(),mx=r.width/2,my=r.height/2;S.px=mx-(mx-S.px)*z/S.zoom;S.py=my-(my-S.py)*z/S.zoom;S.zoom=z;setView();return;}
   if(act==='panel'){S.panel=!S.panel;render();requestAnimationFrame(fit);return;}
   if(act==='play'){S.story?stopStory():startStory();return;}
   if(act==='intro-close'){$('.intro').hidden=true;return;}
   if(act==='intro-story'){$('.intro').hidden=true;startStory();return;}
   if(act==='intro'){$('.intro').hidden=false;return;}
   if(act==='dissect-sel'&&S.sel){const o=S.M.byId.get(S.sel);const col=S.M.colOf.get(o.id)||S.M.mod.get((S.M.capUsers.get(o.id)||[])[0])||S.M.mod.get((S.M.capUsers.get(S.M.capOf.get(o.id))||[])[0]);if(col&&!String(col).startsWith('EXT'))S.focus=col;S.peel={responsibility:'logical',component:'application',capability:'capability',technology:'technology'}[o.type]||null;render();requestAnimationFrame(fit);return;}
   if(act==='step-next'||act==='step-prev'){const sc=S.M.scenarios.find(s=>s.id===S.scenario);if(!sc)return;S.step=act==='step-next'?(S.step>=sc.steps.length-1?0:S.step+1):Math.max(0,S.step-1);S.sel=null;render();return;}
   if(act==='noop')return;
   if(act==='key'){const k=$('.key');k.classList.toggle('min');a.textContent=k.classList.contains('min')?'▴':'▾';return;}
  }
  if(lens&&!lens.disabled){S.lens=lens.dataset.lens;S.answer=null;if(S.lens!=='flow'){S.scenario=null;S.step=-1;}render();const target={operation:'runtime',reasoning:'intent',signals:'application',information:'application',flow:'application',protection:'application'}[S.lens];if(target)setTimeout(()=>revealBand(target),60);return;}
  if(peel&&!peel.disabled){S.peel=peel.dataset.peel||null;render();if(S.peel)setTimeout(()=>revealBand(S.peel),420);return;}
  if(chb){stopStory();setChapter(Number(chb.dataset.ch));return;}
  if(askb){ask(askb.dataset.ask);return;}
  if(pill){select(pill.dataset.pill);return;}
  if(sel){e.stopPropagation();select(sel.dataset.sel);return;}
  const band=e.target.closest('[data-band]');if(band&&!moved){const s=STRATA.find(x=>x.id===band.dataset.band);if(S.chapter>=s.ch){S.peel=S.peel===s.id?null:s.id;render();}return;}
  const node=e.target.closest('.stage [data-id]');
  if(node&&!moved){if(node.dataset.kind==='mhead'){const c=node.dataset.id;if(c==='BRIEF'||String(c).startsWith('EXT'))return;select(S.sel===c?null:c);return;}select(S.sel===node.dataset.id?null:node.dataset.id);return;}
  if(e.target.closest('.stage')&&!moved&&!e.target.closest('.zoombar,.scenario,.key')){if(S.sel)select(null);}
 });
 document.addEventListener('dblclick',e=>{const h=e.target.closest('.stage [data-kind="mhead"]');if(h&&!String(h.dataset.id).startsWith('EXT')&&h.dataset.id!=='BRIEF'){S.focus=S.focus===h.dataset.id?null:h.dataset.id;render();requestAnimationFrame(fit);}});
 document.addEventListener('change',e=>{if(e.target.dataset.f==='scenario'){S.scenario=e.target.value||null;S.step=-1;render();}});
 addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('.intro').hidden){$('.intro').hidden=true;return;}if(S.sel)select(null);else if(S.peel){S.peel=null;render();}else if(S.focus){S.focus=null;render();requestAnimationFrame(fit);}}
  if(e.key==='ArrowRight'&&e.altKey)setChapter(S.chapter+1);if(e.key==='ArrowLeft'&&e.altKey)setChapter(S.chapter-1);});
 let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{render();fit();},120);});
}
window.addEventListener('DOMContentLoaded',()=>{bind();loadDataset((window.AIW_DATASETS.find(d=>d.id==='core-banking')||window.AIW_DATASETS[0]).id);});
})();
