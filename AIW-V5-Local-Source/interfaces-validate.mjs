import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import {applyTechnologyRealisationCommand} from './public/technology-realisation-domain.js';
import {withInterfaces,contracts,contract,dataRecord,dataRecords,interfaceSources,interfaceSourceChanged,interfaceIntakeCurrent,interfaceReviewCurrent,interfaceHandoffCurrent,contractReviewCurrent,dataReviewCurrent,contractCheckCurrent,contractStamp,interfaceFindings,interfaceMilestones,interfaceProposal,samplePayload,evaluateContract,applyInterfacesCommand,exportInterfacesMarkdown} from './public/interfaces-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
const cmd=(p,type,payload={})=>applyInterfacesCommand(p,{type:'interfaces.'+type,payload}).document;
const base=withInterfaces(seedProject()),original=JSON.stringify(base);
assert.equal(contracts(base).length,7);assert.equal(dataRecords(base).length,4);
assert.equal(contract(base,'rest').ref,'IF-001');assert.equal(dataRecord(base,'instruction').ref,'DAT-001');
assert.equal(new Set(dataRecords(base).flatMap(d=>d.fields.map(f=>f.id))).size,14);
assert.deepEqual(withInterfaces(base),base,'Reopening retains stable contract, data, and exchange identities');
assert(Buffer.byteLength(original)<400000,'Upstream references remain compact');
assert.deepEqual(base.artefacts,seedProject().artefacts);
assert(interfaceSources(base,contract(base,'posting-api')).requirements.some(r=>r.id==='REQ-003'));
assert(interfaceSources(base,dataRecord(base,'posting')).requirements.some(r=>r.id==='REQ-003'));
assert(interfaceSources(base,contract(base,'network')).drivers.some(r=>r.id==='QD-004'));
assert.equal(new Set(logicalGraph(base).nodes.map(n=>n.id)).size,55);
assert.equal(new Set(interfaceFindings(base).map(f=>f.id)).size,interfaceFindings(base).length);
let p=cmd(base,'intake');assert(interfaceIntakeCurrent(p));
const c0=contract(p,'rest'),contractPlan={...c0,title:'Controlled payment initiation',purpose:'Create a traceable instruction without implying settlement.',owner:'Payments API owner',operation:'POST /payments',protocol:'HTTPS / JSON',contractVersion:'review-fixture-v1',correlationKey:'paymentReference',idempotencyKey:'paymentReference',duplicatePolicy:'Return the existing result for the same immutable instruction; reject a mismatched repeat.',timeoutPolicy:'Retain pending outcome and enquire before replay.',retryPolicy:'Enquire with the original reference before an owned retry.',failurePolicy:'Distinguish invalid, rejected, and unknown outcomes.',authorization:'Named caller identity and explicit instruction authority.',transport:'Protected, authenticated channel; fixture only.',compatibility:'Review additive changes and version breaking changes.',evidence:'Synthetic provider-consumer design fixture.',timeoutMs:'2000',timeoutBasis:'Synthetic timing assumption; not a measured SLA.',timeoutConfirmed:false};
p=cmd(p,'contract',contractPlan);assert.equal(contract(p,'rest').ref,'IF-001');assert.equal(contract(p,'rest').exchanges[0].id,c0.exchanges[0].id);
assert.equal(logicalGraph(p).nodes.find(n=>n.id==='rest').title,contractPlan.title,'Shared model changes in place');
assert(interfaceFindings(p).some(f=>f.objectId==='rest'&&f.code==='timeout'));
assert.throws(()=>cmd(p,'contract',{...contractPlan,from:'missing'}),/existing/);
assert.throws(()=>cmd(p,'contract',{...contractPlan,to:contractPlan.from}),/different/);
assert.throws(()=>cmd(p,'contract',{...contractPlan,timeoutMs:-1}),/non-negative/);
assert.throws(()=>cmd(p,'contract',{...contractPlan,exchanges:[{dataId:'missing',role:'request'}]}),/existing/);
assert.throws(()=>cmd(p,'contract',{...contractPlan,exchanges:[c0.exchanges[0],c0.exchanges[0]]}),/once/);
assert.throws(()=>cmd(p,'contract',{...contractPlan,kind:'event',exchanges:[{dataId:'instruction',role:'response'}]}),/event/);
const d0=dataRecord(p,'instruction'),dataPlan={...d0,owner:'Payments data owner',protection:'Restricted writer and masked support view.',retentionPolicy:'Owned deletion and hold procedure; fixture only.',retentionDays:'90',retentionBasis:'Synthetic retention fixture, not a legal requirement.',retentionConfirmed:false};
p=cmd(p,'data',dataPlan);assert.equal(dataRecord(p,'instruction').fields[0].id,d0.fields[0].id);
assert(interfaceFindings(p).some(f=>f.objectId==='instruction'&&f.code==='retention-assumption'));
assert.throws(()=>cmd(p,'data',{...dataPlan,retentionDays:'forever'}),/non-negative/);
assert.throws(()=>cmd(p,'data',{...dataPlan,classification:'secret-ish'}),/classification/);
const field={name:'clientSequence',type:'integer',required:true,key:false,classification:'Inherited',description:'A synthetic client sequence used to order local test requests.',example:'1',enumeration:'',constraints:'Monotonicity needs an implementation test.'};
p=cmd(p,'field',{id:'instruction',field});let df=dataRecord(p,'instruction').fields.at(-1);assert.equal(df.id,'DF-015');
p=cmd(p,'field',{id:'instruction',field:{...df,description:'Revised sequence definition'}});assert.equal(dataRecord(p,'instruction').fields.at(-1).id,'DF-015');
assert.throws(()=>cmd(p,'field',{id:'instruction',field}),/already/);
assert.throws(()=>cmd(p,'field',{id:'instruction',field:{...field,name:'bad field'}}),/field name/);
assert.throws(()=>cmd(p,'field',{id:'instruction',field:{...field,name:'test',type:'magic'}}),/type/);
const sample=samplePayload(p,contract(p,'rest'));assert(evaluateContract(p,'rest',sample).valid);
const invalid=JSON.parse(sample);delete invalid.paymentReference;invalid.amount='one thousand';invalid.currency='INVALID';
const rejected=evaluateContract(p,'rest',JSON.stringify(invalid));assert(!rejected.valid);assert(rejected.issues.some(i=>i.message.includes('paymentReference')));assert(rejected.issues.some(i=>i.message.includes('amount must be number')));assert(rejected.issues.some(i=>i.message.includes('currency is outside')));
const noFields=structuredClone(p);dataRecord(noFields,'instruction').fields=[];assert(!evaluateContract(noFields,'rest','{}').valid,'An empty dictionary cannot pass the sample check');
assert.throws(()=>evaluateContract(p,'rest','{broken'),/valid JSON/);assert.throws(()=>evaluateContract(p,'rest','[]'),/JSON object/);
assert(evaluateContract(p,'rest',JSON.stringify({...JSON.parse(sample),undeclared:'synthetic'})).issues.some(i=>i.level==='warning'));
for(const scenario of ['normal','duplicate','timeout']){const result=evaluateContract(p,'rest',sample,'request',scenario);assert(result.valid);assert.equal(result.steps.length,4);assert(result.policyDefined);}
const review={id:'rest',reviewer:'Test reviewer',evidence:'Synthetic design review',reviewed:true};
assert.throws(()=>cmd(p,'record-review',{...review,reviewed:false}),/explicit/);
p=cmd(p,'record-review',review);assert(contractReviewCurrent(p,contract(p,'rest')));
p=cmd(p,'record-review',{...review,id:'instruction'});assert(dataReviewCurrent(p,dataRecord(p,'instruction')));
const check={id:'rest',payload:sample,role:'request',scenario:'duplicate',observations:'Synthetic repeat policy review; runtime conformance remains open.',reviewed:true,visited:[0,1,2,3],stamp:contractStamp(p,contract(p,'rest'))};
assert.throws(()=>cmd(p,'check',{...check,visited:[0,3]}),/four stages/);
assert.throws(()=>cmd(p,'check',{...check,stamp:'old'}),/Definitions changed/);
p=cmd(p,'check',check);let record=p.interfaces.checks.at(-1);assert.equal(record.id,'CT-001');assert(contractCheckCurrent(p,record));assert(!Object.hasOwn(record,'payload'),'No entered sample payload is persisted');
const beforeEdit=p;p=cmd(p,'field',{id:'instruction',field:{...df,description:'New definition after design check'}});
assert(!contractReviewCurrent(p,contract(p,'rest')));assert(!dataReviewCurrent(p,dataRecord(p,'instruction')));assert(!contractCheckCurrent(p,p.interfaces.checks[0]));
assert.throws(()=>cmd(p,'check',check),/Definitions changed/);
p=cmd(p,'remove-field',{id:'instruction',fieldId:df.id});p=cmd(p,'field',{id:'instruction',field:{...field,name:'deliverySequence'}});assert.equal(dataRecord(p,'instruction').fields.at(-1).id,'DF-016');
const secret=dataRecord(p,'instruction').fields.at(-1);p=cmd(p,'field',{id:'instruction',field:{...secret,classification:'Restricted'}});assert(interfaceFindings(p).some(f=>f.code==='field-classification'));
const lineage={title:'Instruction to posting outcome',from:'instruction',to:'posting',contractId:'posting-api',transformation:'Retain paymentReference and attach the authoritative postingReference and outcome.',owner:'Payments data architecture',evidence:'Synthetic mapping fixture'};
p=cmd(p,'lineage',lineage);assert.equal(p.interfaces.lineage[0].id,'DL-001');p=cmd(p,'lineage',{...lineage,id:'DL-001',title:'Controlled posting derivation'});assert.equal(p.interfaces.lineage.length,1);
assert.throws(()=>cmd(p,'lineage',{...lineage,to:'instruction'}),/different/);
assert.throws(()=>cmd(p,'lineage',{...lineage,contractId:'missing'}),/existing/);
assert.throws(()=>cmd(p,'lineage',{...lineage,title:'Controlled posting derivation'}),/already/);
p=cmd(p,'remove-lineage',{id:'DL-001'});p=cmd(p,'lineage',lineage);assert.equal(p.interfaces.lineage[0].id,'DL-002');
const unchanged=JSON.stringify(p),proposal=interfaceProposal(p,'uncertainty','network');assert(proposal);assert.equal(JSON.stringify(p),unchanged);
assert.throws(()=>cmd(p,'proposal',proposal),/Review/);
p=cmd(p,'proposal',{...proposal,record:{...proposal.record,timeoutPolicy:'Edited: keep pending and assign the enquiry to payments operations.'},reviewed:true});assert(contract(p,'network').timeoutPolicy.startsWith('Edited:'));
const dataGhost=interfaceProposal(p,'lifecycle','posting');p=cmd(p,'proposal',{...dataGhost,record:{...dataGhost.record,retentionPolicy:'Edited lifecycle obligation.'},reviewed:true});assert.equal(dataRecord(p,'posting').retentionPolicy,'Edited lifecycle obligation.');
p=cmd(p,'party',{title:'Reconciliation provider',purpose:'Supply controlled reconciliation outcomes.',owner:'Test provider',confirmed:false});assert.equal(p.interfaces.parties.at(-1).ref,'EXT-004');
p=cmd(p,'data',{title:'Reconciliation evidence',purpose:'Link enquiry and authoritative results.',owner:'Payments operations',authorityId:'ext-004',classification:'Confidential',retentionPolicy:'Owned review and expiry.',protection:'Restricted access.',evidence:'Synthetic fixture'});assert.equal(dataRecords(p).at(-1).ref,'DAT-005');
p=cmd(p,'contract',{...contractPlan,id:null,title:'Reconciliation enquiry',to:'ext-004'});assert.equal(contracts(p).at(-1).ref,'IF-008');
const addedInput=applyTechnologyRealisationCommand(p,{type:'techrealisation.connection',payload:{from:'tr-001',to:'tr-002',title:'State access',protocol:'Service interaction',contract:'Original reference and authoritative outcome',security:'Owned identity',failure:'Enquire before retry',owner:'Test platform'}}).document;
const inherited=withInterfaces(addedInput);assert.equal(contracts(inherited).at(-1).sourceId,'TI-001');assert.equal(contracts(inherited).at(-1).ref,'IF-009');assert.deepEqual(withInterfaces(inherited),inherited);assert(!interfaceIntakeCurrent(inherited));
// Round 12 (GR-REQ-13): a new Chapter 7 interface is a new input to the chapter (its intake, above), not a change to the
// contracts that do not read it; a change to that interface marks the contract that answers it, and only that one.
assert.deepEqual(contracts(inherited).filter(c=>interfaceSourceChanged(inherited,c)).map(c=>c.ref),[],'An interface no other contract reads changes none of them');
const reworded=withInterfaces(applyTechnologyRealisationCommand(inherited,{type:'techrealisation.connection',payload:{id:'TI-001',failure:'Enquire with the original reference before any retry'}}).document);
assert.deepEqual(contracts(reworded).filter(c=>interfaceSourceChanged(reworded,c)).map(c=>c.ref),['IF-009'],'A changed interface marks the contract that answers it, and only that one');assert(!interfaceIntakeCurrent(reworded));
for(const key of ['artefacts','quality','decisions','logical','realisation','technology','technologyRealisation'])assert.deepEqual(p[key],base[key],'Chapter 8 preserves upstream '+key);
assert.equal(JSON.stringify(base),original,'Commands and proposals are pure with respect to the caller state');

