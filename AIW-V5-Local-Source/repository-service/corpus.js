// The acquired corpus as the service is allowed to see it: the pinned snapshot selection, the
// verified connector registry, and exact accepted bytes checked against the manifest on every read.
// Quarantined, rejected, excluded and opaque entries are never opened.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {sha256} from './ids.js';
import {formatOf} from './passages.js';

export const MAX_PROJECT_SOURCE_BYTES=60000;
// The Site's registered-repository acquisition accepts these documentation paths (knowledge-service.js).
export const SITE_PATH=/^[\w./ -]{1,350}$/;
export const SITE_FORMATS=/\.(md|mdx|markdown|txt|adoc|asciidoc|rst)$/i;
const HEX64=/^[a-f0-9]{64}$/;

export async function loadConfig(file){
 // ${VAR} expands from the environment so secrets can live outside the repository (e.g. LOCALAPPDATA).
 const expand=p=>typeof p==='string'?p.replace(/\$\{([A-Z0-9_]+)\}/g,(_,k)=>{if(!process.env[k])throw Error('Configuration refers to unset '+k+'.');return process.env[k];}):p;
 const raw=JSON.parse(await readFile(file,'utf8')),base=path.dirname(path.resolve(file)),at=p=>p&&path.resolve(base,expand(p));
 const config={snapshotRoot:at(raw.snapshotRoot),manifestIndex:at(raw.manifestIndex),catalogue:at(raw.catalogue),catalogueSums:at(raw.catalogueSums),store:at(raw.store),secrets:at(raw.secrets),port:Number(raw.port)||4180};
 for(const k of ['snapshotRoot','manifestIndex','catalogue','catalogueSums','store','secrets'])if(!config[k])throw Error('Configuration needs '+k+'.');
 // Snapshots acquired after the governed acquisition live beside the store, never inside the original
 // acquisition root; the overlay says which newer snapshot replaces a connector's pinned one.
 config.acquiredRoot=at(raw.acquiredRoot)||path.join(path.dirname(config.store),'acquired');
 config.overlay=at(raw.overlay)||path.join(path.dirname(config.store),'selection-overlay.json');
 return config;
}
export const snapshotDirOf=(config,connectorId,snapshotId,acquired=false)=>path.join(acquired?config.acquiredRoot:config.snapshotRoot,'snapshots',connectorId,snapshotId);

// Connector registry from the AKR catalogue, trusted only when its bytes match the release checksum list.
export async function loadRegistry(config){
 const bytes=await readFile(config.catalogue),hash=sha256(bytes),sums=await readFile(config.catalogueSums,'utf8');
 const listed=sums.split(/\r?\n/).map(l=>/^([a-f0-9]{64}) [ *]?(.+)$/.exec(l.trim())).find(m=>m&&path.basename(m[2])===path.basename(config.catalogue));
 if(!listed||listed[1]!==hash)throw Error('The connector catalogue does not match its release checksum list.');
 const catalogue=JSON.parse(bytes.toString('utf8')),connectors=new Map();
 for(const c of catalogue.connectors||[])connectors.set(c.id,{connectorId:c.id,name:c.name,owner:c.owner,repository:c.repository,lifecycle:c.lifecycleStatus,trustTier:c.trustTier,categories:c.categories||[],contentUses:c.contentUses||[],allowedPaths:c.allowedPaths||[],deniedPaths:c.deniedPaths||[],maxFileBytes:c.maxFileBytes||null,defaultBranch:c.defaultBranch||null,maxFilesPerRefresh:c.maxFilesPerRefresh||null,licence:{reviewStatus:c.license?.reviewStatus||'requires-review',usePolicy:c.license?.usePolicy||'metadata-only',note:c.license?.note||''}});
 return {connectors,receipt:{file:path.basename(config.catalogue),sha256:hash,checksumList:path.basename(config.catalogueSums),generatedAt:catalogue.generatedAt||null}};
}

