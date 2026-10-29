// What a requirement's statement says, read by rule (round 12, GR-INT-08, GR-INT-09, GR-INT-10). Deterministic and
// explainable: every check names the words or the shape that raised it, so a person sees why and can restate the
// statement or answer the check. The word lists are AIW's configuration, not knowledge: they decide what is flagged or
// proposed, never what is true, and move no score, constraint or conformance result. No person has reviewed them yet
// (audit/round12/DOMAIN-KNOWLEDGE-REVIEW-PACK.md, section 5, lists them for review). Pure; no DOM, no project writes.
//
//   statementChecks(text, {title, lens}) -> [{check, words, why}]: what keeps a statement from being tested, read as the
//                                     one ambiguity cause of Chapter 1 (requirements-domain.js findings):
//                                     subjective  words that name a quality without a measure (the eight Chapter 1 has
//                                                 always flagged, wherever they stand, and more of the same kind);
//                                     vague       words that leave the scope open, when the statement states no figure;
//                                     regulation  a regulation cited without naming the regulator or the instrument;
//                                     target      a quality of the system named with no measurable target;
//                                     shape       a question, or a fragment (a list item, or fewer than four words).
//   testObjective(text)              -> the phrase that reads as a test objective ("To ensure that", "Verify that"), or ''.
//   regulationsNamed(text, {lens})   -> [{name, kind: 'regulator' | 'instrument' | 'regime'}]: what a statement names,
//                                     each once, in the order it appears. A title that ends in Guidelines, Guide, Rules,
//                                     Code or Policy is an instrument only beside words of compliance ("comply with",
//                                     "as required by", "regulatory"), so a product's business rules are not one.
// With the core-banking lens chosen for the project (and only then), the lens's regulatory words (know your customer,
// anti-money laundering, regulatory reporting, data protection) name the regime a citation is about.
import {CORE_BANKING_TERMS} from './lenses/core-banking-terms.js';

