import {needChanged,needIsSeed} from './technology-domain.js';

// Chapter 5 shows the Chapter 6 review against the same source snapshot as Validate.
export function componentNeedStatus(project,need){
  if(needIsSeed(project,need))return 'Proposed';
  if(needChanged(project,need))return 'Inputs changed · review needed';
  return need.confirmed?'Reviewed':'Draft';
}

// This small editor does not submit fields it cannot review. The native partial-update
// command retains linked records and allocations, and invalidates changed assumptions.
export function componentNeedsPayload(component,values){
  if(!component)throw Error('This component no longer exists. Reload the current project.');
  const payload={id:component.id};
  for(const key of ['technologyNeeds','assumptions','source'])payload[key]=String(values[key]??'');
  const changed=['technologyNeeds','assumptions','source'].some(key=>payload[key].trim()!==String(component[key]??'').trim());
  if(changed&&component.status==='reviewed')payload.status='candidate';
  return payload;
}
