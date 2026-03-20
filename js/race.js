import { showScreen } from './screens.js';
import { createEngine } from './engine.js';
import { CatSprite } from './sprites.js';
import { supabase, getRandomPrompt, createRaceInDb, getRaceByCode, joinRaceInDb, setPlayerReady, setRaceStatus, recordFinish, saveScore, saveGhost, getRaceResults } from './supabase.js';
import { getUser, getUserProfile } from './auth.js';
import { showToast } from './toast.js';
import { playClick, playError, playFinish } from './audio.js';
import { esc } from './escape.js';

let _race, _engine, _myCat, _others, _channel, _lobbySub, _raf, _lastT;
let _keystrokes, _lastKsT, _finishPos, _timerInt, _startedAt;
let _borderColor, _dimColor;

export async function createRace() {
  const user = getUser(); const prompt = await getRandomPrompt();
  const race = await createRaceInDb(user.id, prompt.id);
  await joinRaceInDb(race.id, user.id);
  _race = { ...race, prompt }; _openLobby();
}

export async function joinRace(code) {
  const user = getUser();
  try {
    const race = await getRaceByCode(code);
    if (race.status !== 'lobby') { showToast('Race already started'); return; }
    await joinRaceInDb(race.id, user.id);
    _race = race; _openLobby();
  } catch { showToast('Race not found — check the code'); }
}

function _openLobby() {
  showScreen('lobby');
  const user = getUser(); const isHost = _race.host_id === user.id;
  document.getElementById('lobby-code').textContent = _race.room_code;
  document.getElementById('btn-start-race').classList.toggle('hidden', !isHost);
  _subscribeLobby();
  document.getElementById('btn-ready').onclick = () => setPlayerReady(_race.id, user.id, true);
  document.getElementById('btn-start-race').onclick = () => setRaceStatus(_race.id, 'countdown');
  document.getElementById('btn-copy-link').onclick = () => {
    navigator.clipboard.writeText(`${location.origin}?join=${_race.room_code}`);
    document.getElementById('btn-copy-link').textContent = '✓ COPIED';
    setTimeout(() => { document.getElementById('btn-copy-link').textContent = '📋 COPY LINK'; }, 2000);
  };
  document.getElementById('btn-lobby-home').onclick = () => { _lobbySub?.unsubscribe(); showScreen('landing'); };
}

