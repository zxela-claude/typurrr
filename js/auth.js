import { supabase, signIn, signUp, signOut, fetchProfile } from './supabase.js';

let _user = null, _profile = null, _onChange = null;
export const getUser = () => _user;
export const getUserProfile = () => _profile;
export function setUserProfile(profile) { _profile = profile; }

export async function initAuth(onChange) {
  _onChange = onChange;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) { _user = session.user; _profile = await fetchProfile(_user.id).catch(() => null); }
  supabase.auth.onAuthStateChange(async (_, session) => {
    _user = session?.user ?? null;
    _profile = _user ? await fetchProfile(_user.id).catch(() => null) : null;
    _onChange?.(_user, _profile);
  });
  return { user: _user, profile: _profile };
}

export function openAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
  document.getElementById('auth-email').focus();
}
function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  document.getElementById('auth-error').classList.add('hidden');
}

export function bindAuthModal() {
  let mode = 'signin';
  const titleEl = document.getElementById('auth-modal-title');
  const submitEl = document.getElementById('auth-submit');
  const toggleEl = document.getElementById('auth-toggle');
  const errorEl  = document.getElementById('auth-error');

  submitEl.addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    const pw    = document.getElementById('auth-password').value;
    errorEl.classList.add('hidden');

    if (!email.includes('@') || !email.includes('.')) {
      errorEl.textContent = 'Please enter a valid email address';
      errorEl.classList.remove('hidden');
      return;
    }
    if (pw.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters';
      errorEl.classList.remove('hidden');
      return;
    }

    submitEl.textContent = '...';
    try {
      if (mode === 'signin') await signIn(email, pw); else await signUp(email, pw);
      closeAuthModal();
    } catch (e) { errorEl.textContent = e.message; errorEl.classList.remove('hidden'); }
    finally { submitEl.textContent = mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'; }
  });
  toggleEl.addEventListener('click', () => {
    mode = mode === 'signin' ? 'signup' : 'signin';
    titleEl.textContent  = mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT';
    submitEl.textContent = mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT';
    toggleEl.textContent = mode === 'signin' ? 'No account? Sign up →' : 'Have account? Sign in →';
  });
  document.getElementById('auth-close').addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeAuthModal(); });
}