// A complete working chapter can retain explicitly acknowledged reference assumptions.
let ready=cmd(base,'intake');
for(const d of dataRecords(base))ready=cmd(ready,'data',{...d,protection:'Owned access and masking fixture.',retentionPolicy:'Owned retention, deletion, and legal-hold fixture.'});
for(const c of contracts(base))ready=cmd(ready,'contract',{...contractPlan,...c,operation:'operation-'+c.ref,protocol:'Fixture exchange',contractVersion:'fixture-v1',idempotencyKey:'paymentReference',duplicatePolicy:contractPlan.duplicatePolicy,timeoutPolicy:contractPlan.timeoutPolicy,retryPolicy:contractPlan.retryPolicy,failurePolicy:contractPlan.failurePolicy,authorization:contractPlan.authorization,transport:contractPlan.transport,compatibility:contractPlan.compatibility,exchanges:c.exchanges.some(x=>x.role==='request')?c.exchanges:[...c.exchanges,{dataId:'instruction',role:'request'}]});
for(const d of dataRecords(ready))ready=cmd(ready,'record-review',{...review,id:d.id});
for(const c of contracts(ready)){ready=cmd(ready,'record-review',{...review,id:c.id});ready=cmd(ready,'check',{...check,id:c.id,payload:samplePayload(ready,contract(ready,c.id)),scenario:'normal',stamp:contractStamp(ready,contract(ready,c.id))});}
assert.throws(()=>cmd(ready,'handoff',{acknowledge:true}),/checks/);
ready=cmd(ready,'review');assert(interfaceReviewCurrent(ready));assert.throws(()=>cmd(ready,'handoff'),/Acknowledge/);
ready=cmd(ready,'handoff',{acknowledge:true});assert(interfaceHandoffCurrent(ready));assert(interfaceMilestones(ready).every(m=>m.done),JSON.stringify(interfaceFindings(ready).filter(f=>f.level==='error')));assert(ready.interfaces.handoff.findings.length>0);
const revised=cmd(ready,'contract',{...contract(ready,'rest'),purpose:'Revised initiation boundary'});assert(!interfaceReviewCurrent(revised));assert(!interfaceHandoffCurrent(revised));assert(!contractReviewCurrent(revised,contract(revised,'rest')));
const changedParty=cmd(beforeEdit,'party',{...beforeEdit.interfaces.parties[0],owner:'Revised external owner'});assert(!contractReviewCurrent(changedParty,contract(changedParty,'rest')));assert(!contractCheckCurrent(changedParty,changedParty.interfaces.checks[0]));
for(const term of ['IF-001','DAT-001','DF-001','DX-001','CT-001','REQ-003','QD-004','Security handoff'])assert(exportInterfacesMarkdown(ready).includes(term),term);
assert(!exportInterfacesMarkdown(ready).includes('undefined'));

