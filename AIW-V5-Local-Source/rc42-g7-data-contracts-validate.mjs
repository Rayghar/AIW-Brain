// AIW v0.10.0-rc.10.73.42, group G7 (handbook gap review D9, D19, D20; audit/rc42/OWNER-DECISIONS-AND-PLAN-2026-10-30.md).
// D9: Chapter 8's authority is the one owner of a data definition; a component's Chapter 5 data list is a 'uses' relation,
//     a document written before keeps the earlier ownership claims that disagree for a person to confirm (a migration).
//     Review round 2: Chapter 5's list-against-list ownership check is retired (two users of one record are no conflict);
//     a claim once settled (off the list, the component removed, Chapter 8 names it, a person confirms) never returns,
//     and a bulk confirmation leaves a definition with an open claim to its own review.
// D19: the blank-project 'recovery' proposal takes the source the person chooses, or none; a seeded Chapter 8 contract
//     whose interaction is removed is flagged.
// D20: a reviewed 'read-only, safe to repeat' declaration satisfies the duplicate check without a key; only a person
//     makes it (a draft by Sol and an agent account cannot), on this project: a project made from a template does not
//     inherit it (review round 2).
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {saveStoredProject} from './project-storage.js';
import {seedProject,applyCommand} from './public/requirements-domain.js';
import {withFinalReview,reviewSource} from './public/review-domain.js';
import {architectureModel} from './public/architecture-model.js';
import {figureSourceOf} from './public/sdd-document.js';
import {applyInterfacesCommand,interfaceFindings,interfaceMilestones,contract,dataRecord,contracts,exportInterfacesMarkdown} from './public/interfaces-domain.js';
import {applyRealisationCommand,realisationProposal,realisationFindings,realisationMilestones,components,component,exportRealisationMarkdown} from './public/realisation-domain.js';
import {applyRecordCommand} from './public/canonical-command.js';
import {confirmationCandidates} from './public/validation-confirmation-domain.js';
import {instantiateTemplate} from './project-lifecycle.js';
import {list} from './public/util.js';
import {reasoningSource} from './public/design-reasoning.js';
import {componentSpec,detectAntiPatterns} from './public/design-spec.js';
import {componentSheet} from './public/component-sheet.js';
import {componentSpecMarkdown} from './public/component-spec-document.js';
import {applyLogicalCommand,logicalGraph} from './public/logical-domain.js';
import {archimateWanted} from './public/notation-palette.js';
import {notationDiagram} from './public/notation-model.js';
import {createProject} from './shared/projects-domain.js';
import {DRAFT_COMMANDS} from './public/architecture-drafter.js';
import {storageUpgradeNeeded} from './storage-upgrade.js';
import {loggedHistories} from './project-storage.js';
import {refuseUnreviewable} from './authorship.js';

const at='2026-10-30T09:00:00.000Z';
let failed=0;
const check=(name,fn)=>{try{fn();console.log('ok - '+name);}catch(e){failed++;console.log('FAIL - '+name+'\n  '+String(e?.stack||e).split('\n').slice(0,3).join('\n  '));}};
const ic=(p,type,payload)=>applyInterfacesCommand(p,{type:'interfaces.'+type,payload},at).document;
const rc=(p,type,payload)=>applyRealisationCommand(p,{type:'realisation.'+type,payload},at).document;
const owners=(p,id)=>architectureModel(p).relationships.filter(e=>e.type==='owns'&&e.to===id).map(e=>e.from+' via '+e.source).sort();
const findings=(p,code,id)=>interfaceFindings(p).filter(f=>f.code===code&&(!id||f.objectId===id));
const reference=()=>withFinalReview(seedProject());
const SOL={kind:'sol-draft',id:'sol',account:'person',reviewed:false},AGENT={kind:'sol-draft',id:'agent-1',account:'agent',reviewed:false};

