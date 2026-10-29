// The reference journeys (round 4; audit/round4/DESIGN.md, "Reference projects"): each one is the pipeline's own
// output from a brief kept here beside its id. Server side only: the Projects page carries the catalogue
// (public/reference-projects.js, whose `brief` is each brief's first line); this module adds the rest of each brief and
// the generation, so the brief interpreter and the journey drafter never reach the browser's Projects route.
//
// createProject (shared/projects-domain.js) keeps the brief as the project's first evidence source and counts its
// interpretation exactly as it does for a typed brief; referenceJourney then drafts all eleven chapters from that kept
// text and commits every drafted record the way the governed chain does:
//   interpretBrief (shared/brief-interpreter.js, Contract 1)
//   → draftJourney (shared/journey-drafter.js, Contract 2), every chapter drafted on the chapters before it
//   → per chapter, in order, each record committed as guide.commit-draft commits it (public/chapter-guide.js): the
//     drafter's provenance checked by journeyProvenance, compileCreation with the drafted answers, withJourneyProvenance
//     on what it created; then what the drafter proposes to follow it: Chapter 1 links and the Chapter 8 data fields (a
//     key and a status field).
// What the drafter could not source stays an explicit open answer ("Unassigned", "Open question: …"). Nothing is
// confirmed, reviewed, baselined, approved or handed off: workspace.reference says what the project is, and
// verified stays false.
import {REFERENCE_PROJECTS} from '../public/reference-projects.js';
import {interpretBrief} from './brief-interpreter.js';
import {draftJourney, briefSource} from './journey-drafter.js';
import {compileCreation} from '../public/guided-creation.js';
import {applyCommand} from '../public/requirements-domain.js';
import {journeyProvenance, withJourneyProvenance} from '../public/chapter-guide.js';

export const REFERENCE_AUTHORITY = 'AIW authored illustration';
export const REFERENCE_DRAFTED = 'journey-rules-1 from the brief';

