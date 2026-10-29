// Authored model scenario for result-read composition; no live service evidence.
import {driverJourneyFixture,DRIVER_JOURNEY_AT as at} from './driver-led-journey-fixtures.mjs';
import {applyInterfacesCommand} from './public/interfaces-domain.js';

export function readOutcomeFixture({domain='fulfilment',approach='cache-aside',freshness='bounded',maxAge=30}={}){
 const f=driverJourneyFixture({domain,approach}),c=f.document.interfaces.contracts.find(c=>c.id===f.ids.contractId);
 const execution={...c.execution,outcomeReadTaskId:f.ids.readTaskId,outcomeFreshness:freshness,...(freshness==='bounded'?{outcomeMaxAgeSeconds:maxAge}:{})};
 const document=applyInterfacesCommand(f.document,{type:'interfaces.contract',payload:{id:c.id,execution}},at).document;
 return {...f,document};
}
