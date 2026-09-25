import {OBJECT_TYPES} from './architecture-model.js';

const levels=[['logical','Responsibilities'],['application','Application realization'],['capability','Technology capabilities'],['technology','Technology realization'],['deployment','Runtime placement']];
const order={module:0,responsibility:1,component:2,capability:3,technology:4,runtime:5,instance:6,environment:7,zone:8};
const sorted=objects=>objects.slice().sort((a,b)=>(order[a.type]??9)-(order[b.type]??9)||String(a.ref).localeCompare(String(b.ref),undefined,{numeric:true}));

const median=values=>{const s=values.slice().sort((a,b)=>a-b);return s.length?s[Math.floor((s.length-1)/2)]:null;};
const grid=value=>Math.round(value/8)*8;
export function occurrenceLimits(item){
 const type=item.object.type;
 return {minWidth:item.module?270:item.placement?216:['gateway','event'].includes(type)?96:160,
  minHeight:item.module?Math.min(item.height,242):item.placement?170:item.embedded?.length?Math.min(item.height,136):['gateway','event'].includes(type)?88:item.process?Math.min(item.height,104):88,
  maxWidth:item.module?720:560,maxHeight:item.module?720:480};
}
export function occurrenceBounds(item,changes={}){
 const limits=occurrenceLimits(item),dimension=(name,min,max)=>Number.isFinite(changes[name])&&changes[name]!==item[name]?Math.max(min,Math.min(max,grid(changes[name]))):item[name];
 return {x:Number.isFinite(changes.x)?Math.max(8,Math.min(6000,grid(changes.x))):item.x,
  y:Number.isFinite(changes.y)?Math.max(72,Math.min(6000,grid(changes.y))):item.y,
  width:dimension('width',limits.minWidth,limits.maxWidth),height:dimension('height',limits.minHeight,limits.maxHeight)};
}
export function occurrenceOverlaps(a,b,spacing=12){
 return a.x<b.x+b.width+spacing&&a.x+a.width+spacing>b.x&&a.y<b.y+b.height+spacing&&a.y+a.height+spacing>b.y;
}
export function canPlaceOccurrence(layout,id,bounds){return !layout.occurrences.some(other=>other.id!==id&&occurrenceOverlaps(bounds,other));}
export function staysInArchitecturalGroup(layout,id,bounds){
 const item=layout.positions.get(id);if(!item)return false;
 const belongs=group=>item.x+item.width/2>=group.x&&item.x+item.width/2<=group.x+group.width&&item.y+item.height/2>=group.y&&item.y+item.height/2<=group.y+group.height;
 const original=new Set(layout.groups.filter(belongs));
 const centerInside=group=>bounds.x+bounds.width/2>=group.x&&bounds.x+bounds.width/2<=group.x+group.width&&bounds.y+bounds.height/2>=group.y&&bounds.y+bounds.height/2<=group.y+group.height;
 return [...original].every(centerInside)&&!layout.groups.some(group=>!original.has(group)&&occurrenceOverlaps(bounds,group,0));
}
// Ordering is a view property. Shared services and many-to-many mappings keep
// one identity while their neighbours are brought closer on the canvas.
function alignLanes(lanes,relationships){
 for(let pass=0;pass<4;pass++)for(const direction of [1,-1]){
  const indices=direction===1?[...lanes.keys()]:[...lanes.keys()].reverse();
  for(const i of indices){const lane=lanes[i],neighbor=lanes[i-direction];if(!neighbor)continue;
   const positions=new Map(neighbor.objects.map((o,j)=>[o.id,j])),adjacent=new Map(lane.objects.map(o=>[o.id,[]]));
   for(const e of relationships){if(adjacent.has(e.from)&&positions.has(e.to))adjacent.get(e.from).push(positions.get(e.to));if(adjacent.has(e.to)&&positions.has(e.from))adjacent.get(e.to).push(positions.get(e.from));}
   const scores=new Map(lane.objects.map(o=>[o.id,median(adjacent.get(o.id))]));
   const score=o=>scores.get(o.id);
   lane.objects.sort((a,b)=>{const left=score(a),right=score(b);return (left===null?Number.MAX_SAFE_INTEGER:left)-(right===null?Number.MAX_SAFE_INTEGER:right)||String(a.ref).localeCompare(String(b.ref),undefined,{numeric:true});});
  }
 }
 return lanes;
}