const words=(list,flags='i')=>new RegExp('\\b(?:'+list.map(w=>w.replace(/[-\s]/g,'[-\\s]')).join('|')+')\\b',flags);
// The eight words Chapter 1 has always flagged, and further subjective words of the same kind.
export const SUBJECTIVE=['quickly','fast','immediately','promptly','user-friendly','seamless','asap','timely','easy','efficiently','seamlessly','intuitive','intuitively','easily','smoothly','robust','flexible','efficient','optimal','optimally','as soon as possible','best possible','state of the art','high performance'];
// Words that leave the scope or the result open: flagged when the statement states no figure that could bound them.
export const VAGUE=['correctly','properly','appropriate','appropriately','adequate','adequately','sufficient','sufficiently','relevant','necessary','comprehensive','various','reasonable','reasonably','suitable','as needed','as required','as appropriate','where applicable','if applicable','where possible','if possible'];
// A regulation cited by its kind, not its name; words of compliance that make a titled rule set an instrument.
const CITED=/\b(?:regulat(?:ory|ions?)|statutory|legal requirements?|legislation|applicable laws?|laws? and regulations?|compliance requirements?|regulators?)\b/i;
const COMPLY=/\b(?:compl(?:y|ies|iance|iant)|in line with|in accordance with|according to|as per|as (?:required|prescribed|stipulated|mandated|set out|directed) (?:by|in)|pursuant to|regulat\w*|statutory|mandatory)\b/i;
// A regulator: a central bank, a financial intelligence unit, a supervisory, monetary, prudential, conduct, securities,
// data-protection, tax, revenue or competition authority. A directive, circular, guideline or regulation named by an
// acronym ("the XYZ directive") is an instrument.
const REGULATOR=/\b(?:central bank|financial intelligence unit|bank(?:ing)? supervisor|information commissioner|(?:supervisory|monetary|prudential|financial conduct|financial services|securities|data protection|tax|revenue|competition)\s+(?:authority|authorities|commission|regulator|agency|office))\b/gi;
const ISSUED=/\b([A-Z]{2,6})(?:'s|’s)?\s+(?:[Dd]irectives?|[Cc]irculars?|[Gg]uidelines?|[Gg]uide|[Rr]egulations?|[Rr]ules|[Pp]olicy on)\b/g;
// An instrument: a capitalised title that ends in a legal kind (strong), or in a kind a product's own rules also take
// (weak: an instrument only beside words of compliance), a numbered directive or regulation, or one of the widely
// cited instruments and standards (a short, generic list: no jurisdiction is assumed).
const TITLE='(?:(?:[A-Z][\\w&\'’-]*|of|on|for|and|the|to)\\s+){0,6}?[A-Z][\\w&\'’-]*\\s+';
const STRONG=new RegExp('\\b'+TITLE+'(?:Acts?|Regulations?|Directive|Ordinance|Code of Practice|Circular|Law)\\b(?:\\s+(?:of\\s+)?\\d{4})?|\\b(?:Directive|Regulation)\\s+(?:\\((?:EU|EC)\\)\\s+)?\\d{2,4}\\/\\d{1,4}','g');
const WEAK=new RegExp('\\b'+TITLE+'(?:Guidelines?|Rules|Code|Policy)\\b|\\b(?:Guide|Guidelines|Code|Rules) (?:to|on|for) (?:[A-Z][\\w&\'’-]*\\s*){1,6}','g');
export const KNOWN_INSTRUMENTS=['GDPR','PSD2','PSD3','PCI DSS','SOX','Sarbanes-Oxley','Basel II','Basel III','Basel IV','IFRS 9','IFRS 16','MiFID II','EMIR','DORA','FATCA','HIPAA','CCPA','LGPD','POPIA','AMLD','FATF'];
const KNOWN=words(KNOWN_INSTRUMENTS,'gi');
const STOP=new Set(['the','this','that','these','a','an','each','every','all','any','when','if','for','to','and','of','on','in','system','bank','ui','user']);
// The lens's regulatory concerns, whose words of a regime name what a citation is about (only for a project that uses
// the lens): know your customer and due diligence, anti-money laundering and sanctions, regulatory reporting, data
// protection; not the lens's process words (account opening is not a regime).
const LENS_REGULATORY=['kyc','aml','reporting','privacy'],REGIME=/kyc|know your customer|due diligence|\b[ce]dd\b|aml|money laundering|sanctions|\bpeps?\b|politically exposed|\bcft\b|regulatory|statutory|prudential|supervisory|xbrl|central bank returns|data protection|gdpr|data privacy/;
let lensWords=null;
const lensRegulatory=()=>lensWords??=words(LENS_REGULATORY.flatMap(k=>CORE_BANKING_TERMS[k]?.terms||[]).filter(t=>REGIME.test(t)),'gi');
export const usesLens=p=>p?.workspace?.domainLens?.lensId==='core-banking';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
export function regulationsNamed(text,{lens=false}={}){
 const t=clean(text),out=[],seen=new Set(),comply=COMPLY.test(t);
 const add=(name,kind,at)=>{const n=clean(name).replace(/^(?:(?:the|a|an|of|on|for|and|to)\s+)+/i,'').replace(/[.,;:]+$/,'');const k=n.toLowerCase();if(n.length<3||seen.has(k)||STOP.has(k))return;seen.add(k);out.push({name:n,kind,at});};
 for(const m of t.matchAll(REGULATOR))add(m[0],'regulator',m.index);
 for(const m of t.matchAll(ISSUED))if(!STOP.has(m[1].toLowerCase()))add(m[0],'instrument',m.index);
 for(const m of t.matchAll(STRONG))add(m[0],'instrument',m.index);
 if(comply)for(const m of t.matchAll(WEAK))add(m[0],'instrument',m.index);
 for(const m of t.matchAll(KNOWN))add(m[0],'instrument',m.index);
 if(lens)for(const m of t.matchAll(lensRegulatory()))add(m[0],'regime',m.index);
 return out.sort((a,b)=>a.at-b.at).map(({name,kind})=>({name,kind}));
}
// A figure that can bound a statement: a number, a percentage, a time or a count or frequency in words.
const FIGURE=/\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty|hundred|thousand|once|twice|daily|weekly|monthly|hourly|annually)\b/i;
// A quality of the system named as such, which a statement should give a measure for (not the availability of funds,
// nor the performance of a loan book).
const QUALITY=/\b(?:response times?|latency|throughput|uptime|availability(?!\s+(?:of|for)\b)|(?:system|platform|application|service) performance|performance (?:requirements?|targets?|levels?)|scalab(?:le|ility)|concurrent users|concurrency|peak (?:load|volumes?|hours?)|recovery time|recovery point|resilien(?:ce|t)|load times?|processing times?)\b/i;
const SUBJECTIVE_RE=words(SUBJECTIVE,'gi'),VAGUE_RE=words(VAGUE,'gi');
const distinct=xs=>[...new Set(xs.map(w=>w.toLowerCase()))];
// A statement reads the same every time: its checks are kept by text (up to 20,000 statements), so the chapter's checks
// read a project's 1,400 statements once, not once per save. Callers get their own copy.
const kept=new Map();
export function statementChecks(text,{title='',lens=false}={}){
 const key=(lens?'1':'0')+'\u0000'+title+'\u0000'+text;let out=kept.get(key);
 if(!out){out=checksOf(text,title,lens);if(kept.size>=20000)kept.clear();kept.set(key,out);}
 return out.map(c=>({...c,words:[...c.words]}));
}
function checksOf(text,title,lens){
 const t=clean(text)||clean(title),all=clean(title+' '+text),out=[];if(!t)return out;
 const figure=FIGURE.test(all),subjective=all.match(SUBJECTIVE_RE),vague=figure?null:all.match(VAGUE_RE);
 if(subjective)out.push({check:'subjective',words:distinct(subjective),why:'names a quality without a measure'});
 if(vague)out.push({check:'vague',words:distinct(vague),why:'leaves the scope open and states no figure'});
 const cited=CITED.exec(all);if(cited&&!regulationsNamed(all,{lens}).length)out.push({check:'regulation',words:[cited[0].toLowerCase()],why:'cites a regulation without naming the regulator or the instrument'});
 const quality=QUALITY.exec(all);if(quality&&!figure)out.push({check:'target',words:[quality[0].toLowerCase()],why:'names a quality of the system with no measurable target'});
 if(/\?\s*$/.test(t))out.push({check:'shape',words:[],why:'is a question, not a statement of what is required'});
 else if(/^\(?(?:\d{1,2}|[a-z])[.)]\s/.test(t)||t.split(' ').length<4)out.push({check:'shape',words:[],why:'is a fragment: a list item or fewer than four words'});
 return out;
}
// The one sentence the ambiguity finding gives: each check, with the words that raised it.
export const checksText=cs=>cs.map(c=>c.why+(c.words.length?' (“'+c.words.slice(0,4).join('”, “')+'”)':'')).join('; ');
// Test objectives (GR-INT-09): what a test case sets out to show, phrased as the test rather than as the requirement it
// tests. A statement that says what the system shall or must do is a requirement, whatever its first words.
// "Validate the account" and "Check the balance" are what a system does; "Verify the posting" is what a test does.
const OBJECTIVE=/^\s*(?:(?:the\s+)?(?:test\s+)?objective\s*(?:is\s*)?:?\s*)?(?:to\s+(?:ensure|verify|validate|test|check|confirm|determine|demonstrate)\b(?:\s+that\b)?|(?:validate|check)\s+(?:that|whether|if)\b|(?:verify(?:ing)?|test(?:ing)?|evaluate|confirm)\s+(?:that|whether|if|the|system'?s|ability)\b|(?:this|the)\s+test\s+(?:case\s+|scenario\s+)?(?:verifies|validates|checks|confirms|ensures)\b)/i;
export function testObjective(text){const t=clean(text),m=OBJECTIVE.exec(t);return m&&!/\b(?:shall|must)\b/i.test(t)?clean(m[0]):'';}
