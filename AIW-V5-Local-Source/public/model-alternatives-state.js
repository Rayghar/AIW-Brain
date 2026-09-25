// Alternative records are design reasoning, separate from the accepted model.
export const modelAlternatives=p=>p.modelAlternatives?.records||[];
export const modelAlternative=(p,id)=>modelAlternatives(p).find(a=>a.id===id);
export function withModelAlternatives(p){p.modelAlternatives||={schemaVersion:1,counter:0,records:[]};return p;}
export function alternativesMarkdown(p){
 const records=modelAlternatives(p);if(!records.length)return '';
 return '## Model alternatives and recorded reasoning\n\nDraft alternatives are not part of the accepted architecture. Applying an alternative saves a working design; governance remains separate.\n\n'+records.map(a=>'### '+a.id+' · '+a.name+'\n\nStatus: '+a.status+' · Revision '+a.revision+'\n\nReasoning: '+a.rationale+'\n\nProposed records: '+a.changes.map(c=>c.source.ref+' · '+c.source.title).join('; ')+'\n\n'+(a.applied?'Applied by '+a.applied.reviewer+' at '+a.applied.at+'. '+a.applied.reason+'\n\nChange history: '+a.applied.changeIds.join(', ')+'\n\n':'')+(a.archived?'Set aside: '+a.archived.reason+'\n\n':'')+'History:\n'+a.history.map(h=>'- '+h.at+' · '+h.event+' · '+h.note).join('\n')+'\n\n').join('');
}