// ---------------------------------------------------------------- D9
check('D9: the canonical graph keeps one owner per data definition, the Chapter 8 authority; a Chapter 5 data list is a uses relation',()=>{
  const p=reference();
  assert.deepEqual(component(p,'api-pod').dataIds,['instruction'],'fixture: APP-001 lists the instruction');
  assert.deepEqual(owners(p,'instruction'),['api-pod via interfaces.data.authorityId'],'the reference keeps one owner of the instruction');
  // The probe of the deep dive: Chapter 8 names APP-002 while APP-001 still lists the instruction in Chapter 5.
  const q=ic(p,'data',{id:'instruction',authorityId:'risk-engine'}),m=architectureModel(q);
  assert.deepEqual(owners(q,'instruction'),['risk-engine via interfaces.data.authorityId'],'one ownership edge, from the Chapter 8 authority');
  const use=m.relationships.find(e=>e.from==='api-pod'&&e.to==='instruction'&&e.source==='realisation.components.dataIds');
  assert.ok(use,'APP-001\'s list stays in the graph');assert.equal(use.type,'uses','as a non-ownership uses relation');
  assert.equal(use.archimate.type,'Access','typed as an ArchiMate Access, as it was');
  assert.deepEqual(archimateWanted('uses','realisation.components.dataIds')[0],['Access']);
  for(const d of q.interfaces.data)assert.ok(owners(q,d.id).length<=1&&owners(q,d.id).every(x=>x.endsWith('via interfaces.data.authorityId')),d.id+': at most one owner, from Chapter 8');
  assert.ok(!m.relationships.some(e=>e.type==='owns'&&e.source==='realisation.components.dataIds'),'no ownership edge is read from a Chapter 5 list');
  // The Chapter 5 canvas draws the list as use, not as a second owner.
  assert.deepEqual(logicalGraph(q).edges.filter(e=>e.from==='api-pod'&&e.to==='instruction').map(e=>e.label),['uses']);
  assert.ok(exportRealisationMarkdown(q).includes('Uses data: Payment instruction')&&!exportRealisationMarkdown(q).includes('Owns data:'),'Chapter 5\'s export says the list is data it uses');
  // In a document written now the list was never an ownership claim: nothing asks to confirm it.
  assert.equal(findings(q,'owner-confirm').length,0);
  // The SDD's figure source, a copy of the design source, reads the same: no claim is invented in the copy.
  assert.equal(findings(figureSourceOf(reviewSource(q)),'owner-confirm').length,0);
});
check('D9 (integration): the connected picture draws one line for a component and data it owns; a use of another owner\'s data keeps its line; the graph keeps both relations',()=>{
  // Before D9 the two records of one ownership were drawn as one line. With the Chapter 5 list read as use, the pair held
  // a use and an ownership, drawn as two parallel lines, and the Layers layout of the reference design gave up drawing
  // lines together. The picture draws the ownership alone for such a pair; nothing leaves the graph.
  const p=reference(),between=(D,a,b)=>D.edges.filter(e=>e.from===a&&e.to===b).map(e=>e.kind).sort();
  const rels=(x,a,b)=>architectureModel(x).relationships.filter(e=>e.from===a&&e.to===b).map(e=>e.type+' via '+e.source).sort();
  assert.deepEqual(rels(p,'api-pod','instruction'),['owns via interfaces.data.authorityId','uses via realisation.components.dataIds'],'the graph holds the use and the ownership');
  for(const chapter of [4,5,8]){const D=notationDiagram(p,'connected',{chapter});
    assert.deepEqual(between(D,'api-pod','instruction'),['owns'],'Chapter '+chapter+': one line, the ownership');
    for(const e of D.edges.filter(e=>e.kind==='owns'))assert.deepEqual(between(D,e.from,e.to),['owns'],'Chapter '+chapter+': no line beside the ownership '+e.from+' > '+e.to);}
  // Chapter 8 names another owner: the lister's use is its own fact and keeps its line; the new owner has the ownership.
  const q=ic(p,'data',{id:'instruction',authorityId:'risk-engine'}),D=notationDiagram(q,'connected',{chapter:8});
  assert.deepEqual(between(D,'api-pod','instruction'),['uses'],'a use of data another component owns is drawn');
  assert.deepEqual(between(D,'risk-engine','instruction'),['owns'],'the owner\'s line is the ownership');
});
check('D9: two components using one record is not an ownership conflict; Chapter 5 raises nothing, Chapter 8 asks for a missing owner',()=>{
  // The reviewer's probe: APP-002 also uses the instruction, which Chapter 8 gives to APP-001.
  const p=reference(),errors=d=>realisationFindings(d).filter(f=>f.level==='error').map(f=>f.id);
  assert.deepEqual(errors(p),[],'fixture: the reference realisation has no error');
  const q=withFinalReview(rc(p,'component',{id:'risk-engine',dataIds:['risk-record','instruction']}));
  assert.deepEqual(component(q,'risk-engine').dataIds,['risk-record','instruction']);
  assert.ok(!realisationFindings(q).some(f=>f.code.startsWith('data-owner')),'no Chapter 5 ownership finding on either component');
  assert.deepEqual(errors(q),[],'a second user of a record raises no Chapter 5 error');
  assert.equal(findings(q,'data-owner','instruction').length,0,'Chapter 8 names the owner');
  assert.deepEqual(owners(q,'instruction'),['api-pod via interfaces.data.authorityId'],'the one owner is unchanged');
  const reviewed=withFinalReview(applyRealisationCommand(q,{type:'realisation.review',payload:{}},at).document);
  assert.equal(realisationMilestones(reviewed).find(m=>m.id==='a-validate').done,true,'Validate the realisation stays reachable');
  const confirmed=withFinalReview(ic(q,'record-review',{id:'instruction',reviewed:true,reviewer:'Payments data owner',evidence:'APP-001 owns it; APP-002 uses it.'}));
  assert.ok(!realisationFindings(confirmed).some(f=>f.code.startsWith('data-owner')),'and nothing waits for a Chapter 8 review');
  // A new component listing the record is a user too.
  const n=rc(p,'component',{title:'Pending-case coordinator',kind:'worker',purpose:'Coordinate pending-case enquiries',boundary:'Own case assignment',owner:'Payments operations',inputs:'Pending instruction',outputs:'Verified outcome',rationale:'Separate pending work.',source:'Fixture',status:'draft',dataIds:['instruction'],allocations:[]});
  assert.ok(!realisationFindings(withFinalReview(n)).some(f=>f.code.startsWith('data-owner')));
  // A record no Chapter 8 definition gives an owner is Chapter 8's error, once, on the definition.
  const none=withFinalReview(ic(q,'data',{id:'instruction',authorityId:''}));
  assert.equal(dataRecord(none,'instruction').authorityId,'','fixture: Chapter 8 names no owner');
  const f=findings(none,'data-owner','instruction');
  assert.equal(f.length,1,'Chapter 8 asks for the owner');assert.equal(f[0].level,'error');
  assert.ok(!realisationFindings(none).some(f=>f.code.startsWith('data-owner')),'Chapter 5 does not raise it again beside it');
});
check('D9: the component specification, its sheet and the SDD read ownership from Chapter 8 only, never from a Chapter 5 list',()=>{
  // APP-002 also uses the instruction (APP-001 owns it); the settlement has no Chapter 8 owner and APP-004 lists it.
  const p=withFinalReview(ic(rc(reference(),'component',{id:'risk-engine',dataIds:['risk-record','instruction']}),'data',{id:'settlement',authorityId:''}));
  assert.deepEqual(component(p,'worker').dataIds.includes('settlement'),true,'fixture: APP-004 lists the settlement');
  const R=reasoningSource(p),spec=id=>componentSpec(R,id).data.owned.map(d=>d.id).sort();
  assert.deepEqual(spec('api-pod'),['instruction'],'APP-001 owns what Chapter 8 names it the authority of');
  assert.ok(!spec('risk-engine').includes('instruction'),'APP-002 only uses the instruction');
  assert.ok(!spec('worker').includes('settlement'),'a record Chapter 8 gives no owner is owned by no component, whatever lists name it');
  const owns=componentSheet(p,'worker').fields.find(f=>f.id==='owns');
  assert.ok(!JSON.stringify(owns).includes('settlement')&&!JSON.stringify(owns).includes('no authority recorded'),'the sheet infers no ownership from the list: '+JSON.stringify(owns.values));
  const ownedLine=componentSpecMarkdown(componentSpec(R,'worker')).match(/Owned: ([^·\n]*)/)?.[1];
  assert.ok(ownedLine!==undefined&&!/settlement/i.test(ownedLine),'and the SDD\'s component passage says it owns no settlement: '+ownedLine);
  // The shared-data concern reads the lists as use, not as owners: it asks how the others reach Chapter 8's one owner.
  const shared=detectAntiPatterns(R).find(a=>a.id==='shared-data');
  assert.ok(shared&&/instruction is used directly by APP-001 Payment service and APP-002 Risk engine/.test(shared.text),'two components using one record directly is a coupling concern: '+shared?.text);
  assert.ok(!/held by/.test(shared.text)&&/Chapter 8/.test(shared.ask),'which names no owner from the lists and asks after Chapter 8\'s: '+shared.ask);
});
// A document written before rc.10.73.42: its Chapter 5 lists were ownership records. Read, it is migrated once.
const legacyOf=p=>{const doc=structuredClone(p);delete doc.dataOwnership;return doc;};
const storedRow=doc=>({document:doc,keys:new Map(loggedHistories(doc).map(k=>['__history:'+k,{}]))});
check('D9 migration: a document written before keeps the disagreeing claims for a person to confirm, once, and is stored upgraded',()=>{
  const written=ic(reference(),'data',{id:'instruction',authorityId:'risk-engine'});
  const legacy=legacyOf(written);legacy.interfaces.data.find(d=>d.id==='settlement').authorityId='';
  assert.equal(storageUpgradeNeeded(storedRow(legacy)),true,'a stored row written before is stored again, upgraded, on its first read');
  const up=withFinalReview(structuredClone(legacy));
  assert.equal(storageUpgradeNeeded(storedRow(up)),false,'an upgraded row is not upgraded again');
  assert.deepEqual(up.dataOwnership.toConfirm.map(x=>[x.dataId,x.componentIds,x.owners]),[['instruction',['api-pod'],['risk-engine']],['settlement',['worker'],[]]],'the claims Chapter 8 does not share are kept');
  assert.deepEqual(owners(up,'instruction'),['risk-engine via interfaces.data.authorityId'],'Chapter 8 stays the owner');
  assert.deepEqual(owners(up,'settlement'),[],'no owner is invented where Chapter 8 names none');
  const f=findings(up,'owner-confirm','instruction')[0];
  assert.ok(f,'the disagreement is a finding');assert.equal(f.level,'error');assert.deepEqual(f.ids,['api-pod']);
  assert.match(f.detail,/APP-001 Payment service/);assert.match(f.detail,/APP-002 Risk engine/);
  assert.match(findings(up,'owner-confirm','settlement')[0]?.detail||'',/names no owner/);
  assert.equal(interfaceMilestones(up).find(m=>m.id==='data').done,false,'data ownership is not established while a claim waits');
  // Idempotent: read again, nothing changes and nothing is added.
  assert.equal(JSON.stringify(withFinalReview(structuredClone(up)).dataOwnership),JSON.stringify(up.dataOwnership));
  // The migration's record is not the design: the design stamp an approval holds does not move with it.
  assert.ok(!('dataOwnership' in reviewSource(up)),'kept outside the review source');
  // Only a person confirms: a draft by Sol and an agent account are refused, whatever the payload claims.
  const review={id:'instruction',reviewed:true,reviewer:'Payments data owner',evidence:'Confirmed APP-002 Risk engine as the owner; APP-001 uses the instruction.'};
  for(const author of [SOL,AGENT])assert.throws(()=>refuseUnreviewable({type:'interfaces.record-review',payload:review},author),/cannot claim a review/);
  assert.throws(()=>ic(up,'record-review',{...review,reviewed:false}),/explicit review confirmation/);
  assert.equal(findings(ic(up,'record-review',{...review,id:'risk-record'}),'owner-confirm','instruction').length,1,'another definition\'s review confirms nothing here');
  const confirmed=ic(up,'record-review',review);
  assert.equal(findings(confirmed,'owner-confirm','instruction').length,0,'a person\'s confirmation resolves it');
  assert.deepEqual(dataRecord(confirmed,'instruction').authorityId,'risk-engine','the confirmation keeps Chapter 8\'s owner');
  assert.deepEqual(component(confirmed,'api-pod').dataIds,['instruction'],'and the component keeps the data it uses');
  assert.equal(findings(withFinalReview(confirmed),'owner-confirm','instruction').length,0,'a later read does not raise it again');
  assert.equal(findings(figureSourceOf(reviewSource(up)),'owner-confirm').length,0,'a copy of the design source (an SDD figure source, a frozen baseline) is read as it was frozen, not upgraded');
  // Making Chapter 8 name the claimant resolves the other one; so does removing the claim from the list.
  const named=ic(up,'data',{id:'settlement',authorityId:'worker'});assert.equal(findings(named,'owner-confirm','settlement').length,0);
  const dropped=rc(up,'component',{id:'worker',dataIds:[]});assert.equal(findings(withFinalReview(dropped),'owner-confirm','settlement').length,0);
});
check('D9 migration: a resolved claim stays resolved; a list written later is data the component uses',()=>{
  // The reviewer's probe: Chapter 8 names APP-002 and APP-001 listed the instruction before the upgrade.
  const legacy=legacyOf(ic(reference(),'data',{id:'instruction',authorityId:'risk-engine'}));legacy.interfaces.data.find(d=>d.id==='settlement').authorityId='';
  const up=withFinalReview(structuredClone(legacy)),claims=d=>list(d.dataOwnership?.toConfirm).map(x=>[x.dataId,x.componentIds]);
  assert.deepEqual(claims(up),[['instruction',['api-pod']],['settlement',['worker']]],'fixture: two claims wait');
  // Taken off the list, then listed again: the claim was settled when it left the list.
  const off=withFinalReview(rc(up,'component',{id:'api-pod',dataIds:[]}));
  assert.equal(findings(off,'owner-confirm','instruction').length,0);
  assert.deepEqual(claims(off),[['settlement',['worker']]],'the settled claim leaves the record of claims');
  const again=withFinalReview(rc(off,'component',{id:'api-pod',dataIds:['instruction']}));
  assert.deepEqual(component(again,'api-pod').dataIds,['instruction']);
  assert.equal(findings(again,'owner-confirm','instruction').length,0,'listed again it is data APP-001 uses, not the old claim');
  assert.deepEqual(claims(again),[['settlement',['worker']]]);
  const settled=withFinalReview(ic(again,'record-review',{id:'settlement',reviewed:true,reviewer:'Payments data owner',evidence:'Chapter 8 names the owner.'}));
  assert.deepEqual([claims(settled),findings(settled,'owner-confirm').length],[[],0],'no claim is left to hold the data milestone');
  // Chapter 8 names the claimant, then another owner: the claim was settled when Chapter 8 named it.
  const named=withFinalReview(ic(up,'data',{id:'settlement',authorityId:'worker'}));
  assert.deepEqual(claims(named),[['instruction',['api-pod']]],'naming the claimant as owner settles its claim');
  const moved=withFinalReview(ic(named,'data',{id:'settlement',authorityId:'api-pod'}));
  assert.equal(findings(moved,'owner-confirm','settlement').length,0,'a later owner change does not bring the old claim back');
  // A person's confirmation settles every claim on the definition.
  assert.deepEqual(claims(ic(up,'record-review',{id:'instruction',reviewed:true,reviewer:'Payments data owner',evidence:'APP-002 owns it.'})),[['settlement',['worker']]]);
  // A component that leaves the design settles its claim: restored, its list is data it uses.
  const made=rc(reference(),'component',{title:'Pending-case coordinator',kind:'worker',purpose:'Coordinate pending-case enquiries',boundary:'Own case assignment',owner:'Payments operations',inputs:'Pending instruction',outputs:'Verified outcome',rationale:'Separate pending work.',source:'Fixture',status:'draft',dataIds:['instruction'],allocations:[]}),madeId=components(made).at(-1).id;
  const upMade=withFinalReview(legacyOf(made));
  assert.deepEqual(claims(upMade),[['instruction',[madeId]]],'fixture: the new component\'s list was read as a claim');
  const retired=withFinalReview(applyRecordCommand(upMade,{type:'record.retire',payload:{ids:[madeId],chapter:5,reason:'Merged into APP-001.'}},at,'architect').document);
  assert.deepEqual(claims(retired),[],'a removed component\'s claim is settled');
  const restored=withFinalReview(applyRecordCommand(retired,{type:'record.restore',payload:{ids:[madeId],chapter:5}},at,'architect').document);
  assert.deepEqual(component(restored,madeId)?.dataIds,['instruction'],'fixture: restored with its list');
  assert.equal(findings(restored,'owner-confirm','instruction').length,0,'restored, its list is data it uses');
  // A malformed record of claims is read defensively.
  const broken=structuredClone(up);broken.dataOwnership.toConfirm.unshift(null,{dataId:'instruction'});
  assert.doesNotThrow(()=>interfaceFindings(broken));assert.equal(interfaceFindings(broken).filter(f=>f.code==='owner-confirm').length,2);
  assert.doesNotThrow(()=>rc(broken,'component',{id:'api-pod',dataIds:[]}));
  assert.doesNotThrow(()=>ic(broken,'record-review',{id:'instruction',reviewed:true,reviewer:'R',evidence:'E'}));
  // A bulk confirmation does not settle a claim it does not show: a definition with a claim waits for its own review.
  const rows=confirmationCandidates(up,8).map(x=>x.id);
  assert.ok(!rows.includes('instruction')&&!rows.includes('settlement'),'a definition with an open claim is left out of the bulk confirmation: '+rows.join(', '));
  assert.ok(confirmationCandidates(ic(up,'record-review',{id:'risk-record',reviewed:true,reviewer:'R',evidence:'E'}),8).every(x=>x.id!=='risk-record'),'fixture: a reviewed definition is not offered');
  assert.ok(confirmationCandidates(withFinalReview(rc(up,'component',{id:'api-pod',dataIds:[]})),8).some(x=>x.id==='instruction'),'once settled, the definition is offered again');
});
// The same through the server: a row stored before is upgraded by its first read, once, as a storage upgrade.
{
  const dir=await mkdtemp(tmpdir()+'/aiw-rc42-g7-'),env={DB:localDatabase(dir+'/g7.sqlite'),FILES:localFiles(dir+'/files'),ASSETS:{fetch:()=>new Response('ok')}},owner='g7-architect',origin='https://aiw.test';
  const get=async id=>{const r=await worker.fetch(new Request(origin+'/api/project?project='+id,{headers:{'oai-authenticated-user-id':owner,Origin:origin}}),env);return {status:r.status,data:await r.json()};};
  const row=id=>env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,id).first();
  let seen;
  try{
    const legacy=legacyOf(ic(reference(),'data',{id:'instruction',authorityId:'risk-engine'})),id='g7-legacy';legacy.id=id;
    await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner,id,JSON.stringify(createProject({name:'G7 legacy',template:'blank'},id,at)),at).run();
    await saveStoredProject(env,owner,id,legacy,1,at,new Map());
    const before=await row(id),read=await get(id),after=await row(id),again=await get(id);seen={before,read,after,again,stored:JSON.parse(after.document)};
  }catch(e){seen={error:e};}finally{env.DB.close();await rm(dir,{recursive:true,force:true});}
  check('D9 migration through the server: the first read stores the upgrade once; Chapter 8 stays the owner and the claim waits for a person',()=>{
    if(seen.error)throw seen.error;const {before,read,after,again,stored}=seen;
    assert.equal(read.status,200);assert.equal(after.revision,before.revision+1,'the read stored the upgrade as a new revision');
    assert.deepEqual(stored.dataOwnership?.toConfirm?.map(x=>[x.dataId,x.componentIds]),[['instruction',['api-pod']]],'the stored row keeps the claim to confirm');
    assert.equal(stored.interfaces.data.find(d=>d.id==='instruction').authorityId,'risk-engine','no record changed: Chapter 8 is still the owner');
    assert.equal(again.data.revision,after.revision,'the next read writes nothing');
    assert.equal(findings(withFinalReview(read.data.document),'owner-confirm','instruction').length,1,'the person sees the finding');
  });
}