// The pinned snapshot per connector from the acquisition index. The index's manifestPath names an
// older root; the snapshot is located explicitly under the configured snapshot root instead.
export async function loadSelection(config){
 const bytes=await readFile(config.manifestIndex),index=JSON.parse(bytes.toString('utf8'));
 if(!Array.isArray(index.manifests)||!index.manifests.length)throw Error('The manifest index lists no snapshots.');
 const seen=new Set(),snapshots=index.manifests.map(m=>{
  if(!/^GH-[A-Z0-9-]+$/.test(m.connectorId)||seen.has(m.connectorId)||!/^KSNAP-[A-Z0-9-]+-[a-f0-9]{12}$/.test(m.snapshotId)||!/^[a-f0-9]{40}$/.test(m.immutableCommit))throw Error('The manifest index has an invalid or duplicate snapshot for '+m.connectorId+'.');
  seen.add(m.connectorId);const snapshotDir=snapshotDirOf(config,m.connectorId,m.snapshotId);
  return {connectorId:m.connectorId,repository:m.repository,commit:m.immutableCommit,snapshotId:m.snapshotId,manifestChecksum:m.manifestChecksum,snapshotChecksum:m.snapshotChecksum,snapshotDir,manifestFile:path.join(snapshotDir,'manifest.json'),acquired:false};
 });
 // Newer snapshots acquired locally replace the pinned one for their connector, with their own digests.
 const overlay=await readOverlay(config);
 for(const o of overlay.snapshots){
  const i=snapshots.findIndex(s=>s.connectorId===o.connectorId);if(i<0||snapshots[i].repository!==o.repository)throw Error('The selection overlay names an unknown connector '+o.connectorId+'.');
  if(!/^KSNAP-[A-Z0-9-]+-[a-f0-9]{12}$/.test(o.snapshotId)||!/^[a-f0-9]{40}$/.test(o.immutableCommit))throw Error('The selection overlay has an invalid snapshot for '+o.connectorId+'.');
  const snapshotDir=snapshotDirOf(config,o.connectorId,o.snapshotId,true);
  snapshots[i]={connectorId:o.connectorId,repository:o.repository,commit:o.immutableCommit,snapshotId:o.snapshotId,manifestChecksum:o.manifestChecksum,snapshotChecksum:o.snapshotChecksum,snapshotDir,manifestFile:path.join(snapshotDir,'manifest.json'),acquired:true,supersedesSnapshot:o.supersedesSnapshot||null};
 }
 return {snapshots,receipt:{file:path.basename(config.manifestIndex),sha256:sha256(bytes),releaseId:index.releaseId||null,schemaVersion:index.schemaVersion||null,overlay:overlay.snapshots.length?{file:path.basename(config.overlay),sha256:overlay.sha256,snapshots:overlay.snapshots.length}:null}};
}
export async function readOverlay(config){
 let bytes;try{bytes=await readFile(config.overlay);}catch(e){if(e.code==='ENOENT')return {snapshots:[],sha256:null};throw e;}
 const o=JSON.parse(bytes.toString('utf8'));if(o.schema!=='aiw-selection-overlay-v1'||!Array.isArray(o.snapshots))throw Error('The selection overlay is not aiw-selection-overlay-v1.');
 return {snapshots:o.snapshots,sha256:sha256(bytes)};
}

export const bareHash=v=>String(v||'').replace(/^sha256:/,'').toLowerCase();
// Whether the Site can hold this path at all. Signed notices must use Site-valid paths, or a single
// notice would make a whole signed update invalid and stall synchronisation (repository-sync.js).
export const siteAddressable=p=>SITE_PATH.test(p)&&!p.startsWith('/')&&!p.split('/').some(s=>!s||s==='.'||s==='..');

// Exact accepted bytes from the content-addressed store, verified against the manifest hash.
export async function readAccepted(snapshotDir,entry){
 if(entry.status!=='accepted')throw Error('Only accepted files are read.');
 const expected=bareHash(entry.contentSha256),rel=String(entry.contentAddressedObject||'');
 if(!HEX64.test(expected)||!/^objects\/sha256\/[a-f0-9]{2}\/[a-f0-9]{64}$/.test(rel)||rel.slice(-64)!==expected||rel.slice(15,17)!==expected.slice(0,2))throw Error('The manifest object location is not a content address.');
 const file=path.join(snapshotDir,...rel.split('/'));
 if(!file.startsWith(path.join(snapshotDir,'objects')+path.sep))throw Error('The object path leaves its snapshot.');
 const bytes=await readFile(file);
 if(sha256(bytes)!==expected)throw Error('The stored bytes differ from the manifest hash.');
 return bytes;
}
// Strict UTF-8 that keeps a byte-order mark, so the Site's sha256(body) equals the file hash.
export function decodeText(bytes){
 let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{return {ok:false,reason:'not-utf8'};}
 if(text.includes('\u0000'))return {ok:false,reason:'binary'};
 return {ok:true,text};
}

export function usePolicyOf(connector,licenceEvidence){return licenceEvidence?.dossierUsePolicy||connector?.licence?.usePolicy||'metadata-only';}
export const contentPermitted=usePolicy=>usePolicy!=='metadata-only';

// Whether a revision may be retrieved into a project source through the Site's existing command.
export function retrievalDecision({connector,usePolicy,path:filePath,bytes,textOk=true,state='current'}){
 if(state!=='current')return {retrievable:false,reason:'revision-not-current'};
 if(!connector||connector.lifecycle!=='approved')return {retrievable:false,reason:'connector-not-approved'};
 if(!contentPermitted(usePolicy))return {retrievable:false,reason:'licence-metadata-only'};
 if(!SITE_FORMATS.test(filePath)||!formatOf(filePath))return {retrievable:false,reason:'format-not-supported'};
 if(!SITE_PATH.test(filePath)||filePath.startsWith('/')||filePath.split('/').some(s=>!s||s==='.'||s==='..'))return {retrievable:false,reason:'path-not-supported'};
 if(bytes>MAX_PROJECT_SOURCE_BYTES)return {retrievable:false,reason:'too-large-for-project-source'};
 if(!textOk)return {retrievable:false,reason:'not-text'};
 return {retrievable:true,reason:null};
}
export const RETRIEVAL_REASONS={
 'revision-not-current':'This revision has been superseded, withdrawn or is unavailable.',
 'connector-not-approved':'The repository is a candidate or discovery-only connector; register and approve it before retrieval.',
 'licence-metadata-only':'The licence dossier permits metadata only; a rights decision is needed before its text is used.',
 'format-not-supported':'Only Markdown, AsciiDoc, reStructuredText and text files can become project sources.',
 'path-not-supported':'The file path has characters the project source contract does not accept.',
 'too-large-for-project-source':'The file is larger than the 60,000-byte project source limit.',
 'not-text':'The file is not valid UTF-8 text.'
};
