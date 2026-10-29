import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {digest} from './public/brain-integrity.js';
import {architectureUnitIssues,architectureUnitRecord} from './public/architecture-knowledge-unit.js';
import {applyKnowledgeCommand,claimReceipt,claimReceiptCurrent,knowledgeEligibility,knowledgeStamp,releasedClaims} from './public/knowledge-governance.js';

const at='2026-10-11T10:00:00Z';
const author='architect-a',reviewer='architect-b';
let p=createProject({name:'Payment architecture',template:'blank'},'architecture-unit-contract');
const command=(type,payload,actor=author)=>{const result=applyKnowledgeCommand(p,{type:'knowledge.'+type,payload},at,actor);p=result.document;return result.selected;};
const sourceId=command('source',{title:'Synthetic message persistence mechanism',body:'For a payment event, the selected queue type and operating topology determine the failure behaviour.',revision:'fixture-1',path:'synthetic/queue.txt',license:'Synthetic test material'});
const architectureUnit={
 kind:'product-mechanism',mechanism:'A replicated queue accepts writes when a majority of its nodes can communicate.',
 scope:{capability:'messaging',product:'RabbitMQ',version:'4.1',topology:'three nodes across failure domains',tier:'self-managed',operatingModel:'platform team'},
 effects:[{quality:'reliability',direction:'supports',rationale:'Replicas can preserve the queue after a single node failure under the recorded topology.'},{quality:'availability',direction:'tradeoff',rationale:'A lost majority stops writes.'}],
 obligations:[{action:'Place nodes in distinct failure domains.',evidence:'Review deployment mapping and run a node loss drill.'},{action:'Handle redelivery.',evidence:'Run duplicate message tests against an idempotent payment consumer.'}],
 exclusions:['The expected failure removes the majority of replicas.']
};
assert.deepEqual(architectureUnitIssues(architectureUnit),[]);
const normalized=architectureUnitRecord({...architectureUnit,mechanism:' '+architectureUnit.mechanism+' '});
assert.equal(normalized.mechanism,architectureUnit.mechanism);
assert.throws(()=>architectureUnitRecord({...architectureUnit,scope:{product:'RabbitMQ'}}),/documented version scope/);
assert.throws(()=>architectureUnitRecord({...architectureUnit,effects:[{quality:'availability',direction:'guarantees',rationale:'Always available.'}]}),/supports, tradeoff or unknown/);
assert.throws(()=>architectureUnitRecord({...architectureUnit,unsupported:'proven'}),/unsupported field/);
const claim={sourceId,lineStart:1,lineEnd:1,subjectId:'RabbitMQ quorum queue',predicate:'replicates',statement:'A replicated queue can preserve accepted messages after a single node failure under the recorded topology.',claimType:'applicability',polarity:'supports',conditions:['Three replicas remain deployed and a majority is reachable.'],limitations:['No measured payment availability is established.'],architectureUnit};
assert.throws(()=>command('claim',{...claim,conditions:[]}),/conditions and limitations/);
const claimId=command('claim',claim);
assert.equal(p.knowledge.claims[0].architectureUnit.scope.version,'4.1');
assert.deepEqual(releasedClaims(p),[],'Candidate interpretations are not an active source of advice.');
const review={reviewed:true,reviewer:'Synthetic second architect',reason:'Checked the exact fixture text, rights, conditions and bounded interpretation.',sourceChecked:true,rightsChecked:true,conditionsChecked:true,decision:'verified'};
assert.throws(()=>command('review',{...review,id:claimId}),/Another authenticated person/);
command('review',{...review,id:claimId},reviewer);
assert.equal(knowledgeEligibility(p,p.knowledge.claims[0]).eligible,true);
const releaseId=command('release',{...review,title:'Synthetic payment messaging',claimIds:[claimId]});
command('activate',{...review,id:releaseId,stamp:knowledgeStamp(p)});
const hit=releasedClaims(p).find(x=>x.claim.id===claimId);
assert(hit?.eligible);
const receipt=claimReceipt(p,hit.claim,hit.release);
assert.deepEqual(receipt.architectureUnit,normalized);
assert.equal(receipt.scoring,false);
assert(claimReceiptCurrent(p,receipt));

const changed=structuredClone(p);
changed.knowledge.releases[0].claims[0].architectureUnit.effects[0].direction='guarantees';
const damaged=changed.knowledge.releases[0].claims[0];
damaged.review.claimHash=digest({...damaged,review:undefined});
const eligibility=knowledgeEligibility(changed,damaged,changed.knowledge.releases[0]);
assert.equal(eligibility.eligible,false);
assert.match(eligibility.reasons.join(' '),/structured architecture claim is invalid/);
assert.equal(claimReceiptCurrent(changed,receipt),false,'A changed unit cannot reuse its earlier receipt.');
const missingConditions=structuredClone(p);
missingConditions.knowledge.releases[0].claims[0].conditions=[];
const incomplete=missingConditions.knowledge.releases[0].claims[0];
incomplete.review.claimHash=digest({...incomplete,review:undefined});
assert.match(knowledgeEligibility(missingConditions,incomplete,missingConditions.knowledge.releases[0]).reasons.join(' '),/lacks applicability conditions/);
const {architectureUnit:_ignored,...oldClaim}=claim;
const older=command('claim',{...oldClaim,subjectId:'Messaging capability'});
assert(older,'Legacy untyped claims still have a creation path');
assert.equal(Object.hasOwn(p.knowledge.claims.at(-1),'architectureUnit'),false);
console.log('PASS architecture unit: bounded typed fields, product version scope, candidate and four-eyes gates, release receipt, malformed/tampered eligibility, older claim compatibility. Synthetic fixture only.');