// Each brief after its first line (the catalogue's `brief`). Written as an architect would receive it; every organisation,
// person, figure and date in it is illustrative, and each brief says so in its own words.
const BODIES = {
'service-permits': `This brief is an AIW authored teaching example. The city, its teams, the people named by role and every target in it are illustrative; none of them describes a real body, a real person or a measured service. The 10 working days below are an illustrative target for this teaching example, and the service operations team sets the real one.

Context:
The city handles requests from residents for three routine permits and services: street-event permits, temporary parking suspensions and bulky-waste collections. Today a request arrives by email, by phone or at the front desk, and each team keeps its own spreadsheet. Case officers copy the same details into several places, and evidence such as site plans and proof of address sits in shared mailboxes. A resident who asks about a request is often passed from one team to another before anyone can answer.

Nobody can say how many requests are open, how long each one has waited or why a request was refused. Decisions on similar requests differ between teams, and the reasons are rarely written down. When a resident complains, the history of the case is rebuilt by hand from old emails.

The city has asked for one case-management service for these three request types. It is the first step of a wider programme. Other request types follow in later releases, and the design leaves room for them without rebuilding the core. Fee payments stay with the arrangements the city already has, and the document archive is not replaced in this release.

Goals:
- Residents get an explained decision on a complete request within 10 working days.
- Every request has one case record that holds its evidence, its status and the reasons for its decision.

Stakeholders:
- The service operations team owns the case-management service and is accountable for its outcome.
- Information governance team — sets the retention and access rules for case records.

Users:
- Residents — submit requests, provide evidence and follow the status of their requests.
- Case officers — check, assess and decide requests.
- Team leaders — assign cases and watch how long they wait.

Scope:
In scope: the three request types named above from submission to decision.
Out of scope: appeals against a decision.

Journey:
1. A resident submits a service request with supporting evidence online and receives a case reference.
2. The service checks the request for missing evidence.
3. A team leader assigns the case to a case officer.
4. The case officer asks the resident for more information when it is needed.
5. The case officer records a decision with its reasons.
6. The resident is notified of the decision and can see the history of the case.

Requirements:
- Residents must be able to submit a service request with supporting evidence online and receive a case reference.
- The service must check each submission for missing evidence before it reaches a case officer.
- Case officers must be able to decide each complete case within 10 working days and record the reasons for the decision.
- The service should send an email to the resident when the status of a request changes.
- The service must keep a case audit trail that records every change.

Constraints:
- Case records hold personal data and must comply with the data protection regulation, including its retention limits.
- The service must integrate with the identity platform that residents already use for other city services.
- The first release must be live by the end of the year for the three request types in scope.

Assumptions:
- We assume most residents have an email address and an account on the city identity platform.

Open questions:
- Who approves a refusal when the case officer and the team leader disagree?
- How long should evidence be kept after a case closes?
- Should residents be able to withdraw a request after they submit it?
- Do the three request types share one review process, or does each need its own?`,
'warehouse-fulfilment': `This brief is an AIW authored teaching example. The distributor, its warehouse, the people named by role and every target in it are illustrative; none of them describes a real business, a real person or a measured operation. The 2 seconds and the 2 pm cut-off below are illustrative targets for this teaching example, and the warehouse operations team sets the real ones.

Context:
A distributor ships household goods from one warehouse. Orders come from its online shop and from trade accounts that send orders in batches overnight. Today stock is reserved only when an order is picked, not when it is accepted. Two orders therefore compete for the last unit on a shelf, and the second one is found short at the picking face. The online shop sometimes sends the same order twice after a timeout, and both copies are picked.

The warehouse management system holds stock locations and quantities. It is taken offline for maintenance most weeks, and orders accepted during that window wait in a spreadsheet until it returns. Carrier hand-over is recorded on paper at the dock. When a customer asks where an order is, customer service phones the warehouse and the dock, and the answer is only as good as the notes on the desk that day.

The distributor has asked for a fulfilment service that reserves stock when an order is accepted, processes each order once, keeps working while the warehouse management system is unavailable and keeps one traceable history per order. Returns and purchasing stay with the arrangements the distributor already has.

Goals:
- Every accepted order has its stock reserved at the moment it is accepted.
- Every order can be traced from acceptance to the carrier's delivery confirmation.

Stakeholders:
- The warehouse operations team owns the fulfilment service and is accountable for its outcome.
- Carriers — collect parcels at the dock and send tracking events until delivery.

Users:
- Customers — place orders in the online shop and follow them to delivery.
- Warehouse pickers — pick and pack reserved stock and report shortages.
- Dispatch clerks — record each parcel hand-over at the dock.

Scope:
In scope: orders from the online shop and trade accounts from acceptance to delivery.
Out of scope: returns and stock replenishment.

Journey:
1. A customer places an order in the online shop.
2. The fulfilment service reserves stock for each order line and confirms the order.
3. A warehouse picker picks and packs the order and reports any shortage.
4. A dispatch clerk hands the parcel to a carrier and records the hand-over, and the customer follows its tracking events until delivery.

Requirements:
- The fulfilment service must accept an order and reserve its stock within 2 seconds, never reserving one unit for two orders.
- The fulfilment service must detect a duplicate order and process it once, even when the online shop sends it twice.
- The fulfilment service must retain each pending order while the warehouse management system is unavailable and resume it when the system returns.
- Warehouse pickers must be able to record a stock shortage so the order is re-planned rather than shipped incomplete.
- Dispatch clerks must record each parcel hand-over to a carrier with its tracking reference.
- Customers should be able to track their order and its delivery events at any time.
- The fulfilment service should release a reservation when the customer cancels an order before it is picked.

Constraints:
- The fulfilment service must integrate with the existing warehouse management system for stock locations.
- Customer personal data must be handled in line with the data protection regulation that covers the online shop.
- The new reservation flow must be in production by October, before the peak trading season.

Assumptions:
- We assume the warehouse management system can accept a reservation and confirm it asynchronously.

Open questions:
- Which order gets the last unit when two orders arrive at the same moment?
- How long should a reservation be held for an order that is not yet paid?
- What happens to a reservation when a trade account cancels part of an order?
- Must orders accepted before the 2 pm cut-off always leave the warehouse the same day?`,
'clinic-appointments': `This brief is an AIW authored teaching example. The clinic, its teams, the people named by role and every target in it are illustrative; none of them describes a real practice, a real person or a measured service. The 15 minutes and the two days below are illustrative targets for this teaching example, and the clinic sets the real ones.

Context:
A community outpatient clinic runs appointments for several clinicians from one shared diary that reception keeps. Patients book by phone during opening hours, and the line is busiest first thing in the morning. Reminders go out by hand when reception has a quiet moment, so many patients get none.

Patients who cannot attend often tell nobody, and the slot is lost. A clinician who is ill at short notice leaves reception phoning every patient on that day's list. Patients on the waiting list hear about a free slot only if someone remembers them. When a patient misses an appointment, the follow-up differs from one clinician to the next and is rarely written down.

The clinic has asked for an appointment service that patients and reception both use, sends reminders, offers freed slots to the waiting list and records missed appointments in one consistent way. Clinical records and prescriptions stay in the systems the clinic already has.

Goals:
- Patients can book, move or cancel an appointment themselves at any time of day.
- Every freed slot is offered to the waiting list before the day of the appointment.

Stakeholders:
- The clinic owns the appointment service and is accountable for its outcome.
- Clinical governance committee — sets the rules for following up missed appointments.

Users:
- Patients — book, move and cancel appointments and receive reminders.
- Receptionists — keep the diary and take bookings by phone.
- Clinicians — set their availability and see the day's appointments.

Scope:
In scope: outpatient appointments from booking to follow-up.
Out of scope: clinical records and prescriptions.

Journey:
1. A patient books an appointment online or by phone with a receptionist.
2. The appointment service confirms the booking and schedules a reminder.
3. The patient receives the reminder and confirms, moves or cancels the appointment.
4. A cancelled or moved appointment frees a slot that the service offers to the waiting list.
5. The clinician marks the appointment as attended or missed, and a missed appointment starts the follow-up.

Requirements:
- Patients must be able to book an appointment at any time through the online service.
- Receptionists must be able to register a phone booking and move or cancel it for a patient who calls.
- The appointment service must send a reminder by text message or email two days before each appointment.
- Patients must be able to answer each reminder to confirm, move or cancel the appointment.
- The appointment service should offer a freed slot to the waiting list within 15 minutes of a cancellation.
- Clinicians must be able to record a missed appointment, and the appointment service must start the follow-up the clinical governance committee sets.

Constraints:
- Patient personal data must be handled in line with the health data regulation that applies where the clinic operates.
- Reminders must not include the reason for the appointment or any clinical detail.
- Online booking must be live by the end of the year.

Assumptions:
- We assume most patients have a mobile phone or an email address for reminders.

Open questions:
- How many reminders should a patient receive, and through which channel by default?
- Who decides when a patient who misses several appointments is discharged?
- Should a patient be able to book for a family member?
- Which existing system remains the record of who the clinic's patients are?`,
'parcel-lockers': `This brief is an AIW authored teaching example. The city, its teams, the people named by role and every target in it are illustrative; none of them describes a real municipality, a real person or a measured service. The 20 deposits per second, the 2 seconds and the 15 minutes below are illustrative targets; the city operations team sets the real ones.

Context:
The city runs parcel lockers at transport stops, libraries and markets, so that couriers can deliver when nobody is home. Today each courier brings its own lockers and its own app. The city has bought 400 locker stations and wants one service for every courier and every resident.

Each station reports its doors, temperature and power over the mobile network; some lose their connection for hours, and a door opened offline must still be accounted for. Couriers work to tight rounds and will not wait at the screen. Residents pay a small fee for a parcel left past the free period.

The city has asked for one locker service: couriers deposit through their own apps over a shared interface, residents collect with a code or the city app, and an operations desk watches every station and every parcel left too long.

Goals:
- Residents collect any parcel from any courier at the station nearest to them.
- The operations desk sees every station and every overdue parcel in one place.

Stakeholders:
- The city operations team owns the locker service and is accountable for its outcome.
- The city's finance team — sets the collection fees and receives the payments.

Users:
- Couriers — deposit parcels into a free door and collect returns.
- Residents — collect their parcel with a code and pay a fee when late.
- Operations desk staff — watch the network and free stuck doors.
- Locker stations — the embedded systems that open doors and report door events.
- The payment provider — the external service that takes the late fee.

Scope:
In scope: parcel deposit, notification, collection, late fees and the operations desk for the city's locker stations.
Out of scope: the couriers' own route planning, and the maintenance contract for the locker hardware.

Journey:
1. A courier scans a parcel at a station and the service assigns a free door of the right size.
2. The courier puts the parcel in and the station's sensor confirms the door is closed.
3. The resident receives a notification with a collection code and the station's address.
4. The resident opens the door with the code or the city app and takes the parcel.
5. A parcel left past the free period incurs a fee, which the resident pays before the door opens.
6. The operations desk reallocates parcels from a station that is offline or stuck.

Requirements:
- The locker service must assign a free door and open it within 2 seconds of a courier's scan.
- The locker service must accept 20 deposits per second across the network at the evening peak.
- The locker service must notify the resident within 5 minutes of a confirmed deposit.
- Residents must be able to open their door with a one-time code that works while the station is offline.
- The locker service must record every door opening with its station, door, parcel and actor.
- The locker service must charge the late fee through the payment provider before the door opens.
- The operations desk must be able to see every station that has not reported for 15 minutes.
- Operations desk staff should be able to free a stuck door and reassign its parcel to another door.

Constraints:
- Residents' personal data and collection codes must be handled in line with the data protection regulation that applies to the city.
- The locker service must integrate with the payment provider and with each courier's app through one shared interface.
- The first 100 stations must be live by October, before the winter peak.

Assumptions:
- We assume each station keeps a log of door openings while it is offline and sends it when its connection returns.

Open questions:
- How long is the free period, and does it differ for cooled lockers?
- Who pays when a parcel is damaged in a locker reported closed?
- What happens to a parcel nobody collects within a month?`,
'library-reservations': `This brief is an AIW authored teaching example. The library service, its branches, the people named by role and every target in it are illustrative; none of them describes a real library, a real person or a measured service. The 1000 holds per hour, the 3 seconds and the 7 days below are illustrative targets; the library service sets the real ones.

Context:
A public library service runs twelve branches from one catalogue. A member can reserve a title and have a copy sent to the branch they choose. Today reservations are placed at a desk or by phone, and the van that moves copies between branches runs on a paper manifest. Members do not know where they stand in a queue, and copies sit uncollected because nobody told the member.

The catalogue system knows every copy and every member; it cannot be replaced in this programme, and it is slow when every branch opens at once. Fines are set by the council, and the library wants them beside a member's reservations.

The library has asked for a reservation service for the mobile app, the website and the desk, which tells the van what to move and the member when to collect, and cancels a hold nobody collects. Loans stay in the catalogue system.

Goals:
- Members reserve any title from any branch and know where they are in the queue.
- Every reserved copy reaches the chosen branch within three working days of becoming available.

Stakeholders:
- The library service owns the reservation service and is accountable for its outcome.
- The council's finance team — sets the fines and receives the payments.

Users:
- Library members — members of the public who reserve titles and collect their copies.
- Branch staff — place reservations at the desk and hand over arrived copies.
- Van crews — move reserved copies between branches from the day's manifest.
- The catalogue system — the external system that holds the copies, their availability and the members.

Scope:
In scope: reservations and holds from request to collection or cancellation, the van manifest and notifications.
Out of scope: loans, returns and the catalogue itself, which stay in the catalogue system.

Journey:
1. A member finds a title in the app and reserves it for collection at a chosen branch.
2. The reservation service places the member in the title's queue and shows their position.
3. When a copy becomes available, the service puts it on the van manifest to the chosen branch.
4. Branch staff shelve the arrived copy and the member is notified that it is ready.
5. The member collects the copy within the hold period, or the hold is cancelled and the copy goes to the next member.

Requirements:
- Members must be able to reserve a title from the app at any time and see their queue position.
- The reservation service must accept 1000 holds per hour when a popular title is released.
- The reservation service must confirm a reservation within 3 seconds while the catalogue system is slow.
- The reservation service must produce each branch's van manifest by 7 am every working day.
- The reservation service must notify the member within 24 hours of a copy arriving.
- Branch staff must be able to place, change and cancel a reservation for a member at the desk.
- The reservation service must cancel a hold not collected within 7 days and offer the copy to the next member.
- The reservation service should show a member's outstanding fines beside their reservations.

Constraints:
- Members' personal data must be handled in line with the data protection regulation that applies to the council.
- Notifications must not include the title of a reserved item when they go to a shared household address.
- The app and the website must be live by the end of the year for all twelve branches.

Assumptions:
- We assume the catalogue system can tell the service within a minute when a copy is returned and available.

Open questions:
- Should a member be able to hold more than one copy of the same title?
- Who decides the queue order when a copy is returned to a branch with a waiting member?
- How long should the collection shelf hold a copy for a member who is away?`
};

