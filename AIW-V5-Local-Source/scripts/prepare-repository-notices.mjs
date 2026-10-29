import {readFile,writeFile} from 'node:fs/promises';
const [packetFile,requestFile,outputFile]=process.argv.slice(2);
if(!packetFile||!requestFile||!outputFile)throw Error('Usage: node scripts/prepare-repository-notices.mjs CANDIDATE_PACKET.json SIGNING_REQUEST.json NOTICES.json');
const packet=JSON.parse(await readFile(packetFile,'utf8')),request=JSON.parse(await readFile(requestFile,'utf8'));
if(packet.schemaVersion!=='aiw-repository-packet-v1'||packet.authority!=='candidate'||packet.productionAccepted!==false||packet.storeId!==request.storeId&&request.storeId!==null||packet.fromCursor!==request.fromCursor)throw Error('Packet store and cursor must match the current unsigned signing request.');
const sources=new Map(packet.sources.map(x=>[x.revisionId,x]));
for(const n of packet.notices)if(n.kind==='revision'&&n.supersedes&&!packet.notices.some(x=>x.kind==='invalidation'&&x.revisionId===n.supersedes))throw Error('A successor revision is missing its explicit prior-revision invalidation notice.');
const notices=packet.notices.map(n=>{
 const source=sources.get(n.revisionId);if(!source)throw Error('Cannot resolve '+n.revisionId+' to an exact source identity. Export its saved revision with the notice.');
 return {cursor:n.cursor,kind:n.kind,repository:source.repository,commit:source.commit,path:source.path,hash:source.hash,reason:n.kind==='revision'?'observed':n.reason};
});
if(notices.length>100||packet.cursor!==request.fromCursor+notices.length)throw Error('Split the complete contiguous cursor range into signed updates of at most 100 notices.');
await writeFile(outputFile,JSON.stringify(notices,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({notices:notices.length,fromCursor:request.fromCursor,cursor:packet.cursor,invalidations:notices.filter(x=>x.kind==='invalidation').length}));
