import type { ArchitectureProject, CollaborationOperationBatch, CollaborationPresence } from '@aiw/domain';

export interface AiwClientOptions {
  baseUrl: string;
  tenantId: string;
  userId: string;
  token?: string;
  retryLimit?: number;
}

export class AiwCollaborationClient {
  constructor(private readonly options: AiwClientOptions) {}
  private async request(path: string, init: RequestInit, timeoutMs = 5_000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('AIW_COLLABORATION_TIMEOUT'), timeoutMs);
    try {
      return await fetch(`${this.options.baseUrl}${path}`, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }
  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-aiw-tenant-id': this.options.tenantId,
      'x-aiw-user-id': this.options.userId,
      ...(this.options.token ? { authorization: `Bearer ${this.options.token}` } : {}),
      ...extra,
    };
  }

  async applyOperations(batch: CollaborationOperationBatch): Promise<ArchitectureProject> {
    const retries = this.options.retryLimit ?? 3;
    let attempt = 0;
    while (true) {
      const response = await this.request(`/api/projects/${batch.projectId}/branches/${batch.branchId}/operations`, {
        method: 'POST', headers: this.headers({ 'idempotency-key': batch.idempotencyKey }), body: JSON.stringify(batch),
      });
      if (response.ok) return response.json() as Promise<ArchitectureProject>;
      if (response.status === 409 || response.status < 500 || attempt >= retries) throw new Error(`AIW_OPERATION_FAILED:${response.status}:${await response.text()}`);
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, Math.min(2000, 100 * 2 ** attempt)));
    }
  }

  async heartbeat(input: Omit<CollaborationPresence, 'tenantId' | 'userId' | 'lastSeenAt'>): Promise<CollaborationPresence> {
    const response = await this.request('/api/presence/heartbeat', { method: 'POST', headers: this.headers(), body: JSON.stringify(input) });
    if (!response.ok) throw new Error(`AIW_PRESENCE_FAILED:${response.status}`);
    return response.json() as Promise<CollaborationPresence>;
  }

  subscribe(onActivity: (payload: string) => void): AbortController {
    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    controller.signal.addEventListener('abort', () => { void reader?.cancel().catch(() => undefined); }, { once: true });
    void (async () => {
      const response = await fetch(`${this.options.baseUrl}/api/events`, {
        headers: this.headers({ accept: 'text/event-stream' }),
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok || !response.body) throw new Error(`AIW_EVENT_STREAM_FAILED:${response.status}`);
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';
          for (const frame of frames) {
            const event = frame.match(/^event:\s*(.+)$/m)?.[1];
            const data = frame.match(/^data:\s*(.+)$/m)?.[1];
            if (event === 'activity' && data) onActivity(data);
          }
        }
      } finally {
        reader.releaseLock();
      }
    })().catch((error) => { if (!controller.signal.aborted) console.error(error); });
    return controller;
  }
}
