import { showScreen } from './screens.js';
import { updateProfile, getPersonalBests } from './supabase.js';
import { CatSprite } from './sprites.js';
import { CAT_VARIANTS } from './config.js';
import { setUserProfile } from './auth.js';
import { drawHeatmap } from './heatmap.js';
import { checkAchievements, CAT_UNLOCKS } from './achievements.js';
import { esc } from './escape.js';

export async function openProfile(user, profile) {
  showScreen('profile');
  const picker = document.getElementById('avatar-picker');
  picker.innerHTML = '';

  const scores = await getPersonalBests(user.id, 100).catch(() => []);
  const earned = checkAchievements(scores).map(a => a.id);

  // Filter variants: always show orange + grey, others need achievement
  const availableVariants = CAT_VARIANTS.filter(v => {
    const requiredAchievement = CAT_UNLOCKS[v];
    return !requiredAchievement || earned.includes(requiredAchievement);
  });

  availableVariants.forEach(variant => {
    const btn = document.createElement('button');
    btn.className = `avatar-btn ${profile?.avatar_cat===variant?'active':''}`;
    btn.dataset.variant = variant;
    btn.appendChild(CatSprite.preview(variant, 48));
    const lbl = document.createElement('span'); lbl.textContent=variant; lbl.style.fontSize='7px';
    btn.appendChild(lbl);
    btn.onclick = async () => {
      picker.querySelectorAll('.avatar-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      await updateProfile(user.id, { avatar_cat: variant }).catch(console.warn);
      setUserProfile({ ...profile, avatar_cat: variant });
      profile = { ...profile, avatar_cat: variant };
    };
    picker.appendChild(btn);
  });

  // Also show locked cats as hints
  const lockedVariants = CAT_VARIANTS.filter(v => !availableVariants.includes(v));
  if (lockedVariants.length > 0) {
    const lockedLabel = document.createElement('p');
    lockedLabel.style.cssText = 'color:var(--dim);font-size:7px;margin:10px 0 4px';
    lockedLabel.textContent = '🔒 LOCKED CATS';
    picker.appendChild(lockedLabel);

    lockedVariants.forEach(variant => {
      const requiredId = CAT_UNLOCKS[variant];
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:inline-block;position:relative;opacity:0.4;margin:2px;text-align:center;vertical-align:top';

      const preview = CatSprite.preview(variant, 48);
      preview.style.display = 'block';
      wrapper.appendChild(preview);

      const lockIcon = document.createElement('div');
      lockIcon.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:14px';
      lockIcon.textContent = '🔒';
      wrapper.appendChild(lockIcon);

      const lbl = document.createElement('span');
      lbl.textContent = variant;
      lbl.style.cssText = 'display:block;font-size:7px;color:var(--dim)';
      wrapper.appendChild(lbl);

      if (requiredId) {
        const hint = document.createElement('span');
        hint.textContent = requiredId.replace(/_/g, ' ');
        hint.style.cssText = 'display:block;font-size:6px;color:var(--dim)';
        wrapper.appendChild(hint);
      }

      picker.appendChild(wrapper);
    });
  }

  document.getElementById('profile-info').innerHTML = `<p>Username: ${esc(profile?.username??'unknown')}</p><p>Member since: ${new Date(profile?.created_at??Date.now()).getFullYear()}</p>`;

  document.getElementById('profile-history').innerHTML = scores.length===0
    ? '<p style="color:var(--dim);font-size:9px">No races yet — go type!</p>'
    : scores.slice(0,10).map(s=>`<div class="lb-row"><span class="lb-wpm">${s.wpm} WPM</span><span class="lb-acc">${Math.round(s.accuracy??0)}%</span><span class="lb-date">${new Date(s.created_at).toLocaleDateString()}</span><span style="color:var(--dim);font-size:7px">${s.mode}</span></div>`).join('');

  // Heatmap
  let heatmapCanvas = document.getElementById('profile-heatmap');
  if (!heatmapCanvas) {
    const section = document.createElement('div');
    section.innerHTML = '<p style="color:var(--dim);font-size:8px;margin:12px 0 6px">⌨ KEY SPEED HEATMAP</p>';
    heatmapCanvas = document.createElement('canvas');
    heatmapCanvas.id = 'profile-heatmap';
    heatmapCanvas.width = 600; heatmapCanvas.height = 120;
    heatmapCanvas.style.cssText = 'display:block;max-width:100%;image-rendering:pixelated;margin:0 auto';
    section.appendChild(heatmapCanvas);
    document.getElementById('profile-history').after(section);
  }
  drawHeatmap(heatmapCanvas);

  document.getElementById('btn-profile-home').onclick = () => showScreen('landing');
}
