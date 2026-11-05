#!/usr/bin/env node
// Connection experiment only. These observations are NOT dashboard activity states.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const help = `Usage: node scripts/check-connection.mjs --thread UUID [options]
  --mode isolated|proxy   isolated starts its own stdio server (default).
                        proxy connects to the existing default control socket.
  --samples N            1–120 samples (default 3)
  --interval MS          At least 5000 ms (default 5000)
  --output PATH          Append minimized JSONL evidence to a local file
  --help                 Show this message
Set CODEX_BIN to override the codex executable. Ctrl+C stops this probe only.
Never starts/resumes a chat, sends prompts, approves tools, or interrupts turns.
An isolated server does not observe another server's runtime state.`;

const opts = { mode: 'isolated', samples: 3, interval: 5000 };
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const key = args[i].replace(/^--/, '');
  if (key === 'help') { console.log(help); process.exit(0); }
  if (!['thread', 'mode', 'samples', 'interval', 'output'].includes(key) || !args[i + 1]) {
    console.error(help); process.exit(1);
  }
  opts[key] = args[++i];
}
opts.samples = Number(opts.samples);
opts.interval = Number(opts.interval);
if (!/^[a-f0-9-]{36}$/i.test(opts.thread ?? '') ||
    !['isolated', 'proxy'].includes(opts.mode) ||
    !Number.isInteger(opts.samples) || opts.samples < 1 || opts.samples > 120 ||
    !Number.isInteger(opts.interval) || opts.interval < 5000 || opts.interval > 60000) {
  console.error(help); process.exit(1);
}

const allowed = new Set(['initialize', 'thread/list', 'thread/read', 'thread/loaded/list', 'thread/turns/list']);
const commandArgs = opts.mode === 'proxy'
  ? ['app-server', 'proxy']
  : ['app-server', '--stdio', '-c', 'analytics.enabled=false'];
const child = spawn(process.env.CODEX_BIN || 'codex', commandArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
const lines = createInterface({ input: child.stdout });
const pending = new Map();
const notifications = {};
let sequence = 0;
let ended = false;
let stderrSeen = false;

// Do not save server logs, prompts, command arguments, or raw protocol messages.
child.stderr.on('data', () => { stderrSeen = true; });
function failPending(message) {
  ended = true;
  for (const { reject, timeout } of pending.values()) {
    clearTimeout(timeout); reject(new Error(message));
  }
  pending.clear();
}
child.on('error', () => failPending('Unable to launch Codex. Check CODEX_BIN.'));
child.on('exit', (code) => failPending(`Probe transport exited (${code ?? 'signal'}); serverStderrPresent=${stderrSeen}.`));
child.stdin.on('error', () => failPending('Probe transport input closed.'));
lines.on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (message.id !== undefined && pending.has(message.id)) {
    const request = pending.get(message.id);
    pending.delete(message.id); clearTimeout(request.timeout);
    if (message.error) request.reject(new Error(`${request.method} returned RPC error ${message.error.code}.`));
    else request.resolve(message.result);
  } else if (typeof message.method === 'string' && message.id === undefined) {
    notifications[message.method] = (notifications[message.method] || 0) + 1;
  }
  // Never respond to unsolicited server requests, including approval/input requests.
});
function call(method, params = {}) {
  if (!allowed.has(method)) throw new Error('Read-only probe method not allowed.');
  if (ended) return Promise.reject(new Error('Probe transport is closed.'));
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => {
      pending.delete(id); reject(new Error(`${method} timed out after 15 seconds.`));
    }, 15000);
    pending.set(id, { resolve, reject, timeout, method });
    child.stdin.write(JSON.stringify({ id, method, params }) + '\n');
  });
}
async function emit(record) {
  const line = JSON.stringify({ observedAt: new Date().toISOString(), mode: opts.mode, ...record }) + '\n';
  process.stdout.write(line);
  if (opts.output) {
    await mkdir(dirname(opts.output), { recursive: true });
    await appendFile(opts.output, line, { mode: 0o600 });
  }
}
function close() {
  lines.close(); child.stdin.end(); child.kill('SIGTERM');
  setTimeout(() => { if (!ended) child.kill('SIGKILL'); }, 1500).unref();
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => { close(); process.exit(signal === 'SIGINT' ? 130 : 143); });
}
try {
  const init = await call('initialize', {
    clientInfo: { name: 'activity_connection_probe', title: 'Activity connection probe', version: '0.1.0' },
    capabilities: { experimentalApi: false },
  });
  child.stdin.write(JSON.stringify({ method: 'initialized', params: {} }) + '\n');
  await emit({ kind: 'connection', userAgent: init.userAgent, runtimeScope: opts.mode === 'isolated' ? 'separate-process' : 'existing-control-socket' });
  for (let sample = 1; sample <= opts.samples; sample++) {
    const loaded = await call('thread/loaded/list', {});
    const listing = await call('thread/list', { limit: 20, sortKey: 'updated_at', useStateDbOnly: true });
    const { thread } = await call('thread/read', { threadId: opts.thread });
    const turns = await call('thread/turns/list', { threadId: opts.thread, limit: 1, itemsView: 'summary' });
    const turn = turns.data?.[0];
    await emit({
      kind: 'sample', sample,
      loadedThreadIds: loaded.data,
      listedThreadCount: listing.data?.length,
      thread: {
        id: thread.id, title: thread.name, projectId: thread.projectId,
        cwd: thread.cwd, runtimeStatus: thread.status, updatedAt: thread.updatedAt,
      },
      latestStoredTurn: turn ? {
        id: turn.id, status: turn.status, startedAt: turn.startedAt, completedAt: turn.completedAt,
        itemTypes: turn.items?.map(item => item.type),
        userFacingMessageCount: turn.items?.filter(item => item.type === 'agentMessage').length,
      } : null,
      notificationCounts: { ...notifications },
      // Connection liveness is NOT evidence of desktop chat activity.
      desktopActivityVerified: false,
    });
    if (sample < opts.samples) await delay(opts.interval);
  }
} catch (error) {
  await emit({ kind: 'error', message: error.message, desktopActivityVerified: false });
  process.exitCode = 1;
} finally { close(); }
