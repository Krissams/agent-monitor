import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AlertTracker } from '../public/alerts.js';
const chat = (status, extra = {}) => ({ id: 'chat', runId: 'one', status, stale: false, ...extra });
test('opening a dashboard never replays old completions or requests', () => {
  assert.deepEqual(new AlertTracker().update([chat('completed')], 100), []);
  assert.deepEqual(new AlertTracker().update([chat('waitingInput', {requestId:'request'})], 100), []);
});
test('completion alerts once across repeated polling and a disconnect', () => {
  const tracker = new AlertTracker();
  tracker.update([chat('working')], 100);
  assert.equal(tracker.update([chat('completed')], 105).length, 1);
  assert.equal(tracker.update([chat('completed')], 110).length, 0);
  assert.equal(tracker.update([chat('completed')], 110, false).length, 0);
  assert.equal(tracker.update([chat('completed')], 115).length, 0);
});
test('repeated runs in an existing chat have separate completion keys', () => {
  const tracker = new AlertTracker();
  tracker.update([chat('working')], 100);
  const first = tracker.update([chat('completed')], 105)[0];
  tracker.update([chat('working', {runId:'two'})], 110);
  const second = tracker.update([chat('completed', {runId:'two'})], 115)[0];
  assert.notEqual(first.key, second.key);
});
test('short new run finishing between polls can alert without a start snapshot', () => {
  const tracker = new AlertTracker();
  tracker.update([chat('completed', {finishedAt:99})], 100);
  assert.equal(tracker.update([chat('completed', {runId:'two',finishedAt:103})], 105).length, 1);
});
test('failure, interruption and stale data do not ring the completion bell', () => {
  for (const [status, stale] of [['failed',false], ['interrupted',false], ['completed',true]]) {
    const tracker = new AlertTracker(); tracker.update([chat('working')], 100);
    assert.equal(tracker.update([chat(status,{stale})], 105).length, 0);
  }
});
test('confirmed attention has its own deduplication key per request', () => {
  const tracker = new AlertTracker(); tracker.update([chat('working')], 100);
  const waiting = chat('waitingApproval', {requestId:'r1'});
  assert.equal(tracker.update([waiting], 105)[0].kind, 'attention');
  assert.equal(tracker.update([waiting], 110).length, 0);
  assert.equal(tracker.update([chat('waitingApproval',{requestId:'r2'})], 115).length, 1);
});
test('answering one question does not replay another unanswered question', () => {
  const tracker = new AlertTracker(); tracker.update([chat('working')],100);
  const both = chat('waitingInput',{requestId:'b',requestIds:['a','b']});
  assert.equal(tracker.update([both],105).length,1); // One alert for a multi-question request.
  assert.equal(tracker.update([both],110).length,0);
  const remaining = chat('waitingInput',{requestId:'a',requestIds:['a']});
  assert.equal(tracker.update([remaining],115).length,0);
  assert.equal(tracker.update([remaining],115,false).length,0);
  assert.equal(tracker.update([remaining],120).length,0);
});
test('an unread completion rings once and reading it does not create another alert', () => {
  const tracker = new AlertTracker(); tracker.update([chat('working')],100);
  const done = chat('completed',{unread:true});
  assert.deepEqual(tracker.update([done],105).map(a=>a.kind),['completed']);
  assert.deepEqual(tracker.update([done],110),[]);
  assert.deepEqual(tracker.update([chat('completed',{unread:false})],115),[]);
  assert.deepEqual(new AlertTracker().update([done],120),[]);
});
