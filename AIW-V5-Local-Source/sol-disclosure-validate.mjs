// What Sol may read (audit B-02, C-34, B-11). Objects the project owner excludes from AI requests stay out
// of every source Sol reads at the desk and in the chapters, not only the decisions asked about; secrets are
// redacted from both packets and again at the provider boundary; and both Sol paths share one budget that
// counts source searches too. Synthetic project; no provider is contacted. Run: npm run test:sol-disclosure
import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {reasoningPacket, currentStamp} from './public/brain-reasoning.js';
import {SOL, solChapterEntry, pendingHTML, solSend, solLoad, solPrepare, reviewFindingHistorical} from './public/brain-reasoning-ui.js';
import {redactSecrets, redactSecretsDeep} from './public/secret-redaction.js';
import {requestReasoning} from './intelligence-provider.js';
import {reviewPacket} from './public/intelligence-context.js';
import {providerEnv} from './mock-llm-provider.mjs';
import {embedTexts} from './brain-retrieval.js';
import {guidanceFooter} from './public/shell-ux.js';
import {solDisclosure} from './public/provenance.js';
import {evidenceMarkdown} from './public/evidence-domain.js';
import {exportLogicalMarkdown} from './public/logical-domain.js';
import {previewWorkingChange} from './public/workbench-domain.js';
import {Window} from 'happy-dom';
import {withConfiguredProductFixtures} from './product-configuration-fixtures.mjs';

const checks = [], pass = (name) => checks.push(name);
const IDS = ['F:capacity:run-001', 'F:capacity:run-008', 'J:security:run-002', 'D:ADR-001'];
// rc39: products configured as product-choice-validate configures them; unconfigured, their mechanisms are unknown and the desk drafts no capacity fix.
const project = withConfiguredProductFixtures(withFinalReview(seedProject()));
// The desk sizes nothing without a review objective (GR-RUN-04); the capacity fixes the ids name need one.
project.finalReview.capacity = {kind: 'users', value: 100000, reviewer: 'Synthetic workload fixture'};

// 1. Excluded objects never reach Sol through the desk's context sources.
const open = reasoningPacket(project, {task: 'decisions', ids: IDS, scope: 'test'});
const drivers = open.sources.filter((s) => s.kind === 'model' && /^QD-/.test(s.objectId)).map((s) => s.objectId);
assert(drivers.length > 0, 'the open packet carries quality drivers as context');
const policed = structuredClone(project);
policed.workspace = {...(policed.workspace || {}), aiPolicy: {...(policed.workspace?.aiPolicy || {}), excludedObjectIds: drivers}};
const closed = reasoningPacket(policed, {task: 'decisions', ids: IDS, scope: 'test'});
assert.deepEqual(closed.sources.filter((s) => drivers.includes(s.objectId)), [], 'no excluded driver is sent');
assert(closed.omissions.some((o) => o.reason === 'disclosure policy' && o.title.startsWith(String(drivers.length))), 'the packet says how many sources were held back, without naming them');
assert(!JSON.stringify(closed.omissions).includes(policed.quality.drivers.find((d) => d.id === drivers[0]).title), 'an omission never carries the excluded title');
assert.equal(closed.disclosure.withheldSources, drivers.length);
assert.equal(reasoningPacket(policed, {task: 'decisions', ids: IDS, scope: 'test'}).stamp, closed.stamp, 'the packet stays deterministic');
pass('the desk and chapter reasoning packet leaves out every source the disclosure policy excludes, and records only how many');

