#!/usr/bin/env node
// Add the *exact six engineering-pack files* to a local knowledge repository store. This
// indexes candidate scene metadata only, and never imports unseen MP4s or promotes claims.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig} from './corpus.js';
import {ENGINEERING_PACK_LIBRARY_ID,importVideoCandidates,videoCandidateStatus,videoCandidates} from './video-evidence.js';
import {openStore} from './store.js';

const args=process.argv.slice(2),command=args[0],opt=(name,fallback=null)=>{const i=args.indexOf('--'+name);return i>=0?args[i+1]:fallback;};
const here=path.dirname(fileURLToPath(import.meta.url));
const storeOverride=opt('store');
const config=storeOverride?{store:path.resolve(storeOverride)}:await loadConfig(opt('config',path.join(here,'config.json')));
const tenantId=opt('tenant');
if(!tenantId)throw Error('Supply --tenant with the exact local workbench tenant scope.');
if(!storeOverride&&!config.allowedTenants?.includes(tenantId))throw Error('Configure this tenant in repository-service/config.json allowedTenants before importing restricted video candidates.');

if(command==='import'){
 const dir=opt('source');if(!dir)throw Error('Supply --source with the extracted AIW video engineering-pack directory.');
 const source=path.resolve(dir),libraryId=opt('library-id');
 if(libraryId!==ENGINEERING_PACK_LIBRARY_ID)throw Error('The Library identifier must name the pinned engineering ZIP; the importer verifies every member hash.');
 const provenance=Object.fromEntries(['graph','manifest','schema','blueprint','frames','readme'].map(role=>[role,{libraryId,materialization:'exact-download'}]));
 const names={graph:'aiw_video_knowledge_graph_seed.json',manifest:'aiw_video_scene_manifest.csv',schema:'aiw_video_ingestion_schema.json',blueprint:'AIW_Video_Knowledge_Graph_Blueprint.md',frames:'aiw_video_frame_semantic_index.csv',readme:'AIW_Video_Analysis_README.txt'};
 const sources=Object.fromEntries(Object.entries(names).map(([k,v])=>[k,path.join(source,v)]));
 console.log(JSON.stringify(await importVideoCandidates(config,{tenantId,...sources,provenance}),null,2));
}else if(command==='status'||command==='search'){
 const store=openStore(config.store);
 try{console.log(JSON.stringify(command==='status'?videoCandidateStatus(store,tenantId):videoCandidates(store,{tenantId,q:opt('q',''),videoId:opt('video','')}),null,2));}
 finally{store.close();}
}else throw Error('Usage: video-evidence-cli.mjs import --tenant <scope> --source <extracted-engineering-pack> --library-id <libfile_...> [--config <path>] [--store <path>]; or status/search --tenant <scope> [--q <terms>]');
