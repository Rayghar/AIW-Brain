// The reference journeys the Projects page offers (round 4; audit/round4/DESIGN.md, "Reference projects"): only what
// the picker shows. Each reference project is generated on the server from its brief — the brief interpreter, the
// journey drafter and the guided chain (shared/reference-journeys.js) — so no project content lives here: the id, the
// title, one line about it and the brief's first line, which is also the first line of the brief the project keeps.
export const REFERENCE_PROJECTS=[
{id:'service-permits',title:'Citizen service requests',description:'A case-management example: submission, evidence, assessment, decision and status.',brief:'Citizen service requests: a brief for one case-management service (an AIW authored teaching example).'},
{id:'warehouse-fulfilment',title:'Warehouse fulfilment',description:'An operations example: reservations, asynchronous fulfilment and traceability.',brief:'Warehouse fulfilment: a brief for reserving stock and tracing every order to its delivery (an AIW authored teaching example).'},
{id:'clinic-appointments',title:'Clinic appointments',description:'A scheduling example: booking, reminders, rescheduling and no-show handling.',brief:'Clinic appointments: a brief for booking, reminders, rescheduling and no-show handling (an AIW authored teaching example).'},
{id:'parcel-lockers',title:'Municipal parcel lockers',description:'A connected-devices example: courier deposits, resident collection, payments and an operations desk over a locker network.',brief:'Municipal parcel lockers: a brief for a city\'s parcel-locker network, from courier deposit to resident collection (an AIW authored teaching example).'},
{id:'library-reservations',title:'Library reservations',description:'A multi-branch example: holds and reservations across branches, a mobile app, a catalogue system, notifications and fines.',brief:'Library reservations: a brief for holds and reservations across a public library\'s branches, its app and its catalogue (an AIW authored teaching example).'}
];