// 2. Secrets are redacted from what Sol reads, and again at the provider boundary.
const KEY = 'sk-proj-' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4', PASSWORD = 'Sup3r$ecret!';
const leaky = structuredClone(project);
const driver = leaky.quality.drivers.find((d) => d.id === drivers[0]);
driver.measurement = `Load test with key ${KEY}; db password: ${PASSWORD}`;
const packet = reasoningPacket(leaky, {task: 'decisions', ids: IDS, scope: 'test', prompt: `Use postgres://app:${PASSWORD}@db.internal/payments to check`});
const text = JSON.stringify(packet);
assert(!text.includes(KEY) && !text.includes(PASSWORD), 'no secret in the packet shown to the architect');
assert.match(text, /\[API key redacted\]/); assert.match(text, /\[secret redacted\]|\[password redacted\]/);
assert.equal(packet.disclosure.redactSecrets, true);
assert.equal(redactSecrets('The password policy requires rotation every 90 days.'), 'The password policy requires rotation every 90 days.', 'ordinary architecture text is kept');
let sent = null;
const capture = async (url, init) => { sent = init.body; return new Response('{}', {status: 500}); };
await assert.rejects(requestReasoning({OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock'}, {...packet, request: {...packet.request, prompt: 'raw ' + KEY}}, {fetcher: capture}));
assert(sent && !sent.includes(KEY), 'the provider boundary redacts what a caller did not');
// The same boundary on the Anthropic wire (round 5): the seam redacts before either provider's request is built.
sent = null;
await assert.rejects(requestReasoning({ANTHROPIC_API_KEY: 'test-key', AIW_LLM_PROVIDER: 'anthropic'}, {...packet, request: {...packet.request, prompt: 'raw ' + KEY}}, {fetcher: capture}));
assert(sent && !sent.includes(KEY) && !sent.includes(PASSWORD) && /\[API key redacted\]/.test(sent), 'the Anthropic request is redacted at the same boundary');
// Sol's model review reads the chapter through the same redaction and disclosure policy.
const reviewed = JSON.stringify(reviewPacket(leaky, {chapter: 2}));
assert(!reviewed.includes(KEY) && !reviewed.includes(PASSWORD), 'no secret in the model review packet');
const reviewClosed = reviewPacket(policed, {chapter: 2});
assert(!drivers.some((id) => reviewClosed.elementIds.includes(id)) && reviewClosed.omissions.withheld === drivers.length, 'an excluded record is not reviewed, and the packet counts it without naming it');
await assert.rejects(embedTexts({OPENAI_API_KEY: 'test-key'}, [`client_secret=${PASSWORD}`], {fetcher: capture}));
assert(sent && !sent.includes(PASSWORD), 'embedding requests are redacted too');
assert.deepEqual(redactSecretsDeep({a: [`token ${KEY}`], n: 3}), {a: ['token [API key redacted]'], n: 3});
pass('keys, tokens, passwords and connection-string credentials are redacted from every packet (the model review\'s too) and at every provider call, on either wire; ordinary text is kept');

// The contact policy covers the whole packet, not only excerpts and the question. The preview contains
// precisely that packet (including selected item values, objective, omissions and knowledge receipts).
const contact = structuredClone(project), EMAIL = 'architect@example.com', PHONE = '+234 801 234 5678';
contact.workspace = {...(contact.workspace || {}), aiPolicy: {...(contact.workspace?.aiPolicy || {}), redactContacts: true}};
contact.decisions.records.find(d => d.id === 'ADR-001').question = `Compare options with ${EMAIL}, ${PHONE}; token ${KEY}`;
contact.decisions.records.find(d => d.id === 'ADR-001').alternatives[0].title = `Option contact ${EMAIL}`;
const masked = reasoningPacket(contact, {task: 'decisions', ids: ['D:ADR-001'], scope: 'contact ' + EMAIL, prompt: 'Please ask ' + PHONE});
const visible = JSON.stringify(masked);
assert(!visible.includes(EMAIL) && !visible.includes(PHONE) && !visible.includes(KEY), 'no contact or secret survives anywhere in the packet');
assert.deepEqual(redactSecretsDeep(masked), masked, 'the provider boundary does not silently alter the previewed packet a second time');
assert.match(masked.items[0].title, /\[email redacted\]/, 'the selected item title, outside the source excerpt, is masked');
assert.match(masked.items[0].title, /\[phone-like value redacted\]/, 'the item contact is masked');
assert(!('excludedObjectIds' in masked.disclosure), 'excluded IDs are not sent as metadata to the provider');
SOL.pending = {packet: masked, request: masked.request, prompt: masked.request.prompt, title: 'Architecture choice'};
SOL.config = {configured: true, provider: 'OpenAI', model: 'mock'};
const preview = new Window().document;
preview.body.innerHTML = pendingHTML();
assert.equal(preview.querySelector('[data-sol-complete-packet]').textContent, JSON.stringify(masked, null, 2), 'the inspectable preview contains the complete exact context packet');
assert.match(preview.body.textContent, /Provider instructions and response schema are separate/, 'the UI discloses the provider wrapper and second check');
sent = null;
await assert.rejects(requestReasoning({OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock'}, {...masked, request: {...masked.request, prompt: EMAIL + ' ' + PHONE}}, {fetcher: capture}));
assert(sent && !sent.includes(EMAIL) && !sent.includes(PHONE), 'the final provider boundary repeats contact masking if a caller mutates the previewed packet');
SOL.pending = null;
pass('contact and secret masking covers the entire actual context; full redacted packet is inspectable before sending');

const chapterPacket = reasoningPacket(project, {task: 'decisions', ids: ['M:7:tr-003'], scope: 'technology'});
assert.equal(currentStamp(project, null, null, 'M:7:tr-003'), chapterPacket.items[0].stamp);
const oldReceipt = structuredClone(chapterPacket);
oldReceipt.sources.find(s => s.kind === 'product-mechanism').receipt.excerptHash = 'outdated';
const runWithOldReceipt = {id: 'old-receipt', packet: oldReceipt, result: {assessments: [{id: 'M:7:tr-003'}]}};
SOL.byItem = new Map([['M:7:tr-003', {run: runWithOldReceipt, item: oldReceipt.items[0], a: runWithOldReceipt.result.assessments[0]}]]);
assert.equal(solChapterEntry(project, 'M:7:tr-003').current, false, 'source receipt changes make the UI stale even when the selected object stamp is unchanged');
SOL.byItem.clear();
pass('Sol’s UI uses the same item and knowledge-receipt currentness rule as server adoption');

const reviewBasis=reviewPacket(project,{chapter:4});
const summary={request:{chapter:4},packetStamp:reviewBasis.stamp,packetBasis:{stamp:reviewBasis.stamp,brainReceipt:{instructions:reviewBasis.brainReceipt.instructions},sources:reviewBasis.sources.map(s=>({kind:s.kind,objectId:s.objectId,receipt:s.receipt||null}))}};
assert.equal(reviewFindingHistorical(project,summary),false,'the matching chapter and current receipts are not historical');
const withdrawnSummary={...summary,packetBasis:{...summary.packetBasis,sources:[...summary.packetBasis.sources,{kind:'knowledge',receipt:{patternId:'withdrawn',releaseId:'old'}}]}};
assert.equal(withdrawnSummary.packetStamp,reviewBasis.stamp,'the chapter stamp itself is unchanged');
assert.equal(reviewFindingHistorical(project,withdrawnSummary),true,'a withdrawn receipt alone opens historical confirmation');
pass('Chapter review historical confirmation follows the server’s basis check, including withdrawn receipts with unchanged chapter stamp');

// A failed persisted request must receive a new ID on retry. When the HTTP response is lost,
// check the original ID first and recover the saved completed run without another provider call.
const retryPacket = reasoningPacket(project, {task: 'decisions', ids: ['D:ADR-001'], scope: 'retry'});
const retryBodies = [], priorFetch = globalThis.fetch;
SOL.pending = {packet: retryPacket, request: retryPacket.request, prompt: '', title: 'Retry test'};
let stage = 0;
try {
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url);
    if (path.includes('/reason') && !path.includes('/reasonings')) {
      const sent = JSON.parse(init.body); retryBodies.push(sent);
      if (stage++ === 0) return new Response(JSON.stringify({status: 'failed', error: 'The provider was unavailable.'}), {status: 502});
      return Response.json({id: sent.requestId, status: 'completed', packet: retryPacket, result: {assessments: []}});
    }
    throw Error('Unexpected request ' + path);
  };
  assert.equal(await solSend(), null);
  assert(SOL.pending && /provider was unavailable/.test(SOL.error), 'a failed run retains the exact prepared context');
  assert((await solSend())?.status === 'completed');
  assert.notEqual(retryBodies[0].requestId, retryBodies[1].requestId, 'the retry is a new request, not replay of a failed saved run');
  assert.equal(retryBodies[0].packetStamp, retryBodies[1].packetStamp, 'the same previewed context is reused');
  SOL.pending = {packet: retryPacket, request: retryPacket.request, prompt: '', title: 'Lost response test'};
  stage = 0; retryBodies.length = 0;
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url);
    if (path.includes('/reason') && !path.includes('/reasonings')) { retryBodies.push(JSON.parse(init.body)); throw Error('Connection interrupted after submission'); }
    if (path.includes('/runs?id=')) return Response.json({id: retryBodies[0].requestId, status: 'completed', packet: retryPacket, result: {assessments: []}});
    throw Error('Unexpected request ' + path);
  };
  assert.equal(await solSend(), null);
  assert(SOL.pending?.checkFirst, 'unknown outcome is marked for lookup');
  assert((await solSend())?.status === 'completed');
  assert.equal(retryBodies.length, 1, 'recover saved completed result without another provider call');
} finally {globalThis.fetch = priorFetch; SOL.pending = null; SOL.error = '';}
pass('failed persisted run retries with a fresh ID; an ambiguous network result is checked before risking a duplicate send');

// Delayed responses from the previous project must never populate the new project's Sol panel.
let resolveOld;
try {
  SOL.projectId = 'older-project';
  SOL.config = {configured:true};
  globalThis.fetch = async url => {
    const path=String(url);
    if (path.includes('/draft?')) return Response.json({draft:null,revision:null,actorKey:'fixture-actor'});
    if (path.includes('reasoning-context')) return new Promise(resolve => {resolveOld=resolve;});
    if (path.includes('status?mode=reasoning')) return Response.json({configured:true,provider:'OpenAI',model:'mock'});
    if (path.includes('/reasonings')) return Response.json({runs:[]});
    throw Error('Unexpected request ' + path);
  };
  const older = solPrepare({ids:['D:ADR-001'],scope:'old'}, {title:'old'});
  for(let n=0;n<30&&!resolveOld;n++)await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(typeof resolveOld,'function','draft load completes before the context request');
  await solLoad('newer-project');
  resolveOld(Response.json({packet:retryPacket,configuration:{configured:true}}));
  await older;
  assert.equal(SOL.projectId,'newer-project');
  assert.equal(SOL.pending,null,'old context never enters the new project');
  SOL.projectId='older-project';SOL.config={configured:true};SOL.pending={packet:retryPacket,request:retryPacket.request,prompt:'',title:'old'};
  let resolveAnswer;
  globalThis.fetch = async url => {
    const path=String(url);
    if (path.includes('/reason') && !path.includes('/reasonings')) return new Promise(resolve => {resolveAnswer=resolve;});
    if (path.includes('status?mode=reasoning')) return Response.json({configured:true,provider:'OpenAI',model:'mock'});
    if (path.includes('/reasonings')) return Response.json({runs:[]});
    throw Error('Unexpected request ' + path);
  };
  const oldSend=solSend();
  await Promise.resolve();
  await solLoad('newer-project');
  resolveAnswer(Response.json({id:'old-run',status:'completed',packet:retryPacket,result:{assessments:[]}}));
  await oldSend;
  assert.equal(SOL.runs.length,0,'old provider answer never enters new project');
  assert.equal(SOL.pending,null);
  assert.equal(SOL.busy,false,'old request completion does not disturb new-project busy state');
} finally {globalThis.fetch=priorFetch; SOL.pending=null;}
pass('a slow preview or provider response is discarded after project switch, with new-project state intact');

// 3. One budget: the reasoning path counts source-search tokens like the generate path.
const FILES = new Map();
const env = {DB: localDatabase(':memory:'), FILES: {async put(k, v) { FILES.set(k, v); }, async get(k) { return FILES.has(k) ? {text: async () => FILES.get(k)} : null; }, async delete(k) { FILES.delete(k); }}, ASSETS: {fetch: () => new Response('')}, ...providerEnv({OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock'})};
const origin = 'https://aiw.test';
const call = async (path, body) => {
  const response = await worker.fetch(new Request(origin + path, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': 'local-architect', ...(body ? {Origin: origin, 'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
  return {status: response.status, data: await response.json()};
};
const {data: opened} = await call('/api/project');
const prepared = await call('/api/intelligence/reasoning-context', {task: 'decisions', ids: IDS, scope: 'test'});
assert.equal(prepared.status, 200, JSON.stringify(prepared.data).slice(0, 200));
const routedEnv={...env, AIW_LLM_PROVIDERS:JSON.stringify({sol:{kind:'openai',apiKey:'synthetic-key',models:['reason-model','field-model','journey-model','review-model']}}), AIW_LLM_ROUTE_REASONING:'sol:reason-model', AIW_LLM_ROUTE_FIELD:'sol:field-model', AIW_LLM_ROUTE_JOURNEY:'sol:journey-model', AIW_LLM_ROUTE_REVIEW:'sol:review-model'};
const routed = async (path, body) => {
 const response = await worker.fetch(new Request(origin + path, {method:body?'POST':'GET',headers:{'oai-authenticated-user-id':'local-architect',...(body?{Origin:origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}), routedEnv);
 return {status:response.status,data:await response.json()};
};
assert.equal((await routed('/api/intelligence/status?mode=reasoning')).data.model,'reason-model');
assert.equal((await routed('/api/intelligence/reasoning-context',{task:'decisions',ids:['D:ADR-001'],scope:'routing'})).data.configuration.model,'reason-model');
const responsibility=project.logical.responsibilities[0];
const fieldPreview=await routed('/api/intelligence/field-context',{command:'logical.responsibility',field:'purpose',recordId:responsibility.id,values:{purpose:responsibility.purpose},links:{}});
assert.equal(fieldPreview.status,200,JSON.stringify(fieldPreview.data).slice(0,150));
assert.equal(fieldPreview.data.configuration.model,'field-model');
const journeyPreview=await routed('/api/intelligence/journey-context',{chapter:1});
assert.equal(journeyPreview.status,200,JSON.stringify(journeyPreview.data).slice(0,150));
assert.equal(journeyPreview.data.configuration.model,'journey-model');
const reviewPreview=await routed('/api/intelligence/review-context',{chapter:4});
assert.equal(reviewPreview.status,200,JSON.stringify(reviewPreview.data).slice(0,150));
assert.equal(reviewPreview.data.configuration.model,'review-model');
assert(!JSON.stringify(fieldPreview.data.packet).includes('excludedObjectIds'),'field packet sends only exclusion counts');
pass('each Sol preview and status uses its own routed model, consistent with its provider execution');
await env.DB.prepare("INSERT INTO brain_retrieval_runs (owner_id,id,project_id,input_hash,status,storage_key,created_at,reserved_tokens,used_tokens) VALUES (?,?,?,?,?,?,?,?,?)").bind('local-architect', crypto.randomUUID(), opened.document.id, 'x', 'completed', 'k', new Date().toISOString(), 0, 1000000).run();
const refused = await call('/api/intelligence/reason', {task: 'decisions', ids: IDS, scope: 'test', requestId: crypto.randomUUID(), packetStamp: prepared.data.packet.stamp});
assert.equal(refused.status, 429, 'a day of source searches exhausts the budget for the desk too: ' + JSON.stringify(refused.data).slice(0, 160));
const review = await call('/api/intelligence/review-context', {chapter: 4});
assert.equal(review.status, 200);
const reviewRefused = await call('/api/intelligence/review', {chapter: 4, requestId: crypto.randomUUID(), packetStamp: review.data.packet.stamp});
assert.equal(reviewRefused.status, 429, 'the model review is counted in the same budget: ' + JSON.stringify(reviewRefused.data).slice(0, 160));
pass('every Sol mode shares one budget: the desk, the chapters and the model review count source-search tokens and apply the same caps');

// 4. What AIW discloses of Sol's part is derived, never fixed (round 12, GR-GOV-07): the footer from the provider configured
// now and the project's stored authorship; the SDD's evidence section and the Chapter 4 export from the stored authorship
// only, with how many records Sol drafted that no person has reviewed.
{
  const status = await call('/api/intelligence/status');
  assert.equal(status.status, 200); assert.equal(status.data.configured, true, 'the suite configures a provider');
  let doc = (await call('/api/project')).data;
  assert.equal(guidanceFooter(status.data, solDisclosure(doc.document)), 'Rule-based guidance · Sol can also draft with ' + status.data.model, 'nothing drafted by Sol: the footer names the configured provider only');
  assert.equal(guidanceFooter({configured: false}, solDisclosure(doc.document)), 'Rule-based guidance · No language model is connected');
  const commands = [{type: 'realisation.component', payload: {title: 'Statement archive', kind: 'store', purpose: 'Keeps statements for their retention period.', boundary: 'Statements only.', owner: 'Operations'}}, {type: 'logical.responsibility', payload: {title: 'Archive statements', purpose: 'Keeps statements.', boundary: 'Statements only.', owner: 'Operations', requirementIds: ['REQ-001']}}];
  const sent = await call('/api/commands', {revision: doc.revision, command: {type: 'workspace.apply', payload: {commands, stamp: previewWorkingChange(doc.document, commands).stamp, reviewed: false, authorKind: 'sol-draft', reason: 'Sol drafts the statement archive.'}}});
  assert.equal(sent.status, 200, JSON.stringify(sent.data).slice(0, 200));
  const d = solDisclosure(sent.data.document);
  assert.deepEqual([d.drafted, d.notReviewed], [2, 2]);
  assert.equal(guidanceFooter(status.data, d), 'Rule-based guidance · Sol can also draft with ' + status.data.model + ' · Sol drafted 2 records, 2 not reviewed by a person');
  assert.equal(guidanceFooter({configured: false}, d), 'Rule-based guidance · No language model is connected · Sol drafted 2 records, 2 not reviewed by a person', 'with no model connected now, what Sol drafted is still said');
  const evidence = evidenceMarkdown(sent.data.document);
  assert.ok(!evidence || !/no external LLM is connected/.test(evidence));
  const chapter4 = exportLogicalMarkdown(sent.data.document);
  assert.doesNotMatch(chapter4, /no external LLM/); assert.match(chapter4, /Sol drafted 1 record in this chapter; 1 of them is not reviewed by a person\./);
  pass('every disclosure is derived: the footer from the provider configured now and the stored authorship (how many records Sol drafted that no person reviewed, said with or without a model connected), the evidence section and Chapter 4\'s export from the stored authorship, never "no external LLM is connected"');
}

console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
