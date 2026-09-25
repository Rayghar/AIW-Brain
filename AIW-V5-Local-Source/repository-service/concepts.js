// Lexical concept cues against the descriptive AKR catalogue, using the same alias normalisation as
// the Site's passage finder (knowledge-ingestion.js). A cue says a name occurs; it is not a claim that
// the pattern applies, is recommended or is correctly described.
import {BRAIN_CATALOGUE} from '../public/brain-catalogue.js';
import {conceptId} from './ids.js';

const words=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
export function conceptLexicon(records=BRAIN_CATALOGUE.records){
 const byFirst=new Map(),concepts=[];
 for(const r of records){
  const id=conceptId(r.id);concepts.push({conceptId:id,catalogueId:r.id,name:r.name,recordType:r.recordType});
  for(const alias of new Set([r.name,...(r.aliases||[])].map(a=>words(a).join(' ')))){
   if(alias.length<5)continue;const tokens=alias.split(' ');
   if(!byFirst.has(tokens[0]))byFirst.set(tokens[0],[]);
   byFirst.get(tokens[0]).push({tokens,score:alias.length+tokens.length*3,conceptId:id,catalogueId:r.id});
  }
 }
 return {byFirst,concepts};
}
// Top cues for one passage (its path, heading and text), best first.
export function conceptCues(lexicon,text,limit=5){
 const t=words(text),best=new Map();
 for(let i=0;i<t.length;i++)for(const a of lexicon.byFirst.get(t[i])||[]){
  if(i+a.tokens.length>t.length)continue;let ok=true;for(let j=1;j<a.tokens.length;j++)if(t[i+j]!==a.tokens[j]){ok=false;break;}
  if(ok&&(best.get(a.conceptId)?.score||0)<a.score)best.set(a.conceptId,a);
 }
 return [...best.values()].sort((a,b)=>b.score-a.score||a.catalogueId.localeCompare(b.catalogueId)).slice(0,limit).map(a=>({conceptId:a.conceptId,catalogueId:a.catalogueId}));
}
