// Output eligibility needs only the recorded operation. Specification parsing and
// payload validation load when their existing workbench dialogs are requested.
// A qualifier is preserved in the export receipt, never accepted as an endpoint.
export function contractOperation(value){const [operation,...notes]=String(value||'').trim().split(/\s+[·|—]\s+/);return {operation:operation.trim(),qualifier:notes.join(' · ').trim()};}
export function httpOperation(value){const {operation,qualifier}=contractOperation(value),match=/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|TRACE)\s+(\/\S*)$/i.exec(operation);return match?{method:match[1].toLowerCase(),path:match[2],qualifier}:null;}