// The actual shared layout supports both viewports with the new graph objects.
const g=logicalGraph(inherited),ids=new Set(g.nodes.map(n=>n.id));assert.equal(ids.size,g.nodes.length);assert(g.edges.every(e=>ids.has(e.from)&&ids.has(e.to)));assert(g.edges.some(e=>e.id==='DL-002'));assert(g.edges.some(e=>e.exchange));

const files=new Map(),FILES={async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}};
const DB=localDatabase(':memory:'),env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env)};
try{
 assert.equal((await api('/api/project','GET',null,null)).status,401);let state=await(await api('/api/project')).json();
 const body={revision:state.revision,command:{type:'interfaces.contract',payload:contractPlan}};assert.equal((await api('/api/commands','POST',body,'architect-a','https://other.test')).status,403);
 const saved=await api('/api/commands','POST',body);assert.equal(saved.status,200);state=await saved.json();assert.equal((await api('/api/commands','POST',body)).status,409);
 const reopened=await(await api('/api/project')).json();assert.equal(contract(reopened.document,'rest').title,contractPlan.title);assert.equal(contract(reopened.document,'rest').exchanges[0].id,'DX-001');
 assert.notEqual(contract((await(await api('/api/project','GET',null,'architect-b')).json()).document,'rest').title,contractPlan.title);
 for(const format of ['json','md']){const res=await api('/api/export?chapter=8&format='+format);assert.equal(res.status,200);if(format==='json'){const b=await res.json();assert(b.connectedModel.nodes.some(n=>n.ref==='DAT-001'));assert(b.interfacesValidation.findings.some(f=>f.code==='retention'));}else{assert(res.headers.get('Content-Disposition').includes('Interfaces_Data.md'));assert((await res.text()).includes('IF-001'));}}
 const earlier=await api('/api/commands','POST',{revision:state.revision,command:{type:'technology.intake'}});assert.equal(earlier.status,200);assert.equal(contract((await earlier.json()).document,'rest').title,contractPlan.title);
 console.log('PASS Interfaces & Data: stable IF/DAT/DF/DX/DL/EXT/CT references; inherited traceability; contract, dictionary, participant and lineage edits; schema, repeated-delivery and timeout checks; reviewed ghosts; source/schema/review invalidation; attainable Security handoff; shared desktop/mobile graph layouts; owner-isolated persistence, CAS, and exports.');
}finally{DB.close()}

