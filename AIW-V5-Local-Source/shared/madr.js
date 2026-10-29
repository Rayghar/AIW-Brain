// Round 6, Contract F and Contract I: decision records in (interpretMADR) and out (madrExport). The rules live in
// public/madr.js, because the browser loads only public/ and Chapter 3's Output tab writes the files there; this module
// re-exports that one for the server, the model interpreter and the suites, so there is one reading of MADR, not two.
export {interpretMADR, madrExport, madrText, madrRoundTrip, MADR_RULES, MADR_LIMITS} from '../public/madr.js';
