import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error; return data.user;
}
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error; return data.user;
}
export async function signOut() { await supabase.auth.signOut(); }

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error; return data;
}
export async function updateProfile(userId, updates) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  if (error) throw error;
}

export async function getRandomPrompt() {
  const { data, error } = await supabase.from('prompts').select('*');
  if (error) throw error;
  return data[Math.floor(Math.random() * data.length)];
}

export async function submitPrompt(text) {
  const { data, error } = await supabase.from('prompts').insert({ text }).select().single();
  if (error) throw error; return data;
}

export async function saveScore({ userId, wpm, accuracy, rawWpm, promptId, mode, raceId = null }) {
  const { data, error } = await supabase.from('scores').insert({
    user_id: userId, wpm, accuracy, raw_wpm: rawWpm, prompt_id: promptId, mode, race_id: raceId,
  }).select().single();
  if (error) throw error; return data;
}
export async function getLeaderboard(filter = 'alltime') {
  let q = supabase.from('scores').select('wpm,accuracy,created_at,profiles!inner(username,avatar_cat)')
    .eq('mode', 'solo').order('wpm', { ascending: false }).limit(50);
  if (filter === 'week') q = q.gte('created_at', new Date(Date.now() - 7*86400000).toISOString());
  const { data, error } = await q; if (error) throw error; return data;
}
export async function getPersonalBests(userId, limit = 10) {
  const { data, error } = await supabase.from('scores').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error; return data;
}

export async function createRaceInDb(hostId, promptId) {
  for (let i = 0; i < 5; i++) {
    const room_code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabase.from('races').insert({ room_code, prompt_id: promptId, host_id: hostId }).select().single();
    if (!error) return data;
    if (!error.message.includes('unique')) throw error;
  }
  throw new Error('Could not generate unique room code');
}
export async function getRaceByCode(code) {
  const { data, error } = await supabase.from('races')
    .select('*,prompts(*),race_participants(*,profiles(username,avatar_cat))')
    .eq('room_code', code.toUpperCase()).single();
  if (error) throw error; return data;
}
export async function joinRaceInDb(raceId, userId) {
  const { error } = await supabase.from('race_participants').upsert({ race_id: raceId, user_id: userId }, { onConflict: 'race_id,user_id' });
  if (error) throw error;
}
export async function setPlayerReady(raceId, userId, ready) {
  const { error } = await supabase.from('race_participants').update({ ready }).eq('race_id', raceId).eq('user_id', userId);
  if (error) throw error;
}
export async function setRaceStatus(raceId, status) {
  const u = { status };
  if (status === 'racing') u.started_at = new Date().toISOString();
  if (status === 'finished') u.finished_at = new Date().toISOString();
  const { error } = await supabase.from('races').update(u).eq('id', raceId);
  if (error) throw error;
}
export async function recordFinish(raceId, userId, position, scoreId) {
  const { error } = await supabase.from('race_participants').update({ position, score_id: scoreId }).eq('race_id', raceId).eq('user_id', userId);
  if (error) throw error;
}
export async function getRaceResults(raceId) {
  const { data, error } = await supabase.from('race_participants')
    .select('position,profiles(username,avatar_cat),scores(wpm,accuracy)').eq('race_id', raceId).order('position', { nullsFirst: false });
  if (error) throw error; return data;
}

export async function saveGhost(raceId, userId, keystrokes, wpm) {
  const { data, error } = await supabase.from('challenge_ghosts').insert({ race_id: raceId, user_id: userId, keystrokes, wpm }).select().single();
  if (error) throw error; return data;
}
export async function getGhost(raceId) {
  const { data } = await supabase.from('challenge_ghosts').select('*,profiles(username)')
    .eq('race_id', raceId).order('wpm', { ascending: false }).limit(1).single();
  return data ?? null;
}
export async function getRacePrompt(raceId) {
  const { data, error } = await supabase.from('races').select('*,prompts(*)').eq('id', raceId).single();
  if (error) throw error; return data;
}