// ---------------------------------------------------------------- D19
const blank=()=>{
  let p=applyCommand(createProject({name:'Equipment reservation',template:'blank',brief:'Reserve shared equipment.'},'g7-blank',at),{type:'artefact',payload:{type:'requirement',title:'Reserve equipment',description:'Accept a reservation request and report its outcome.',acceptance:'The original reference identifies one reservation.',owner:'Facilities',source:'Workshop',confirmed:true}},at).document;
  p=applyLogicalCommand(p,{type:'logical.responsibility',payload:{title:'Reservation intake',purpose:'Accept reservation requests.',boundary:'Own the request boundary.',owner:'Facilities',source:'Workshop',groupId:'',requirementIds:['REQ-001'],decisionIds:[]}},at).document;
  p=applyLogicalCommand(p,{type:'logical.responsibility',payload:{title:'Reservation outcome',purpose:'Settle reservation outcomes.',boundary:'Own the outcome.',owner:'Facilities',source:'Workshop',groupId:'',requirementIds:['REQ-001'],decisionIds:[]}},at).document;
  for(const [title,kind] of [['Reservation API','service'],['Reservation ledger','store']])p=rc(p,'component',{title,kind,purpose:title+' work.',boundary:title+' boundary.',owner:'Facilities',inputs:'Request',outputs:'Outcome',rationale:'Fixture.',source:'Workshop',status:'draft',allocations:[]});
  return withFinalReview(p);
};
check('D19: the blank-project recovery proposal takes the source a person chooses, or none',()=>{
  const p=blank(),[first,second]=components(p),prop=realisationProposal(p,'recovery');
  assert.equal(prop.sourceId,'','no component is chosen for the person');
  assert.deepEqual(prop.sourceOptions.map(x=>x.id),[first.id,second.id],'every component is offered as the source');
  const chosen=rc(p,'candidate',{...prop,reviewed:true,sourceId:second.id}),made=components(chosen).at(-1);
  assert.deepEqual(chosen.realisation.connections.map(e=>[e.from,e.to]),[[second.id,made.id]],'the interaction runs from the chosen source');
  const declined=rc(p,'candidate',{...prop,reviewed:true});
  assert.equal(declined.realisation.connections.length,0,'with no source chosen no interaction is invented');
  assert.equal(rc(p,'candidate',{...prop,reviewed:true,sourceId:''}).realisation.connections.length,0,'declining saves none');
  assert.throws(()=>rc(p,'candidate',{...prop,reviewed:true,sourceId:'nowhere'}),/existing component/);
  // The reference keeps its own named source, and a person may change it there too.
  const r=reference(),rp=realisationProposal(r,'recovery');
  assert.equal(rp.sourceId,'worker');
  assert.deepEqual(rc(r,'candidate',{...rp,reviewed:true,sourceId:'api-pod'}).realisation.connections.at(-1).from,'api-pod');
});
check('D19: a seeded Chapter 8 contract whose interaction is removed is flagged',()=>{
  const p=blank(),[,second]=components(p),prop=realisationProposal(p,'recovery');
  const q=withFinalReview(rc(p,'candidate',{...prop,reviewed:true,sourceId:second.id})),e=q.realisation.connections[0];
  const seed=contracts(q).find(c=>c.sourceId===e.id);
  assert.ok(seed&&seed.state==='proposed','Chapter 8 proposes a contract from the interaction');
  assert.equal(findings(q,'source-missing',seed.id).length,0);
  const gone=withFinalReview(rc(q,'remove-interaction',{id:e.id}));
  assert.ok(contract(gone,seed.id),'AIW\'s proposal stays until a person retires it');
  const f=findings(gone,'source-missing',seed.id)[0];
  assert.ok(f,'and says its source no longer calls for it');assert.match(f.detail,new RegExp(e.id));assert.match(f.title,/Retire/);
  // The same words hold for a seed whose read input left because Chapter 8's authority changed: no claim that a source is gone.
  assert.match(f.detail,/no longer calls for it/);assert.doesNotMatch(f.detail,/is gone/);
});

