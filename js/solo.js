import { showScreen } from './screens.js';
import { createEngine } from './engine.js';
import { CatSprite } from './sprites.js';
import { getRandomPrompt, saveScore } from './supabase.js';
import { getUser, getUserProfile } from './auth.js';

let _engine, _cat, _raf, _lastT, _prompt, _timerInterval, _startedAt;

const FALLBACK = 'the quick brown cat leaps over the lazy sleeping dog on a warm sunny afternoon type fast paws on keys meow louder than the clicking';

export async function startSolo() {
  showScreen('solo');
  _prompt = await getRandomPrompt().catch(() => ({ id: null, text: FALLBACK }));
  _engine = createEngine(_prompt.text);
  _cat    = new CatSprite(getUserProfile()?.avatar_cat || 'orange');
  _startedAt = null;

  document.getElementById('solo-results').classList.add('hidden');
  document.getElementById('solo-wpm-display').textContent = '0 WPM';
  document.getElementById('solo-timer').textContent = '0:00';
  renderPrompt();

  clearInterval(_timerInterval); cancelAnimationFrame(_raf);
  const input = document.getElementById('typing-input');
  input.value = ''; input.disabled = false;
  input.replaceWith(input.cloneNode(true));
  document.getElementById('typing-input').addEventListener('keydown', onKey);
  document.getElementById('typing-input').focus();

  _lastT = performance.now();
  _raf = requestAnimationFrame(loop);
}

function onKey(e) {
  if (_engine.isComplete) return;
  const char = e.key === 'Backspace' ? 'Backspace' : (e.key.length === 1 ? e.key : null);
  if (!char) return; e.preventDefault();
  if (!_startedAt) { _startedAt = Date.now(); startTimer(); }
  _engine.type(char); renderPrompt();
  document.getElementById('solo-wpm-display').textContent = `${_engine.wpm} WPM`;
  if (_engine.isComplete) finish();
}

function startTimer() {
  _timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - _startedAt) / 1000);
    document.getElementById('solo-timer').textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  }, 500);
}

function loop(t) {
  const dt = t - _lastT; _lastT = t; drawTrack(dt);
  if (!_engine.isComplete) _raf = requestAnimationFrame(loop);
}

function drawTrack(dt) {
  const canvas = document.getElementById('race-track');
  const ctx = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const css = getComputedStyle(document.documentElement);
  ctx.strokeStyle = css.getPropertyValue('--border').trim() || '#2a5e2a';
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, H - 16); ctx.lineTo(W - 20, H - 16); ctx.stroke();
  const pct = _engine.cursor / _engine.prompt.length;
  ctx.fillStyle = css.getPropertyValue('--primary').trim() || '#39ff14';
  ctx.fillRect(20, H - 8, (W - 40) * pct, 4);
  _cat.update(_startedAt ? dt : 0);
  _cat.draw(ctx, 20 + pct * (W - 80), H - 68, 3);
}

function renderPrompt() {
  document.getElementById('prompt-display').innerHTML = [..._engine.prompt].map((ch, i) => {
    const s = ch === ' ' ? '&nbsp;' : ch.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    if (i < _engine.cursor) return `<span class="char-correct">${s}</span>`;
    if (i === _engine.cursor) return `<span class="${_engine.hasError ? 'char-error' : 'char-cursor'}">${s}</span>`;
    return `<span class="char-pending">${s}</span>`;
  }).join('');
}

async function finish() {
  clearInterval(_timerInterval); cancelAnimationFrame(_raf);
  document.getElementById('typing-input').disabled = true;
  document.getElementById('result-wpm').textContent      = _engine.wpm;
  document.getElementById('result-accuracy').textContent = _engine.accuracy;
  document.getElementById('result-raw-wpm').textContent  = _engine.rawWpm;
  document.getElementById('solo-results').classList.remove('hidden');
  const user = getUser();
  if (user && _prompt.id) saveScore({ userId: user.id, wpm: _engine.wpm, accuracy: _engine.accuracy, rawWpm: _engine.rawWpm, promptId: _prompt.id, mode: 'solo' }).catch(console.warn);
}

document.getElementById('btn-retry').addEventListener('click', startSolo);
document.getElementById('btn-solo-home').addEventListener('click', () => showScreen('landing'));
