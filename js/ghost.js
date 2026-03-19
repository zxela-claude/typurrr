import { showScreen } from './screens.js';
import { createEngine } from './engine.js';
import { CatSprite } from './sprites.js';
import { getGhost, getRacePrompt, saveScore } from './supabase.js';
import { getUser, getUserProfile } from './auth.js';

export async function startChallenge(raceId) {
  let race, ghost;
  try { [race, ghost] = await Promise.all([getRacePrompt(raceId), getGhost(raceId)]); }
  catch { alert('Challenge not found'); showScreen('landing'); return; }

  const promptText = race.prompts?.text || '';
  const engine = createEngine(promptText);
  const myCat = new CatSprite(getUserProfile()?.avatar_cat || 'orange');
  const ghostCat = new CatSprite('grey');

  showScreen('solo');
  document.getElementById('solo-results').classList.add('hidden');
  document.getElementById('solo-wpm-display').textContent = '0 WPM';
  renderPrompt(engine);

  // Precompute ghost timeline
  const timeline = [];
  if (ghost?.keystrokes?.length) {
    let abs = 0, cur = 0;
    for (const { char, t_ms } of ghost.keystrokes) {
      abs += t_ms;
      if (char !== 'Backspace' && char === promptText[cur]) cur++;
      timeline.push({ abs, cursor: cur });
    }
  }

  let raceStart = null, ghostPct = 0;
  function tickGhost() {
    if (!raceStart) return;
    const elapsed = Date.now() - raceStart;
    let cur = 0;
    for (const p of timeline) { if (p.abs <= elapsed) cur = p.cursor; else break; }
    ghostPct = cur / promptText.length;
    if (ghostPct < 1) requestAnimationFrame(tickGhost);
  }

  const canvas = document.getElementById('race-track');
  canvas.height = 160;
  let lastT = performance.now(); let rafId;

  function draw(t) {
    const dt = t - lastT; lastT = t;
    const ctx = canvas.getContext('2d'); const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    const css = getComputedStyle(document.documentElement);
    const bc = css.getPropertyValue('--border').trim()||'#2a5e2a';
    const dc = css.getPropertyValue('--dim').trim()||'#1e6e1e';
    ctx.strokeStyle=bc; ctx.lineWidth=1;
    [H/2-4,H-8].forEach(y=>{ctx.beginPath();ctx.moveTo(20,y);ctx.lineTo(W-20,y);ctx.stroke();});
    ctx.fillStyle=dc; ctx.font='8px monospace';
    ctx.fillText('YOU',6,H/2-20); ctx.fillText(ghost?.profiles?.username||'GHOST',6,H-24);
    const myPct = engine.cursor/promptText.length;
    myCat.update(raceStart?dt:0); myCat.draw(ctx, 20+myPct*(W-80), H/2-60, 3);
    ghostCat.update(ghostPct>0?dt:0); ghostCat.draw(ctx, 20+ghostPct*(W-80), H-70, 3);
    if (!engine.isComplete) rafId = requestAnimationFrame(draw);
  }
  rafId = requestAnimationFrame(draw);

  const input = document.getElementById('typing-input');
  input.value=''; input.disabled=false;
  input.replaceWith(input.cloneNode(true));
  const fresh = document.getElementById('typing-input');
  fresh.placeholder = 'start typing to race the ghost...'; fresh.focus();

  fresh.addEventListener('keydown', e => {
    if (engine.isComplete) return;
    const char = e.key==='Backspace'?'Backspace':(e.key.length===1?e.key:null);
    if (!char) return; e.preventDefault();
    if (!raceStart) { raceStart=Date.now(); requestAnimationFrame(tickGhost); }
    engine.type(char); renderPrompt(engine);
    document.getElementById('solo-wpm-display').textContent = `${engine.wpm} WPM`;
    if (engine.isComplete) {
      cancelAnimationFrame(rafId); fresh.disabled=true;
      document.getElementById('result-wpm').textContent=engine.wpm;
      document.getElementById('result-accuracy').textContent=engine.accuracy;
      document.getElementById('result-raw-wpm').textContent=engine.rawWpm;
      document.getElementById('solo-results').classList.remove('hidden');
      canvas.height=100;
      const user=getUser();
      if (user&&race.prompts?.id) saveScore({userId:user.id,wpm:engine.wpm,accuracy:engine.accuracy,rawWpm:engine.rawWpm,promptId:race.prompts.id,mode:'solo'}).catch(()=>{});
    }
  });
}

function renderPrompt(engine) {
  document.getElementById('prompt-display').innerHTML = [...engine.prompt].map((ch,i)=>{
    const s=ch===' '?'&nbsp;':ch.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    if(i<engine.cursor) return `<span class="char-correct">${s}</span>`;
    if(i===engine.cursor) return `<span class="${engine.hasError?'char-error':'char-cursor'}">${s}</span>`;
    return `<span class="char-pending">${s}</span>`;
  }).join('');
}
