import { showScreen } from './screens.js';
import { initAuth, openAuthModal, bindAuthModal, getUser, getUserProfile } from './auth.js';
import { getLeaderboard } from './supabase.js';

// Palette
const saved = localStorage.getItem('typurrr-palette') || 'phosphor';
document.documentElement.dataset.palette = saved;
document.querySelectorAll('#palette-switcher button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.documentElement.dataset.palette = btn.dataset.palette;
    localStorage.setItem('typurrr-palette', btn.dataset.palette);
  });
});

// Auth
bindAuthModal();
function updateAuthBar(user, profile) {
  const nameEl = document.getElementById('auth-username');
  const btnEl  = document.getElementById('auth-btn');
  if (user) {
    nameEl.textContent = profile?.username || user.email?.split('@')[0] || 'player';
    btnEl.textContent = 'PROFILE';
    btnEl.onclick = async () => { const { openProfile } = await import('./profile.js'); openProfile(user, profile); };
  } else {
    nameEl.textContent = ''; btnEl.textContent = 'SIGN IN'; btnEl.onclick = openAuthModal;
  }
}
await initAuth(updateAuthBar);
updateAuthBar(getUser(), getUserProfile());

// Landing leaderboard preview
getLeaderboard('alltime').then(rows => {
  const el = document.getElementById('landing-lb-preview');
  if (!rows?.length) { el.style.display='none'; return; }
  el.innerHTML = `<p style="font-size:8px;color:var(--dim);margin-bottom:10px">🏆 TOP SCORES</p>` +
    rows.slice(0,5).map((r,i)=>`<div class="lb-row"><span class="lb-rank">#${i+1}</span><span class="lb-name">${r.profiles?.username??'???'}</span><span class="lb-wpm">${r.wpm} WPM</span></div>`).join('');
}).catch(()=>{ document.getElementById('landing-lb-preview').style.display='none'; });

// Nav
document.getElementById('btn-play-solo').addEventListener('click', async () => { const { startSolo } = await import('./solo.js'); startSolo(); });
document.getElementById('btn-create-race').addEventListener('click', async () => { if (!getUser()) { openAuthModal(); return; } const { createRace } = await import('./race.js'); createRace(); });
document.getElementById('btn-join-race').addEventListener('click', () => { if (!getUser()) { openAuthModal(); return; } document.getElementById('join-modal').classList.remove('hidden'); document.getElementById('join-code').value=''; document.getElementById('join-code').focus(); });
document.getElementById('btn-leaderboard').addEventListener('click', async () => { const { openLeaderboard } = await import('./leaderboard.js'); openLeaderboard(); });
document.getElementById('btn-my-stats').addEventListener('click', async () => {
  const { openStats } = await import('./stats.js');
  openStats();
});
document.getElementById('join-submit').addEventListener('click', async () => { const code=document.getElementById('join-code').value.trim().toUpperCase(); if(!code) return; document.getElementById('join-modal').classList.add('hidden'); const { joinRace } = await import('./race.js'); joinRace(code); });
document.getElementById('join-close').addEventListener('click', () => document.getElementById('join-modal').classList.add('hidden'));
document.getElementById('join-modal').addEventListener('click', e => { if(e.target===e.currentTarget) document.getElementById('join-modal').classList.add('hidden'); });
document.getElementById('join-code').addEventListener('keydown', async e => { if(e.key!=='Enter') return; const code=e.target.value.trim().toUpperCase(); if(!code) return; document.getElementById('join-modal').classList.add('hidden'); const { joinRace } = await import('./race.js'); joinRace(code); });

// URL routing
const params = new URLSearchParams(location.search);
if (params.get('challenge')) {
  const { startChallenge } = await import('./ghost.js'); startChallenge(params.get('challenge'));
} else if (params.get('join')) {
  if (getUser()) { const { joinRace } = await import('./race.js'); joinRace(params.get('join')); }
  else { openAuthModal(); }
} else {
  showScreen('landing');
}
