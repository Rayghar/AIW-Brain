import { useEffect } from 'react';
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

  // Presence changes with stage and selection; the activity stream does not. Keeping
  // them separate prevents a new long-lived SSE connection for every canvas click.
  useEffect(() => {
    if (!serverPersistenceEnabled) return;
    const client = collaborationClient();
    let active = true;
    const syncPresence = async () => {
      try {
        await client.heartbeat({ connectionId: connectionId(), branchId, stage: activeStage, ...(selectedNodeId ? { selectedNodeId } : {}) });
        const presence = await getJson<CollaborationPresence[]>(`/api/presence/${encodeURIComponent(branchId)}`);
        if (active) useWorkspaceStore.setState({ collaborationPresence: presence });
      } catch { /* Local/offline mode remains available. */ }
    };
    void syncPresence();
    const heartbeat = window.setInterval(() => void syncPresence(), 15_000);
    return () => { active = false; window.clearInterval(heartbeat); };
  }, [branchId, activeStage, selectedNodeId, serverPersistenceEnabled]);

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
