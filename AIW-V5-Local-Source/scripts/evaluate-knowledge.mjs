// Explicit live evaluation using synthetic data only. Requires runtime credentials.
import assert from 'node:assert/strict';
import {createProject} from '../public/projects-domain.js';
import {applyCommand} from '../public/requirements-domain.js';
import {withFinalReview} from '../public/review-domain.js';
import {intelligencePacket} from '../public/intelligence-context.js';
import {requestIntelligence} from '../intelligence-provider.js';
let p=withFinalReview(createProject({name:'Equipment reservation evaluation',template:'blank'},'synthetic-knowledge'));
p=applyCommand(p,{type:'artefact',payload:{type:'requirement',title:'Recover an uncertain reservation',description:'The remote equipment inventory dependency can time out after accepting a reservation. Repeating the request could create duplicate reservations.',acceptance:'The requester receives the original recorded outcome.',owner:'',source:'Synthetic evaluation fixture'}}).document;
const packet=intelligencePacket(p,{chapter:1,objectId:'REQ-001',mode:'mind',prompt:'Explore retry with backoff for this timeout. Compare with a simpler approach. Explain what must be known before retrying. Keep the explanation concise; do not invent a time budget or assume the timeout means the reservation failed.'});
const response=await requestIntelligence(process.env,packet),r=response.result;
assert.equal(r.options.length,0,'A recovery-policy question is not a boundary proposal');
assert(r.sourceRefs.includes('S1'));
assert(r.sourceRefs.some(ref=>packet.sources.some(s=>s.ref===ref&&s.objectId==='PAT-RETRY-WITH-BACKOFF')),'Expected citation of the supplied retry record');
assert(/idempot|duplicat/i.test(JSON.stringify(r)),'Expected duplicate-effect consideration');
assert(/budget|bounded|limit/i.test(JSON.stringify(r)),'Expected bounded-retry consideration');
console.log(JSON.stringify({provider:response.provider,model:response.model,usage:response.usage,sources:packet.sources.map(s=>({ref:s.ref,id:s.objectId})),result:r},null,2));
