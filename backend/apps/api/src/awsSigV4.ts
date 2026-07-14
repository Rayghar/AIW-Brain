import { createHash, createHmac } from 'node:crypto';
function hash(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }
function hmac(key: Uint8Array | string, value: string): Buffer { return createHmac('sha256', key).update(value).digest(); }
function encode(value: string): string { return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`); }
export function signAwsRequest(input: { method: string; url: string; service: string; region: string; accessKeyId: string; secretAccessKey: string; sessionToken?: string; body?: string; headers?: Record<string,string>; now?: Date }): Headers {
  const now = input.now ?? new Date(); const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); const date = amzDate.slice(0,8); const url = new URL(input.url); const body = input.body ?? '';
  const rawHeaders: Record<string,string> = { host: url.host, 'x-amz-date': amzDate, 'x-amz-content-sha256': hash(body), ...(input.sessionToken ? { 'x-amz-security-token': input.sessionToken } : {}), ...(input.headers ?? {}) };
  const normalized = Object.fromEntries(Object.entries(rawHeaders).map(([key,value]) => [key.toLowerCase(), value.trim().replace(/\s+/g,' ')]));
  const signedHeaders = Object.keys(normalized).sort().join(';'); const canonicalHeaders = Object.keys(normalized).sort().map((key) => `${key}:${normalized[key]}\n`).join('');
  const query = [...url.searchParams.entries()].sort(([a,av],[b,bv]) => a.localeCompare(b)||av.localeCompare(bv)).map(([k,v]) => `${encode(k)}=${encode(v)}`).join('&');
  const canonicalRequest = [input.method.toUpperCase(), url.pathname.split('/').map(encodeURIComponent).join('/').replace(/%2F/g,'/'), query, canonicalHeaders, signedHeaders, hash(body)].join('\n');
  const scope = `${date}/${input.region}/${input.service}/aws4_request`; const stringToSign = ['AWS4-HMAC-SHA256',amzDate,scope,hash(canonicalRequest)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`,date),input.region),input.service),'aws4_request'); const signature = createHmac('sha256',key).update(stringToSign).digest('hex');
  normalized.authorization = `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return new Headers(normalized);
}