// ---------------------------------------------------------------- bounds (round 5, R5-G)
// A workspace keeps up to 500 records of a collection (2,000 relationships and fields): at the bound the next one is
// refused with the workspace's wording and nothing changes; one under it, the next is accepted and the bound is reached.
import * as boundsMemo from './public/document-memo.js';
import * as boundsReview from './public/review-domain.js';
import * as boundsSeed from './public/requirements-domain.js';
{
  const base = boundsReview.withFinalReview(boundsSeed.seedProject()), at = '2026-10-02T12:00:00.000Z';
  const filled = (limit, list, make) => { const p = boundsMemo.documentClone(base), xs = list(p); for (let n = 0; xs.length < limit; n++) xs.push(make(p, n)); return p; };
  const bound = (what, limit, list, make, apply, command, words) => {
    const full = filled(limit, list, make), before = JSON.stringify(full);
    assert.throws(() => apply(full, command(full), at), words, what + ': the ' + (limit + 1) + 'st is refused');
    assert.equal(JSON.stringify(full), before, what + ': a refused record changes nothing');
    const under = filled(limit - 1, list, make), after = apply(under, command(under), at).document;
    assert.equal(list(after).length, limit, what + ': the last one under the bound is accepted');
  };
  const {applyInterfacesCommand: applyI, INTERFACE_LIMITS: IL} = await import('./public/interfaces-domain.js');
  assert.deepEqual({...IL}, {contracts: 500, data: 500, fields: 2000});
  bound('contracts', IL.contracts, p => p.interfaces.contracts, (p, n) => ({...structuredClone(p.interfaces.contracts[0]), id: 'if-b' + n, ref: 'IF-B' + n, title: 'Bound contract ' + n, sourceId: ''}), applyI, p => ({type: 'interfaces.contract', payload: {title: 'One contract more', kind: 'request', from: p.realisation.components[0].id, to: p.realisation.components[1].id, exchanges: []}}), /^Error: This workspace keeps up to 500 contracts\.$/);
  bound('data definitions', IL.data, p => p.interfaces.data, (p, n) => ({...structuredClone(p.interfaces.data[0]), id: 'dat-b' + n, ref: 'DAT-B' + n, title: 'Bound data ' + n}), applyI, () => ({type: 'interfaces.data', payload: {title: 'One data definition more', classification: 'Internal'}}), /^Error: This workspace keeps up to 500 data definitions\.$/);
  bound('fields of one data definition', IL.fields, p => p.interfaces.data[0].fields, (p, n) => ({id: 'DF-B' + n, name: 'bound_' + n, type: 'string', description: 'Bound field', required: false, key: false, classification: 'Inherited', example: '', enumeration: '', constraints: '', origin: 'user'}), applyI, p => ({type: 'interfaces.field', payload: {id: p.interfaces.data[0].id, field: {name: 'one_field_more', type: 'string', description: 'x', classification: 'Inherited'}}}), /^Error: This workspace keeps up to 2,000 fields per data definition\.$/);
  console.log('PASS contracts and data definitions are bounded at 500 and fields at 2,000 per data definition, each refusing the next with "This workspace keeps up to …"');
}

