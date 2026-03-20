import { showScreen } from './screens.js';
import { updateProfile, getPersonalBests } from './supabase.js';
import { CatSprite } from './sprites.js';
import { CAT_VARIANTS } from './config.js';
import { setUserProfile } from './auth.js';

export async function openProfile(user, profile) {
  showScreen('profile');
  const picker = document.getElementById('avatar-picker');
  picker.innerHTML = '';
  CAT_VARIANTS.forEach(variant => {
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

  document.getElementById('profile-info').innerHTML = `<p>Username: ${profile?.username??'unknown'}</p><p>Member since: ${new Date(profile?.created_at??Date.now()).getFullYear()}</p>`;

  const scores = await getPersonalBests(user.id).catch(()=>[]);
  document.getElementById('profile-history').innerHTML = scores.length===0
    ? '<p style="color:var(--dim);font-size:9px">No races yet — go type!</p>'
    : scores.map(s=>`<div class="lb-row"><span class="lb-wpm">${s.wpm} WPM</span><span class="lb-acc">${Math.round(s.accuracy??0)}%</span><span class="lb-date">${new Date(s.created_at).toLocaleDateString()}</span><span style="color:var(--dim);font-size:7px">${s.mode}</span></div>`).join('');
  document.getElementById('btn-profile-home').onclick = () => showScreen('landing');
}
