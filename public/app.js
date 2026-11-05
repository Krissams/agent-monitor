import { AlertTracker } from './alerts.js';
import { updateAgentList } from './sequence.js';
import { wavingMascot, workingMascot } from './mascot.js';
import {ROLES, roleForAgent} from './roles.js';
import {assignUniqueOutfits, defaultOutfit} from './outfits.js';
const $ = id => document.getElementById(id);
const tracker = new AlertTracker();
const preferenceKey = 'agent-monitor-preferences-v2';
const seenKey = 'codex-activity-alerts-v1';
const outfitKey = 'agent-monitor-outfits-v1';
function stored(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
const prefs = { project: '', status: '', hideIdle: true, animateAgents: true, volume: 35, muted: false, ...stored('codex-activity-preferences-v1', {}), theme: 'light', ...stored(preferenceKey, {}) };
let snapshot = null, offline = false, refreshing = false, audio = null, audioReady = false;
let outfitAssignments=stored(outfitKey,{}), outfits=new Map();
function save() { try { localStorage.setItem(preferenceKey, JSON.stringify(prefs)); } catch {} }
function text(tag, value, className) { const el = document.createElement(tag); el.textContent = value; if (className) el.className = className; return el; }
const paths = {
  task: '<path d="M9 3 7 7H4v13h16V7h-3l-2-4H9Z"/><path d="M9 11h6m-6 4h4"/>',
  play: '<path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke-linejoin="round"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v1"/>',
  unread: '<circle cx="12" cy="12" r="8" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M9 2h6m-3 0v3m6 1 2-2"/>',
  link: '<path d="M7 17 17 7M7 7h10v10"/>',
  volume: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="m17 9 5 6m0-6-5 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.5 14A8.7 8.7 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  collapse: '<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/>'
};
function icon(name) { const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); node.setAttribute('viewBox','0 0 24 24'); node.setAttribute('fill','none'); node.setAttribute('stroke','currentColor'); node.setAttribute('stroke-width','1.7'); node.setAttribute('stroke-linecap','round'); node.setAttribute('stroke-linejoin','round'); node.setAttribute('aria-hidden','true'); node.innerHTML = paths[name] || paths.task; return node; }
function relative(seconds) {
  if (!seconds) return 'No update yet';
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - seconds));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function category(chat) {
  if (offline || chat.stale || ['unknown', 'error'].includes(chat.status)) return 'stale';
  if (['waitingApproval', 'waitingInput'].includes(chat.status)) return 'attention';
  if (chat.unread && ['completed','failed','interrupted'].includes(chat.status)) return 'attention';
  if (chat.status === 'working') return 'working';
  if (['completed', 'failed', 'interrupted'].includes(chat.status) && chat.finishedAt > Date.now()/1000 - 86400) return 'finished';
  return 'idle';
}
function statusLabel(chat) {
  if (offline || chat.stale) return 'Stale';
  if (chat.unread && chat.status === 'completed') return 'Unread result';
  if (chat.unread && ['failed','interrupted'].includes(chat.status)) return `${chat.status === 'failed' ? 'Failed' : 'Interrupted'} · Unread`;
  return ({working:'Working',completed:'Completed',interrupted:'Interrupted',failed:'Failed',unknown:'Unknown',error:'Error observed',waitingApproval:'Approval needed',waitingInput:'Input needed',idle:'Idle'})[chat.status] || 'Unknown';
}
function duration(start, end) {
  if (!start) return '—';
  const seconds = Math.max(0, Math.floor((end || Date.now()/1000) - start));
  return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
}
function card(chat) {
  const item = text('article', '', `chat-card ${category(chat)}${chat.status==='completed'?' is-completed':''}`);
  item.dataset.agentId = chat.id;
  const title = chat.title.toLowerCase();
  const variant = /design|dashboard|content|ads/.test(title) ? 0 : /bug|test|\bqa\b/.test(title) ? 2 : 1;
  const attention = category(chat) === 'attention';
  const working = category(chat) === 'working';
  const role = roleForAgent(chat, prefs.agentRoles?.[chat.id]);
  const outfit = outfits.get(chat.id) || defaultOutfit(role);
  const avatar = text('div', '', `avatar variant-${variant}${attention?` waving role-${role.id} look-${outfit.slot}`:working?` working-motion role-${role.id} look-${outfit.slot}`:chat.status==='completed'?' sleeping':''}`); avatar.setAttribute('aria-hidden', 'true');
  if (working) avatar.dataset.motionPhase = String([...chat.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3);
  if (attention) avatar.append(wavingMascot(role,outfit));
  else if (working) avatar.append(workingMascot(role,outfit));
  else if (chat.status === 'completed') {
    const sleep = text('span', '', 'sleep-zzz');
    for (let index=0;index<3;index++) sleep.append(text('span', 'Z'));
    avatar.append(sleep);
  } else {
    avatar.classList.add('static-motion');
    avatar.append(workingMascot(role,outfit));
  }
  const body = text('div', '', 'card-body');
  const titleRow = text('div', '', 'title-row');
  const taskIcon = text('span', '', 'task-icon'); taskIcon.append(icon('task'));
  const titleCopy = text('div', '', 'title-copy');
  const heading = text('h3', chat.title); heading.title = chat.title;
  titleCopy.append(heading, text('div', chat.project, 'project-name')); titleRow.append(taskIcon, titleCopy);
  if (working) {
    const picker = text('select', '', 'role-picker');
    picker.setAttribute('aria-label', `Thumbnail style for ${chat.title}`);
    picker.title = `Role style. Your agent keeps its own unique ${outfit.name.toLowerCase()} outfit.`;
    picker.append(new Option(`Auto · ${roleForAgent(chat).name}`, ''), ...ROLES.map(r => new Option(r.name, r.id)));
    picker.value = prefs.agentRoles?.[chat.id] || '';
    picker.onchange = event => {
      prefs.agentRoles ||= {};
      if (event.target.value) prefs.agentRoles[chat.id] = event.target.value;
      else delete prefs.agentRoles[chat.id];
      save(); render();
      [...document.querySelectorAll('.role-picker')].find(p => p.getAttribute('aria-label') === picker.getAttribute('aria-label'))?.focus({preventScroll:true});
    };
    titleCopy.append(picker);
  }
  const message = chat.requestText || chat.update;
  const update = text('p', message || (chat.status === 'working' ? 'Run started. Waiting for a progress update.' : 'No recent progress message.'), 'card-update'); update.title = message || '';
  const bottom = text('div', '', 'card-bottom'); const dot = text('span', '', 'dot');
  const stamp = chat.requestAt || chat.updateAt || chat.lastEventAt;
  const timestamp = text('time', `Updated ${relative(stamp)}`);
  if (stamp) { timestamp.dateTime = new Date(stamp*1000).toISOString(); timestamp.title = new Date(stamp*1000).toLocaleString(); }
  bottom.append(dot, timestamp); body.append(titleRow, update, bottom);
  if (chat.issue) body.append(text('p', chat.issue, 'card-issue'));
  const side = text('div', '', 'card-status');
  const status = offline || chat.stale ? 'stale' : chat.unread && chat.status === 'completed' ? 'unread' : chat.status;
  const badge = text('span', '', `badge status-${status}`);
  badge.append(icon(status === 'working' ? 'play' : status === 'completed' ? 'check' : status === 'unread' ? 'unread' : 'alert'), text('span', statusLabel(chat)));
  const timer = text('div', '', 'elapsed'); const timerCopy = text('div', '', '');
  const end = chat.finishedAt || (category(chat) === 'working' ? 0 : chat.lastEventAt);
  const value = text('span', duration(chat.startedAt,end), 'elapsed-value');
  if (chat.startedAt && category(chat) === 'working') value.dataset.startedAt = chat.startedAt;
  timerCopy.append(text('span', 'Run time', 'elapsed-label'), value); timer.append(icon('clock'), timerCopy);
  const canOpen = /^codex:\/\/threads\/[a-f0-9-]{36}$/i.test(chat.openUrl || '');
  const link = text(canOpen ? 'a' : 'span', '', canOpen ? 'open-link' : 'demo-agent-label');
  if (canOpen) {
    link.href = chat.openUrl;
    link.setAttribute('aria-label', `Open my agent: ${chat.title} in Codex`);
    link.append(text('span','Open in Codex'),icon('link'));
  } else link.textContent = 'Demo agent';
  side.append(badge, timer, link); item.append(avatar,body,side); return item;
}
function matchesStatus(chat) {
  if (!prefs.status) return true;
  if (['attention','stale','idle'].includes(prefs.status)) return category(chat) === prefs.status;
  return chat.status === prefs.status && category(chat) !== 'stale';
}
function render() {
  if (!snapshot) return;
  const focusedLink = document.activeElement?.matches('.open-link') ? document.activeElement.getAttribute('href') : null;
  const available = snapshot.connection?.ok && !offline;
  $('demo-banner').hidden = !snapshot.demo;
  const all = snapshot.chats || [];
  const allocation=assignUniqueOutfits(all,outfitAssignments);
  outfits=allocation.looks;
  if (JSON.stringify(allocation.assignments)!==JSON.stringify(outfitAssignments)) {
    outfitAssignments=allocation.assignments;
    try {localStorage.setItem(outfitKey,JSON.stringify(outfitAssignments));} catch {}
  }
  const chats = all.filter(chat => (!prefs.project || chat.project === prefs.project) && matchesStatus(chat) && !(prefs.hideIdle && category(chat) !== 'attention' && ['completed','interrupted','failed','idle'].includes(chat.status) && (!chat.finishedAt || chat.finishedAt < Date.now()/1000-86400)));
  const ranks = {attention:0,working:1,stale:2,finished:3,idle:4};
  chats.sort((a,b) => ranks[category(a)] - ranks[category(b)] || (b.finishedAt || b.lastEventAt || 0) - (a.finishedAt || a.lastEventAt || 0));
  const working = chats.filter(c=>category(c)==='working').length;
  $('working-count').textContent = available ? working : '—';
  $('finished-count').textContent = available ? chats.filter(c=>!c.stale && ['completed','failed','interrupted'].includes(c.status) && c.finishedAt > Date.now()/1000-86400).length : '—';
  const attentionSupported = snapshot.capabilities?.pendingInput || snapshot.capabilities?.completedUnread;
  $('attention-count').textContent = available && attentionSupported ? chats.filter(c=>category(c)==='attention').length : '—';
  $('attention-caption').textContent = snapshot.capabilities?.completedUnread ? 'Input needed or unread result' : attentionSupported ? 'Input requests · unread unavailable' : 'Check Codex for requests';
  $('visible-count').textContent = chats.length;
  updateAgentList($('agents'),chats,card);
  if (!chats.length) $('agents').replaceChildren(text('div', !available ? 'The local reader is unavailable. Reconnecting automatically…' : 'No agents match these filters.', 'empty-state'));
  $('connection-label').textContent = snapshot.demo ? 'Demo · Sample data' : available ? 'Reading local activity' : offline ? 'Reader disconnected' : 'Source needs attention';
  const problem = offline ? 'The local reader is unreachable. Information is stale; reconnecting automatically.' : snapshot.connection?.problem;
  $('connection-error').hidden = !problem; $('connection-error').textContent = problem || '';
  $('last-refresh').textContent = `Updated ${relative(snapshot.refreshedAt)}`;
  const missing = snapshot.connection?.unavailableJournals || 0;
  $('source-info').textContent = `${all.length} local agents · 5-second refresh${missing ? ` · ${missing} records without journals` : ''}${snapshot.persistenceCheck?.verified ? ' · Independent polling verified' : ''}.`;
  if (focusedLink) [...document.querySelectorAll('.open-link')].find(link=>link.getAttribute('href')===focusedLink)?.focus({preventScroll:true});
  document.title = `${working ? `(${working}) ` : ''}Agent Monitor`;
}
let projectSignature = '';
function renderProjects() {
  const names = [...new Set((snapshot?.chats || []).map(chat=>chat.project))].sort();
  const signature = JSON.stringify(names);
  if (signature === projectSignature) return;
  projectSignature = signature;
  $('project-filter').replaceChildren(new Option('All projects',''), ...names.map(name=>new Option(name,name)));
  $('project-filter').value = prefs.project;
}
function setTheme() {
  document.documentElement.dataset.theme = prefs.theme;
  for (const theme of ['light','dark']) $('theme-'+theme).setAttribute('aria-pressed',String(prefs.theme===theme));
}
function fullscreenActive() { return Boolean(document.fullscreenElement || document.webkitFullscreenElement); }
function updateFullscreenButton() {
  const active = fullscreenActive();
  const label = active ? 'Exit fullscreen' : 'Enter fullscreen';
  $('fullscreen').replaceChildren(icon(active ? 'collapse' : 'expand'),text('span',active ? 'Exit fullscreen' : 'Fullscreen','button-label'));
  $('fullscreen').setAttribute('aria-label',label);
  $('fullscreen').setAttribute('aria-pressed',String(active));
  $('fullscreen').title = label;
}
function soundLabel() {
  const active = audioReady && !prefs.muted;
  const label = !audioReady ? 'Enable sound' : prefs.muted ? 'Unmute' : 'Mute';
  $('sound').replaceChildren(icon(active ? 'volume' : 'muted'));
  $('sound').title = label; $('sound').setAttribute('aria-label',label); $('sound').setAttribute('aria-pressed',String(active));
}

async function enableAudio() {
  audio ||= new AudioContext(); await audio.resume(); audioReady = true; soundLabel();
}
function bell(kind) {
  if (!audioReady || prefs.muted || !audio || audio.state !== 'running') return;
  const tones = kind === 'attention' ? [[1046.5, 0], [1318.5, 0.23]] : [[783.99, 0]];
  for (const [frequency, offset] of tones) {
    const time = audio.currentTime + offset;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(Number(prefs.volume) / 100 * 0.3, time + 0.012); gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.1);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(time); oscillator.stop(time + 1.2);
  }
}
async function deliver(alert) {
  // The tracker has already consumed muted/locked transitions. Let an enabled
  // second window claim the shared audible alert rather than a silent window.
  if (!audioReady || prefs.muted || audio?.state !== 'running') return;
  const once = () => {
    const seen = stored(seenKey, []);
    if (seen.includes(alert.key)) return;
    try { localStorage.setItem(seenKey, JSON.stringify([...seen.slice(-499), alert.key])); } catch { /* Per-page transition detection still prevents refresh repeats. */ }
    bell(alert.kind); // Muted/locked alerts are consumed, never replayed later.
  };
  if (navigator.locks) await navigator.locks.request('codex-activity-alert-ledger', once);
  else once();
}
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    const response = await fetch('/api/status', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Reader unavailable');
    const next = await response.json();
    if (!Array.isArray(next.chats) || !next.connection) throw new Error('Invalid reader data');
    snapshot = next; offline = false;
    for (const alert of tracker.update(next.chats, next.refreshedAt, next.connection.ok)) await deliver(alert);
    renderProjects(); render();
  } catch {
    offline = true;
    if (snapshot) render();
    else { $('connection-label').textContent = 'Reader disconnected'; $('connection-error').hidden = false; $('connection-error').textContent = 'Cannot reach the local reader. Reconnecting automatically.'; }
  } finally { refreshing = false; }
}
$('project-filter').onchange = event => { prefs.project=event.target.value; save(); render(); };
$('status-filter').value = prefs.status;
$('status-filter').onchange = event => { prefs.status=event.target.value; save(); render(); };
$('hide-idle').checked = prefs.hideIdle;
$('hide-idle').onchange = event => { prefs.hideIdle=event.target.checked; save(); render(); };
$('animate-agents').checked = prefs.animateAgents;
document.documentElement.dataset.motion = prefs.animateAgents ? 'on' : 'paused';
$('animate-agents').onchange = event => { prefs.animateAgents=event.target.checked; document.documentElement.dataset.motion=prefs.animateAgents?'on':'paused'; save(); };
$('volume').value = prefs.volume; $('volume-value').textContent = `${prefs.volume}%`;
$('volume').oninput = event => { prefs.volume=Number(event.target.value); $('volume-value').textContent=`${prefs.volume}%`; save(); };
for (const theme of ['light','dark']) {
  $('theme-'+theme).querySelector('.theme-icon').append(icon(theme==='light'?'sun':'moon'));
  $('theme-'+theme).onclick = () => { prefs.theme=theme; save(); setTheme(); };
}
$('sound').onclick = async () => { try { if (!audioReady) { prefs.muted=false; await enableAudio(); } else prefs.muted=!prefs.muted; save(); soundLabel(); } catch { $('sound-message').textContent='Audio could not start. Check browser sound permissions.'; } };
for (const [id,kind] of [['test-complete','completed'],['test-attention','attention']]) $(id).onclick = async () => { try { await enableAudio(); if (prefs.muted) { $('sound-message').textContent='Unmute to test the bells.'; return; } bell(kind); $('sound-message').textContent=`${kind==='completed'?'Completion':'Attention'} bell played at ${prefs.volume}% volume.`; } catch { $('sound-message').textContent='Browser audio is unavailable.'; } };
$('fullscreen').onclick = async () => {
  $('display-message').hidden = true;
  try {
    if (fullscreenActive()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (!exit) throw new Error('Fullscreen unavailable');
      await exit.call(document);
    } else {
      const enter = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (!enter) throw new Error('Fullscreen unavailable');
      await enter.call(document.documentElement,{navigationUI:'hide'});
    }
  } catch {
    $('display-message').textContent='This browser blocked page fullscreen. On your Mac, use Control–Command–F for window fullscreen.';
    $('display-message').hidden = false;
  }
  updateFullscreenButton();
};
for (const event of ['fullscreenchange','webkitfullscreenchange']) document.addEventListener(event,updateFullscreenButton);
$('refresh').onclick = refresh;
document.addEventListener('keydown',event=>{if(event.key==='Escape')$('settings').open=false;});
document.addEventListener('click',event=>{if(!$('settings').contains(event.target))$('settings').open=false;});
setTheme(); updateFullscreenButton(); soundLabel(); refresh();
setInterval(refresh,5000);
setInterval(()=>{for(const timer of document.querySelectorAll('[data-started-at]'))timer.textContent=duration(Number(timer.dataset.startedAt),0);},1000);
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{
  if(event.matches) for(const agent of document.querySelectorAll('[data-agent-id]')) agent._sequenceAnimation?.cancel();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
