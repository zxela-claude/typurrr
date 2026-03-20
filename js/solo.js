import { showScreen } from './screens.js';
import { createEngine } from './engine.js';
import { CatSprite } from './sprites.js';
import { getRandomPrompt, saveScore, createRaceInDb, saveGhost } from './supabase.js';
import { getUser, getUserProfile } from './auth.js';
import { playClick, playError, playFinish } from './audio.js';
import { renderPrompt as renderPromptFn } from './render.js';

let _engine, _cat, _raf, _lastT, _prompt, _timerInterval, _startedAt;
let _keystrokes, _prevKeystrokeTime;
let _borderColor, _primaryColor;

const FALLBACK = 'the quick brown cat leaps over the lazy sleeping dog on a warm sunny afternoon type fast paws on keys meow louder than the clicking';

export async function startSolo() {
  showScreen('solo');
  _prompt = await getRandomPrompt().catch(() => ({ id: null, text: FALLBACK }));
  _engine = createEngine(_prompt.text);
  _cat    = new CatSprite(getUserProfile()?.avatar_cat || 'orange');
  _startedAt = null;
  _keystrokes = [];
  _prevKeystrokeTime = null;

  // Cache CSS vars once per solo start — avoids getComputedStyle every animation frame
  const css = getComputedStyle(document.documentElement);
  _borderColor  = css.getPropertyValue('--border').trim()  || '#2a5e2a';
  _primaryColor = css.getPropertyValue('--primary').trim() || '#39ff14';

  document.getElementById('solo-results').classList.add('hidden');
  document.getElementById('btn-race-ghost').classList.add('hidden');
  document.getElementById('btn-share-ghost').classList.add('hidden');
  document.getElementById('btn-solo-challenge').classList.add('hidden');
  document.getElementById('solo-wpm-display').textContent = '0 WPM';
  document.getElementById('solo-timer').textContent = '0:00';
  renderPromptFn(_engine);

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
  const now = Date.now();
  if (!_startedAt) { _startedAt = now; startTimer(); }
  _keystrokes.push({ char, t_ms: now - (_prevKeystrokeTime ?? now) });
  _prevKeystrokeTime = now;
  _engine.type(char); renderPromptFn(_engine);
  if (char !== 'Backspace') {
    if (_engine.hasError) playError();
    else playClick();
  }
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
  ctx.strokeStyle = _borderColor;
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, H - 16); ctx.lineTo(W - 20, H - 16); ctx.stroke();
  const pct = _engine.cursor / _engine.prompt.length;
  ctx.fillStyle = _primaryColor;
  ctx.fillRect(20, H - 8, (W - 40) * pct, 4);
  _cat.update(_startedAt ? dt : 0);
  _cat.draw(ctx, 20 + pct * (W - 80), H - 68, 3);
}


async function finish() {
  clearInterval(_timerInterval); cancelAnimationFrame(_raf);
  document.getElementById('typing-input').disabled = true;
  document.getElementById('result-wpm').textContent      = _engine.wpm;
  document.getElementById('result-accuracy').textContent = _engine.accuracy;
  document.getElementById('result-raw-wpm').textContent  = _engine.rawWpm;
  document.getElementById('solo-results').classList.remove('hidden');
  playFinish();
  // Build per-key latency map
  const keyLatency = {};
  for (const { char, t_ms } of _keystrokes) {
    if (char === 'Backspace' || t_ms === 0) continue;
    if (!keyLatency[char]) keyLatency[char] = { total: 0, count: 0 };
    keyLatency[char].total += t_ms;
    keyLatency[char].count++;
  }
  // Save to localStorage (merge with existing data)
  const existing = JSON.parse(localStorage.getItem('typurrr-heatmap') || '{}');
  for (const [char, { total, count }] of Object.entries(keyLatency)) {
    if (!existing[char]) existing[char] = { total: 0, count: 0 };
    existing[char].total += total;
    existing[char].count += count;
  }
  localStorage.setItem('typurrr-heatmap', JSON.stringify(existing));
  const user = getUser();
  if (user && _prompt.id) {
    saveScore({ userId: user.id, wpm: _engine.wpm, accuracy: _engine.accuracy, rawWpm: _engine.rawWpm, promptId: _prompt.id, mode: 'solo' }).catch(console.warn);
    try {
      const race = await createRaceInDb(user.id, _prompt.id);
      await saveGhost(race.id, user.id, _keystrokes, _engine.wpm);
      const ghostBtn = document.getElementById('btn-race-ghost');
      ghostBtn.classList.remove('hidden');
      ghostBtn.onclick = async () => { const { startChallenge } = await import('./ghost.js'); startChallenge(race.id); };

      const shareBtn = document.getElementById('btn-share-ghost');
      shareBtn.classList.remove('hidden');
      shareBtn.onclick = () => {
        const url = `${location.origin}?challenge=${race.id}`;
        navigator.clipboard.writeText(url).then(() => {
          shareBtn.textContent = '✓ LINK COPIED';
          setTimeout(() => { shareBtn.textContent = '🔗 SHARE GHOST'; }, 2000);
        }).catch(() => {
          // Fallback: show the URL
          prompt('Copy this link:', url);
        });
      };

      const challengeBtn = document.getElementById('btn-solo-challenge');
      challengeBtn.classList.remove('hidden');
      challengeBtn.onclick = () => {
        const url = `${location.origin}?challenge=${race.id}`;
        navigator.clipboard.writeText(url).then(() => {
          challengeBtn.textContent = '✓ CHALLENGE LINK COPIED';
          setTimeout(() => { challengeBtn.textContent = '⚡ CHALLENGE FRIENDS'; }, 2000);
        });
      };
    } catch (e) { console.warn('Ghost save failed', e); }
  }
}

document.getElementById('btn-retry').addEventListener('click', startSolo);
document.getElementById('btn-solo-home').addEventListener('click', () => showScreen('landing'));