function behaviourLanes(view){
 const nodes=sorted(view.objects),ids=new Set(nodes.map(o=>o.id)),edges=view.relationships.filter(e=>ids.has(e.from)&&ids.has(e.to)&&e.from!==e.to);
 const indegree=new Map(nodes.map(o=>[o.id,0])),outgoing=new Map(nodes.map(o=>[o.id,[]]));
 edges.forEach(e=>{indegree.set(e.to,indegree.get(e.to)+1);outgoing.get(e.from).push(e.to);});
 const queue=nodes.filter(o=>!indegree.get(o.id)).map(o=>o.id),processed=new Set(),depth=new Map(nodes.map(o=>[o.id,0]));
 while(queue.length){const id=queue.shift();if(processed.has(id))continue;processed.add(id);
  for(const next of outgoing.get(id)){depth.set(next,Math.max(depth.get(next),Math.min(4,depth.get(id)+1)));indegree.set(next,indegree.get(next)-1);if(!indegree.get(next))queue.push(next);}
 }
 // Give a strongly connected remainder a stable entry point; back edges are
 // still rendered as back edges, without claiming a measured runtime order.
 for(const o of nodes)if(!processed.has(o.id)){
  const pending=[o.id];processed.add(o.id);
  while(pending.length){const id=pending.shift();for(const next of outgoing.get(id))if(!processed.has(next)){depth.set(next,Math.min(4,depth.get(id)+1));processed.add(next);pending.push(next);}}
 }
 const count=Math.max(1,Math.max(...depth.values())+1);
 return alignLanes(Array.from({length:count},(_,i)=>({title:'Interaction band '+(i+1),objects:nodes.filter(o=>depth.get(o.id)===i)})),edges);
}

