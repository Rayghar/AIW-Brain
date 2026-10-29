// Security-relevant events written to the server log as one JSON line each (audit B-17): who changed whose
// access to what. The local server writes sign-in events the same way (server.js). Errors use the same shape
// (round 2, B2-10): one line, a request id when there is one, the first lines of the stack, never a bare trace.
export function auditEvent(event, details) {
  console.log(JSON.stringify({at: new Date().toISOString(), event, ...details}));
}
export function errorEvent(event, error, details = {}) {
  const stack = typeof error?.stack === 'string' ? error.stack.split('\n').slice(0, 6).join(' | ') : null;
  console.error(JSON.stringify({at: new Date().toISOString(), event, ...details, message: String(error?.message ?? error), ...(error?.code ? {code: error.code} : {}), ...(stack ? {stack} : {})}));
}
