let _ctx = null;
let _muted = false;
let _clickBuf = null; // pre-allocated once, reused per keystroke

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}

function getClickBuf(ctx) {
  if (!_clickBuf) {
    _clickBuf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const data = _clickBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
  }
  return _clickBuf;
}

export function toggleMute() { _muted = !_muted; return _muted; }
export function isMuted() { return _muted; }

export function playClick() {
  if (_muted) return;
  try {
    const ctx = getCtx();
    const src = ctx.createBufferSource();
    src.buffer = getClickBuf(ctx);
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    src.connect(gain); gain.connect(ctx.destination);
    src.start();
  } catch {}
}

export function playError() {
  if (_muted) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = 120;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

export function playFinish() {
  if (_muted) return;
  try {
    const ctx = getCtx();
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch {}
}
