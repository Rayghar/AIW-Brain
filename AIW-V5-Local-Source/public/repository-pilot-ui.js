import {BRAIN_CATALOGUE} from './knowledge-governance.js';
import {REPOSITORY_PILOT} from './repository-pilot.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function repositoryLocators(preview){
 if(preview)return preview.locators;
 return REPOSITORY_PILOT.sources.map(source=>{
  const registered=BRAIN_CATALOGUE.repositories.find(repo=>repo.connectorId===source.repositoryId&&repo.repository.toLowerCase()===source.repository.toLowerCase());
  const supported=!!registered&&/\.(md|mdx|markdown|txt|adoc|asciidoc|rst)$/i.test(source.path);
  return {revisionId:source.revisionId,repository:source.repository,path:source.path,licenceDisposition:source.licenceDisposition,
   status:supported?'ready-for-explicit-source-retrieval':'repository-registration-required',
   command:supported?{type:'knowledge.fetch',payload:{connectorId:source.repositoryId,path:source.path,ref:source.commit,expectedHash:source.hash}}:null};
 });
}

export function renderRepositoryPilot(state,query='',selected=new Set(),preview=null){
 const locators=repositoryLocators(preview),term=query.trim().toLowerCase(),matches=locators.filter(item=>!term||[item.repository,item.path].some(value=>String(value).toLowerCase().includes(term)));
 const cards=matches.slice(0,12).map(item=>{
  const payload=item.command?.payload,saved=payload&&state.sources.some(source=>source.connectorId===payload.connectorId&&source.path===payload.path&&source.hash===payload.expectedHash);
  return `<article class="kw-lead"><b>${esc(item.path.split('/').at(-1))}</b><small>${esc(item.repository)} · ${esc(item.path)}<br>${esc(item.licenceDisposition)} · ${item.command?'Exact commit and SHA-256 recorded':'Repository registration required'}</small>${saved?'<p class="kw-discovery-count">Original already saved in this project</p>':item.command?`<label class="kg-lead-check"><input type="checkbox" data-k-repository-lead="${esc(item.revisionId)}" ${selected.has(item.revisionId)?'checked':''}> Select for exact-source retrieval</label>`:''}${item.command&&!saved?`<button type="button" class="btn" data-k-action="repository-fetch" data-id="${esc(item.revisionId)}">Retrieve and verify</button>`:''}</article>`;
 });
 const invalidations=preview?.notices?.filter(item=>item.kind==='invalidation').length||0;
 return `<section class="kw-discovery" aria-label="Repository knowledge pilot"><span class="brain-eyebrow">Laptop repository pilot · candidate evidence</span><h4>Verified source locations</h4><p>${preview?'Read-only preview of the selected JSON packet.':'24 source identities checked against the local acquired corpus.'} The original text stays outside this index. Retrieval checks a registered repository, exact commit and file hash before saving an original for review. No packet claim becomes approved advice.</p><p class="kw-discovery-count">${matches.length} matching locators${matches.length>12?' · showing first 12':''}${invalidations?' · '+invalidations+' untrusted change notices for review':''}</p><div class="kw-discovery-list">${cards.join('')||'<p>No matching pilot locator. The wider AKR index and manual repository fetch remain below.</p>'}</div><button type="button" class="btn" data-k-action="repository-batch-fetch">Retrieve selected pilot sources (up to five)</button><details><summary>Preview a newer repository packet</summary><p>Choose the metadata-only JSON export from the laptop repository. AIW binds this read-only preview to your current project; your local file is unchanged. Original text, review decisions and releases are not imported.</p><label class="brain-field"><span>Repository packet JSON</span><input type="file" data-k-repository-packet accept=".json,application/json"></label>${preview?'<p class="kw-discovery-count">Showing the uploaded packet until you leave this project. Refreshing the page restores the bundled pilot locators.</p>':''}</details><details><summary>Pilot provenance and authority</summary><p>Source identities were measured in the handoff. Licences and architecture claims still require review. An unsigned change notice has no authority to alter project releases.</p><p class="brain-hash">Handoff SHA-256 ${esc(REPOSITORY_PILOT.handoffSha256)}</p></details></section>`;
}