export function layoutArchitecture(model,view,state,width=1100){
 const positions=new Map(),groups=[],occurrences=[];let w=Math.max(780,width),h=520;
 const place=(o,x,y,width=214,height=112,extra={})=>{const item={id:o.id,object:o,x,y,width,height,...extra};positions.set(o.id,item);occurrences.push(item);return item;};
 if(view.concern==='process'&&state.context==='functional'&&model.objects.has('PROC-REF-START')){
  // A compact lane diagram with discrete gateway and outcome ports. Fixed
  // reference slots keep the payment journey spatially stable across visits.
  const slots=['PROC-REF-START','JRN-001','JRN-002','PROC-REF-RISK','JRN-003','JRN-004','PROC-REF-OUTCOME','JRN-005','PROC-REF-DONE'];
  const widths=slots.map(id=>['gateway','event'].includes(model.objects.get(id)?.type)?104:188),x=[32];
  for(let i=1;i<slots.length;i++)x.push(x[i-1]+widths[i-1]+40);
  const lanes=['Channel','Risk','Core banking','Payments'],y={Channel:104,Risk:315,'Core banking':585,Payments:800};
  const referenceLane={'PROC-REF-START':'Channel','JRN-001':'Channel','JRN-002':'Risk','PROC-REF-RISK':'Risk','PROC-REF-HELD':'Risk','JRN-003':'Core banking','JRN-004':'Payments','PROC-REF-OUTCOME':'Payments','PROC-REF-PENDING':'Payments','JRN-005':'Channel','PROC-REF-DONE':'Channel'};
  const name=o=>referenceLane[o.id]||(/risk/i.test(o.owner||o.attributes.lane)?'Risk':/core|ledger/i.test(o.owner||o.attributes.lane)?'Core banking':/payment/i.test(o.owner||o.attributes.lane)?'Payments':'Channel');
  w=Math.max(w,x.at(-1)+widths.at(-1)+56);
  for(const lane of lanes)groups.push({title:lane+' · '+(lane==='Channel'?'customer interaction':lane==='Risk'?'screening and holds':lane==='Core banking'?'book of record':'external settlement'),x:20,y:y[lane]-38,width:w-40,height:lane==='Risk'?266:186,process:true});
  const byId=new Map(view.objects.map(o=>[o.id,o]));
  slots.forEach((id,i)=>{const o=byId.get(id);if(o)place(o,x[i],y[name(o)],widths[i],o.type==='event'?96:o.type==='gateway'?112:122,{process:true});});
  for(const [id,column,offset] of [['PROC-REF-HELD',3,135],['PROC-REF-PENDING',7,0]]){const o=byId.get(id);if(o)place(o,x[column]-(id==='PROC-REF-HELD'?80:0),y[name(o)]+offset,138,92,{process:true,branch:true});}
  const pending=view.objects.filter(o=>!positions.has(o.id));let detached=0;
  // A new object follows its recorded predecessor in the accountable lane.
  // Unconnected drafts stay in a small review area until a path is declared.
  const passLimit=pending.length;for(let pass=0;pass<passLimit;pass++){
   let progressed=false;
   for(const o of pending.slice()){
    const predecessor=view.relationships.find(e=>e.type==='sequence'&&e.to===o.id&&positions.has(e.from));
    if(!predecessor)continue;
    const source=positions.get(predecessor.from),width=o.type==='event'||o.type==='gateway'?130:188,atY=y[name(o)]||104;
    let atX=source.x+source.width+40;
    while(occurrences.some(n=>atX<n.x+n.width+16&&atX+width+16>n.x&&atY<n.y+n.height+16&&atY+112+16>n.y))atX+=228;
    place(o,atX,atY,width,112,{process:true,authored:true});w=Math.max(w,atX+width+56);pending.splice(pending.indexOf(o),1);progressed=true;
   }
   if(!progressed)break;
  }
  for(const o of pending){const cols=Math.max(1,Math.floor((w-64)/228)),i=detached++;place(o,32+(i%cols)*228,1020+Math.floor(i/cols)*148,o.type==='event'||o.type==='gateway'?130:188,112,{process:true,authored:true});}
  if(detached){const rows=Math.ceil(detached/Math.max(1,Math.floor((w-64)/228)));groups.push({title:'Unconnected process definitions · review next',description:'Give each object a conditional path or a clear ownership link.',x:20,y:978,width:w-40,height:76+rows*148,process:true});h=1080+rows*148;}else h=1020;
  groups.forEach(g=>g.width=w-40);
 }else if(view.concern==='process'){
  const owners=[...new Set(view.objects.map(o=>o.attributes.lane||o.owner||'Unassigned'))].sort(),rows=owners.length||1;
  const tasks=view.objects.slice().sort((a,b)=>(a.attributes.order||0)-(b.attributes.order||0)||a.id.localeCompare(b.id));
  w=Math.max(w,90+tasks.length*226);
  owners.forEach((name,i)=>groups.push({title:name,x:20,y:56+i*164,width:w-40,height:146,process:true}));
  tasks.forEach((o,i)=>place(o,36+i*226,103+Math.max(0,owners.indexOf(o.attributes.lane||o.owner||'Unassigned'))*164,o.type==='event'||o.type==='gateway'?128:184,102,{process:true}));
  h=Math.max(450,64+rows*164);
 }else if(view.concern==='structure'&&state.scopeId===model.root&&model.modules.length&&state.context==='functional'){
  const cols=Math.max(1,Math.min(3,Math.floor((w-64)/320))),gap=38,cardW=Math.max(270,Math.min(380,(w-64-(cols-1)*gap)/cols));
  let lower=72;
  for(let row=0;row<Math.ceil(model.modules.length/cols);row++){
   const modules=model.modules.slice(row*cols,(row+1)*cols),children=modules.map(o=>[...model.objects.values()].filter(n=>n.type==='responsibility'&&n.moduleIds.includes(o.id)));
   const cardH=Math.max(242,...children.map(items=>166+Math.min(3,items.length)*32+(items.length>3?18:0)));
   modules.forEach((o,i)=>place(o,32+i*(cardW+gap),lower,cardW,cardH,{module:true,overview:true,children:children[i]}));lower+=cardH+44;
  }
  const shared=view.objects.filter(o=>o.type==='capability'&&o.shared),supportW=204,supportGap=24,supportCols=Math.max(1,Math.floor((w-64+supportGap)/(supportW+supportGap)));
  if(shared.length){const height=68+Math.ceil(shared.length/supportCols)*116;groups.push({title:'Shared technology capabilities',description:'One capability, used by several modules',x:24,y:lower,width:w-48,height});shared.forEach((o,i)=>place(o,42+(i%supportCols)*(supportW+supportGap),lower+55+Math.floor(i/supportCols)*116,supportW,90,{shared:true,overview:true}));lower+=height+32;}
  const remaining=view.objects.filter(o=>o.type==='party'||o.type==='responsibility'&&!o.moduleIds.length);
  if(remaining.length){const height=62+Math.ceil(remaining.length/supportCols)*122;groups.push({title:'External participants and unassigned responsibilities',x:24,y:lower,width:w-48,height});remaining.forEach((o,i)=>place(o,42+(i%supportCols)*(supportW+supportGap),lower+48+Math.floor(i/supportCols)*122,supportW,96,{overview:true}));lower+=height+28;}
  h=lower+20;
 }else if(view.concern==='structure'&&view.mode==='guided'&&state.scopeId!==model.root&&state.context==='functional'&&view.objects.length>=2&&view.objects.length<=4&&view.objects.every(o=>o.type==='responsibility')){
  // A small module reads as an ordered responsibility path, not as a tall
  // single-column inventory. The group is the module boundary in this view.
  const remaining=new Set(view.objects.map(o=>o.id)),ordered=[];
  while(remaining.size){const entry=[...remaining].find(id=>!view.relationships.some(e=>e.to===id&&remaining.has(e.from)))||[...remaining][0];ordered.push(model.objects.get(entry));remaining.delete(entry);}
  const cardW=ordered.length===4?224:248,gap=ordered.length===4?30:48,occupied=ordered.length*cardW+(ordered.length-1)*gap;
  w=Math.max(w,occupied+56);const left=Math.max(24,Math.floor((w-occupied)/2));
  groups.push({title:view.scope.title+' · responsibilities',x:left-14,y:48,width:occupied+28,height:232});
  ordered.forEach((o,i)=>place(o,left+i*(cardW+gap),126,cardW,110));h=328;
 }else if(view.concern==='data'&&view.mode==='guided'&&state.context==='functional'&&view.objects.length<=6&&view.objects.some(o=>o.type==='contract')&&view.objects.some(o=>o.type==='data')){
  const columns=[{title:'Application & participant',types:['component','party']},{title:'Interface contract',types:['contract']},{title:'Exchanged data',types:['data']}],gap=48,laneW=Math.min(288,Math.max(208,(w-72-2*gap)/3)),occupied=3*laneW+2*gap;
  w=Math.max(w,occupied+48);const left=Math.max(24,Math.floor((w-occupied)/2));
  columns.forEach((column,i)=>{const x=left+i*(laneW+gap),nodes=sorted(view.objects.filter(o=>column.types.includes(o.type)));if(!nodes.length)return;
   groups.push({title:column.title,x,y:20,width:laneW,height:304});
   nodes.forEach((o,j)=>place(o,x+10,72+j*124,laneW-20,o.type==='data'?110:112));
  });h=350;
 }else if(view.concern==='security'&&view.mode==='guided'&&state.context==='functional'&&view.objects.length<=6&&view.objects.some(o=>o.type==='component')&&view.objects.some(o=>o.type==='contract')&&view.objects.some(o=>o.type==='control')){
  // Read the protected path from application to contract to control. Place
  // its boundary and threat below their subjects instead of interleaving
  // multiple protected contracts in the same column.
  const columns=[{title:'Application & boundary',types:['component','party','boundary']},{title:'Protected contract',types:['contract','data']},{title:'Control & threat',types:['control','threat']}],gap=48,laneW=Math.min(290,Math.max(208,(w-72-2*gap)/3)),occupied=3*laneW+2*gap;
  w=Math.max(w,occupied+48);const left=Math.max(24,Math.floor((w-occupied)/2));
  columns.forEach((column,i)=>{const x=left+i*(laneW+gap),nodes=view.objects.filter(o=>column.types.includes(o.type));if(!nodes.length)return;
   groups.push({title:column.title,x,y:48,width:laneW,height:346});
   nodes.forEach((o,j)=>place(o,x+10,112+j*124,laneW-20,o.type==='threat'?128:112,{securityPath:true}));
  });h=410;
 }else if(view.concern==='realization'&&state.context==='functional'){
  const columns=alignLanes(levels.map(([level,title])=>({level,title,objects:sorted(view.objects.filter(o=>o.level===level))})).filter(column=>column.objects.length),view.relationships);
  const guided=view.mode==='guided',gap=guided?56:88,columnWidth=guided?Math.min(310,Math.max(238,(w-80-Math.max(0,columns.length-1)*gap)/Math.max(1,columns.length))):238,rowH=guided?158:170;
  const occupied=columns.length*columnWidth+Math.max(0,columns.length-1)*gap;
  w=Math.max(w,occupied+48);const left=guided?Math.max(24,Math.floor((w-occupied)/2)):24;
  columns.forEach((col,i)=>{
   const x=left+i*(columnWidth+gap),height=Math.max(340,col.objects.length*rowH+96);groups.push({title:col.title,x,y:48,width:columnWidth,height,level:col.level});
   col.objects.forEach((o,j)=>place(o,x+9,111+j*rowH,columnWidth-18,state.detail==='expanded'&&o.type==='component'?144:116,{embedded:o.type==='component'?model.relationships.filter(e=>e.type==='realizedBy'&&e.to===o.id).map(e=>model.objects.get(e.from)).filter(Boolean):[]}));h=Math.max(h,height+82);
  });
 }else if(view.concern==='deployment'&&state.context==='functional'){
  let x=24;
  const envs=view.objects.filter(o=>o.type==='environment');
  for(const env of envs){
   const zones=view.objects.filter(o=>o.type==='zone'&&o.attributes.environmentId===env.id);let cursor=82,envHeight=120;
   for(const zone of zones){
    const placements=view.objects.filter(o=>o.type==='instance'&&o.attributes.zoneId===zone.id),rows=Math.max(1,Math.ceil(placements.length/2)),height=76+rows*205;
    groups.push({id:zone.id,title:zone.title,description:zone.attributes.failureDomain||'Failure domain not recorded',x:x+16,y:cursor,width:490,height,zone:true});
    placements.forEach((o,i)=>place(o,x+30+(i%2)*238,cursor+66+Math.floor(i/2)*205,218,180,{placement:true,plan:model.objects.get(o.attributes.planId),asset:model.objects.get(model.objects.get(o.attributes.planId)?.attributes.assetId)}));cursor+=height+20;envHeight=cursor;
   }
   groups.unshift({id:env.id,title:env.title,description:env.attributes.stage||'Environment',x,y:20,width:522,height:envHeight,environment:true});x+=554;h=Math.max(h,envHeight+50);
  }
  const unmapped=view.objects.filter(o=>['runtime','technology','component'].includes(o.type)&&!model.relationships.some(e=>e.type==='placedAs'&&(e.from===o.id||model.relationships.some(r=>r.from===o.id&&r.to===e.from))));
  const remaining=sorted(unmapped);if(remaining.length){groups.push({title:'Placement not modelled',description:'Recorded design objects without a planned placement',x,y:20,width:490,height:Math.max(210,Math.ceil(remaining.length/2)*132+86)});
   remaining.forEach((o,i)=>place(o,x+14+(i%2)*238,100+Math.floor(i/2)*132,218,112));w=Math.max(w,x+524);h=Math.max(h,Math.ceil(remaining.length/2)*132+140);}else w=Math.max(w,x+24);
 }else{
  let buckets;
  if(state.context==='owner'){
   const names=[...new Set(view.objects.map(o=>o.owner||'Owner not assigned'))].sort();buckets=names.map(name=>({title:name,objects:sorted(view.objects.filter(o=>(o.owner||'Owner not assigned')===name))}));
  }else if(state.context==='boundary'){
   const boundary=o=>model.relationships.find(e=>e.from===o.id&&e.type==='withinBoundary')?.to;
   const ids=[...new Set(view.objects.map(boundary))].sort();buckets=ids.map(id=>({title:id?model.objects.get(id)?.title||id:'No direct boundary mapping',objects:sorted(view.objects.filter(o=>boundary(o)===id))}));
  }else if(view.concern==='behaviour'){
   buckets=behaviourLanes(view);
  }else{
   const sets=view.concern==='security'?(view.mode==='guided'?[['component','party','contract','data'],['threat','control'],['boundary']]:[['component','party'],['contract','data'],['threat'],['control'],['boundary']]):view.concern==='data'?[['component','party'],['contract'],['data']]:view.concern==='rationale'?(view.mode==='guided'?[['outcome','requirement','quality'],['decision','evidence','pattern'],['responsibility','component']]:[['outcome','requirement'],['quality'],['decision'],['responsibility','component'],['evidence','pattern']]):[['responsibility'],['component'],['party']];
   buckets=sets.map(types=>({title:types.map(t=>OBJECT_TYPES[t].label).join(' / '),objects:sorted(view.objects.filter(o=>types.includes(o.type)))})).filter(b=>b.objects.length);
   alignLanes(buckets,view.relationships);
  }
  const guided=view.mode==='guided',gap=guided?48:66,laneW=guided?Math.max(210,Math.min(288,(w-64-Math.max(0,buckets.length-1)*gap)/Math.max(1,buckets.length))):242,rowH=guided&&view.concern==='data'?136:150;
  const occupied=buckets.length*laneW+Math.max(0,buckets.length-1)*gap;w=Math.max(w,occupied+48);const left=guided?Math.max(24,Math.floor((w-occupied)/2)):24;
  buckets.forEach((b,i)=>{const x=left+i*(laneW+gap),height=Math.max(300,b.objects.length*rowH+84);groups.push({title:b.title,x,y:48,width:laneW,height});b.objects.forEach((o,j)=>place(o,x+11,112+j*rowH,laneW-22,o.type==='data'?124:110));h=Math.max(h,height+82);});
 }
 // View occurrences may be moved and resized without changing the object's
 // semantic identity, its owner, or the definition of a frozen baseline.
 for(const item of occurrences){const saved=state.positions?.[item.id];if(!saved)continue;
  Object.assign(item,occurrenceBounds(item,saved));w=Math.max(w,item.x+item.width+40);h=Math.max(h,item.y+item.height+40);
 }
 return {positions,groups,occurrences,width:w,height:h};
}

