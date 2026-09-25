import {BRAIN_CATALOGUE} from './brain-catalogue.js';
import {sha256} from './brain-integrity.js';

// A deterministic passage finder, not a claim generator. All excerpt locations
// refer to the exact source revision stored in the project.
export function candidatePassages(source){
 const lines=source.body.split('\n'),blocks=[];let heading='',start=-1,part=[],fenced=false,frontmatter=lines[0]?.trim()==='---';
 const flush=()=>{if(start<0)return;const excerpt=part.join('\n'),plain=excerpt.replace(/\[[^\]]+\]\([^)]*\)/g,'reference').replace(/[`*_#>\[\]()]/g,' ').trim();if(plain.length>=55&&plain.split(/\s+/).length>=8){
  const indicative=/\b(must|should|requires?|avoid|when|unless|if|consider|risk|trade.?off|recommended|can|cannot|may|enable|limit|depend)\b/i.test(plain);
  const lexical=/\b(architecture|pattern|service|system|component|data|security|reliab|scalab|deploy|event|latency|failure|observab|integration|design|model|cache|dependency)\w*/i.test(plain+' '+heading);
  blocks.push({lineStart:start+1,lineEnd:start+part.length,excerpt,heading,score:(indicative?3:0)+(lexical?2:0)+Math.min(plain.length,360)/180});
 }start=-1;part=[];};
 for(let i=0;i<lines.length;i++){
  const line=lines[i],trimmed=line.trim();
  if(frontmatter){if(i>0&&trimmed==='---')frontmatter=false;continue;}
  if(/^\s*(```|~~~)/.test(line)){flush();fenced=!fenced;continue;}
  if(fenced)continue;
  if(/^#{1,6}\s+/.test(trimmed)){flush();heading=trimmed.replace(/^#+\s*/, '').slice(0,180);continue;}
  if(!trimmed||/^\s*(?:<!--|\||!\[|<|[-=]{4,})/.test(line)){flush();continue;}
  if(trimmed.length>1400){flush();continue;}
  if(start<0)start=i;
  if(part.length>=4||part.join('\n').length+line.length>1400){flush();start=i;}
  part.push(line);
 }
 flush();
 return blocks.sort((a,b)=>b.score-a.score||a.lineStart-b.lineStart).slice(0,10).sort((a,b)=>a.lineStart-b.lineStart).map(({score,...b})=>({
  ...b,sourceId:source.id,sourceHash:source.hash,excerptHash:sha256(b.excerpt),
  conceptIds:suggestConcepts([source.path,b.heading,b.excerpt].join(' ')),status:'open'
 }));
}

function suggestConcepts(input){
 const text=' '+input.toLowerCase().replace(/[^a-z0-9]+/g,' ')+' ';
 const matches=[];
 for(const record of BRAIN_CATALOGUE.records){
  let score=0;
  for(const alias of [record.name,...(record.aliases||[])]){
   const normalized=String(alias).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
   if(normalized.length>=5&&text.includes(' '+normalized+' '))score=Math.max(score,normalized.length+normalized.split(' ').length*3);
  }
  if(score)matches.push({id:record.id,score});
 }
 return matches.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,3).map(x=>x.id);
}

export function passageIsCurrent(source,suggestion){
 if(!source||source.hash!==suggestion.sourceHash||sha256(source.body)!==source.hash)return false;
 const excerpt=source.body.split('\n').slice(suggestion.lineStart-1,suggestion.lineEnd).join('\n');
 return excerpt===suggestion.excerpt&&sha256(excerpt)===suggestion.excerptHash;
}
