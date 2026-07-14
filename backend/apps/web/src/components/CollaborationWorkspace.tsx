import { useMemo, useState } from 'react';
import { Activity, Bell, CheckCircle2, Clock3, MessageSquarePlus, MessagesSquare, Radio, UserCheck, Users } from 'lucide-react';
import { architectureStages, type ArchitectureStage } from '@aiw/domain';
import { useWorkspaceStore } from '../store/workspaceStore';

export function CollaborationWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const currentUserId = useWorkspaceStore((state) => state.currentUserId);
  const setCurrentUser = useWorkspaceStore((state) => state.setCurrentUser);
  const assignStageReview = useWorkspaceStore((state) => state.assignStageReview);
  const completeStageReview = useWorkspaceStore((state) => state.completeStageReview);
  const createDiscussionThread = useWorkspaceStore((state) => state.createDiscussionThread);
  const addThreadComment = useWorkspaceStore((state) => state.addThreadComment);
  const resolveDiscussionThread = useWorkspaceStore((state) => state.resolveDiscussionThread);
  const markNotificationRead = useWorkspaceStore((state) => state.markNotificationRead);
  const runExpiryCheck = useWorkspaceStore((state) => state.runExpiryCheck);
  const [stage, setStage] = useState<ArchitectureStage>('logicalApplication');
  const [reviewer, setReviewer] = useState('user-reviewer');
  const [instructions, setInstructions] = useState('Review architecture completeness, trade-offs, governance findings and decision traceability.');
  const [threadTitle, setThreadTitle] = useState('Architecture review discussion');
  const [threadBody, setThreadBody] = useState('Please review this stage and record any material architecture concerns.');
  const collaborationPresence = useWorkspaceStore((state) => state.collaborationPresence);
  const recentActivity = useWorkspaceStore((state) => state.recentActivity);
  const [commentBodies, setCommentBodies] = useState<Record<string, string>>({});
  const currentUser = project.members.find((member) => member.id === currentUserId);
  const reviewCandidates = project.members.filter((member) => member.status === 'active' && ['reviewer', 'governance', 'owner'].includes(member.role));
  const notifications = project.notifications.filter((item) => item.recipientId === currentUserId);
  const unread = notifications.filter((item) => !item.readAt).length;
  const assignments = useMemo(() => project.reviewAssignments.filter((item) => item.branchId === project.branch.id), [project.reviewAssignments, project.branch.id]);

  return (
    <section className="studio-page governance-page collaboration-page">
      <div className="page-heading">
        <div><span className="eyebrow">Enterprise collaboration</span><h2>People, reviews & architecture conversations</h2><p>Coordinate architecture work without separating discussion, review and governance from the canonical model.</p></div>
        <button className="button button--secondary" onClick={runExpiryCheck}><Clock3 size={15}/> Check due dates</button>
      </div>

      <section className="collaboration-grid collaboration-grid--overview">
        <article className="collaboration-panel">
          <div className="governance-heading"><Radio size={18}/><div><h3>Live presence</h3><p>Connected collaborators on {project.branch.name}.</p></div></div>
          <div className="presence-list">{collaborationPresence.length ? collaborationPresence.map((presence) => { const member = project.members.find((item) => item.id === presence.userId); return <div key={presence.connectionId}><span className="presence-dot"/><span><strong>{member?.displayName ?? presence.userId}</strong><small>{presence.stage}{presence.selectedNodeId ? ` · ${presence.selectedNodeId}` : ''}</small></span></div>; }) : <div className="empty-card">No other active collaborators are connected.</div>}</div>
        </article>
        <article className="collaboration-panel">
          <div className="governance-heading"><Activity size={18}/><div><h3>Shared activity</h3><p>Server events for project saves, operations and reviews.</p></div></div>
          <div className="activity-list">{recentActivity.filter((item) => item.projectId === project.id).slice(0,8).map((item) => <div key={item.id}><strong>{item.summary}</strong><small>{item.actorId} · {new Date(item.createdAt).toLocaleTimeString()}</small></div>)}{!recentActivity.some((item) => item.projectId === project.id) ? <div className="empty-card">Activity will appear when connected users save or collaborate.</div> : null}</div>
        </article>
      </section>

      <section className="collaboration-grid collaboration-grid--overview">
        <article className="collaboration-panel">
          <div className="governance-heading"><Users size={18}/><div><h3>Active identity</h3><p>Change the simulated actor to exercise role permissions and personal work queues.</p></div></div>
          <select value={currentUserId} onChange={(event) => setCurrentUser(event.target.value)}>
            {project.members.filter((member) => member.status === 'active').map((member) => <option key={member.id} value={member.id}>{member.displayName} · {member.role}</option>)}
          </select>
          <div className="member-grid">
            {project.members.map((member) => <div key={member.id} className={member.id === currentUserId ? 'member-chip active' : 'member-chip'}><strong>{member.displayName}</strong><span>{member.role}</span><small>{member.email}</small></div>)}
          </div>
        </article>

        <article className="collaboration-panel">
          <div className="governance-heading"><Bell size={18}/><div><h3>Notifications</h3><p>{unread} unread item{unread === 1 ? '' : 's'} for {currentUser?.displayName ?? 'the current user'}.</p></div></div>
          <div className="notification-list">
            {notifications.length ? notifications.slice(0, 8).map((item) => <button key={item.id} className={item.readAt ? 'read' : ''} onClick={() => markNotificationRead(item.id)}><span><strong>{item.title}</strong><small>{item.message}</small></span><b>{item.readAt ? 'READ' : 'NEW'}</b></button>) : <div className="empty-card">No notifications for this user.</div>}
          </div>
        </article>
      </section>

      <section className="collaboration-grid">
        <article className="collaboration-panel">
          <div className="governance-heading"><UserCheck size={18}/><div><h3>Assign an architecture review</h3><p>Assignments are branch- and stage-specific and include due dates and notifications.</p></div></div>
          <div className="collaboration-form">
            <label><span>Stage</span><select value={stage} onChange={(event) => setStage(event.target.value as ArchitectureStage)}>{architectureStages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span>Reviewer</span><select value={reviewer} onChange={(event) => setReviewer(event.target.value)}>{reviewCandidates.map((member) => <option key={member.id} value={member.id}>{member.displayName} · {member.role}</option>)}</select></label>
            <label className="wide"><span>Instructions</span><textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={3}/></label>
            <button className="button button--primary" onClick={() => assignStageReview(stage, reviewer, instructions, 'high')}>Assign review</button>
          </div>
        </article>

        <article className="collaboration-panel">
          <div className="governance-heading"><MessageSquarePlus size={18}/><div><h3>Start a stage discussion</h3><p>Threads are attached to model records and retained with the project history.</p></div></div>
          <div className="collaboration-form">
            <label><span>Title</span><input value={threadTitle} onChange={(event) => setThreadTitle(event.target.value)}/></label>
            <label><span>Stage</span><select value={stage} onChange={(event) => setStage(event.target.value as ArchitectureStage)}>{architectureStages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="wide"><span>Opening comment</span><textarea value={threadBody} onChange={(event) => setThreadBody(event.target.value)} rows={3}/></label>
            <button className="button button--primary" onClick={() => createDiscussionThread('stage', stage, threadTitle, threadBody)}>Create discussion</button>
          </div>
        </article>
      </section>

      <section className="governance-section">
        <div className="governance-heading"><UserCheck size={18}/><div><h3>Review work queue</h3><p>Open, overdue and completed reviews for the active architecture branch.</p></div></div>
        <div className="review-queue">
          {assignments.length ? assignments.map((assignment) => {
            const assignee = project.members.find((member) => member.id === assignment.assignedTo);
            const canComplete = assignment.assignedTo === currentUserId || ['owner','governance','reviewer'].includes(currentUser?.role ?? 'viewer');
            return <article key={assignment.id}><div><strong>{assignment.stage}</strong><span className={`status-pill ${assignment.status}`}>{assignment.status}</span></div><p>{assignment.instructions}</p><small>{assignee?.displayName ?? assignment.assignedTo} · due {assignment.dueAt ? new Date(assignment.dueAt).toLocaleDateString() : 'not set'} · {assignment.priority}</small>{canComplete && !['completed','cancelled'].includes(assignment.status) ? <button onClick={() => completeStageReview(assignment.id)}><CheckCircle2 size={14}/> Mark complete</button> : null}</article>;
          }) : <div className="empty-card">No review assignments for this branch.</div>}
        </div>
      </section>

      <section className="governance-section">
        <div className="governance-heading"><MessagesSquare size={18}/><div><h3>Threaded architecture discussions</h3><p>Resolve conversations only when the architecture concern has been addressed.</p></div></div>
        <div className="thread-list">
          {project.discussionThreads.length ? project.discussionThreads.map((thread) => <article key={thread.id} className={thread.status === 'resolved' ? 'resolved' : ''}><div className="thread-head"><span><strong>{thread.title}</strong><small>{thread.targetType}: {thread.targetId} · {thread.status}</small></span>{thread.status === 'open' ? <button onClick={() => resolveDiscussionThread(thread.id)}>Resolve</button> : null}</div><div className="thread-comments">{thread.comments.map((comment) => { const author = project.members.find((member) => member.id === comment.authorId); return <div key={comment.id}><strong>{author?.displayName ?? comment.authorId}</strong><p>{comment.body}</p><small>{new Date(comment.createdAt).toLocaleString()}</small></div>; })}</div>{thread.status === 'open' ? <div className="thread-reply"><input value={commentBodies[thread.id] ?? ''} onChange={(event) => setCommentBodies((current) => ({ ...current, [thread.id]: event.target.value }))} placeholder="Add a response"/><button onClick={() => { const body = commentBodies[thread.id]?.trim(); if (!body) return; addThreadComment(thread.id, body); setCommentBodies((current) => ({ ...current, [thread.id]: '' })); }}>Reply</button></div> : null}</article>) : <div className="empty-card">No architecture discussions have been created.</div>}
        </div>
      </section>
    </section>
  );
}
