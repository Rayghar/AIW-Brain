// The component library (round 11, workstream F, first increment): the core the domains need. A library entry of kind
// `component` holds a component specification snapshot: what one project's design recorded about one component, read
// through componentSpec (design-spec.js) at the time it was filed. It names things (interfaces, data, needs,
// obligations) and keeps texts; it holds no record and no secret. The same shape sits in the project library
// (workbench-domain.js, workspace.catalogue) and in the organisation library (organization-service.js), whose review,
// signed releases and pins apply unchanged.
//
// This module reads and checks a snapshot and what travels with a proposal (realisation-domain.js, the reviewed
// realisation.candidate path); the builders (the snapshot of a project component, the proposals from an entry or a
// catalogue archetype) are component-snapshot.js, loaded only by the surfaces that need them. Library content is
// knowledge: it enters no score, no hard constraint and no conformance reading. Pure.
import {redactSecretsDeep} from './secret-redaction.js';
import {CATALOGUE} from './catalogue-index.js';
import {list, str, num, uniq} from './util.js';

export const COMPONENT_LIBRARY_KIND = 'component';
export const SNAPSHOT_SCHEMA = 'aiw.component-snapshot.v1';
export const LIBRARY_KEYS = ['library', 'archetype'];
export const SNAPSHOT_LIMIT = 30000;
// What a snapshot holds at most: entries per list, characters per name and per text.
export const LIST = 24, NAME = 160, TEXT = 1200;
export const clip = (v, n = TEXT) => str(v).slice(0, n);
export const names = xs => uniq(list(xs).map(x => clip(x, NAME)).filter(Boolean)).slice(0, LIST);
const faceKind = k => (str(k) === 'event' ? 'event' : str(k) === 'batch' ? 'batch' : 'request');

// Reads a library entry's content as a snapshot: the stored JSON, checked and normalised (every list bounded, every text
// clipped, secrets redacted). Throws when the content is not a component snapshot.
export function readComponentSnapshot(content) {
  let raw;
  try { raw = typeof content === 'string' ? JSON.parse(content) : content; } catch { raw = null; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schema !== SNAPSHOT_SCHEMA || !str(raw.identity?.title)) throw Error('A component entry holds a component specification snapshot. File one from a project component.');
  const face = f => ({title: clip(f?.title, NAME), ref: clip(f?.ref, 40), kind: faceKind(f?.kind), provider: clip(f?.provider, NAME), consumer: clip(f?.consumer, NAME), promises: Object.fromEntries(Object.entries(f?.promises && typeof f.promises === 'object' ? f.promises : {}).slice(0, 20).map(([k, v]) => [clip(k, 40), clip(v, 300)])), exchanges: list(f?.exchanges).slice(0, LIST).map(x => ({role: clip(x?.role, 40), data: clip(x?.data, NAME)}))});
  const snapshot = {
    schema: SNAPSHOT_SCHEMA,
    identity: {ref: clip(raw.identity.ref, 40), title: clip(raw.identity.title, NAME), kind: clip(raw.identity.kind, 40), status: clip(raw.identity.status, 40), owner: clip(raw.identity.owner, 180), revision: num(raw.identity.revision) ?? 1},
    purpose: clip(raw.purpose), boundary: clip(raw.boundary),
    responsibilities: list(raw.responsibilities).slice(0, LIST).map(x => clip(x, 400)).filter(Boolean),
    interfaces: {provides: list(raw.interfaces?.provides).slice(0, LIST).map(face), requires: list(raw.interfaces?.requires).slice(0, LIST).map(face)},
    data: {owned: names(raw.data?.owned), consumed: names(raw.data?.consumed), produced: names(raw.data?.produced), inputs: clip(raw.data?.inputs), outputs: clip(raw.data?.outputs)},
    technology: {needs: list(raw.technology?.needs).slice(0, LIST).map(n => ({category: clip(n?.category, 40), description: clip(n?.description, 400), criticality: clip(n?.criticality, 40), capability: clip(n?.capability, NAME)})), asWritten: clip(raw.technology?.asWritten)},
    obligations: list(raw.obligations).slice(0, 2 * LIST).map(o => ({kind: clip(o?.kind, 40) || 'obligation', title: clip(o?.title, NAME), detail: clip(o?.detail, 400)})).filter(o => o.title),
    origin: {project: {id: clip(raw.origin?.project?.id, 80), name: clip(raw.origin?.project?.name, NAME)}, component: {id: clip(raw.origin?.component?.id, 100), ref: clip(raw.origin?.component?.ref, 40), title: clip(raw.origin?.component?.title, NAME)}, at: clip(raw.origin?.at, 40)},
  };
  return redactSecretsDeep(snapshot);
}
export const snapshotText = snapshot => JSON.stringify(snapshot);

// The catalogue's component archetypes, by id and name, from the small index (catalogue-index.js): what a list can show
// and a reference can be checked against without loading the catalogue.
export const COMPONENT_ARCHETYPES = Object.freeze(CATALOGUE.records.filter(r => r.type === 'component-archetype').map(r => Object.freeze({id: r.id, name: r.name})));
export const isArchetypeId = id => COMPONENT_ARCHETYPES.some(a => a.id === id);

// What travels with a proposal besides the component: bounded, text only. Stored on the candidate record as `proposed`.
export function cleanProposed(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    contracts: list(r.contracts).slice(0, LIST).map(k => ({title: clip(k?.title, NAME), kind: faceKind(k?.kind), role: str(k?.role) === 'requires' ? 'requires' : 'provides', other: clip(k?.other, NAME), promises: clip(k?.promises, 600), exchanges: clip(k?.exchanges, 600)})).filter(k => k.title),
    needs: list(r.needs).slice(0, LIST).map(n => ({category: clip(n?.category, 40), description: clip(n?.description, 400), criticality: clip(n?.criticality, 40)})).filter(n => n.description),
    obligations: list(r.obligations).slice(0, 2 * LIST).map(o => ({kind: clip(o?.kind, 40) || 'obligation', title: clip(o?.title, NAME), detail: clip(o?.detail, 400)})).filter(o => o.title),
  };
}
// Where a proposal came from: a project library entry, an organisation library entry or a catalogue archetype.
export function cleanLibraryRef(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const scope = ['project', 'organisation', 'catalogue'].includes(r.scope) ? r.scope : null;
  if (!scope) throw Error('Say where the proposal comes from: the project library, an organisation library or the catalogue.');
  const ref = {scope, title: clip(r.title, NAME)};
  if (scope === 'catalogue') { if (!isArchetypeId(r.archetypeId)) throw Error('Choose one of the catalogue’s component archetypes.'); ref.archetypeId = r.archetypeId; ref.releaseId = clip(r.releaseId, 60); ref.recordSha256 = clip(r.recordSha256, 64); }
  else { if (!str(r.entryId)) throw Error('Choose a library entry.'); ref.entryId = clip(r.entryId, 100); ref.revision = num(r.revision) ?? null; ref.contentHash = clip(r.contentHash, 64); if (scope === 'organisation') { if (!str(r.organizationId)) throw Error('Name the organisation the entry belongs to.'); ref.organizationId = clip(r.organizationId, 100); ref.organizationTitle = clip(r.organizationTitle, NAME); } }
  return ref;
}
