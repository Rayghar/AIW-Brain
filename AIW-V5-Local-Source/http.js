// The API's JSON answer, in one place (round 2, B2-21): every service answers with the same content type, no caching
// and no content sniffing. Error answers go through errorResponse (error-message.js), which uses the same headers.
export const JSON_HEADERS = Object.freeze({'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
export const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: JSON_HEADERS});