// ---------------------------------------------------------------- D20
const statusContract={title:'Query payment status',kind:'request',from:'ext-channel',to:'api-pod',purpose:'Answer the current status of an instruction.',owner:'Payments API owner',operation:'GET /payments/{reference}',protocol:'HTTPS / JSON',contractVersion:'v1',correlationKey:'paymentReference',idempotencyKey:'',duplicatePolicy:'A status read changes nothing: a repeat returns the current status.',authorization:'Authenticated channel',transport:'TLS',failurePolicy:'Return an explicit error.',retryPolicy:'Retry reads within the caller deadline.',timeoutPolicy:'Report unknown status.',exchanges:[{dataId:'instruction',role:'request'}]};
check('D20: a reviewed read-only declaration satisfies the duplicate check without recording a key',()=>{
  let p=ic(reference(),'contract',statusContract);const id=contracts(p).at(-1).id;
  assert.equal(findings(p,'duplicate',id).length,1,'fixture: a safe read without a key raises the duplicate error');
  assert.throws(()=>ic(p,'read-only',{id,reviewer:'Integration lead',basis:'It reads the instruction and changes nothing.'}),/Confirm the review/);
  assert.throws(()=>ic(p,'read-only',{id,reviewed:true,basis:'It reads the instruction.'}),/reviewer/);
  assert.throws(()=>ic(p,'read-only',{id,reviewed:true,reviewer:'Integration lead'}),/why/);
  const q=ic(p,'read-only',{id,reviewed:true,reviewer:'Integration lead',basis:'It reads the instruction and changes nothing.'}),c=contract(q,id);
  assert.equal(findings(q,'duplicate',id).length,0,'the declaration answers the duplicate check');
  assert.deepEqual([c.idempotencyKey,c.open?.idempotencyKey],['',undefined],'no key, and no open key, is recorded: the contract is not misstated');
  assert.deepEqual([c.readOnlyDeclaration.reviewer,c.readOnlyDeclaration.basis,c.readOnlyDeclaration.at],['Integration lead','It reads the instruction and changes nothing.',at]);
  // The person may withdraw it: the duplicate check asks for the key again.
  const withdrawn=ic(q,'read-only',{id,withdraw:true});assert.equal(contract(withdrawn,id).readOnlyDeclaration,undefined);assert.equal(findings(withdrawn,'duplicate',id).length,1);
  // The repeat handling itself is still required: the declaration replaces the key, not the policy.
  assert.equal(findings(ic(q,'contract',{id,duplicatePolicy:''}),'duplicate',id).length,1);
  // A change to what the contract does withdraws the declaration's effect until a person reviews it again.
  const changed=ic(q,'contract',{id,operation:'POST /payments/{reference}/cancel'});
  assert.equal(findings(changed,'duplicate',id).length,1,'the changed operation needs its key or a new declaration');
  assert.equal(findings(changed,'read-only-review',id).length,1,'and the earlier declaration asks to be reviewed');
  // Only a request contract that posts nothing can be read-only.
  assert.throws(()=>ic(p,'read-only',{id:'missing',reviewed:true,reviewer:'R',basis:'B'}),/existing contract/);
  const ev=ic(p,'contract',{...statusContract,title:'Status published',kind:'event',operation:'status.changed'}),evId=contracts(ev).at(-1).id;
  assert.throws(()=>ic(ev,'read-only',{id:evId,reviewed:true,reviewer:'R',basis:'B'}),/request contract/);
  const posts=ic(p,'data',{id:'instruction',authorities:[{id:'api-pod',role:'owns'},{id:'ext-channel',role:'posts'}]});
  assert.throws(()=>ic(posts,'read-only',{id,reviewed:true,reviewer:'R',basis:'B'}),/posts/);
});
check('D20: Sol cannot make the declaration',()=>{
  const p=ic(reference(),'contract',statusContract),id=contracts(p).at(-1).id;
  for(const author of [SOL,AGENT])assert.throws(()=>refuseUnreviewable({type:'interfaces.read-only',payload:{id,reviewer:'Sol',basis:'Looks safe.'}},author),/does not review, confirm/);
  assert.ok(!DRAFT_COMMANDS.has('interfaces.read-only')&&!DRAFT_COMMANDS.has('interfaces.record-review'),'a draft cannot carry it');
  // A contract save, drafted or not, cannot carry a declaration in with it.
  const smuggled=ic(p,'contract',{id,readOnlyDeclaration:{at,reviewer:'Sol',basis:'Looks safe.',stamp:'x'}});
  assert.equal(contract(smuggled,id).readOnlyDeclaration,undefined);assert.equal(findings(smuggled,'duplicate',id).length,1);
});
check('D20: a project made from a template does not inherit the declaration; a person declares it there',()=>{
  let p=ic(reference(),'contract',statusContract);const id=contracts(p).at(-1).id;
  p=ic(p,'read-only',{id,reviewed:true,reviewer:'Integration lead',basis:'It reads the instruction and changes nothing.'});
  p=ic(p,'record-review',{id,reviewed:true,reviewer:'Integration lead',evidence:'Reviewed in the source project.'});
  assert.deepEqual([findings(p,'duplicate',id).length,!!contract(p,id).review],[0,true],'fixture: declared and reviewed in the source project');
  // A second contract, declared and then retired in the source: its retired copy must not carry the declaration either.
  let s=ic(p,'contract',{...statusContract,title:'Query settlement status',operation:'GET /settlements/{reference}'});const sid=contracts(s).at(-1).id;
  s=ic(s,'read-only',{id:sid,reviewed:true,reviewer:'Integration lead',basis:'It reads and changes nothing.'});
  s=applyRecordCommand(s,{type:'record.retire',payload:{ids:[sid],chapter:8,reason:'Not needed in the source.'}},at,'architect').document;
  const t=instantiateTemplate(s,'g7-from-template','From template',at),c=contract(t,id);
  assert.equal(c.review,null,'the instance resets the contract\'s review');
  assert.ok(!c.readOnlyDeclaration,'and the person-only declaration with it');
  assert.equal(findings(t,'duplicate',id).length,1,'the duplicate check asks again in the new project');
  assert.equal(findings(t,'read-only-review',id).length,0,'nothing stale is left to review');
  assert.ok(!exportInterfacesMarkdown(t).includes('Read-only, safe to repeat'),'the export does not state it');
  const back=applyRecordCommand(t,{type:'record.restore',payload:{ids:[sid],chapter:8}},at,'architect').document;
  assert.ok(contract(back,sid)&&!contract(back,sid).readOnlyDeclaration,'a retired copy restored in the instance carries none');
  assert.equal(findings(back,'duplicate',sid).length,1);
  const declared=ic(t,'read-only',{id,reviewed:true,reviewer:'Instance integration lead',basis:'Reviewed here: it reads and changes nothing.'});
  assert.equal(findings(declared,'duplicate',id).length,0,'a person declares it in the new project');
  assert.equal(contract(declared,id).readOnlyDeclaration.reviewer,'Instance integration lead');
  // The source project keeps its own declaration.
  assert.equal(contract(p,id).readOnlyDeclaration.reviewer,'Integration lead');
});

if(failed){console.log(failed+' check'+(failed>1?'s':'')+' failed');process.exit(1);}
console.log('rc42 g7 data contracts: D9 one data owner with migration, D19 recovery source chosen by a person and orphaned proposal flagged, D20 reviewed read-only declaration: all checks pass');
