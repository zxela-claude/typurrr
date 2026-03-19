import { showScreen } from './screens.js';
import { getLeaderboard } from './supabase.js';

export async function openLeaderboard(filter = 'alltime') {
  showScreen('leaderboard');
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  const list = document.getElementById('leaderboard-list');
  list.textContent = 'Loading...';
  try {
    const rows = await getLeaderboard(filter);
    list.innerHTML = rows.length === 0
      ? '<p style="color:var(--dim);font-size:9px;padding:16px 0">No scores yet — be the first!</p>'
      : rows.map((r, i) => `<div class="lb-row"><span class="lb-rank">#${i+1}</span><span class="lb-name">${r.profiles?.username??'???'}</span><span class="lb-wpm">${r.wpm} WPM</span><span class="lb-acc">${Math.round(r.accuracy??0)}%</span><span class="lb-date">${new Date(r.created_at).toLocaleDateString()}</span></div>`).join('');
  } catch (e) { list.innerHTML = '<p style="color:var(--error)">Failed to load.</p>'; console.error(e); }
}

document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => openLeaderboard(btn.dataset.filter)));
document.getElementById('btn-lb-home').addEventListener('click', () => showScreen('landing'));
