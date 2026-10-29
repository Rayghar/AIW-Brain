// A reviewed claim can carry a structured architecture interpretation. This is kept within the existing
// source -> candidate -> independent review -> signed release lifecycle, rather than becoming another
// store of architecture advice. The source passage establishes the claim; this shape makes its mechanism,
// scope, quality effects and obligations inspectable. It does not assert that a quality target was met.
import {APPLICABILITY_OPERATORS,safeFactKey} from './architecture-facts.js';
const KINDS=new Set(['style','pattern','tactic','anti-pattern-signal','product-mechanism','design-principle','quality-tradeoff']);
const DIRECTIONS=new Set(['supports','tradeoff','unknown']);
const FIELDS=new Set(['kind','mechanism','scope','effects','obligations','exclusions','applicability','placement']);
const SCOPE_FIELDS=new Set(['capability','product','version','topology','tier','operatingModel']);
const EFFECT_FIELDS=new Set(['quality','direction','rationale']);
const OBLIGATION_FIELDS=new Set(['action','evidence']);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const value=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max;
const unknown=(obj,allowed,label,out)=>{for(const key of Object.keys(obj))if(!allowed.has(key))out.push(label+' has an unsupported field: '+key+'.');};
const PREDICATE_FIELDS=new Set(['id','fact','op','value','label','question','sourceIds']);
const PLACEMENT_FIELDS=new Set(['target','role','reason','capability']);
const PLACEMENT_TARGETS=new Set(['caller','callee','interaction','data-owner','component','capability','runtime']);
const scalar=v=>typeof v==='string'&&v.length<=240||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v);

// Conditions are a bounded data contract. Facts are literal keys; expressions,
// nested object traversal and executable source content are never accepted.
export function architectureApplicabilityIssues(rule){
 const issues=[];
 if(!object(rule))return ['Applicability must be an object.'];
 unknown(rule,new Set(['id','requires','excludes']),'Applicability',issues);
 if(rule.id!==undefined&&!value(rule.id,120))issues.push('Applicability needs a non-empty identifier of up to 120 characters.');
 const ids=new Set();
 for(const kind of ['requires','excludes']){
  const rows=rule[kind];if(rows===undefined)continue;
  if(!Array.isArray(rows)||rows.length>24){issues.push('Applicability '+kind+' must contain at most 24 conditions.');continue;}
  for(const [index,p] of rows.entries()){
   const label='Applicability '+kind+' condition '+(index+1);
   if(!object(p)){issues.push(label+' must be an object.');continue;}
   unknown(p,PREDICATE_FIELDS,label,issues);
   if(!value(p.id,120)||ids.has(p.id))issues.push(label+' needs a distinct identifier.');else ids.add(p.id);
   if(!safeFactKey(p.fact))issues.push(label+' needs a safe literal fact key.');
   if(!APPLICABILITY_OPERATORS.includes(p.op))issues.push(label+' needs a supported comparison.');
   if(!value(p.label,240))issues.push(label+' needs a readable label.');
   if(p.question!==undefined&&!value(p.question,800))issues.push(label+' question must contain up to 800 characters.');
   if(p.sourceIds!==undefined&&(!Array.isArray(p.sourceIds)||p.sourceIds.length>12||p.sourceIds.some(x=>!value(x,160))))issues.push(label+' has invalid source references.');
   if(p.op==='oneOf'){if(!Array.isArray(p.value)||!p.value.length||p.value.length>24||!p.value.every(scalar))issues.push(label+' needs a bounded list of scalar values.');}
   else if(['gte','lte','gt','lt'].includes(p.op)){if(typeof p.value!=='number'||!Number.isFinite(p.value))issues.push(label+' needs a finite numeric comparison value.');}
   else if(p.op!=='present'&&!scalar(p.value))issues.push(label+' needs a scalar comparison value.');
   else if(p.op==='present'&&p.value!==undefined)issues.push(label+' does not take a comparison value.');
  }
 }
 if(!rule.requires?.length&&!rule.excludes?.length)issues.push('Applicability needs at least one required or excluded condition.');
 return issues;
}

