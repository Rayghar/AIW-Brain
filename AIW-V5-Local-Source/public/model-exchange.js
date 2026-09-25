import {architectureModel,architectureView,normalizeExploration,CONCERNS,OBJECT_TYPES,MODEL_SCHEMA} from './architecture-model.js';
import {digest,sha256} from './brain-integrity.js';

export const PACKAGE_SCHEMA='aiw.model-package/1';
const copy=v=>structuredClone(v),plain=o=>{const {record,visual,...data}=o;return data;};
const identity=(p,id)=>`${p.modelIdentity||p.workspace?.recovery?.originProjectId||p.id}::${id.startsWith('object:system:')?'object:system':id}`;
const sort=a=>a.slice().sort((x,y)=>x.id.localeCompare(y.id));
export function semanticDocument(p){const m=architectureModel(p);return {schema:MODEL_SCHEMA,projectId:p.id,objects:sort([...m.objects.values()].map(plain)),relationships:sort(m.relationships),issues:m.issues};}
export async function nativePackage(input,exploration={}){
 const p=copy(input),model=architectureModel(p);p.modelIdentity=p.modelIdentity||p.workspace?.recovery?.originProjectId||p.id;
 // Legacy reference context becomes explicit portable context, without replacing domain records.
 p.modelContext={objects:[...model.objects.values()].filter(o=>o.source.startsWith('model.context.')).map(plain),relationships:model.relationships.filter(e=>e.source==='model.context')};
 const body={schema:PACKAGE_SCHEMA,createdAt:new Date().toISOString(),project:p,semantic:semanticDocument(p),exploration:normalizeExploration(exploration,architectureModel(exploration.baselineId?p.finalReview?.baselines?.find(b=>b.id===exploration.baselineId)?.source||p:p)),authority:'Imported assertions retain their original status and history; authenticated permissions and live approvals are not transferred.',limits:['Original uploaded binaries and server configuration are outside this model package. Use the recovery package for original files.','Third-party mappings and layout are projections, not a replacement for the native model.']};
 return {...body,checksum:sha256(JSON.stringify(body))};
}
export async function validateNativePackage(pack){
 if(pack?.schema!==PACKAGE_SCHEMA)throw Error('Unsupported model package version.');
 const {checksum,...body}=pack;if(checksum!==sha256(JSON.stringify(body)))throw Error('The model package checksum does not match.');
 const p=pack.project;if(!p||typeof p.id!=='string'||!Array.isArray(p.artefacts)||!Array.isArray(p.relationships))throw Error('The complete project source is missing.');
 const projected=semanticDocument(p);if(projected.objects.length>100000)throw Error('This package exceeds the 100,000 object import boundary.');
 if(new Set(pack.semantic?.objects?.map(o=>o.id)).size!==pack.semantic?.objects?.length||new Set(pack.semantic?.relationships?.map(e=>e.id)).size!==pack.semantic?.relationships?.length)throw Error('Duplicate semantic identities in the package.');
 if(digest(projected)!==digest(pack.semantic))throw Error('The semantic records do not agree with the project source.');
 if(projected.issues.length)throw Error('Resolve duplicate identities and missing relationship endpoints before importing this package.');
 const model=architectureModel(p);for(const view of p.workbench?.views||[]){const source=view.exploration?.baselineId?p.finalReview?.baselines?.find(b=>b.id===view.exploration.baselineId)?.source:p;if(view.exploration&&!source)throw Error('A saved perspective refers to a missing baseline.');}
 return {project:copy(p),objects:model.objects.size,relationships:model.relationships.length,views:p.workbench?.views?.length||0,checksum};
}
export function portableView(p,state={}){const m=architectureModel(p),normalized=normalizeExploration(state,m),v=architectureView(m,normalized);return {model:m,state:normalized,view:v};}
export function exchangeMappingTemplate(p){
 const m=architectureModel(p),types=[...new Set([...m.objects.values()].map(o=>o.type))].sort(),pairs=[...new Set(m.relationships.map(e=>[e.type,m.objects.get(e.from).type,m.objects.get(e.to).type].join('|')))].sort();
 return {schema:'aiw.orbus-mapping/1',target:{name:'Your OrbusInfinity metamodel',modelId:'',identityAttributeId:''},objectTypes:Object.fromEntries(types.map(t=>[t,{objectTypeId:'',attributes:{owner:'',status:'',revision:'',source:'',aiwType:'',aiwAttributes:''}}])),relationshipTypes:Object.fromEntries(pairs.map(t=>[t,{relationshipTypeId:'',typePairId:'',reverse:false}])),instructions:'Fill the exact identifiers from your tenant. The identifying attribute stores the stable AIW ExternalId. Lead/Member direction must match the selected type pair. Validate a first import and repeated update in the target tenant before production use.'};
}
export function orbusExchange(p,mapping=exchangeMappingTemplate(p),previous=null){
 if(mapping.schema!=='aiw.orbus-mapping/1')throw Error('Choose an AIW Orbus mapping configuration.');
 const m=architectureModel(p),objects=[],relationships=[],omissions=[],warnings=[],target=mapping.target||{};
 if(!target.modelId)warnings.push('A target Model ID is required.');if(!target.identityAttributeId)warnings.push('A target identifying attribute ID is required for stable updates.');
 for(const o of m.objects.values()){
  const config=mapping.objectTypes?.[o.type];if(!config?.objectTypeId){omissions.push({kind:'object',id:o.id,type:o.type,reason:'Object type is not mapped to the target metamodel.'});continue;}
  const ExternalId=identity(p,'object:'+o.id),Attributes={};if(target.identityAttributeId)Attributes[target.identityAttributeId]=ExternalId;
  const values={owner:o.owner,status:o.status,revision:o.revision,source:o.source,aiwType:o.type,aiwAttributes:JSON.stringify(o.attributes)};
  for(const [key,attrId] of Object.entries(config.attributes||{}))if(attrId&&Object.hasOwn(values,key))Attributes[attrId]=values[key];
  objects.push({ExternalId,ObjectTypeId:config.objectTypeId,ModelId:target.modelId||'',Name:o.title,Description:o.description,Attributes,sourceId:o.id,sourceType:o.type});
  for(const key of Object.keys(values))if(values[key]&&!config.attributes?.[key])omissions.push({kind:'attribute',id:o.id,attribute:key,reason:'Retained in native package; no target attribute mapping.'});
 }
 const mapped=new Set(objects.map(o=>o.sourceId));
 for(const e of m.relationships){
  const key=[e.type,m.objects.get(e.from).type,m.objects.get(e.to).type].join('|'),config=mapping.relationshipTypes?.[key];
  if(!config?.relationshipTypeId||!config?.typePairId||!mapped.has(e.from)||!mapped.has(e.to)){omissions.push({kind:'relationship',id:e.id,type:e.type,reason:'Type pair or endpoint is not mapped.'});continue;}
  relationships.push({ExternalId:identity(p,'relationship:'+e.id),RelationshipTypeId:config.relationshipTypeId,TypePairId:config.typePairId,LeadExternalId:identity(p,'object:'+(config.reverse?e.to:e.from)),MemberExternalId:identity(p,'object:'+(config.reverse?e.from:e.to)),Name:e.label,sourceId:e.id,sourceType:e.type,derived:e.derived,AttributesJSON:JSON.stringify(e.attributes)});
 }
 const records=[...objects.map(o=>({id:o.ExternalId,kind:'object',hash:digest(o)})),...relationships.map(r=>({id:r.ExternalId,kind:'relationship',hash:digest(r)}))];
 if(previous&&(previous.schema!=='aiw.orbus-manifest/1'||previous.namespace!==(p.modelIdentity||p.workspace?.recovery?.originProjectId||p.id)))throw Error('The update manifest belongs to a different model namespace.');
 if(previous&&previous.mappingHash!==digest(mapping))warnings.push('The target mapping changed; revalidate object types, identifiers and relationship directions before import.');
 const old=new Map((previous?.records||[]).map(r=>[r.id,r.hash]));
 const changes={create:records.filter(r=>!old.has(r.id)).map(r=>r.id),update:records.filter(r=>old.has(r.id)&&old.get(r.id)!==r.hash).map(r=>r.id),unchanged:records.filter(r=>old.get(r.id)===r.hash).map(r=>r.id),absentFromPackage:[...old.keys()].filter(id=>!records.some(r=>r.id===id))};
 return {schema:'aiw.orbus-exchange/1',project:p.name,target,objects,relationships,omissions,warnings,readyForTenantTrial:!warnings.length&&!omissions.some(o=>o.kind!=='attribute'),verifiedInTenant:false,changes,manifest:{schema:'aiw.orbus-manifest/1',namespace:p.modelIdentity||p.workspace?.recovery?.originProjectId||p.id,mappingHash:digest(mapping),records},instructions:['Upsert objects by the mapped identifying attribute, and resolve ExternalIds to target Object IDs before creating relationships.','Use the exact target TypePair and relationship direction. No target write is performed by this export.','Absence from a package never authorizes target deletion.','Semantic attributes without a target mapping remain in the native companion package. Receiver-side import/update validation is outstanding.']};
}
export const csvCell=value=>{let s=typeof value==='object'?JSON.stringify(value):String(value??'');if(/^[\s]*[=+@-]/.test(s)||/^[\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
export const csv=(rows,columns)=>[columns.map(csvCell).join(','),...rows.map(r=>columns.map(k=>csvCell(r[k])).join(','))].join('\r\n');
// Encoding bytes as hex gives a reversible, collision-free identifier for DSL/XML syntax.
export const targetId=id=>'aiw_'+[...new TextEncoder().encode(id)].map(n=>n.toString(16).padStart(2,'0')).join('');
const xml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function archimateExchange(p){
 const m=architectureModel(p),types={module:'Grouping',requirement:'Requirement',constraint:'Constraint',responsibility:'ApplicationFunction',component:'ApplicationComponent',capability:'TechnologyService',data:'DataObject',zone:'Location'},objects=[...m.objects.values()].filter(o=>types[o.type]),ids=new Set(objects.map(o=>o.id)),rels=m.relationships.filter(e=>ids.has(e.from)&&ids.has(e.to));
 const prop=(id,value)=>`<property propertyDefinitionRef="${id}"><value xml:lang="en">${xml(value)}</value></property>`;
 const props=o=>`<properties>${prop('aiw-id',o.id)}${prop('aiw-type',o.type)}${prop('aiw-attributes',JSON.stringify(o.attributes))}</properties>`;
 const elements=objects.map(o=>`<element identifier="${targetId(o.id)}" xsi:type="${types[o.type]}"><name xml:lang="en">${xml(o.title)}</name><documentation xml:lang="en">${xml(o.description)}</documentation>${props(o)}</element>`).join('\n');
 const relationships=rels.map(e=>`<relationship identifier="${targetId(e.id)}" xsi:type="Association" source="${targetId(e.from)}" target="${targetId(e.to)}"><name xml:lang="en">${xml(e.label)}</name>${props(e)}</relationship>`).join('\n');
 const document=`<?xml version="1.0" encoding="UTF-8"?>\n<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="${targetId(m.root)}"><name xml:lang="en">${xml(p.name)}</name><documentation xml:lang="en">Bounded AIW exchange. Associations retain the AIW relationship type as a property; review semantics in the target tool.</documentation><elements>${elements}</elements><relationships>${relationships}</relationships><propertyDefinitions>${['aiw-id','aiw-type','aiw-attributes'].map(id=>`<propertyDefinition identifier="${id}" type="string"><name>${id}</name></propertyDefinition>`).join('')}</propertyDefinitions></model>`;
 return {document,report:{objects:objects.length,relationships:rels.length,omittedObjects:[...m.objects.values()].filter(o=>!ids.has(o.id)).map(o=>({id:o.id,type:o.type,reason:'Outside the conservative ArchiMate mapping.'})),omittedRelationships:m.relationships.filter(e=>!rels.includes(e)).map(e=>e.id),limits:['All exported edges are associations with ordered source/target endpoints with AIW type properties. ArchiMate relationship semantics require architect review.','AIW view interaction, baselines, evidence files and review procedures remain in the native package.','The export structure is tested against the ArchiMate 3.0 exchange XSD. Target-tool acceptance and semantic interpretation still require review.']}};
}
export function ilographExchange(p,state={}){
 const m=architectureModel(p),resources=[...m.objects.values()].filter(o=>o.type!=='view').map(o=>({id:targetId(o.id),name:o.title,subtitle:OBJECT_TYPES[o.type].label+' · '+o.ref,description:{'AIW identity':o.id,'Definition status':o.status,'Purpose':o.description,'Attributes':JSON.stringify(o.attributes)},color:o.color,...(o.type==='instance'?{style:'plural'}:{})}));
 const scopes=[{name:'Current scope',state:normalizeExploration(state,m)},...(p.workbench?.views||[]).filter(v=>v.exploration&&!v.exploration.baselineId).map(v=>({name:v.title,state:v.exploration}))];
 const perspectives=CONCERNS.map(([id,title])=>{const v=architectureView(m,{...state,concern:id});return {id:'aiw_'+id,name:title,notes:'Working AIW model · '+v.scope.title+'. Shared resources retain the same identity.',relations:v.relationships.map(e=>({from:targetId(e.from),to:targetId(e.to),label:e.label,description:e.id+' · '+e.type+' · '+JSON.stringify(e.attributes)})),walkthrough:scopes.slice(0,10).map(s=>({text:s.name,select:targetId(s.state.selectedId||s.state.scopeId||m.root)}))};});
 return {document:JSON.stringify({description:p.name+' · AIW connected perspectives',resources,perspectives},null,2),limits:['JSON syntax is valid YAML. Import into Ilograph as diagram source.','Perspective resources retain identity; AIW approvals, typed commands and frozen baseline history remain native.','Verify rendering in the target Ilograph version before relying on presentation fidelity.']};
}
export function eraserExchange(p,state={}){
 const {view}=portableView(p,state),q=v=>JSON.stringify(String(v).replace(/[\r\n]/g,' '));
 return {document:['// AIW current perspective. Native package retains attributes and relationship IDs.','direction right','colorMode outline','typeface clean',...view.objects.map(o=>`${targetId(o.id)} [label: ${q(o.title)}, color: "${o.color}"]`),...view.relationships.map(e=>`${targetId(e.from)} > ${targetId(e.to)}: ${q(e.label)}`)].join('\n'),limits:['Only the current view is exported. Geometry and interactions are regenerated by Eraser.','Stable DSL identifiers map to AIW objects; typed relationship attributes, evidence and approval history stay in the native package.','Target editor rendering is not yet independently verified.']};
}
export function exchangeFiles(p,format,state={},mapping=null,previous=null){
 if(state.baselineId){const source=p.finalReview?.baselines?.find(b=>b.id===state.baselineId)?.source;if(!source)throw Error('The selected frozen baseline is missing.');p={...source,modelIdentity:p.modelIdentity||p.workspace?.recovery?.originProjectId||p.id};}
 if(format==='orbus'){const data=orbusExchange(p,mapping||exchangeMappingTemplate(p),previous);return {report:data,files:[{name:'orbus-objects.csv',text:csv(data.objects,['ExternalId','ObjectTypeId','ModelId','Name','Description','Attributes'])},{name:'orbus-relationships.csv',text:csv(data.relationships,['ExternalId','RelationshipTypeId','TypePairId','LeadExternalId','MemberExternalId','Name','AttributesJSON'])},{name:'orbus-manifest.json',text:JSON.stringify(data.manifest,null,2)},{name:'exchange-report.json',text:JSON.stringify(data,null,2)}]};}
 const data=format==='archimate'?archimateExchange(p):format==='ilograph'?ilographExchange(p,state):format==='eraser'?eraserExchange(p,state):null;if(!data)throw Error('Choose a supported export format.');return {report:data.report||{limits:data.limits},files:[{name:format==='archimate'?'architecture.xml':format==='ilograph'?'architecture.ilograph.yaml':'architecture.eraser.txt',text:data.document},{name:'exchange-report.json',text:JSON.stringify(data.report||{limits:data.limits},null,2)}]};
}
// Store-only ZIP: no third-party runtime, no executable content, deterministic paths.
export function zipFiles(files){
 const enc=new TextEncoder(),parts=[],central=[];let offset=0;const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
 for(const f of files){if(!/^[a-zA-Z0-9_.-]+$/.test(f.name))throw Error('Unsafe export filename.');const name=enc.encode(f.name),bytes=enc.encode(f.text),sum=crc(bytes),h=new Uint8Array(30+name.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,sum,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,name.length,true);h.set(name,30);parts.push(h,bytes);const ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint32(16,sum,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=h.length+bytes.length;}
 const size=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
}
