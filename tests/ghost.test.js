import { describe, it, expect } from 'vitest';

// Pure functions extracted from ghost.js startChallenge()
// These replicate the timeline precomputation and ghost position lookup logic.

function buildTimeline(keystrokes, promptText) {
  const timeline = [];
  let abs = 0, cur = 0;
  for (const { char, t_ms } of keystrokes) {
    abs += t_ms;
    if (char !== 'Backspace' && char === promptText[cur]) cur++;
    timeline.push({ abs, cursor: cur });
  }
  return timeline;
}

function getGhostPct(timeline, elapsed, promptLength) {
  let cur = 0;
  for (const p of timeline) { if (p.abs <= elapsed) cur = p.cursor; else break; }
  return cur / promptLength;
}

describe('buildTimeline', () => {
  it('returns empty array for empty keystrokes', () => {
    const timeline = buildTimeline([], 'hello');
    expect(timeline).toEqual([]);
  });

  it('correct keystrokes advance cursor', () => {
    const timeline = buildTimeline(
      [{ char: 'h', t_ms: 100 }, { char: 'i', t_ms: 100 }],
      'hi'
    );
    expect(timeline[0].cursor).toBe(1);
    expect(timeline[1].cursor).toBe(2);
  });

  it('Backspace does not advance cursor', () => {
    const timeline = buildTimeline(
      [{ char: 'h', t_ms: 100 }, { char: 'Backspace', t_ms: 50 }],
      'hello'
    );
    expect(timeline[0].cursor).toBe(1);
    expect(timeline[1].cursor).toBe(1); // Backspace does not advance
  });

  it('wrong character does not advance cursor', () => {
    const timeline = buildTimeline(
      [{ char: 'x', t_ms: 100 }, { char: 'h', t_ms: 100 }],
      'hello'
    );
    expect(timeline[0].cursor).toBe(0); // 'x' is wrong, stays at 0
    expect(timeline[1].cursor).toBe(1); // 'h' is correct
  });

  it('absolute times accumulate correctly', () => {
    const timeline = buildTimeline(
      [{ char: 'h', t_ms: 100 }, { char: 'e', t_ms: 200 }, { char: 'l', t_ms: 150 }],
      'hello'
    );
    expect(timeline[0].abs).toBe(100);
    expect(timeline[1].abs).toBe(300);
    expect(timeline[2].abs).toBe(450);
  });

  it('each entry has abs and cursor fields', () => {
    const timeline = buildTimeline(
      [{ char: 'h', t_ms: 100 }],
      'hello'
    );
    expect(timeline[0]).toHaveProperty('abs');
    expect(timeline[0]).toHaveProperty('cursor');
  });

  it('produces one entry per keystroke', () => {
    const keystrokes = [
      { char: 'h', t_ms: 100 },
      { char: 'e', t_ms: 100 },
      { char: 'l', t_ms: 100 },
    ];
    const timeline = buildTimeline(keystrokes, 'hello');
    expect(timeline.length).toBe(3);
  });

  it('multiple wrong chars in a row all keep cursor at 0', () => {
    const timeline = buildTimeline(
      [{ char: 'z', t_ms: 50 }, { char: 'x', t_ms: 50 }, { char: 'y', t_ms: 50 }],
      'hello'
    );
    expect(timeline.every(p => p.cursor === 0)).toBe(true);
  });

  it('full correct typing reaches end of prompt', () => {
    const prompt = 'hi';
    const timeline = buildTimeline(
      [{ char: 'h', t_ms: 100 }, { char: 'i', t_ms: 100 }],
      prompt
    );
    expect(timeline[timeline.length - 1].cursor).toBe(prompt.length);
  });
});

describe('getGhostPct', () => {
  const prompt = 'hello';
  const keystrokes = [
    { char: 'h', t_ms: 100 },
    { char: 'e', t_ms: 100 },
    { char: 'l', t_ms: 100 },
    { char: 'l', t_ms: 100 },
    { char: 'o', t_ms: 100 },
  ];
  const timeline = buildTimeline(keystrokes, prompt);

  it('returns 0% when elapsed is 0 and no entries have abs <= 0', () => {
    const pct = getGhostPct(timeline, 0, prompt.length);
    expect(pct).toBe(0);
  });

  it('returns 100% when elapsed exceeds all abs times', () => {
    const pct = getGhostPct(timeline, 10000, prompt.length);
    expect(pct).toBe(1);
  });

  it('returns correct fraction mid-race', () => {
    // After 250ms, entries at abs 100, 200 have been processed (cursor=2), abs 300 has not
    const pct = getGhostPct(timeline, 250, prompt.length);
    expect(pct).toBe(2 / 5);
  });

  it('returns 0 for empty timeline', () => {
    const pct = getGhostPct([], 999, 5);
    expect(pct).toBe(0);
  });

  it('returns correct pct when elapsed matches exact abs time', () => {
    // At elapsed=100, cursor should advance to 1 (abs=100 <= 100)
    const pct = getGhostPct(timeline, 100, prompt.length);
    expect(pct).toBe(1 / 5);
  });
});
