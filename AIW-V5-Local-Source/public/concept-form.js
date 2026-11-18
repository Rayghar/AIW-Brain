// A knowledge form (rc44, wp1): the typed reading a governed claim may carry of its own exact passage. A concept is one
// maintained identity (knowledge.concepts) whose forms are ordinary claims; this module is the bounded data contract of
// the nine form types, as architecture-knowledge-unit.js is of the structured unit. Two tiers: teaching (definition,
// mechanism, example, exercise) and decision-bearing (applicability, selection, composition, calculation, verification).
// A form holds strings with limits and short lists: no expressions, no code, nothing that is interpreted. Every list
// item, and every object a form holds, names its lines inside the claim's passage (at) and a verbatim quote found in
// those lines once whitespace is collapsed; every text the form states of itself rests on a quote of the passage that
// names it (quotes: [{field, quote}], no quote given twice). In a decision-bearing form every statement rests on its
// own quote: an entry of a sub-list is {text, quote}, the quote inside the lines of the object that holds it, and a
// number is stated only where the text's own quote holds it (the claim's statement, conditions and limitations: where
// some quote of the form does). A worked value sits only in workedValues and parameters[].example, always illustrative.
// A quote grounds an item in the passage: it rejects what the passage does not say and cannot tell whether a reading is
// right, which is the second person's review.
// A form reviews nothing and claims no result: it carries no status, decision or confirmation, and an evidence level
// is what the source says of itself. Pure: no project import, no DOM, no clock.
export const FORM_TYPES=['definition','mechanism','applicability','selection','composition','calculation','verification','example','exercise'];
export const FORM_TIER={definition:'teaching',mechanism:'teaching',applicability:'decision',selection:'decision',composition:'decision',calculation:'decision',verification:'decision',example:'teaching',exercise:'teaching'};
// A form is claimed under its own claim type and one fixed predicate, so that claims of one concept from different
// sources meet on the same subject and predicate (knowledge-governance.js flagOverlaps).
export const FORM_CLAIM_TYPE=Object.fromEntries(FORM_TYPES.map(t=>[t,t]));
export const FORM_PREDICATE={definition:'is defined as',mechanism:'works by',applicability:'applies when',selection:'is chosen over alternatives when',composition:'composes with',calculation:'is calculated by',verification:'is verified by',example:'is illustrated by',exercise:'is practised by'};
export const CONCEPT_KINDS=['style','pattern','tactic','technique','anti-pattern','component','composition','reference-architecture','deployment-topology','principle','topic'];
// A concept's scope: the placement targets of the structured unit (architecture-knowledge-unit.js).
export const CONCEPT_SCOPES=['caller','callee','interaction','data-owner','component','capability','runtime'];
// `related` is untyped navigation: it never supports a companion or a conflict reading.
export const RELATION_VERBS=['requires','requires-when','complements','alternative-to','conflicts-with','constrains','specialises','realises','validated-by','remediates','distinguished-from','uses','related'];
// What a source says of its own statement. A project's results (executed, observed, passed) are evidence records, never a form's.
export const EVIDENCE_LEVELS=['illustrative','proposed','reported-executed-by-source'];
export const ALIAS_SCHEMES=['akr','playbook','aiw-method','handbook','lens','external'];
// A concept id: capitals and digits in two to eight hyphenated parts. A prefix and a number (REQ-001, IF-001, ADR-001,
// KC-0001) is how design records and knowledge records are numbered, and is never a concept's id (RECORD_REFERENCE).
export const RECORD_REFERENCE=/^[A-Z][A-Z0-9]*-\d+$/;
export const CONCEPT_ID=/^(?![A-Z][A-Z0-9]*-\d+$)[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){1,7}$/;
const INVARIANT_KINDS=['identity','authority','time','ordering','publication','lifecycle','other'];
const RECORD_KINDS=['responsibility','component','contract','data','capability','realization','plan','control','party'];
const STAGES=['problem','consequence','inspect','decide','run','evidence','revise','assess'];
const RESERVED=['reviewed','confirmed','targetConfirmed','assumptionsResolved','acknowledge','sourceChecked','rightsChecked','conditionsChecked','status','decision'];
// Field kinds: T a text the form states (it rests on a quote), N a name or label, ID an identifier or a reference to one
// (the only text the number rule does not read, so it holds an identifier and never a sentence), E one of a closed
// list, S a short list of texts. An identifier is letters, digits and hyphens only (ruling G1 of 2026-11-18): no point
// and no comma, so it states no decimal number. An alias id is an identifier too; a method alias is <topic>/<option>,
// hence the slash.
const IDENTIFIER=/^[A-Za-z0-9][A-Za-z0-9-]*$/,ALIAS_ID=/^[A-Za-z0-9][A-Za-z0-9\/-]*$/;
const own=(o,k)=>Object.hasOwn(o,k);
const T=(max,opt=false)=>({k:'text',max,opt}),N=(max,opt=false)=>({k:'text',max,opt,label:true}),ID=(max,opt=false)=>({k:'text',max,opt,label:true,id:true}),E=(values,opt=false)=>({k:'enum',values,opt}),S=(n,max)=>({k:'strings',n,max,opt:true});
const INT={k:'int'},BOOL={k:'bool'},TARGET={k:'target'},LEVEL={k:'level',opt:true},ILLUSTRATIVE={k:'illustrative'},VALUE={k:'value'},WORKED={k:'worked',opt:true};
const SHAPES={
 definition:{scalars:{short:T(400),explanation:T(4000,true)},lists:{distinctions:[8,{from:N(240),difference:T(800)}],vocabulary:[12,{term:N(120),meaning:T(800)}]}},
 mechanism:{scalars:{narrative:T(4000,true)},lists:{steps:[16,{n:INT,text:T(800)}],effects:[12,{quality:N(120),direction:E(['supports','tradeoff','unknown']),mechanism:T(1200),observableMeasure:T(400,true),potentialCost:T(400,true)}]},objects:{diagram:{notation:N(60),source:T(4000),origin:E(['source-figure'])}},verbatim:{diagram:'source'}},
 applicability:{lists:{useWhen:[12,{text:T(800)}],avoidWhen:[12,{text:T(800)}],prerequisites:[12,{text:T(800)}]},objects:{guaranteeBoundary:{boundedClaim:T(800),dependsOn:S(8,400),doesNotEstablish:S(8,400)}}},
 selection:{lists:{alternatives:[12,{target:TARGET,chooseWhen:T(800),cost:T(800)}],rules:[12,{condition:T(800),candidate:T(400),contraindication:T(800),evidenceNeeded:T(800)}],variants:[12,{name:N(160),chooseWhen:T(800),tradeoff:T(800)}]}},
 composition:{lists:{roles:[16,{id:ID(60),name:N(160),responsibility:T(800),recordKind:E(RECORD_KINDS),required:BOOL,sameAs:ID(120,true)}],relations:[24,{verb:E(RELATION_VERBS),target:TARGET,when:T(400,true),reason:T(800)}],invariants:[12,{kind:E(INVARIANT_KINDS),statement:T(800)}],parameters:[24,{name:N(120),type:N(40),unit:N(40,true),meaning:T(800),selectionBasis:T(800),wrongChoice:T(800,true),required:BOOL,example:WORKED}],ports:[16,{name:N(160),direction:N(40),contract:T(800)}],sequence:[24,{step:INT,ownerRole:ID(120),text:T(800),exitEvidence:T(400,true),onFailure:T(400,true)}]}},
 calculation:{scalars:{modelKind:ID(60),purpose:T(800),relation:T(1200),bounds:T(800,true)},lists:{inputs:[16,{name:N(120),unit:N(40),meaning:T(800)}],outputs:[8,{text:T(400)}],notConsidered:[12,{text:T(400)}],workedValues:[16,{name:N(120),value:VALUE,unit:N(40),evidenceLevel:ILLUSTRATIVE}]}},
 verification:{lists:{scenarios:[16,{id:ID(80),given:T(800),when:T(800),then:T(800),evidenceRequired:T(800),evidenceLevel:LEVEL}],failureModes:[16,{failure:T(800),behaviour:T(800,true),signal:T(400,true),response:T(800),evidence:T(800,true)}],signals:[12,{name:N(120),unit:N(40),interpretation:T(800)}]},objects:{metric:{name:N(120),unit:N(40),boundary:T(400,true),population:T(400,true),aggregation:T(400,true),window:T(400,true),thresholdBasis:T(400,true),coverage:T(400,true),missingData:T(400,true),ownerAction:T(400,true)},technique:{purpose:T(800),inputs:S(12,400),steps:S(16,800),outputs:S(12,400),evidenceProduced:T(800)}}},
 example:{scalars:{title:N(160),scenario:T(1200,true),expectedOutcome:T(600),evidenceLevel:LEVEL,numbersAre:E(['teaching-assumptions'])},lists:{steps:[16,{text:T(800)}]}},
 exercise:{lists:{items:[9,{level:E(['beginner','intermediate','advanced']),prompt:T(1200),stage:E(STAGES,true)}]}}
};
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const collapse=v=>String(v).replace(/\s+/g,' ').trim();
// The numbers a text states: every run of decimal digits, in any script, with the points and commas inside it (ruling
// G1 of 2026-11-18). The text is normalised first (NFKC), so a full-width, superscript, circled or mathematical digit
// reads as the digit it stands for; a digit of another script (Arabic-Indic, Devanagari, Thai and the rest) is read as
// it is written. A text and its quote are read the same way.
const numbers=v=>String(v).normalize('NFKC').match(/\p{Nd}+(?:[.,]\p{Nd}+)*/gu)||[];
// A verbatim quote is measured as it is matched: with whitespace collapsed. 12 to `max` characters, at least eight of
// them letters or digits, so that neither padding nor a run of punctuation passes for the passage's words.
const quoteText=(v,max=240)=>{if(typeof v!=='string')return false;const q=collapse(v);return q.length>=12&&q.length<=max&&(q.match(/[\p{L}\p{N}]/gu)||[]).length>=8;};
// Whether the quote occurs in lines at[0]..at[1] of the source (the passage starts at lineStart), whitespace collapsed.
export function quoteFound(excerpt,lineStart,at,quote){
 const q=collapse(quote);return !!q&&collapse(String(excerpt).split('\n').slice(at[0]-lineStart,at[1]-lineStart+1).join(' ')).includes(q);
}
const QUOTE_RULE='a quote is measured with its whitespace collapsed and holds at least eight letters or digits';
// One field of an item or of the form. `basis` holds the numbers a decision-bearing text may state (null: free).
// `ground`, in a decision-bearing form, is where an entry of a sub-list finds its own quote: {excerpt, lineStart, at}.
function field(path,key,spec,v,basis,basisWords,out,ground=null){
 const at=key[0]==='['?path+key:path+'.'+key;
 if(v===undefined){if(!spec.opt)out.push(spec.k==='illustrative'?path+': a worked value is illustrative (evidenceLevel "illustrative").':at+' is required.');return;}
 if(spec.k==='text'){
  if(typeof v!=='string'||!v.trim()){out.push(at+(typeof v==='string'?' is required.':' is a text.'));return;}
  if(v.trim().length>spec.max)out.push(at+' holds '+v.trim().length+' characters; at most '+spec.max+'.');
  if(spec.id){if(!IDENTIFIER.test(v.trim()))out.push(at+' is an identifier (letters, digits and hyphens only).');}
  else if(basis)for(const n of numbers(v))if(!basis.has(n)){out.push(at+' states the number '+n+', which '+basisWords+'.');break;}
 }else if(spec.k==='enum'){if(!spec.values.includes(v))out.push(at+': choose one of '+spec.values.join(', ')+'.');}
 else if(spec.k==='int'){if(!Number.isInteger(v)||v<1||v>999)out.push(at+' is a whole number (1 or more).');}
 else if(spec.k==='bool'){if(typeof v!=='boolean')out.push(at+' is true or false.');}
 else if(spec.k==='level'){if(!EVIDENCE_LEVELS.includes(v))out.push(at+': "'+String(v).slice(0,60)+'" is not a level a source states of itself ('+EVIDENCE_LEVELS.join(', ')+'). A result is recorded as evidence, never in a form.');}
 else if(spec.k==='illustrative'){if(v!=='illustrative')out.push(path+': a worked value is illustrative (evidenceLevel "illustrative").');}
 else if(spec.k==='value'){if(!(typeof v==='number'&&Number.isFinite(v))&&!(typeof v==='string'&&v.trim()&&v.trim().length<=120))out.push(at+' is a number or a short text.');}
 else if(spec.k==='worked'){
  if(!object(v)){out.push(at+' is an object.');return;}
  for(const k of Object.keys(v))if(!['value','evidenceLevel'].includes(k)&&!RESERVED.includes(k))out.push(at+' has an unsupported field: '+k+'.');
  field(at,'value',VALUE,v.value,null,'',out);if(v.evidenceLevel!=='illustrative')out.push(at+': a worked value is illustrative (evidenceLevel "illustrative").');
 }else if(spec.k==='strings'){
  // A sub-list of an object. In a teaching form its entries are texts and rest on the object's one quote. In a
  // decision-bearing form each entry is a statement of its own (ruling B6 of 2026-11-18): {text, quote}, the quote found
  // in the lines of the object that holds it, and the text states a number only where that quote does.
  if(!Array.isArray(v)||v.length>spec.n){out.push(at+' is a list of at most '+spec.n+(ground?' entries, each a text with its own verbatim quote ({text, quote}).':' texts.'));return;}
  v.forEach((x,i)=>{
   if(!ground){field(at,'['+i+']',T(spec.max),x,basis,basisWords,out);return;}
   const p=at+'['+i+']';
   if(!object(x)){out.push(p+' is a text with its own verbatim quote: {text, quote}.');return;}
   for(const k of Object.keys(x))if(k!=='text'&&k!=='quote'&&!RESERVED.includes(k))out.push(p+' has an unsupported field: '+k+'.');
   const quoted=quoteText(x.quote);
   if(!quoted)out.push(p+' has no verbatim quote (12 to 240 characters) of its lines: '+QUOTE_RULE+'.');
   else if(ground.at&&!quoteFound(ground.excerpt,ground.lineStart,ground.at,x.quote))out.push(p+': the quote is not found in lines '+ground.at[0]+'–'+ground.at[1]+'.');
   field(p,'text',T(spec.max),x.text,new Set(numbers(quoted?x.quote:'')),'its quote does not contain',out);
  });
 }else if(spec.k==='target'){
  const keys=object(v)?Object.keys(v):[],ok=keys.length===1&&(keys[0]==='conceptId'?typeof v.conceptId==='string'&&v.conceptId.length<=80&&CONCEPT_ID.test(v.conceptId):keys[0]==='label'?typeof v.label==='string'&&!!v.label.trim()&&v.label.trim().length<=160:keys[0]==='alias'&&object(v.alias)&&Object.keys(v.alias).length===2&&ALIAS_SCHEMES.includes(v.alias.scheme)&&typeof v.alias.aliasId==='string'&&v.alias.aliasId.length<=120&&ALIAS_ID.test(v.alias.aliasId));
  if(!ok)out.push(at+' names a concept id, an alias (scheme and id) or a label.');
  // A label is a text the form states: in a decision-bearing form it holds a number only where the item's quote does.
  else if(basis&&keys[0]==='label')for(const n of numbers(v.label))if(!basis.has(n)){out.push(at+'.label states the number '+n+', which '+basisWords+'.');break;}
 }
}
// A form records what its passage says: a key that claims a review, a state or a decision is refused by name, at any depth
// a form has. The deepest thing a form holds is an alias inside a target inside an item of a list (four levels), so a
// value nested below the sixth is refused here and never walked: a form is read again on every read.
function reserved(v,path,out,depth=0){
 if(!Array.isArray(v)&&!object(v))return;
 if(depth>6){out.push(path+' is nested more deeply than a form holds.');return;}
 if(Array.isArray(v)){v.forEach((x,i)=>reserved(x,path+'['+i+']',out,depth+1));return;}
 for(const [k,x] of Object.entries(v)){
  if(RESERVED.includes(k)||k==='effect'&&x==='not-applicable')out.push(path+' must not carry "'+k+'": a form records what its passage says and reviews nothing.');
  else reserved(x,path+'.'+k,out,depth+1);
 }
}
// An item of a list, or an object the form holds: its fields, its lines inside the passage and its verbatim quote.
function item(path,fields,v,{excerpt,lineStart,lines,decision,verbatim=null},out){
 if(!object(v)){out.push(path+' is an object.');return;}
 for(const k of Object.keys(v))if(!own(fields,k)&&k!=='at'&&k!=='quote'&&!RESERVED.includes(k))out.push(path+' has an unsupported field: '+k+'.');
 if(verbatim&&v.quote!==undefined)out.push(path+' has an unsupported field: quote.');
 const at=v.at,range=Array.isArray(at)&&at.length===2&&at.every(Number.isInteger)&&at[0]>=1&&at[1]>=at[0],quote=verbatim?v[verbatim]:v.quote;
 let grounded=false;
 if(!range)out.push(path+' names no lines of the passage (at: [first line, last line]).');
 else if(at[0]<lineStart||at[1]>lineStart+lines-1)out.push(path+' cites lines '+at[0]+'–'+at[1]+', outside the passage (lines '+lineStart+'–'+(lineStart+lines-1)+').');
 else grounded=true;
 if(!verbatim&&!quoteText(quote))out.push(path+' has no verbatim quote (12 to 240 characters) of its lines: '+QUOTE_RULE+'.');
 else if(verbatim&&typeof quote==='string'&&quote.trim()&&!quoteText(quote,fields[verbatim].max))out.push(path+': the diagram source is the passage\'s own text (at least 12 characters once whitespace is collapsed, eight of them letters or digits).');
 else if(grounded&&typeof quote==='string'&&quote.trim()&&!quoteFound(excerpt,lineStart,at,quote))out.push(path+': the '+(verbatim?'diagram source':'quote')+' is not found in lines '+at[0]+'–'+at[1]+'.');
 const basis=decision?new Set(numbers(typeof quote==='string'?quote:'')):null,ground=decision?{excerpt,lineStart,at:grounded?at:null}:null;
 for(const [k,spec] of Object.entries(fields))field(path,k,spec,v[k],basis,'its quote does not contain',out,ground);
}
// Every verbatim quote a form holds, at any depth it has: its items', its sub-list entries' and its quotes entries'.
function everyQuote(v,out=[],depth=0){
 if(depth>6)return out;
 if(Array.isArray(v))for(const x of v)everyQuote(x,out,depth+1);
 else if(object(v))for(const [k,x] of Object.entries(v)){if(k==='quote'){if(typeof x==='string')out.push(x);}else everyQuote(x,out,depth+1);}
 return out;
}
// Every issue of a form read against its passage: {excerpt (the claim's lines of the source), lineStart (its first line),
// claim (optional: the claim's own statement, conditions and limitations, which the number rule reads too)}.
export function conceptFormIssues(form,{excerpt,lineStart,claim=null}={}){
 if(!object(form))return ['A form is an object.'];
 const type=form.type,shape=typeof type==='string'&&own(SHAPES,type)?SHAPES[type]:null;if(!shape)return ['Choose a supported form type ('+FORM_TYPES.join(', ')+').'];
 if(typeof excerpt!=='string'||!excerpt.trim()||!Number.isInteger(lineStart)||lineStart<1)return ['A form is read against its passage: the lines of the source its claim cites.'];
 const out=[],scalars=shape.scalars||{},lists=shape.lists||{},objects=shape.objects||{},decision=FORM_TIER[type]==='decision',ctx={excerpt,lineStart,lines:excerpt.split('\n').length,decision};
 reserved(form,type,out);
 if(form.v!==1)out.push(type+': version 1 is the only form version (v: 1).');
 for(const k of Object.keys(form))if(!['type','v','quotes'].includes(k)&&!own(scalars,k)&&!own(lists,k)&&!own(objects,k)&&!RESERVED.includes(k))out.push(type+' has an unsupported field: '+k+'.');
 // The texts the form states of itself each rest on a quote of the passage that names them ({field, quote}); no quote
 // is given twice, so one sentence of the passage never passes for the ground of several texts.
 const stated=Object.keys(scalars).filter(k=>scalars[k].k==='text'&&!scalars[k].label&&form[k]!==undefined),quotes=form.quotes,given=Object.fromEntries(stated.map(k=>[k,[]]));
 if(quotes!==undefined&&(!Array.isArray(quotes)||quotes.length>8))out.push(type+'.quotes is a list of at most 8 entries, each naming a text of the form and its verbatim quote ({field, quote}).');
 else{
  const seen=new Map();
  (quotes||[]).forEach((q,i)=>{
   const p=type+'.quotes['+i+']';
   if(!object(q)){out.push(p+' names the text it grounds and gives its verbatim quote: {field, quote}.');return;}
   for(const k of Object.keys(q))if(k!=='field'&&k!=='quote'&&!RESERVED.includes(k))out.push(p+' has an unsupported field: '+k+'.');
   const named=typeof q.field==='string'&&stated.includes(q.field);
   if(!named)out.push(p+' names no text this form states (field: '+(stated.join(', ')||'none')+').');
   if(!quoteText(q.quote)){out.push(p+' is a verbatim quote of 12 to 240 characters (whitespace collapsed, at least eight letters or digits).');return;}
   if(!collapse(excerpt).includes(collapse(q.quote))){out.push(p+' is not found in the passage.');return;}
   const key=collapse(q.quote);
   if(seen.has(key)){out.push(p+' repeats quotes['+seen.get(key)+']: each text rests on a quote of its own.');return;}
   seen.set(key,i);if(named)given[q.field].push(q.quote);
  });
  const missing=stated.filter(k=>!given[k].length);
  if(missing.length)out.push(type+' needs a verbatim quote of the passage for each of its texts ('+stated.join(', ')+'): none grounds '+missing.join(', ')+'.');
 }
 // In a decision-bearing form each of those texts states a number only where a quote given for it holds the number.
 for(const [k,spec] of Object.entries(scalars))field(type,k,spec,form[k],decision?new Set((given[k]||[]).flatMap(numbers)):null,'no quote given for '+k+' contains',out);
 let held=0;
 for(const [k,[max,fields]] of Object.entries(lists)){
  const v=form[k];if(v===undefined)continue;
  if(!Array.isArray(v)){out.push(type+'.'+k+' is a list.');continue;}
  if(v.length>max){out.push(type+'.'+k+' holds '+v.length+' items; at most '+max+'.');continue;}
  held+=v.length;v.forEach((x,i)=>item(type+'.'+k+'['+i+']',fields,x,ctx,out));
 }
 for(const [k,fields] of Object.entries(objects)){if(form[k]===undefined)continue;held++;item(type+'.'+k,fields,form[k],{...ctx,verbatim:shape.verbatim?.[k]||null},out);}
 if(!held&&!Object.values(scalars).some(s=>s.k==='text'&&!s.opt&&!s.label)&&!stated.length)out.push(type+' holds no content.');
 // The claim's own statement, conditions and limitations are what a reader meets first: in a decision-bearing form
 // they state a number only where some quote of the form holds it.
 if(decision&&object(claim)){
  const pool=new Set(everyQuote(form).flatMap(numbers)),texts=v=>Array.isArray(v)?v:typeof v==='string'?v.split('\n'):[];
  for(const [name,list] of [['statement',[claim.statement]],['conditions',texts(claim.conditions)],['limitations',texts(claim.limitations)]])list.forEach((t,i)=>{for(const n of numbers(typeof t==='string'?t:''))if(!pool.has(n)){out.push('The claim\'s '+name+(name==='statement'?'':'['+i+']')+' states the number '+n+', which no quote of the form contains.');break;}});
 }
 return out;
}
const tidy=v=>typeof v==='string'?v.trim():Array.isArray(v)?v.map(tidy):object(v)?Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).map(([k,x])=>[k,tidy(x)])):v;
// The form as it is stored: the checked shape, texts trimmed. Throws every issue when there is one.
export function conceptFormRecord(form,ctx){
 const issues=conceptFormIssues(form,ctx);if(issues.length)throw Error(issues.join(' '));
 return tidy(form);
}
