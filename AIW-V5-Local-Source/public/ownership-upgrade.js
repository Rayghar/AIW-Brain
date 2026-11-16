// The upgrade of a document written before rc.10.73.42 (D9, handbook gap review), whose Chapter 5 data lists were a second
// record of who owns a data definition beside the Chapter 8 authority. Now the authority is the one owner and a component's
// list is data it uses (architecture-model.js draws it as a uses relation). The upgrade runs on read, with the readings
// upgrade (readings-upgrade.js registers both; the server alone loads it, and the browser receives documents upgraded), and
// the first read stores it (storage-upgrade.js). It changes no record: it keeps, once, each data definition whose Chapter 5
// owners Chapter 8 does not share, with those components and Chapter 8's owners (none where it names none), in
// dataOwnership.toConfirm. That record sits beside the design (review-domain.js reviewSource leaves it out, so no stamp
// moves), and each entry is a Chapter 8 finding until a person confirms the owner by recording the definition's review
// (interfaces-domain.js). A document written now keeps an empty record, so a list a person writes now is never read as a
// claim. A frozen source is read as it was frozen ({upgrade:false}): it is not upgraded.
import {dataRecords,dataOwners} from './interfaces-domain.js';
import {components} from './realisation-domain.js';

export const OWNERSHIP_DEFINITION=2;
export const needsOwnershipUpgrade=p=>!!p?.interfaces&&!(p.dataOwnership?.definition>=OWNERSHIP_DEFINITION);
export function upgradeOwnership(p){
 if(!needsOwnershipUpgrade(p))return p;
 const toConfirm=[];
 for(const d of dataRecords(p)){const owners=dataOwners(p,d),componentIds=components(p).filter(c=>(c.dataIds||[]).includes(d.id)&&!owners.includes(c.id)).map(c=>c.id);if(componentIds.length)toConfirm.push({dataId:d.id,componentIds,owners});}
 p.dataOwnership={definition:OWNERSHIP_DEFINITION,toConfirm};
 return p;
}
