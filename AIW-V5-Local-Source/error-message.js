// What an API error may say to the browser (audit B-16). Validation messages are written for the person
// and thrown as Error; they are returned as they are. A programming fault (TypeError, ReferenceError,
// RangeError, SyntaxError and the like) is logged on the server and answered with a general message, so
// internal details never reach the page.
import {JSON_HEADERS} from './http.js';
const INTERNAL = [TypeError, ReferenceError, RangeError, SyntaxError, EvalError, URIError];
export function publicMessage(error) {
  if (!error || INTERNAL.some((Type) => error instanceof Type) || typeof error.message !== 'string' || !error.message) {
    console.error(JSON.stringify({at: new Date().toISOString(), event: 'fault', message: String(error?.message || error), stack: typeof error?.stack === 'string' ? error.stack.split('\n').slice(0, 6).join(' | ') : null}));
    return 'This action could not be completed. Your input is kept; reload the project and try again.';
  }
  return error.message;
}

// An integrity fault (round 2, B2-06): a stored reference whose object is missing or whose checksum does not
// match. It is permanent until an operator restores the files, so it is never reported as a transient storage
// outage: the route answers 422 with code "integrity" and the fault is logged with the key it names.
export const INTEGRITY = 'integrity';
export function integrityError(message, key = null) {
  return Object.assign(Error(message), {code: INTEGRITY, ...(key ? {key} : {})});
}
export const isIntegrityError = (error) => error?.code === INTEGRITY;
export const isInternalError = (error) => !error || INTERNAL.some((Type) => error instanceof Type);

// One answer for a service's final catch: an integrity fault is 422 with code "integrity" and one JSON log line
// naming the key; anything else is the person-readable message (or the general one for a fault) at `status`.
export function errorResponse(error, status = 400, context = {}) {
  if (isIntegrityError(error)) {
    console.error(JSON.stringify({at: new Date().toISOString(), event: 'integrity-fault', ...context, key: error.key || null, message: error.message}));
    return new Response(JSON.stringify({error: error.message, code: INTEGRITY}), {status: 422, headers: JSON_HEADERS});
  }
  return new Response(JSON.stringify({error: publicMessage(error)}), {status, headers: JSON_HEADERS});
}