// ---------------------------------------------------------------- a data definition's lifecycle (round 6, Contract T)
// A data definition records the field that carries its state, its states (up to 40) and the transitions between them, each
// moved by an existing contract (up to 200); the reference's settlement and posting records carry theirs; the chapter's
// checks name a field or a contract that is gone; the Markdown edition writes it; null clears it; a save that does not
// mention it keeps it.
{
  const {LIFECYCLE_LIMITS: LL} = await import('./public/interfaces-domain.js');
  assert.deepEqual({...LL}, {states: 40, transitions: 200});
  const b = withInterfaces(seedProject()), frozen = JSON.stringify(b), settle = dataRecord(b, 'settlement');
  assert.deepEqual(settle.lifecycle, {field: 'status', states: ['PENDING', 'SETTLED', 'FAILED'], transitions: [{from: 'PENDING', to: 'SETTLED', contractId: 'network'}, {from: 'PENDING', to: 'FAILED', contractId: 'network'}]}, 'the reference settlement record carries its illustrative lifecycle');
  assert.equal(dataRecord(b, 'posting').lifecycle.field, 'outcome'); assert.ok(!dataRecord(b, 'instruction').lifecycle, 'a record without declared states has none');
  const lc = {field: 'status', states: ['PENDING', 'SETTLED', 'FAILED', 'RETURNED'], transitions: [{from: 'PENDING', to: 'SETTLED', contractId: 'network'}, {from: 'SETTLED', to: 'RETURNED', contractId: 'posting-api'}]};
  const q = cmd(b, 'data', {...settle, lifecycle: lc});
  assert.deepEqual(dataRecord(q, 'settlement').lifecycle, lc); assert.equal(dataRecord(q, 'settlement').revision, settle.revision + 1, 'a lifecycle change is a revision');
  const bad = (l, re) => assert.throws(() => cmd(b, 'data', {...settle, lifecycle: l}), re);
  bad('words', /field, states and transitions/);
  bad({...lc, field: 'nope'}, /one of the data definition's fields/);
  bad({...lc, states: []}, /at least one state/);
  bad({...lc, states: Array.from({length: 41}, (_, i) => 'S' + i), transitions: []}, /up to 40 states/);
  bad({...lc, states: ['PENDING', 'pending']}, /each state once/);
  bad({...lc, transitions: [{from: 'PENDING', to: 'GONE', contractId: 'network'}]}, /between two of the named states/);
  bad({...lc, transitions: [{from: 'PENDING', to: 'SETTLED', contractId: ''}]}, /existing contract/);
  bad({...lc, transitions: [{from: 'PENDING', to: 'SETTLED', contractId: 'if-999'}]}, /existing contract/);
  bad({...lc, transitions: Array.from({length: 201}, () => ({from: 'PENDING', to: 'SETTLED', contractId: 'network'}))}, /up to 200 transitions/);
  bad({...lc, transitions: [lc.transitions[0], lc.transitions[0]]}, /each transition once/);
  assert.ok(!dataRecord(cmd(q, 'data', {...dataRecord(q, 'settlement'), lifecycle: null}), 'settlement').lifecycle, 'null clears it');
  const {lifecycle: _kept, ...rest} = dataRecord(q, 'settlement'); assert.deepEqual(dataRecord(cmd(q, 'data', rest), 'settlement').lifecycle, lc, 'a save that does not mention the lifecycle keeps it');
  const gone = structuredClone(q); dataRecord(gone, 'settlement').lifecycle.field = 'vanished'; dataRecord(gone, 'settlement').lifecycle.transitions[0].contractId = 'if-gone';
  const codes = interfaceFindings(gone).filter(f => f.objectId === 'settlement').map(f => f.code);
  assert.ok(codes.includes('lifecycle-field') && codes.includes('lifecycle-link'), 'a field or a contract that is gone is a finding: ' + codes.join(', '));
  assert.ok(!interfaceFindings(q).some(f => f.code.startsWith('lifecycle')), 'a whole lifecycle raises none');
  assert.match(exportInterfacesMarkdown(q), /Lifecycle \(status\): PENDING · SETTLED · FAILED · RETURNED; PENDING → SETTLED by IF-003, SETTLED → RETURNED by IF-002/, 'the Markdown edition writes the lifecycle with its contracts');
  assert.equal(JSON.stringify(b), frozen, 'the caller\'s document is never changed');
  console.log('PASS a data definition records its lifecycle (field, up to 40 states, up to 200 transitions each moved by an existing contract): the reference settlement and posting records carry theirs, ten refusals name what to do, null clears it, a save without it keeps it, a vanished field or contract is a finding, and the Markdown edition writes it');
}

// ---------------------------------------------------------------- Round 12 (D2): style not stated, the party as an integration
{
  const {partyIntegration, PARTY_KINDS, NOT_CLASSIFIED} = await import('./public/interfaces-domain.js');
  let q = cmd(base, 'contract', {id: 'rest', kind: ''});
  assert.equal(contract(q, 'rest').kind, '');
  assert.ok(interfaceFindings(q).some(f => f.code === 'not-stated' && f.items.some(x => x.objectId === 'rest' && x.field === 'kind')));
  q = cmd(q, 'party', {id: 'ext-core', kind: PARTY_KINDS[3], status: 'retiring', dataFormats: 'Fixed-width files'});
  const x = partyIntegration(q, 'ext-core');
  assert.deepEqual([x.kind, x.status, x.dataFormats.source, x.facilitation.source, x.protocols.source], ['legacy system', 'retiring', 'party', 'contracts', 'none'], 'its own words, else its contracts, else nothing');
  const d = applyInterfacesCommand(q, {type: 'interfaces.data', payload: {title: 'Beneficiary', purpose: 'Who receives.', owner: 'Payments', authorityId: 'api-pod', protection: 'Masked'}});
  assert.equal(dataRecord(d.document, d.selected).classification, NOT_CLASSIFIED);
  assert.ok(!interfaceFindings(d.document).some(f => f.code === 'classification' && f.objectId === d.selected), 'not classified yet is an open item, not the Unclassified error');
  console.log('PASS round 12: a contract\'s style may be not stated (one grouped warning); a party records its kind and state and partyIntegration reads its own words before its contracts; a new definition is not classified yet, an open item rather than an error');
}

// ---------------------------------------------------------------- Round 23: a drafted design's party names its proposed users
// Every contract a drafter writes stands proposed until a person decides it (contractIsSeed), so a party read only
// through its decided contracts said "no component yet" for every party of a drafted design.
{
  const {partyIntegration, exportInterfacesMarkdown} = await import('./public/interfaces-domain.js');
  const q = structuredClone(base);
  contract(q, 'network').state = 'proposed';
  const x = partyIntegration(q, 'ext-network');
  assert.deepEqual([x.components.length, x.contracts.length], [0, 0], 'a proposed contract is no decided use');
  assert.deepEqual([x.proposed.components.map(c => c.ref), x.proposed.contracts.map(c => c.ref)], [['APP-004'], ['IF-003']], 'the part a proposed contract reaches is named as a proposed user');
  assert.equal(x.facilitation.source, 'proposed', 'how the architecture handles it: read from the proposed contract, and says so');
  assert.match(x.facilitation.text, /^APP-004 .+ through IF-003 /);
  assert.match(exportInterfacesMarkdown(q), /How the architecture handles it: APP-004 [^\n]+ \(read from AIW's proposed contracts, not decided\)/, 'the export labels it');
  const y = partyIntegration(base, 'ext-network');
  assert.deepEqual([y.components.map(c => c.ref), y.proposed.components.length, y.facilitation.source], [['APP-004'], 0, 'contracts'], 'a decided contract reads as before');
  console.log('PASS round 23: a party used only through AIW\'s proposed contracts names the parts they reach as proposed users, and reads how the architecture handles it from them, labelled as not decided; a decided contract reads as before');
}

// ---------------------------------------------------------------- Round 12 (D4): records at depth in Chapter 8
// GR-DAT-04: a lifecycle transition moved by time names a schedule trigger instead of a contract, saves and is printed.
{
  const {TRANSITION_TRIGGERS} = await import('./public/interfaces-domain.js');
  assert.deepEqual(TRANSITION_TRIGGERS, ['schedule']);
  const lc = {field: 'status', states: ['PENDING', 'SETTLED', 'FAILED', 'EXPIRED'], transitions: [{from: 'PENDING', to: 'SETTLED', contractId: 'network'}, {from: 'PENDING', to: 'EXPIRED', trigger: {kind: 'schedule', schedule: 'End of day after five business days'}}]};
  const q = cmd(base, 'data', {id: 'settlement', lifecycle: lc});
  assert.deepEqual(dataRecord(q, 'settlement').lifecycle.transitions[1], {from: 'PENDING', to: 'EXPIRED', trigger: {kind: 'schedule', schedule: 'End of day after five business days'}}, 'saved with its trigger and no contract');
  assert.ok(!interfaceFindings(q).some(f => f.code.startsWith('lifecycle') && f.objectId === 'settlement'), 'a scheduled transition is whole');
  assert.match(exportInterfacesMarkdown(q), /PENDING → EXPIRED on schedule: End of day after five business days/, 'and printed with its trigger');
  const bad = (t, words) => assert.throws(() => cmd(base, 'data', {id: 'settlement', lifecycle: {...lc, transitions: [t]}}), words);
  bad({from: 'PENDING', to: 'EXPIRED', trigger: {kind: 'clock', schedule: 'Daily'}}, /trigger of kind schedule/);
  bad({from: 'PENDING', to: 'EXPIRED', trigger: {kind: 'schedule', schedule: ''}}, /calendar, a time or the end of day/);
  bad({from: 'PENDING', to: 'EXPIRED', contractId: 'network', trigger: {kind: 'schedule', schedule: 'Daily'}}, /not both/);
  bad({from: 'PENDING', to: 'EXPIRED'}, /or the schedule that does/);
  console.log('PASS round 12 (GR-DAT-04): a lifecycle transition moved by time names a schedule trigger instead of a contract, saves, raises no lifecycle finding and is printed with its trigger; a trigger of another kind, an empty schedule or both a contract and a schedule are refused');
}
// GR-DAT-05: a data definition read through a Chapter 5 data dependency is not reported unconnected; where the data names
// another authoritative system, AIW proposes a read contract from the reader to it.
{
  const {applyRealisationCommand} = await import('./public/realisation-domain.js');
  const bare = cmd(base, 'data', {title: 'Exchange rates', purpose: 'Daily reference rates.', owner: 'Treasury', authorityId: 'core-adapter', protection: 'Internal'}), rates = bare.interfaces.data.at(-1).id;
  assert.ok(interfaceFindings(bare).some(f => f.code === 'unconnected-data' && f.objectId === rates), 'unread and in no contract, it is unconnected');
  const read = applyRealisationCommand(bare, {type: 'realisation.interaction', payload: {from: 'api-pod', to: rates, label: 'reads the day\'s rates', interaction: 'data'}}).document;
  const q = withInterfaces(read), proposed = contracts(q).find(c => c.sourceId === read.realisation.connections.at(-1).id);
  assert.ok(!interfaceFindings(q).some(f => f.code === 'unconnected-data' && f.objectId === rates), 'read through a data dependency, it is connected');
  assert.ok(proposed, 'a read contract is proposed');
  assert.deepEqual([proposed.from, proposed.to, proposed.exchanges.map(x => [x.dataId, x.role])], ['api-pod', 'core-adapter', [[rates, 'response']]], 'from the reader to the authoritative system, the data as its response');
  console.log('PASS round 12 (GR-DAT-05): a data definition read through a Chapter 5 data dependency is not reported unconnected, and a read contract from the reader to its authoritative system is proposed');
}
// GR-DAT-06: a data definition takes its fields in one command, recorded as one change.
{
  const before = cmd(base, 'data', {title: 'Standing order', purpose: 'A recurring payment instruction.', owner: 'Payments', authorityId: 'api-pod', protection: 'Masked'}), id = before.interfaces.data.at(-1).id, rev = dataRecord(before, id).revision;
  const fields = [{name: 'orderId', type: 'string', description: 'The order\'s key.', key: true}, {name: 'amount', type: 'money', description: 'What each run pays.', currency: 'currency'}, {name: 'currency', type: 'string', description: 'The currency code.'}, {name: 'nextRun', type: 'date', description: 'When it runs next.'}];
  const q = cmd(before, 'data', {id, fields}), d = dataRecord(q, id);
  assert.deepEqual(d.fields.map(f => f.name), ['orderId', 'amount', 'currency', 'nextRun'], 'every field in one command');
  assert.equal(d.revision, rev + 1, 'one change: one revision');
  assert.equal(d.history.at(-1).action, 'Revise data definition', 'and one history entry');
  assert.ok(d.fields.every(f => /^DF-\d+$/.test(f.id)) && new Set(d.fields.map(f => f.id)).size === 4);
  const fresh = applyInterfacesCommand(base, {type: 'interfaces.data', payload: {title: 'Mandate', purpose: 'A signed mandate.', owner: 'Payments', authorityId: 'api-pod', protection: 'Masked', fields: [{name: 'mandateId', type: 'string', description: 'Key.', key: true}]}});
  assert.deepEqual(dataRecord(fresh.document, fresh.selected).fields.map(f => f.name), ['mandateId'], 'a new definition takes its fields with it');
  // A list is the dictionary whole; {add, remove} patches it; each field is checked as interfaces.field checks it.
  const kept = d.fields.filter(f => f.name !== 'nextRun').map(f => f.name === 'amount' ? {id: f.id, description: 'What each run pays, in its currency.'} : {id: f.id});
  const r = dataRecord(cmd(q, 'data', {id, fields: kept}), id);
  assert.deepEqual([r.fields.map(f => f.name), r.fields[1].description, r.fields[1].type, r.revision], [['orderId', 'amount', 'currency'], 'What each run pays, in its currency.', 'money', d.revision + 1], 'a field left out is removed, one named by its id is patched');
  const s = dataRecord(cmd(q, 'data', {id, fields: {add: [{name: 'endDate', type: 'date', description: 'When it stops.'}], remove: [d.fields[3].id]}}), id);
  assert.deepEqual(s.fields.map(f => f.name), ['orderId', 'amount', 'currency', 'endDate']);
  assert.throws(() => cmd(q, 'data', {id, fields: [...d.fields.map(f => ({id: f.id})), {name: 'amount', type: 'string', description: 'Twice.'}]}), /A field with this name already exists: amount\./);
  assert.throws(() => cmd(q, 'data', {id, fields: [{name: '9lives', type: 'string'}]}), /field name starting with a letter/);
  assert.equal(dataRecord(cmd(q, 'data', {id, fields: d.fields.map(f => ({id: f.id}))}), id).revision, d.revision, 'the same dictionary sent again changes nothing');
  console.log('PASS round 12 (GR-DAT-06): interfaces.data takes a definition\'s fields in one command and records one change (one revision, one history entry); a list is the dictionary whole, {add, remove} patches it, and each field is checked as interfaces.field checks it');
}
// GR-DAT-07: an invariant bound to a data definition and its posting contracts saves; a posting contract with neither an
// invariant nor an idempotency key raises a finding.
{
  const {invariants, invariantsFor, postingContract} = await import('./public/interfaces-domain.js');
  const {componentSpec, reasoningFor} = await import('./public/design-spec.js');
  // The core adapter posts the posting record through the posting contract (DM-26), with no idempotency key yet.
  let q = cmd(base, 'data', {id: 'posting', authorities: [{id: 'ext-core', role: 'owns'}, {id: 'core-adapter', role: 'posts'}]});
  q = cmd(q, 'contract', {id: 'posting-api', idempotencyKey: null});
  assert.ok(postingContract(q, contract(q, 'posting-api')), 'a contract that exchanges data its caller posts is a posting contract');
  assert.ok(interfaceFindings(q).some(f => f.code === 'posting-guard' && f.objectId === 'posting-api'), 'with neither an invariant nor an idempotency key, it is a finding');
  const saved = applyInterfacesCommand(q, {type: 'interfaces.invariant', payload: {title: 'Postings balance', condition: 'For every posting, debits equal credits.', kind: 'balance', dataIds: ['posting'], contractIds: ['posting-api'], check: 'Reconcile debits and credits at the end of each day.', owner: 'Finance operations'}});
  q = saved.document; const inv = invariants(q)[0];
  assert.deepEqual([inv.id, inv.ref, inv.dataIds, inv.contractIds, inv.kind], ['inv-001', 'INV-001', ['posting'], ['posting-api'], 'balance'], 'the invariant saves bound to the data and its posting contract');
  assert.ok(!interfaceFindings(q).some(f => f.code === 'posting-guard'), 'bound to an invariant, the posting contract is guarded');
  assert.deepEqual(invariantsFor(q, 'core-adapter').map(r => r.id), ['inv-001'], 'the part that calls the posting contract reads it');
  assert.deepEqual(componentSpec(reasoningFor(q), 'core-adapter').invariants.map(r => r.ref), ['INV-001'], 'listed in the component specification');
  assert.match(exportInterfacesMarkdown(q), /# Invariants\n\n- INV-001 · Postings balance · balance\n  For every posting, debits equal credits\./);
  const keyed = cmd(cmd(q, 'invariant', {id: 'inv-001', contractIds: []}), 'contract', {id: 'posting-api', idempotencyKey: 'paymentReference'});
  assert.ok(!interfaceFindings(keyed).some(f => f.code === 'posting-guard'), 'an idempotency key guards it too');
  assert.throws(() => cmd(q, 'invariant', {title: 'Unbound', condition: 'Something holds.'}), /Bind the invariant to the data definitions/);
  assert.throws(() => cmd(q, 'invariant', {title: 'Unsaid', dataIds: ['posting']}), /State the condition the invariant keeps/);
  assert.ok(!interfaceFindings(base).some(f => f.code === 'posting-guard'), 'the reference raises none');
  console.log('PASS round 12 (GR-DAT-07): an invariant bound to a data definition and its posting contract saves (INV-001), is read by the parts it binds and listed in the component specification and the Markdown edition; a posting contract with neither an invariant nor an idempotency key is a finding');
}
// GR-RUN-03: a batch contract records its trigger, window, cut-off, predecessors, restart point and volume, and the
// end-of-day chain reads as a sequence.
{
  const {batchChain, BATCH_TRIGGERS} = await import('./public/interfaces-domain.js');
  assert.deepEqual(BATCH_TRIGGERS, ['calendar', 'time', 'event']);
  const batch = (q, title, extra = {}) => { const r = applyInterfacesCommand(q, {type: 'interfaces.contract', payload: {title, kind: 'batch', from: 'worker', to: 'ext-core', exchanges: [{dataId: 'posting', role: 'request'}], ...extra}}); return [r.document, r.selected]; };
  let [q, close] = batch(base, 'Close the business day', {batchTrigger: 'calendar', batchSchedule: 'Each business day', batchWindow: '22:00 to 23:00 WAT', cutOff: '21:45', restartPoint: 'The last committed branch', volume: '2 million postings'});
  let interest, statements;
  [q, interest] = batch(q, 'Accrue interest', {batchTrigger: 'event', batchSchedule: 'When the day is closed', batchWindow: '23:00 to 00:30 WAT', cutOff: '23:00', predecessorIds: [close], restartPoint: 'The last account processed', volume: '9 million accounts'});
  [q, statements] = batch(q, 'Produce statements', {batchTrigger: 'time', batchSchedule: '01:00 daily', predecessorIds: [interest]});
  const c = contract(q, interest);
  assert.deepEqual([c.batchTrigger, c.batchSchedule, c.batchWindow, c.cutOff, c.predecessorIds, c.restartPoint, c.volume], ['event', 'When the day is closed', '23:00 to 00:30 WAT', '23:00', [close], 'The last account processed', '9 million accounts'], 'each recorded');
  const chain = batchChain(q);
  assert.deepEqual(chain.steps.map(x => x.id), [close, interest, statements], 'in the order they run');
  assert.equal(chain.text, [close, interest, statements].map(id => contract(q, id).ref).join(' → '), 'the end-of-day chain reads as a sequence');
  const codes = id => interfaceFindings(q).filter(f => f.objectId === id).map(f => f.code);
  assert.ok(codes(statements).includes('batch-schedule') && codes(statements).includes('batch-restart') && codes(statements).includes('batch-volume'), 'one that says less is asked for the rest');
  assert.ok(!codes(close).some(x => x.startsWith('batch-')), 'one that says it all is not');
  assert.ok(!codes('rest').some(x => x.startsWith('batch-')), 'a request contract is never asked');
  const looped = cmd(q, 'contract', {id: close, predecessorIds: [statements]});
  assert.ok(interfaceFindings(looped).some(f => f.code === 'batch-cycle'), 'a circular order is a finding');
  assert.throws(() => cmd(q, 'contract', {id: close, predecessorIds: [close]}), /Choose existing contracts that run first/);
  assert.match(exportInterfacesMarkdown(q), /Batch: Trigger: event · When: When the day is closed · Window: 23:00 to 00:30 WAT · Cut-off: 23:00 · Restart point: The last account processed · Volume: 9 million accounts · After: IF-\d+/);
  console.log('PASS round 12 (GR-RUN-03): a batch contract records its trigger (calendar, time or event), window, cut-off, predecessors, restart point and volume; batchChain reads the end-of-day chain as a sequence; a batch contract that says less is asked for the rest, a circular order is a finding');
}
// GR-GOV-20: with AIW's seeding switched off (a reviewed project setting), a project gets no seeded contract, plan, path
// or need, and its findings ask the author instead.
{
  const {createProject} = await import('./shared/projects-domain.js');
  const {applyRealisationCommand} = await import('./public/realisation-domain.js');
  const {applyWorkbenchCommand} = await import('./public/workbench-domain.js');
  const {technologyFindings, needsFor} = await import('./public/technology-domain.js');
  const {withRuntime, runtimeFindings, plans, applyRuntimeCommand} = await import('./public/runtime-domain.js');
  const at = '2026-10-08T10:00:00.000Z';
  const fresh = createProject({name: 'Seeding test', template: 'blank'}, 'p-seeding', at);
  // The same design built twice: two parts, an interaction between them, both in the project's environment.
  const build = start => {
    let q = start;
    const comp = title => { const r = applyRealisationCommand(q, {type: 'realisation.component', payload: {title, kind: 'service', purpose: title + ' does its part.', technologyNeeds: 'Stores the records it takes.'}}, at); q = r.document; return r.selected; };
    const a = comp('Intake service'), b = comp('Case service');
    q = applyRealisationCommand(q, {type: 'realisation.interaction', payload: {from: a, to: b, label: 'hands the case over', interaction: 'sync', failure: 'Hold the case.'}}, at).document;
    const link = q.realisation.connections.at(-1).id;
    q = applyRuntimeCommand(q, {type: 'runtime.environment', payload: {title: 'Production', assetIds: [a, b]}}, at).document;
    return {q: withRuntime(q), a, b, link};
  };
  // Seeding on: AIW proposes the contract, the needs and the plans.
  const on = build(fresh);
  assert.ok(contracts(on.q).some(c => c.sourceId === on.link) && needsFor(on.q, on.a).length && plans(on.q).length, 'with seeding on, AIW proposes a contract, needs and plans');
  // Switched off, reviewed and with a reason, before the design is entered.
  assert.throws(() => applyWorkbenchCommand(fresh, {type: 'workspace.seeding', payload: {state: 'off', rationale: 'Imported design.'}}, at, 'tester'), /Review what switching/);
  assert.throws(() => applyWorkbenchCommand(fresh, {type: 'workspace.seeding', payload: {state: 'off', reviewed: true}}, at, 'tester'), /Say why/);
  const quiet = applyWorkbenchCommand(fresh, {type: 'workspace.seeding', payload: {state: 'off', reviewed: true, rationale: 'The design is imported whole; nothing is to be proposed.'}}, at, 'tester').document;
  assert.deepEqual(quiet.workspace.seeding, {state: 'off', at, actor: 'tester', rationale: 'The design is imported whole; nothing is to be proposed.'}, 'kept with who, when and why');
  const {q: off, a, b, link} = build(quiet);
  assert.ok(!contracts(off).length && !needsFor(off, a).length && !needsFor(off, b).length && !plans(off).length && !off.runtime.paths.length && !off.technology.boundaries.length, 'with seeding off: no seeded contract, need, plan, path or boundary');
  const asks = [...interfaceFindings(off), ...technologyFindings(off), ...runtimeFindings(off)];
  assert.ok(asks.some(f => f.code === 'uncontracted' && f.ids.includes(link)), 'the interaction is asked for its contract');
  assert.ok(asks.some(f => f.code === 'no-needs' && f.objectId === a), 'each part is asked for its needs');
  assert.ok(asks.some(f => f.code === 'unplanned'), 'each part in an environment is asked for its plan');
  assert.ok(!asks.some(f => f.code === 'proposals'), 'and nothing waits as a proposal');
  console.log('PASS round 12 (GR-GOV-20): with AIW\'s seeding switched off by a reviewed setting (kept with who, when and why), a project gets no seeded contract, need, plan, path or boundary, and its findings ask the author for each instead');
}
// GR-REQ-13: a contract and a data definition keep a reading of what they read, not the versions of Chapters 1-7.
// Changing one component's purpose marks only the contracts and data definitions that read that component, and their
// reviews and checks; the others stay current. A requirement a contract names marks that contract only, a re-save that
// changes nothing marks nothing, and a stamp kept before (the versions) is judged as it was.
{
  const I = await import('./public/interfaces-domain.js');
  const {applyRealisationCommand, component} = await import('./public/realisation-domain.js');
  const {applyCommand} = await import('./public/requirements-domain.js');
  const at = '2026-10-08T10:00:00.000Z', reviewed = {reviewer: 'Fixture reviewer', evidence: 'Synthetic review fixture', reviewed: true};
  let q = withInterfaces(seedProject());
  for (const r of [...contracts(q), ...dataRecords(q)]) q = cmd(q, 'record-review', {...reviewed, id: r.id});
  for (const id of ['rest', 'network']) { const c = contract(q, id); q = cmd(q, 'check', {id, payload: samplePayload(q, c), role: 'request', scenario: 'normal', observations: 'Synthetic walk-through of the fixture.', reviewed: true, visited: [0, 1, 2, 3], stamp: contractStamp(q, c)}); }
  const marked = p => [...contracts(p), ...dataRecords(p)].filter(r => interfaceSourceChanged(p, r)).map(r => r.id);
  const reviewedNow = p => [...contracts(p).filter(c => contractReviewCurrent(p, c)), ...dataRecords(p).filter(d => dataReviewCurrent(p, d))].map(r => r.id);
  const all = [...contracts(q), ...dataRecords(q)].map(r => r.id);
  assert.deepEqual(marked(q), [], 'nothing is marked to begin with');
  assert.deepEqual(reviewedNow(q), all, 'every contract and data definition is reviewed');
  assert.ok([...contracts(q), ...dataRecords(q)].every(r => r.sourceSnapshot.startsWith('fp1:')), 'each keeps a reading (a fingerprint), not the versions of the chapters before');
  // One component's purpose changes: api-pod is a participant of rest and if-004, and keeps (and is the authority of) instruction.
  const api = component(q, 'api-pod');
  const changed = withInterfaces(applyRealisationCommand(q, {type: 'realisation.component', payload: {...api, purpose: api.purpose + ' It keeps the channel reference.'}}, at).document);
  assert.notEqual(I.inputStamp(changed), I.inputStamp(q), 'the versions of the chapters before have moved, as they did');
  assert.deepEqual(marked(changed), ['rest', 'if-004', 'instruction'], 'only the contracts and the data definition that read the component are marked');
  assert.deepEqual(interfaceFindings(changed).filter(f => f.code === 'source').map(f => f.objectId), ['rest', 'if-004', 'instruction'], 'one "Review changed inputs" finding for each, none for the rest');
  assert.deepEqual(reviewedNow(changed), all.filter(id => !['rest', 'if-004', 'instruction'].includes(id)), 'their reviews are no longer current; every other review is');
  const checkOf = (p, id) => p.interfaces.checks.find(t => t.contractId === id);
  assert.ok(!contractCheckCurrent(changed, checkOf(changed, 'rest')) && contractCheckCurrent(changed, checkOf(changed, 'network')), 'the check of a contract that reads it is not current; another contract\'s check is');
  // A review taken again keeps the reading of now.
  const again = cmd(changed, 'record-review', {...reviewed, id: 'rest'});
  assert.ok(!interfaceSourceChanged(again, contract(again, 'rest')) && contractReviewCurrent(again, contract(again, 'rest')));
  // A re-save of a component that changes nothing marks nothing.
  const {sourceSnapshot: _s, history: _h, ...worker} = component(q, 'worker');
  const resaved = withInterfaces(applyRealisationCommand(q, {type: 'realisation.component', payload: {...worker, allocations: q.logical.mappings.filter(m => m.physicalId === 'worker').map(m => ({logicalId: m.logicalId, scope: m.scope}))}}, at).document);
  assert.deepEqual([marked(resaved), reviewedNow(resaved)], [[], all], 'an unchanged component re-saved marks no record and keeps every review');
  // A requirement a contract names marks that contract, and no other record of the chapter.
  const named = cmd(q, 'contract', {id: 'network', requirementIds: ['REQ-003']});
  const req = named.artefacts.find(a => a.id === 'REQ-003');
  const edited = withInterfaces(applyCommand(named, {type: 'artefact', payload: {...req, acceptance: req.acceptance + ' The outcome keeps its reference.'}}, at).document);
  assert.deepEqual(marked(edited), ['network'], 'a changed requirement marks the contract that names it');
  // A record whose stamps were taken before (the versions of Chapters 1-7) is judged as before: changed by any change before.
  const legacy = structuredClone(q), old = legacy.interfaces.contracts.find(c => c.id === 'posting-api');
  old.sourceSnapshot = I.inputStamp(legacy);
  old.review.stamp = JSON.stringify([old.revision, I.inputStamp(legacy), old.exchanges.map(x => [x.id, x.dataId, dataRecord(legacy, x.dataId)?.revision]), [old.from, old.to].map(id => legacy.interfaces.parties.find(a => a.id === id)?.revision || 0)]);
  assert.ok(!interfaceSourceChanged(legacy, old) && contractReviewCurrent(legacy, old), 'a stamp taken before reads as current while nothing before has changed');
  const legacyChanged = withInterfaces(applyRealisationCommand(legacy, {type: 'realisation.component', payload: {...api, purpose: api.purpose + ' It keeps the channel reference.'}}, at).document);
  assert.deepEqual(marked(legacyChanged), ['rest', 'posting-api', 'if-004', 'instruction'], 'and as changed, with its review, after any change before, as it was');
  assert.ok(!contractReviewCurrent(legacyChanged, contract(legacyChanged, 'posting-api')));
  console.log('PASS round 12 (GR-REQ-13): changing one component\'s purpose marks only the contracts and data definitions that read it (rest, if-004, instruction), with their reviews and checks; every other review and check stays current; a named requirement marks the contract that names it; an unchanged re-save marks nothing; a stamp kept before is judged as it was');
}
