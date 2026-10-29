import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyTechnologyRealisationCommand} from './public/technology-realisation-domain.js';
import {technologyCatalogue,findTechnologyProduct,technologyProductUsage} from './public/technology-catalogue.js';

const original=withFinalReview(seedProject()),before=JSON.stringify(original);
const catalogue=technologyCatalogue(original);
const blank=createProject({name:'Technology discovery on a new project',template:'blank',brief:'Prototype a payment service.'},'catalogue-blank');
assert.equal(technologyCatalogue(blank).counts.candidates,0,'a new project has no product candidates or implied choices');
assert.equal(findTechnologyProduct(blank,'MySQL').uses.length,0,'a new project can browse products without inventing a capability');
for(const name of ['PostgreSQL','MySQL','Apache Kafka','RabbitMQ','Redis']){
 const e=findTechnologyProduct(original,name);
 assert(e&&e.documentation.startsWith('https://'),name+' is discoverable with documentation');
 assert.equal(e.provenance.status,'Descriptive suggestion');
 assert(e.mechanisms.length>0,name+' has sourced mechanisms');
 assert(e.mechanisms.every(m=>m.source.startsWith('https://')&&m.condition));
}
assert.equal(catalogue.counts.selections,0,'illustrative options are never selections');
assert.equal(catalogue.counts.approvals,0,'catalogue presence is never approval');
assert.equal(findTechnologyProduct(original,'postgres').id,'postgresql','aliases resolve one product profile');
const kafka=findTechnologyProduct(original,'Apache Kafka');
assert.equal(kafka.documentation,'https://kafka.apache.org/43/');
assert(kafka.mechanisms.filter(m=>m.id.startsWith('kafka-')).every(m=>m.sourceVersion==='4.3'),'the bundled Kafka source version stays visible');
assert.deepEqual(kafka.mechanisms.filter(m=>m.id.startsWith('kafka-')).map(m=>m.source),[
 'https://kafka.apache.org/43/getting-started/introduction/',
 'https://kafka.apache.org/43/design/design/',
 'https://kafka.apache.org/43/design/design/'
],'Kafka mechanisms open official versioned pages containing the described behaviour, not the retired documentation redirect');
assert.equal(findTechnologyProduct(original,'MySQL').mechanisms.find(m=>m.id==='mysql-unique').source,'https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html','the InnoDB duplicate-key claim cites its exact handling page');
assert.deepEqual(technologyProductUsage(original,'Apache Kafka').map(u=>[u.realizationId,u.optionId,u.selected]),[['tr-003','TO-006',false]]);
assert.match(kafka.uses[0].sourceVersionMismatch,/Option specifies Apache Kafka version 3\.9; bundled mechanism documentation cites version 4\.3/,'a reference option on Kafka 3.9 cannot silently borrow the Kafka 4.3 documentation');
assert.equal(JSON.stringify(original),before,'discovery is a pure read');
const withdrawn=structuredClone(original);withdrawn.knowledge??={};withdrawn.knowledge.withdrawals=[{targetId:'AIW-PRODUCT-MECHANISMS-1'}];
assert.equal(findTechnologyProduct(withdrawn,'Apache Kafka').provenance.status,'Source pack withdrawn');
assert.equal(findTechnologyProduct(withdrawn,'Apache Kafka').mechanisms.length,0,'a withdrawn mechanism pack cannot suggest in discovery');

const command=(p,type,payload)=>applyTechnologyRealisationCommand(p,{type:'techrealisation.'+type,payload},'2026-10-11T12:00:00Z').document;
let p=structuredClone(original),r=p.technologyRealisation.records.find(x=>x.id==='tr-002');
p=command(p,'option',{id:r.id,option:{title:'MySQL design candidate',product:'MySQL',version:'',vendor:'',operatingModel:'',sourceUrl:'https://dev.mysql.com/doc/refman/8.4/en/',evidence:'Compare the applicable documented mechanisms and project obligations.'}});
const mysql=findTechnologyProduct(p,'MySQL');
assert.equal(mysql.uses.length,1,'a new Chapter 7 option appears in the same catalogue');
assert.equal(mysql.uses[0].status,'Candidate option');
assert.equal(mysql.uses[0].sourceVersionMismatch,'','an option with no recorded version is never said to mismatch');
assert(mysql.mechanisms.some(m=>m.id==='mysql-primary'&&m.effect==='ceiling'),'single-primary topology is conditional');

r=p.technologyRealisation.records.find(x=>x.id==='tr-002');
const pg=r.options.find(o=>o.product==='PostgreSQL');
p=command(p,'plan',{id:r.id,rationale:'The architect prefers PostgreSQL subject to a measured restore and capacity assessment.'});
p=command(p,'preference',{id:r.id,optionId:pg.id});
assert.equal(findTechnologyProduct(p,'PostgreSQL').uses[0].status,'Draft preference');
p=command(p,'record',{id:r.id,reviewed:true});
assert.equal(findTechnologyProduct(p,'PostgreSQL').uses[0].status,'Current architect selection');
assert.equal(findTechnologyProduct(p,'PostgreSQL').uses[0].rationale,p.technologyRealisation.records.find(x=>x.id===r.id).rationale);
assert.equal(findTechnologyProduct(p,'PostgreSQL').uses[0].approved,false,'recorded selection does not imply external approval');
p=command(p,'approval',{id:r.id,reviewer:'Fixture reviewer',authority:'Fixture change board',evidence:'Synthetic approval fixture only',confirmed:true});
assert.equal(findTechnologyProduct(p,'PostgreSQL').uses[0].status,'External approval evidence recorded');
p=command(p,'option',{id:r.id,option:{id:pg.id,serviceTier:'Unconfirmed project tier'}});
assert.equal(findTechnologyProduct(p,'PostgreSQL').uses[0].status,'Selection needs review','a changed option invalidates recorded selection and approval without erasing its history');
assert.equal(findTechnologyProduct(p,'PostgreSQL').uses[0].needsReview,true);
console.log('PASS technology catalogue: governed discovery, conditional sources, Chapter 7 options and selection lifecycle');
