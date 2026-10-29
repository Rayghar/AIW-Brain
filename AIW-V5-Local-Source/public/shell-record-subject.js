// A saved chapter record is selectable in Work even when no diagram draws it.
// This adapter serves the shell inspector only; graph geometry and edges stay unchanged.
import {architectureModel, OBJECT_TYPES} from './architecture-model.js';
import {recordBelongsTo, resolveRecordRef} from './chapter-records.js';
const LAYER = {module:'logical',need:'technology',boundary:'security',party:'interface',environment:'deployment',zone:'deployment',instance:'deployment',path:'deployment'};
// `id` may be a reference (rc41, W3: APP-001 for api-pod); the subject it answers carries the record's id.
export function savedRecordSubject(project, chapter, id) {
  id = project && id ? resolveRecordRef(project, id, {chapter}) : null;
  if (!project || !id || !recordBelongsTo(project, chapter, id)) return null;
  const o = architectureModel(project).objects.get(id); if (!o) return null;
  return {id:o.id,ref:o.ref,title:o.title,description:o.description,layer:o.visual?.layer||LAYER[o.type]||'logical',sub:OBJECT_TYPES[o.type]?.label||o.type,attrs:{Reference:o.ref,Type:OBJECT_TYPES[o.type]?.label||o.type,...(o.owner?{Owner:o.owner}:{})},col:0,savedRecord:true};
}