// Rebuild the concern-specific, relationship-aligned projection. Manually
// positioned or resized objects remain anchors; their neighbours are packed
// into the nearest clear slots within their original architectural columns.
export function smartArrangeArchitecture(model,view,state,width=1100,previous={}){
 const base=layoutArchitecture(model,view,{...state,positions:{}},width),result={},placed=[];
 const pinned=base.occurrences.filter(item=>previous[item.id]?.pinned!==false&&previous[item.id]&&(
  Number.isFinite(previous[item.id].x)||Number.isFinite(previous[item.id].width)));
 const others=base.occurrences.filter(item=>!pinned.includes(item));
 for(const item of [...pinned,...others]){
  const anchor=pinned.includes(item),original=anchor?occurrenceBounds(item,previous[item.id]):occurrenceBounds(item);let next={...original};
  // Start with the saved anchor. Reflow only an actual collision; prefer to
  // keep the item's architectural lane rather than drift into another group.
  if(placed.some(other=>occurrenceOverlaps(next,other))){
   const across=grid(original.width+32),rows=[original.y,...placed.flatMap(other=>[grid(other.y+other.height+20),grid(other.y-original.height-20)])].filter((y,i,all)=>y>=72&&y<=6000&&all.indexOf(y)===i).sort((a,b)=>Math.abs(a-original.y)-Math.abs(b-original.y)||a-b);let found=false;
   for(let column=0;column<50&&!found;column++){
    const x=column?grid(original.x+(column%2?1:-1)*Math.ceil(column/2)*across):original.x;
    if(x<8||x>6000)continue;
    for(const y of rows){
     const candidate={...original,x,y};if(staysInArchitecturalGroup(base,item.id,candidate)&&!placed.some(other=>occurrenceOverlaps(candidate,other))){next=candidate;found=true;break;}
    }
   }
   if(!found)throw Error('This view is too crowded for a collision-free arrangement. Narrow the scope or release an anchor.');
  }
  placed.push(next);result[item.id]={...next,pinned:anchor};
 }
 return result;
}

