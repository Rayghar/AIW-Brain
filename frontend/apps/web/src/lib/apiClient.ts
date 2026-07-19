const TOKEN_KEY = 'aiw-access-token';
const TENANT_KEY = 'aiw-tenant-id';
const USER_KEY = 'aiw-user-id';


export interface AuthSessionStatus {
  principal: {
    subject: string;
    email: string;
    displayName: string;
    tenantId: string;
    providerId: string;
    issuedAt: string;
    expiresAt: string;
    roles?: string[];
    authMode?: string;
    roleSource?: string;
  };
  authenticated: boolean;
  accessMode: string;
  developmentAuthEnabled: boolean;
  guidance: string;
}

export function hasApiToken(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export interface ApiErrorPayload { error?: string; message?: string; currentRevision?: number; [key: string]: unknown }

export function setApiSession(input: { token?: string; tenantId?: string; userId?: string }): void {
  if (input.token) localStorage.setItem(TOKEN_KEY, input.token); else localStorage.removeItem(TOKEN_KEY);
  if (input.tenantId) localStorage.setItem(TENANT_KEY, input.tenantId);
  if (input.userId) localStorage.setItem(USER_KEY, input.userId);
}

export function clearApiSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem(USER_KEY);
}

export function apiSession(): { token?: string; tenantId: string; userId: string } {
  const token = localStorage.getItem(TOKEN_KEY) ?? undefined;
  return { ...(token ? { token } : {}), tenantId: localStorage.getItem(TENANT_KEY) ?? 'tenant-reference', userId: localStorage.getItem(USER_KEY) ?? 'user-owner' };
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const session = apiSession();
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-aiw-tenant-id': session.tenantId,
    'x-aiw-user-id': session.userId,
    ...(session.token ? { authorization: `Bearer ${session.token}` } : {}),
    ...extra,
  };
}

async function readPayload(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json().catch(() => ({}));
  return response.text().catch(() => '');
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...headers(), ...(init.headers as Record<string, string> | undefined) } });
  const payload = await readPayload(response);
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload ? payload as ApiErrorPayload : {};
    const error = new Error(detail.error ?? detail.message ?? `HTTP_${response.status}`) as Error & { status?: number; payload?: ApiErrorPayload };
    error.status = response.status;
    error.payload = detail;
    throw error;
  }
  return payload as T;
}

export async function getJson<T>(path: string): Promise<T> { return request<T>(path, { method: 'GET' }); }
export async function postJson<T>(path: string, body: unknown): Promise<T> { return request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
export async function patchJson<T>(path: string, body: unknown): Promise<T> { return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
export async function putJson<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> { return request<T>(path, { method: 'PUT', headers: extraHeaders, body: JSON.stringify(body) }); }
export async function deleteJson<T>(path: string): Promise<T> { return request<T>(path, { method: 'DELETE' }); }
