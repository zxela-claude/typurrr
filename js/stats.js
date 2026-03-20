import { showScreen } from './screens.js';
import { getPersonalBests } from './supabase.js';
import { getUser, openAuthModal } from './auth.js';
import { getAchievements, renderAchievements } from './achievements.js';

let _statsListenersBound = false;

export async function openStats() {
  const user = getUser();
  if (!user) { openAuthModal(); return; }
  showScreen('stats');

  // Bind filter buttons once — no stacking listeners on repeat visits
  if (!_statsListenersBound) {
    _statsListenersBound = true;
    document.querySelectorAll('[data-stats-filter]').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('[data-stats-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const limit = btn.dataset.statsFilter === 'all' ? 1000 : parseInt(btn.dataset.statsFilter);
        await loadStats(getUser()?.id, limit);
      });
    });
  }

  document.getElementById('btn-stats-home').onclick = () => showScreen('landing');
  await loadStats(user.id, 30);
}

async function loadStats(userId, limit) {
  const scores = await getPersonalBests(userId, limit).catch(() => []);
  // Compute achievements once, pass result to both chart and render
  const allAchievements = getAchievements(scores);
  drawChart(scores);
  drawSummary(scores);
  renderAchievements(document.getElementById('achievements-grid'), allAchievements);
}

function drawChart(scores) {
  const canvas = document.getElementById('stats-chart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Read CSS vars once for entire function
  const css = getComputedStyle(document.documentElement);
  const primary = css.getPropertyValue('--primary').trim() || '#39ff14';
  const dim = css.getPropertyValue('--dim').trim() || '#1e6e1e';
  const border = css.getPropertyValue('--border').trim() || '#2a5e2a';

  if (scores.length < 2) {
    ctx.fillStyle = dim;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('need more races to show chart', W/2, H/2);
    ctx.textAlign = 'left';
    return;
  }

  const sorted = [...scores].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const wpms = sorted.map(s => s.wpm);
  // Use reduce to avoid spread on potentially large arrays
  const maxW = wpms.reduce((a, b) => b > a ? b : a, -Infinity);
  const minW = wpms.reduce((a, b) => b < a ? b : a, Infinity);
  const range = maxW - minW || 1;

  const pad = { l: 40, r: 20, t: 20, b: 30 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;

  // Grid lines
  ctx.strokeStyle = border; ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = pad.t + cH * (1 - t);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillStyle = dim; ctx.font = '7px monospace';
    ctx.fillText(Math.round(minW + range * t), 2, y + 3);
  });

  // WPM line
  ctx.strokeStyle = primary; ctx.lineWidth = 2;
  ctx.beginPath();
  sorted.forEach((s, i) => {
    const x = pad.l + (i / (sorted.length - 1)) * cW;
    const y = pad.t + cH * (1 - (s.wpm - minW) / range);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Moving average (window of 10)
  if (sorted.length >= 5) {
    ctx.strokeStyle = 'rgba(255,200,0,0.7)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    sorted.forEach((_, i) => {
      if (i < 4) return;
      const window = sorted.slice(Math.max(0, i-9), i+1);
      const avg = window.reduce((s, r) => s + r.wpm, 0) / window.length;
      const x = pad.l + (i / (sorted.length - 1)) * cW;
      const y = pad.t + cH * (1 - (avg - minW) / range);
      i === 4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = dim; ctx.font = '7px monospace'; ctx.textAlign = 'center';
  ctx.fillText('races (oldest → newest)', W/2, H - 4);
  ctx.textAlign = 'left';
}

function drawSummary(scores) {
  if (!scores.length) { document.getElementById('stats-summary').innerHTML = ''; return; }
  const wpms = scores.map(s => s.wpm);
  const best = wpms.reduce((a, b) => b > a ? b : a, -Infinity);
  const avg = Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length);
  const recent10 = wpms.slice(-10);
  const trend = recent10.length >= 2 ? recent10[recent10.length-1] - recent10[0] : 0;
  const avgAcc = Math.round(scores.reduce((a, s) => a + s.accuracy, 0) / scores.length);

  document.getElementById('stats-summary').innerHTML = `
    <div style="display:flex;gap:20px;flex-wrap:wrap;margin:8px 0;font-size:9px">
      <div><span style="color:var(--dim)">BEST</span> <strong style="color:var(--primary)">${best} WPM</strong></div>
      <div><span style="color:var(--dim)">AVG</span> <strong style="color:var(--primary)">${avg} WPM</strong></div>
      <div><span style="color:var(--dim)">AVG ACC</span> <strong style="color:var(--primary)">${avgAcc}%</strong></div>
      <div><span style="color:var(--dim)">TREND</span> <strong style="color:${trend >= 0 ? 'var(--primary)' : '#ff4444'}">${trend >= 0 ? '+' : ''}${trend} WPM</strong></div>
      <div><span style="color:var(--dim)">RACES</span> <strong style="color:var(--primary)">${scores.length}</strong></div>
    </div>`;
}