export function edgeGeometry(a,b,index=0,canvasWidth=null){
 if(!a||!b)return null;
 if(a.process&&b.process){
  if(Math.abs(a.x-b.x)<10){const center=a.x+a.width/2,target=b.x+b.width/2;if(a.y<b.y)return {d:`M${center} ${a.y+a.height} V${b.y}`,x:center+12,y:(a.y+a.height+b.y)/2};return {d:`M${center} ${a.y} V${b.y+b.height}`,x:center+12,y:(a.y+b.y+b.height)/2};}
  const sx=a.x+a.width,tx=b.x,ay=a.y+a.height/2,by=b.y+b.height/2,mid=(sx+tx)/2;
  if(tx>sx+125){const rail=Math.min(a.y,b.y)-25;return {d:`M${sx} ${ay} H${sx+16} V${rail} H${tx-16} V${by} H${tx}`,x:(sx+tx)/2,y:rail};}
  if(tx>sx+8)return {d:`M${sx} ${ay} H${mid} V${by} H${tx}`,x:mid,y:(ay+by)/2};
 }
 const lane=(index%5-2)*3,ay=a.y+a.height/2,by=b.y+b.height/2;
 if(a.overview&&b.overview){
  const outer=canvasWidth?canvasWidth-12:Math.max(a.x+a.width,b.x+b.width)+40,top=24+(index%4)*4;
  if(b.y>a.y+a.height+25){const sx=a.x+a.width,rail=sx+18,target=b.x+b.width/2,corridor=b.y-18-(index%3)*3;return {d:`M${sx} ${ay} H${rail} V${top} H${outer} V${corridor} H${target} V${b.y}`,x:(outer+target)/2,y:corridor};}
  if(a.y>b.y+b.height+25){const sx=a.x+a.width/2,rail=b.x+b.width+18,corridor=a.y-18-(index%3)*3;return {d:`M${sx} ${a.y} V${corridor} H${outer} V${top} H${rail} V${by} H${b.x+b.width}`,x:(outer+rail)/2,y:top};}
  if(a.x>b.x+20){const sx=a.x+a.width,rail=sx+16,target=b.x+b.width+16,corridor=Math.min(a.y,b.y)-18-(index%3)*3;return {d:`M${sx} ${ay} H${rail} V${corridor} H${target} V${by} H${b.x+b.width}`,x:(rail+target)/2,y:corridor};}
 }
 if(a.x+a.width+14<b.x){const sx=a.x+a.width,tx=b.x,mid=(sx+tx)/2+lane;
  if(tx-sx>120){const top=Math.max(24,Math.min(a.y,b.y)-28)+(index%5)*3;return {d:`M${sx} ${ay} H${sx+22} V${top} H${tx-22} V${by} H${tx}`,x:(sx+tx)/2,y:top};}
  return {d:`M${sx} ${ay} H${mid} V${by} H${tx}`,x:mid,y:(ay+by)/2};}
 if(b.x+b.width+14<a.x){const sx=a.x,tx=b.x+b.width,top=Math.max(24,Math.min(a.y,b.y)-28)+(index%5)*3,via=sx-24-lane,end=tx+24+lane;return {d:`M${sx} ${ay} H${via} V${top} H${end} V${by} H${tx}`,x:(via+end)/2,y:top};}
 const right=Math.max(a.x+a.width,b.x+b.width)+20+Math.abs(lane),sx=a.x+a.width,tx=b.x+b.width;
 if(a.id===b.id)return {d:`M${sx} ${ay-12} H${right} V${ay+12} H${tx}`,x:right,y:ay};
 return {d:`M${sx} ${ay} H${right} V${by} H${tx}`,x:right,y:(ay+by)/2};
}

