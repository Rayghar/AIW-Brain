import { useEffect, useRef } from 'react';
import type { ActivityEvent, CollaborationPresence } from '@aiw/domain';
import { AiwCollaborationClient } from '../lib/collaborationClient';
import { apiSession, getJson } from '../lib/apiClient';
import { useWorkspaceStore } from '../store/workspaceStore';

function connectionId(): string {
  const existing = sessionStorage.getItem('aiw-connection-id');
  if (existing) return existing;
  const created = `web-${crypto.randomUUID()}`;
  sessionStorage.setItem('aiw-connection-id', created);
  return created;
}

function collaborationClient(): AiwCollaborationClient {
  const session = apiSession();
  return new AiwCollaborationClient({
    baseUrl: '',
    tenantId: session.tenantId,
    userId: session.userId,
    ...(session.token ? { token: session.token } : {}),
  });
}

export function CollaborationRuntime() {
  const projectId = useWorkspaceStore((state) => state.project.id);
  const branchId = useWorkspaceStore((state) => state.project.branch.id);
  const activeStage = useWorkspaceStore((state) => state.project.activeStage);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const serverPersistenceEnabled = useWorkspaceStore((state) => state.serverPersistenceEnabled);
  const currentUserId = useWorkspaceStore((state) => state.currentUserId);
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);

  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; }, [selectedNodeId]);

  // Presence changes with stage and selection; the activity stream does not. Keeping
  // them separate prevents a new long-lived SSE connection for every canvas click.
  useEffect(() => {
    if (!serverPersistenceEnabled) return;
    const client = collaborationClient();
    let active = true;
    let consecutiveFailures = 0;
    let nextRetryAt = 0;
    let lastPresenceListRefresh = 0;
    const syncPresence = async () => {
      try {
        const selected = selectedNodeIdRef.current;
        await client.heartbeat({ connectionId: connectionId(), branchId, stage: activeStage, ...(selected ? { selectedNodeId: selected } : {}) });
        consecutiveFailures = 0;
        nextRetryAt = 0;
        const now = Date.now();
        if (now - lastPresenceListRefresh >= 60_000) {
          const presence = await getJson<CollaborationPresence[]>(`/api/presence/${encodeURIComponent(branchId)}`);
          lastPresenceListRefresh = now;
          if (active) useWorkspaceStore.setState({ collaborationPresence: presence });
        }
      } catch {
        consecutiveFailures += 1;
        // Collaboration is optional in local/offline mode. Stop creating main-thread
        // pressure and console noise after repeated connection failures.
        if (consecutiveFailures >= 3 && active) {
          nextRetryAt = Date.now() + 120_000;
          useWorkspaceStore.setState({ collaborationPresence: [] });
        }
      }
    };
    void syncPresence();
    const heartbeat = window.setInterval(() => {
      if (consecutiveFailures < 3 || Date.now() >= nextRetryAt) void syncPresence();
    }, 30_000);
    return () => { active = false; window.clearInterval(heartbeat); };
  }, [branchId, activeStage, serverPersistenceEnabled]);

  useEffect(() => {
    if (!serverPersistenceEnabled) return;
    const client = collaborationClient();
    const stream = client.subscribe((payload) => {
      try {
        const event = JSON.parse(payload) as ActivityEvent;
        const state = useWorkspaceStore.getState();
        useWorkspaceStore.setState({ recentActivity: [event, ...state.recentActivity.filter((item) => item.id !== event.id)].slice(0, 100) });
        if (event.projectId === state.project.id && event.actorId !== currentUserId && event.revision > state.project.revision) {
          if (state.persistenceStatus === 'saved') void state.loadProjectFromServer(state.project.id, state.project.branch.id);
          else useWorkspaceStore.setState({ persistenceStatus: 'conflict', notice: `${event.actorId} changed this branch while you have local edits. Save, reload or compare before continuing.` });
        }
      } catch { /* Ignore malformed event frames. */ }
    });
    return () => stream.abort();
  }, [projectId, serverPersistenceEnabled, currentUserId]);

  return null;
}