function _subscribeLobby() {
  _lobbySub = supabase.channel(`lobby:${_race.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'race_participants', filter: `race_id=eq.${_race.id}` }, _refreshPlayers)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'races', filter: `id=eq.${_race.id}` }, ({ new: u }) => { if (u.status === 'countdown') _startCountdown(); })
    .subscribe();
  _refreshPlayers();
}

async function _refreshPlayers() {
  const { data } = await supabase.from('race_participants').select('ready,profiles(username,avatar_cat)').eq('race_id', _race.id);
  document.getElementById('lobby-players').innerHTML = (data||[]).map(p =>
    `<div class="lobby-player ${p.ready?'ready':''}"><span>${esc(p.profiles?.username??'unknown')}</span><span>${p.ready?'✓ READY':'waiting...'}</span></div>`).join('');
}

function _startCountdown() {
  _lobbySub?.unsubscribe(); _lobbySub = null;
  const overlay = document.getElementById('countdown-overlay');
  const numEl   = document.getElementById('countdown-number');
  overlay.classList.remove('hidden'); numEl.textContent = 3;
  let count = 3;
  const tick = setInterval(() => {
    count--;
    if (count > 0) { numEl.textContent = count; }
    else if (count === 0) { numEl.textContent = 'GO!'; }
    else { clearInterval(tick); overlay.classList.add('hidden'); _startRace(); }
  }, 1000);
}

async function _startRace() {
  showScreen('race');
  const user = getUser(); const profile = getUserProfile();
  const promptText = _race.prompt?.text || _race.prompts?.text || '';
  _engine = createEngine(promptText); _myCat = new CatSprite(profile?.avatar_cat||'orange');
  _others = {}; _finishPos = 0; _keystrokes = []; _lastKsT = Date.now(); _startedAt = null;

  // Cache CSS vars once per race start — avoids getComputedStyle every animation frame
  const css = getComputedStyle(document.documentElement);
  _borderColor = css.getPropertyValue('--border').trim() || '#2a5e2a';
  _dimColor    = css.getPropertyValue('--dim').trim()    || '#1e6e1e';
  renderRacePrompt();
  document.getElementById('race-wpm-display').textContent = '0 WPM';
  document.getElementById('race-timer').textContent = '0:00';

  _channel = supabase.channel(`race:${_race.id}`, { config: { broadcast: { self: false } } });
  _channel.on('broadcast', { event: 'progress' }, ({ payload }) => {
    if (!_others[payload.userId]) _others[payload.userId] = { cat: new CatSprite(payload.variant||'grey'), pct: 0, username: payload.username||'opponent' };
    _others[payload.userId].pct = payload.pct;
  }).subscribe();

  const input = document.getElementById('race-typing-input');
  input.value = ''; input.disabled = false;
  input.replaceWith(input.cloneNode(true));
  document.getElementById('race-typing-input').addEventListener('keydown', _onKey);
  document.getElementById('race-typing-input').focus();
  _lastT = performance.now(); _raf = requestAnimationFrame(_loop);
}

function _onKey(e) {
  if (_engine.isComplete) return;
  const char = e.key === 'Backspace' ? 'Backspace' : (e.key.length === 1 ? e.key : null);
  if (!char) return; e.preventDefault();
  if (!_startedAt) {
    _startedAt = Date.now();
    _timerInt = setInterval(() => {
      const s = Math.floor((Date.now()-_startedAt)/1000);
      document.getElementById('race-timer').textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
    }, 500);
  }
  const now = Date.now(); _keystrokes.push({ char, t_ms: now - _lastKsT }); _lastKsT = now;
  _engine.type(char); renderRacePrompt();
  if (char !== 'Backspace') {
    if (_engine.hasError) playError();
    else playClick();
  }
  document.getElementById('race-wpm-display').textContent = `${_engine.wpm} WPM`;
  const user = getUser(); const profile = getUserProfile();
  _channel.send({ type:'broadcast', event:'progress', payload: { userId: user.id, username: profile?.username, variant: profile?.avatar_cat||'orange', pct: _engine.cursor/_engine.prompt.length } });
  if (_engine.isComplete) _finishRace();
}

function _loop(t) { const dt = t-_lastT; _lastT=t; _drawTrack(dt); if (!_engine?.isComplete) _raf = requestAnimationFrame(_loop); }

function _drawTrack(dt) {
  const canvas = document.getElementById('race-track-multi');
  const ctx = canvas.getContext('2d'); const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const all = [{ cat:_myCat, pct:_engine.cursor/_engine.prompt.length, label:'YOU' }, ...Object.values(_others).map(o=>({cat:o.cat,pct:o.pct,label:o.username}))];
  const rH = Math.floor(H/Math.max(all.length,1));
  all.forEach((p,i) => {
    const y = i*rH;
    ctx.strokeStyle=_borderColor; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(20,y+rH-6); ctx.lineTo(W-20,y+rH-6); ctx.stroke();
    ctx.fillStyle=_dimColor; ctx.font='8px monospace'; ctx.fillText(p.label,6,y+rH-22);
    p.cat.update(_startedAt?dt:0); p.cat.draw(ctx, 20+p.pct*(W-80), y+rH-70, 3);
  });
}

function renderRacePrompt() {
  document.getElementById('race-prompt-display').innerHTML = [..._engine.prompt].map((ch,i)=>{
    const s=ch===' '?'&nbsp;':ch.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    if(i<_engine.cursor) return `<span class="char-correct">${s}</span>`;
    if(i===_engine.cursor) return `<span class="${_engine.hasError?'char-error':'char-cursor'}">${s}</span>`;
    return `<span class="char-pending">${s}</span>`;
  }).join('');
}

async function _finishRace() {
  clearInterval(_timerInt); cancelAnimationFrame(_raf);
  const user = getUser(); _finishPos++;
  const promptId = _race.prompt_id || _race.prompt?.id;
  try {
    const score = await saveScore({ userId:user.id, wpm:_engine.wpm, accuracy:_engine.accuracy, rawWpm:_engine.rawWpm, promptId, mode:'race', raceId:_race.id });
    await recordFinish(_race.id, user.id, _finishPos, score.id);
    await saveGhost(_race.id, user.id, _keystrokes, _engine.wpm).catch(()=>{});
  } catch(e) { console.warn(e); }
  _channel.send({ type:'broadcast', event:'finish', payload:{ userId:user.id, wpm:_engine.wpm } });
  playFinish();
  setTimeout(_showResults, 2500);
}

async function _showResults() {
  if (_channel) { await _channel.unsubscribe(); _channel=null; }
  showScreen('results');
  const results = await getRaceResults(_race.id).catch(()=>[]);
  document.getElementById('results-list').innerHTML = results.map((p,i)=>`<div class="lb-row"><span class="lb-rank">#${p.position??i+1}</span><span class="lb-name">${esc(p.profiles?.username??'unknown')}</span><span class="lb-wpm">${p.scores?.wpm??'--'} WPM</span><span class="lb-acc">${Math.round(p.scores?.accuracy??0)}%</span></div>`).join('');
  document.getElementById('btn-challenge').onclick = async () => { await navigator.clipboard.writeText(`${location.origin}?challenge=${_race.id}`); document.getElementById('btn-challenge').textContent='✓ LINK COPIED'; };
  document.getElementById('btn-race-again').onclick = createRace;
  document.getElementById('btn-results-home').onclick = () => showScreen('landing');
}