// The inspector and exports retain every relationship. Dense views render a
// local slice so the canvas never turns into a complete-link hairball.
export function visibleRelationships(view,layout,{selectedId,anchorId,selectedEdgeId,pathIds=[]}={}){
 const all=view.relationships,explicit=new Set(pathIds);
 if(view.concern==='process'&&all.length<=40)return {visible:all,hidden:0};
 if(selectedEdgeId)explicit.add(selectedEdgeId);
 const guided=view.mode==='guided';
 if(!selectedId&&!explicit.size){
  if(all.length<=(guided?5:view.concern==='structure'?6:10))return {visible:all,hidden:0};
  const max=guided?5:view.concern==='structure'?6:view.concern==='realization'?8:view.concern==='behaviour'?10:6;
  const distance=e=>{const a=layout.positions.get(e.from),b=layout.positions.get(e.to);return a&&b?Math.abs(a.x-b.x)+Math.abs(a.y-b.y):Number.MAX_SAFE_INTEGER;};
  const candidates=all.filter(e=>layout.positions.has(e.from)&&layout.positions.has(e.to)).slice().sort((a,b)=>distance(a)-distance(b)||a.id.localeCompare(b.id));
  const chosen=[],covered=new Set();
  for(const need of [2,1,0])for(const e of candidates){if(chosen.length>=max)break;
   const fresh=Number(!covered.has(e.from))+Number(!covered.has(e.to));if(fresh<need||chosen.includes(e))continue;
   chosen.push(e);covered.add(e.from);covered.add(e.to);
  }
  return {visible:chosen,hidden:all.length-chosen.length};
 }
 const selected=new Set(explicit);
 if(selectedId){
  const nearby=all.filter(e=>e.from===selectedId||e.to===selectedId).slice(0,guided?7:12);
  nearby.forEach(e=>selected.add(e.id));
  if(guided&&view.concern==='security'&&anchorId&&layout.positions.has(anchorId)){
   const contracts=new Set(nearby.flatMap(e=>[e.from,e.to]).filter(id=>layout.positions.get(id)?.object.type==='contract'));
   let connected=false;for(const e of all)if(['provides','uses'].includes(e.type)&&((e.from===anchorId&&contracts.has(e.to))||(e.to===anchorId&&contracts.has(e.from)))){selected.add(e.id);connected=true;}
   if(connected)for(const e of all)if(e.type==='withinBoundary'&&e.from===anchorId)selected.add(e.id);
  }
  if(!guided&&view.concern==='realization'){
   const first=new Set(nearby.flatMap(e=>[e.from,e.to]));
   for(const e of all)if((first.has(e.from)||first.has(e.to))&&selected.size<18)selected.add(e.id);
  }
 }
 const visible=all.filter(e=>selected.has(e.id));return {visible,hidden:all.length-visible.length};
}
