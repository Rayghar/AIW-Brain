// A project stored before round 12, upgraded once, when it is read (round 12, PS-15). Its readings were copies (D-04) or
// readings of whole records (UX-02), and its journal kept every earlier change whole and every explanation twice
// (journal-archive.js): each read upgraded it again in memory (8.6 s of a 12 s read at the size of a drafted design), and
// only a save stored the upgrade, which a reader never makes. GET /api/project now stores the upgraded project the first
// time it reads such a row: a storage upgrade, not a change of the design. Every judgement is the same after it
// (readings-upgrade.js, journal-archive.js), so it is not a command and opens no change review; it is recorded once in the
// project's activity (kind "storage"), and the version it upgraded stays recoverable: the stored row as it was and every
// object it referenced are kept, named by a recovery point (readRecoveryPoint reads that version back whole). Then the
// local database file is compacted, since the row it rewrote is a fraction of the one it replaced.
import {saveStoredProject,readStoredProject,priorKeys,loggedHistories} from './project-storage.js';
import {needsReadingsUpgrade} from './public/readings-upgrade.js';
import {compactJournal} from './journal-archive.js';
import {activityStatement} from './object-service.js';
import {templateEvidence} from './shared/projects-domain.js';

const pointPrefix=(owner,projectId)=>'upgrades/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
// Whether a row as read needs storing again: readings to upgrade, or a journal written before it was kept compact that
// has something to compact (a row this version saved says it is compact).
export function storageUpgradeNeeded(stored){
  if(needsReadingsUpgrade(stored.document))return true;
  // A frozen baseline stored whole (round 12, GR-STO-02): kept as parts named by their SHA-256 (project-storage.js).
  if((stored.document.finalReview?.baselines||[]).some(b=>!b?.frozen))return true;
  // A document stored without a template (round 12, GR-DOM-15) whose own evidence is not the Bank Payment reference:
  // stamped blank, so it is never read as the reference and seeded. One holding the reference's records reads as the
  // reference, as it always has, and is stamped by the next upgrade it needs (storeStorageUpgrade).
  if(templateEvidence(stored.document)!=='bank-payment'&&!stored.document.workspace?.template)return true;
  // A history kept inside its section (round 12, GR-STO-05): kept as a log (project-storage.js).
  if(loggedHistories(stored.document).some(kind=>!stored.keys.has('__history:'+kind)))return true;
  const events=stored.document.changes?.events,journal=stored.keys.get('__change_journal');
  return Array.isArray(events)&&events.length>0&&!journal?.compacted&&compactJournal(events,{pageCount:journal?.archive?.length||0}).events!==events;
}
// Store the upgraded document (the document as the read completed it) over the row it was read from. Answers the row
// now stored ({revision, updatedAt}), or null when another request changed the project first (the caller reads again).
export async function storeStorageUpgrade(env,identity,projectId,row,stored,document,at=new Date().toISOString()){
  if(!env.FILES)return null;
  const {owner}=identity,key=pointPrefix(owner,projectId)+crypto.randomUUID()+'.json';
  // The template a document was made from, stamped from its own evidence when it was stored without one (GR-DOM-15).
  if(!document.workspace?.template)document.workspace={...(document.workspace||{}),template:templateEvidence(document)};
  const objects=[...priorKeys(stored.keys)].sort();
  await env.FILES.put(key,JSON.stringify({schema:'aiw.storage-recovery-point.v1',at,projectId,revision:row.revision,updatedAt:row.updated_at,document:row.document,objects}),{httpMetadata:{contentType:'application/json'}});
  const event={at,kind:'storage',title:'Storage upgrade',summary:'The project was stored again as this version of AIW keeps it: its readings as fingerprints of what records say, its change history compact with earlier changes in the archive, its frozen baselines as parts named by their SHA-256, its workbench and guided histories as logs, and its template recorded from its own records when it had none. No design content changed; the previous version is kept for recovery.',revision:row.revision+1,recoveryPoint:key,fromRevision:row.revision};
  let change;
  try{change=await saveStoredProject(env,owner,projectId,document,row.revision,at,stored.keys,stamp=>[activityStatement(env,identity,projectId,event,stamp)],{keepPrior:true});}
  catch(e){await env.FILES.delete(key).catch(()=>{});throw e;}
  if(!change.meta?.changes){await env.FILES.delete(key).catch(()=>{});return null;}
  // The local database keeps the pages the old row used as free space: compacted once the row is smaller.
  try{await env.DB.compact?.();}catch{/* the file stays as large as it was; the next upgrade tries again */}
  return {revision:row.revision+1,updatedAt:at,recoveryPoint:key};
}
// The version a storage upgrade replaced, read back whole (its objects were kept): {revision, updatedAt, document}.
export async function readRecoveryPoint(env,owner,projectId,key){
  if(typeof key!=='string'||!key.startsWith(pointPrefix(owner,projectId)))throw Error('Choose a recovery point of this project.');
  const file=await env.FILES?.get(key);if(!file)throw Error('The recovery point is unavailable.');
  const point=JSON.parse(await file.text());
  if(point.schema!=='aiw.storage-recovery-point.v1'||point.projectId!==projectId)throw Error('The recovery point does not belong to this project.');
  return {revision:point.revision,updatedAt:point.updatedAt,document:(await readStoredProject(env,owner,point.document)).document};
}
