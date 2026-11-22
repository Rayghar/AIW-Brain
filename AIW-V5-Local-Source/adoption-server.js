// The server's registration of the design package of applied mechanisms (rc44, wp2 slice S1; the lead's ruling J12 of
// 2026-11-19), the line of design-packages.js. The package registers itself where it is stated
// (public/adoption-package.js, which the browser's lazy entry imports too); the server adds the read upgrade to that
// same object here, before worker.js checks the packages when it starts, so that the upgrade (design §e.3) and the
// built-in skeletons it reads are in no client bundle: the browser upgrades no document. Whichever of the two modules
// a process imports first, the registered package is one object, and on the server it has its upgrade step.
// Slice S5 (the lead's ruling U5) adds the SDD's selection basis here, as the package's section of the architecture
// edition (S0's sections part), for the same reason: only the server prints an SDD.
import {ADOPTION_PACKAGE} from './public/adoption-package.js';
import {upgradeAdoptions} from './public/adoption-upgrade.js';
import {selectionReading} from './public/adoption-selection.js';
import {md, bullets, plural, decisionOrder} from './public/sdd-architecture.js';

// ---------------------------------------------------------------- the selection basis (slice S5, ruling U5)
// Each component selection of the document, in the SDD's order of its decisions, from the package's own reading
// (adoption-selection.js selectionReading): what is selected; each hard constraint that reaches it now, a constraint that
// reached it after the choice included (none carries a typed reading: ruling Q3); and each candidate in the order it was
// added, with its kind, what it is pinned to, its outcome and its rows: as they read when the choice was made and as they
// read now, once when both agree, each named when they do not, with why a candidate no longer stands. ", named unproven"
// marks only the chosen candidate's rows the chooser named. Nothing is weighed. Printed at the end of the trade-off
// analysis; the decision record points here (sdd-architecture.js, which imports no module of the package: ruling D3).
const list=v=>Array.isArray(v)?v:[],KINDS={profile:'profile',library:'library entry',archetype:'catalogue archetype',existing:'existing component',build:'build',buy:'buy',option:'released option'};
const pinned=c=>{const r=c.ref||{};return c.kind==='profile'?', released '+r.claimId+' in '+r.releaseId:c.kind==='library'?' '+(r.entryId||''):c.kind==='archetype'?' '+(r.archetypeId||''):c.kind==='existing'?' '+(r.componentId||''):c.kind==='option'?' '+(r.optionId||''):'';};
function basisOf(p,d){
 const R=selectionReading(p,d),s=d.selection,driver=id=>list(p.quality?.drivers).find(x=>x.id===id),label=id=>md(R.constraints.find(k=>k.id===id)?.label||driver(id)?.title||id);
 const what=R.kind==='option'?'the released options of '+md(R.concern?.title||R.concern?.id):'a component for '+list(R.responsibilityIds).map(id=>{const r=list(p.logical?.responsibilities).find(x=>x.id===id);return r?(r.ref||r.id)+' · '+md(r.title):id;}).join(', ');
 const say=(rows,chosen)=>rows.map(r=>label(r.constraintId)+': '+r.state+(r.basis==='person'?' (judged by '+md(r.by)+')':'')+(chosen&&r.state==='unknown'&&list(s.choice?.unproven).includes(r.constraintId)?', named unproven':'')).join('; ');
 const line=c=>{
  const chosen=!!R.choice&&c.alternativeId===R.choice.alternativeId,stored=R.choice?list(s.choice?.rows?.[c.alternativeId]?.rows):null,now=say(c.eligibility.rows,chosen),why=c.eligibility.reasons.length?' ('+md(c.eligibility.reasons.join(' '))+')':'';
  const rows=stored?(say(stored,chosen)===now&&!why?'at the choice and now: '+now:'at the choice: '+(say(stored,chosen)||'no row')+' · now: '+(now||'no row')+why):now||why?'now: '+(now||'no row')+why:'';
  return md(c.title)+' ('+(KINDS[c.kind]||md(c.kind))+pinned(c)+(c.by==='sol'?', proposed by Sol':c.by==='agent'?', added by an agent account':'')+'): '+c.outcome+(rows?' · '+rows:'');
 };
 const n=R.constraints.length;
 return '**'+d.id+' · '+md(d.question)+'**: '+what+', against '+(n?plural(n,'hard constraint')+': '+R.constraints.map(k=>md(k.label)+' (no typed reading: unknown until a person judges it)').join('; '):'no hard constraint')+'.'+(R.prepared==='sol-draft'?' Prepared as a draft by Sol.':R.prepared==='agent'?' Prepared by an agent account.':'')+'\n\n'+bullets(R.candidates.map(line),{rest:k=>'And '+plural(k,'more candidate')+' (Chapter 3 · '+d.id+').'});
}
export function selectionBasis(p){
 const ds=decisionOrder(p,list(p?.decisions?.records)).filter(d=>d?.selection&&typeof d.selection==='object');
 return ds.length?'### Selection basis\n\nEach component selection is read against the hard constraints that reach it, row by row: each candidate\'s rows as they read when the choice was made, and as they read now.\n\n'+ds.map(d=>basisOf(p,d)).join(''):'';
}

Object.assign(ADOPTION_PACKAGE,{
 upgrade:upgradeAdoptions,
 upgradeNote:'Guided designs that were applied are now kept as adoption records, each applied and not yet accepted by a second person.',
 sections:[{document:'sdd',after:'## Trade-off analysis',markdown:selectionBasis}]
});
