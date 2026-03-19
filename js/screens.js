const ALL = ['landing', 'solo', 'lobby', 'race', 'results', 'leaderboard', 'profile'];
export function showScreen(name) {
  for (const s of ALL) {
    document.getElementById(`screen-${s}`)?.classList.toggle('active', s === name);
  }
}
