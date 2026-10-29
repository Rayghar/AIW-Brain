// The full workbook and the supported 5,000-requirement boundary both index without
// a dynamically assembled compound SELECT. This exercises the same atomic batch and
// index-stamp guard as a project save, on a real SQLite engine.
import assert from 'node:assert/strict';
import {localDatabase} from './local-db.js';
import {requirementIndexStatements,queryRequirements} from './requirement-storage.js';

const DB=localDatabase(':memory:'),owner='architect',project='large-case',old='stamp-1',fresh='stamp-2';
try{
 const artefacts=Array.from({length:5000},(_,i)=>({id:`REQ-${String(i+1).padStart(4,'0')}`,type:'requirement',externalId:`EXT-${i+1}`,domain:i%2?'Payments':'Ledger',capability:'Transfer',title:`Payment ${i+1}`,description:`Transfer number ${i+1}`,confirmed:i%3===0,assessment:{delivery:i%4?'Delivered':'Partially Delivered'}}));
 const document={artefacts},env={DB:{...DB,prepare(sql){assert(!/\bUNION\s+ALL\b/i.test(sql),'the index writer must not build a compound SELECT');return DB.prepare(sql);}}};
 await DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at,index_stamp) VALUES(?,?,?,?,?,?)').bind(owner,project,'{}',1,new Date().toISOString(),old).run();
 const statements=requirementIndexStatements(env,owner,project,document,new Map(),fresh,false);
 assert.equal(statements.length,50,'5,000 requirements use fifty bounded index pages');
 const changes=await DB.batch([DB.prepare('UPDATE projects SET index_stamp=? WHERE owner_id=? AND id=? AND index_stamp=?').bind(fresh,owner,project,old),...statements]);
 assert.equal(changes[0].meta.changes,1);
 assert.equal((await DB.prepare('SELECT COUNT(*) n FROM requirement_index WHERE owner_id=? AND project_id=?').bind(owner,project).first()).n,5000);
 const first=await queryRequirements({DB},owner,project,new URLSearchParams({q:'EXT-1',domain:'Payments'}));
 assert(first.rows.length>0&&first.rows.every(r=>r.domain==='Payments'),'the stored projection remains searchable');
 const gaps=await queryRequirements({DB},owner,project,new URLSearchParams({gaps:'1',page:'10000'}));
 assert.equal(gaps.total,1250);assert.equal(gaps.page,25);assert.equal(gaps.rows.length,50);
 const stale=requirementIndexStatements(env,owner,project,{artefacts:[{...artefacts[0],title:'A stale overwrite'}]},new Map(),old,false);
 await DB.batch(stale);
 assert.equal((await DB.prepare('SELECT title FROM requirement_index WHERE owner_id=? AND project_id=? AND id=?').bind(owner,project,'REQ-0001').first()).title,'Payment 1','a stale save cannot overwrite the newer index');
 console.log('PASS Requirement storage: 5,000 rows in 50 JSON pages, searchable projection, paged gaps and stamp-guarded stale update');
}finally{DB.close();}