export function architectureUnitIssues(unit){
 const issues=[];
 if(!object(unit))return ['Architecture unit must be an object.'];
 unknown(unit,FIELDS,'Architecture unit',issues);
 if(!KINDS.has(unit.kind))issues.push('Choose a supported architecture unit kind.');
 if(!value(unit.mechanism,2400))issues.push('Describe the bounded mechanism (up to 2,400 characters).');
 if(unit.scope!==undefined&&!object(unit.scope))issues.push('Architecture unit scope must be an object.');
 const scope=object(unit.scope)?unit.scope:{};
 unknown(scope,SCOPE_FIELDS,'Architecture unit scope',issues);
 for(const key of SCOPE_FIELDS)if(scope[key]!==undefined&&!value(scope[key],240))issues.push('Scope '+key+' must be a non-empty string of up to 240 characters.');
 if(unit.kind==='product-mechanism'&&(!value(scope.product,240)||!value(scope.version,240)))issues.push('A product mechanism needs a named product and a documented version scope.');
 if(!Array.isArray(unit.effects)||unit.effects.length<1||unit.effects.length>12)issues.push('Record 1–12 quality effects.');
 else for(const [index,effect] of unit.effects.entries()){
  if(!object(effect)){issues.push('Quality effect '+(index+1)+' must be an object.');continue;}
  unknown(effect,EFFECT_FIELDS,'Quality effect '+(index+1),issues);
  if(!value(effect.quality,120))issues.push('Quality effect '+(index+1)+' needs a quality attribute (up to 120 characters).');
  if(!DIRECTIONS.has(effect.direction))issues.push('Quality effect '+(index+1)+' needs supports, tradeoff or unknown direction.');
  if(!value(effect.rationale,1200))issues.push('Quality effect '+(index+1)+' needs bounded reasoning (up to 1,200 characters).');
 }
 if(!Array.isArray(unit.obligations)||unit.obligations.length<1||unit.obligations.length>12)issues.push('Record 1–12 implementation or verification obligations.');
 else for(const [index,obligation] of unit.obligations.entries()){
  if(!object(obligation)){issues.push('Obligation '+(index+1)+' must be an object.');continue;}
  unknown(obligation,OBLIGATION_FIELDS,'Obligation '+(index+1),issues);
  if(!value(obligation.action,1200))issues.push('Obligation '+(index+1)+' needs an action (up to 1,200 characters).');
  if(!value(obligation.evidence,1200))issues.push('Obligation '+(index+1)+' needs the evidence that would check it (up to 1,200 characters).');
 }
 if(unit.exclusions!==undefined){
  if(!Array.isArray(unit.exclusions)||unit.exclusions.length>12)issues.push('Record at most 12 exclusions.');
  else for(const [index,exclusion] of unit.exclusions.entries())if(!value(exclusion,800))issues.push('Exclusion '+(index+1)+' must be a non-empty string of up to 800 characters.');
 }
 if(unit.applicability!==undefined)issues.push(...architectureApplicabilityIssues(unit.applicability));
 if(unit.placement!==undefined){
  if(!Array.isArray(unit.placement)||!unit.placement.length||unit.placement.length>12)issues.push('Record 1–12 placement rules.');
  else for(const [index,p] of unit.placement.entries()){
   const label='Placement '+(index+1);
   if(!object(p)){issues.push(label+' must be an object.');continue;}
   unknown(p,PLACEMENT_FIELDS,label,issues);
   if(!PLACEMENT_TARGETS.has(p.target))issues.push(label+' needs a supported design boundary.');
   if(!value(p.reason,1200))issues.push(label+' needs the reason for this location.');
   if(p.role!==undefined&&!value(p.role,120))issues.push(label+' role must contain up to 120 characters.');
   if(p.capability!==undefined&&!value(p.capability,240))issues.push(label+' capability must contain up to 240 characters.');
  }
 }
 return issues;
}

export function architectureUnitRecord(unit){
 const issues=architectureUnitIssues(unit);if(issues.length)throw Error(issues.join(' '));
 const scope=Object.fromEntries(Object.entries(unit.scope||{}).map(([key,v])=>[key,v.trim()]));
 return {kind:unit.kind,mechanism:unit.mechanism.trim(),scope,effects:unit.effects.map(e=>({quality:e.quality.trim(),direction:e.direction,rationale:e.rationale.trim()})),obligations:unit.obligations.map(o=>({action:o.action.trim(),evidence:o.evidence.trim()})),exclusions:(unit.exclusions||[]).map(x=>x.trim()),...(unit.applicability?{applicability:structuredClone(unit.applicability)}:{}),...(unit.placement?{placement:unit.placement.map(p=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v.trim()])))}:{})};
}
