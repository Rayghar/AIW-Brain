// Contextual questions are editable invitations, never requests sent automatically.
export const SOL_QUESTIONS = [
 ['explain','Explain the reasoning','Explain what this record does in the design, what it rests on and what it still leaves open.','Understand the choice and its conditions'],
 ['check','Find the gaps','Check this record against its chapter’s checks and the sources: what is unsupported, untestable or missing?','See what is missing or unsupported'],
 ['safer','Make it safer','What would make this record clearer, more testable or safer, without inventing owners, numbers or approvals?','Explore failure and recovery'],
 ['compare','Compare alternatives','Compare the alternatives against the actual quality scenarios and fixed constraints. Explain admissibility, mechanisms, trade-offs and what would change your advice. Leave the selection to the architect.','Weigh the recorded alternatives'],
 ['challenge','Challenge my assumptions','Challenge the assumptions behind this record. Identify contradictions, exclusions and conditions that could invalidate its reasoning. Separate recorded facts, eligible source claims and your own hypotheses.','Look for a reason the design could fail'],
 ['impact','What changes if…','Trace what would need review if a requirement, quality target, product version or topology changed. Use the recorded connections, identify gaps in the trace, and ask me which change to explore. Do not invent a new target.','Follow the consequences through the model'],
 ['patterns','Explore relevant patterns','Explain which eligible architecture patterns or tactics could help with this record and why. Compare with a simpler approach; state applicability, exclusions, implementation obligations and verification. Say when the sources are insufficient.','Connect mechanisms to quality drivers'],
 ['evidence','Examine the evidence','Show which exact sources support this record’s reasoning and what they do not establish. Distinguish project intent, reviewed knowledge, proposed tests and observed results. Identify the next evidence needed.','Separate support from assumption']
];

export function appendCoDesignQuestion(existing, incoming, limit = 2000) {
 const question=typeof incoming==='string'?incoming.trim():'';
 if(!question)return {ok:false,error:'Choose a question to explore.'};
 const current=String(existing||'').trim();
 const prompt=current.includes(question)?current:[current,question].filter(Boolean).join('\n\n');
 if(prompt.length>limit)return {ok:false,error:`Your existing question is retained. Shorten it before adding this prompt (${limit.toLocaleString('en-US')} characters maximum).`};
 return {ok:true,prompt};
}