// The whole brief a reference project keeps, or null for any other template.
export function referenceBrief(id) {
  const r = REFERENCE_PROJECTS.find(x => x.id === id);
  return r && Object.hasOwn(BODIES, id) ? r.brief + '\n\n' + BODIES[id] : null;
}

// One drafted record committed as the governed chain commits it: the drafter's provenance through the guide's own
// check, compileCreation with the drafted answers, the provenance written to what it created. The drafter applied the
// same record to its own copy of the journey; the ids this commit creates must be the ones it named, or a later
// chapter would cite records that do not exist, so a difference stops the generation.
function commit(p, chapter, record, at) {
  if (record.blocked) throw Error(`The reference journey could not draft Chapter ${chapter} ${record.key}: ${record.blocked}`);
  const provenance = journeyProvenance(p, record.provenance), r = compileCreation(p, chapter, record.answers, at);
  if (JSON.stringify(r.created) !== JSON.stringify(record.creates || [])) throw Error(`Chapter ${chapter} ${record.key} created ${r.created.join(', ')} where the draft named ${(record.creates || []).join(', ')}.`);
  let next = withJourneyProvenance(r.document, chapter, r.created, provenance, at);
  // What follows the guided commit, as the journey review saves it: the Chapter 1 links between context records.
  for (const command of record.extras || []) if (FOLLOW_UP[command.type]) next = FOLLOW_UP[command.type](next, command, at).document;
  return next;
}
const FOLLOW_UP = {relationship: applyCommand};

// A reference project from a new project that already keeps its reference brief (createProject). Returns the project.
export function referenceJourney(input, id, at) {
  const ref = REFERENCE_PROJECTS.find(r => r.id === id), text = referenceBrief(id);
  if (!ref || !text) throw Error('Choose an available reference journey.');
  const source = briefSource(input);
  if (!source.kept || source.text !== text) throw Error('A reference journey is drafted from its own brief, kept as the project\'s first evidence source.');
  const brief = interpretBrief(source.text, {name: input.name}), {chapters} = draftJourney(input, {brief, at});
  let p = structuredClone(input);
  for (const draft of chapters) for (const record of draft.records) p = commit(p, draft.chapter, record, at);
  p.brief.source = `AIW authored teaching example: the brief of the reference journey ${ref.title}, kept as ${source.sourceId}.`;
  p.workspace.reference = {id, authority: REFERENCE_AUTHORITY, drafted: REFERENCE_DRAFTED, verified: false};
  return p;
}
