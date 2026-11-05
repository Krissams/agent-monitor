// Pure transition detection, shared with the Node tests. Never infer a run failure.
export class AlertTracker {
  constructor() { this.previous = null; this.refreshedAt = 0; }
  update(chats, refreshedAt, sourceOk = true) {
    if (!sourceOk || !refreshedAt) return [];
    const current = new Map(chats.map(chat => [chat.id, chat]));
    const alerts = [];
    if (this.previous) for (const chat of chats) {
      if (chat.stale || !chat.runId) continue;
      const before = this.previous.get(chat.id);
      const completedNow = (chat.runStatus || chat.status) === 'completed' && (
        (before?.runId === chat.runId && (before.runStatus || before.status) !== 'completed') ||
        (before?.runId !== chat.runId && chat.finishedAt > this.refreshedAt)
      );
      if (completedNow) alerts.push({ key: `${chat.id}:${chat.runId}:completed`, kind: 'completed' });
      // Request IDs prevent repeats when the reader reconnects or the order changes.
      if (['waitingApproval', 'waitingInput'].includes(chat.status) && chat.requestId &&
          (chat.requestIds ? chat.requestIds.some(id => !(before?.requestIds || []).includes(id)) : before?.requestId !== chat.requestId)) {
        const ids = (chat.requestIds || [chat.requestId]).filter(id => !(before?.requestIds || [before?.requestId]).includes(id));
        alerts.push({ key: `${chat.id}:${chat.status}:${ids.join('|')}`, kind: 'attention' });
      }
    }
    this.previous = current;
    this.refreshedAt = refreshedAt;
    return alerts;
  }
}
