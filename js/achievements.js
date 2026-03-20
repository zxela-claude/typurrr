// Achievement definitions
const ACHIEVEMENTS = [
  { id: 'first_race',     label: '🐾 First Steps',      desc: 'Complete your first race',          check: (s) => s.length >= 1 },
  { id: 'wpm_50',         label: '⚡ Speed Paws',         desc: 'Reach 50 WPM',                     check: (s) => s.some(r => r.wpm >= 50) },
  { id: 'wpm_75',         label: '🚀 Sonic Paws',         desc: 'Reach 75 WPM',                     check: (s) => s.some(r => r.wpm >= 75) },
  { id: 'wpm_100',        label: '💎 Century Cat',        desc: 'Reach 100 WPM',                    check: (s) => s.some(r => r.wpm >= 100) },
  { id: 'accuracy_99',    label: '🎯 Purrfect',           desc: '99%+ accuracy in a race',          check: (s) => s.some(r => r.accuracy >= 99) },
  { id: 'accuracy_95_10', label: '🏆 Consistent',         desc: '95%+ accuracy 10 times',           check: (s) => s.filter(r => r.accuracy >= 95).length >= 10 },
  { id: 'races_10',       label: '🐱 Regular',            desc: 'Complete 10 races',                check: (s) => s.length >= 10 },
  { id: 'races_50',       label: '🦁 Veteran',            desc: 'Complete 50 races',                check: (s) => s.length >= 50 },
  { id: 'streak_improve', label: '📈 On the Rise',        desc: 'Improve WPM 5 races in a row',     check: (s) => checkImprovementStreak(s, 5) },
];

// Cat unlocks tied to achievements
export const CAT_UNLOCKS = {
  tuxedo:    'wpm_50',
  calico:    'accuracy_99',
  ghost_cat: 'wpm_100',
  neon_cat:  'races_50',
};

// O(n) single-pass streak check
function checkImprovementStreak(scores, n) {
  if (scores.length < n) return false;
  const sorted = [...scores].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].wpm > sorted[i - 1].wpm) {
      if (++streak >= n) return true;
    } else {
      streak = 1;
    }
  }
  return false;
}

// Compute achievements once — reads/writes localStorage once per call
export function getAchievements(scores) {
  const unlocked = new Set(JSON.parse(localStorage.getItem('typurrr-achievements') || '[]'));
  const results = ACHIEVEMENTS.map(a => ({
    ...a,
    earned: unlocked.has(a.id) || a.check(scores),
  }));
  localStorage.setItem('typurrr-achievements', JSON.stringify(results.filter(a => a.earned).map(a => a.id)));
  return results;
}

export function checkAchievements(scores) {
  return getAchievements(scores).filter(a => a.earned);
}

// Accepts pre-computed results to avoid a redundant getAchievements call
export function renderAchievements(container, all) {
  container.innerHTML = `
    <p style="color:var(--dim);font-size:8px;margin-bottom:8px">🏅 ACHIEVEMENTS (${all.filter(a=>a.earned).length}/${all.length})</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${all.map(a => `
        <div style="
          border:1px solid ${a.earned ? 'var(--primary)' : 'var(--border)'};
          padding:6px 8px;font-size:7px;min-width:90px;
          opacity:${a.earned ? 1 : 0.4};
          background:${a.earned ? 'rgba(57,255,20,0.05)' : 'transparent'}
        ">
          <div style="font-size:10px;margin-bottom:2px">${a.label}</div>
          <div style="color:var(--dim)">${a.desc}</div>
        </div>
      `).join('')}
    </div>`;
}
