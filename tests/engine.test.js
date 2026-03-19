import { describe, it, expect, beforeEach } from 'vitest';
import { createEngine } from '../js/engine.js';

describe('createEngine', () => {
  let engine;
  beforeEach(() => { engine = createEngine('hello world'); });

  it('starts with cursor at 0', () => expect(engine.cursor).toBe(0));
  it('correct char advances cursor', () => { engine.type('h'); expect(engine.cursor).toBe(1); });
  it('wrong char does not advance cursor', () => { engine.type('x'); expect(engine.cursor).toBe(0); });
  it('wrong char marks error', () => { engine.type('x'); expect(engine.hasError).toBe(true); });
  it('backspace clears error', () => { engine.type('x'); engine.type('Backspace'); expect(engine.hasError).toBe(false); });
  it('backspace without error is safe', () => { engine.type('Backspace'); expect(engine.cursor).toBe(0); });
  it('typing in error state does not advance', () => { engine.type('x'); engine.type('h'); expect(engine.cursor).toBe(0); });
  it('tracks total keystrokes', () => { engine.type('h'); engine.type('x'); expect(engine.totalKeystrokes).toBe(2); });
  it('calculates accuracy', () => { engine.type('h'); engine.type('x'); expect(engine.accuracy).toBe(50); });
  it('accuracy is 100 with no keystrokes', () => expect(engine.accuracy).toBe(100));
  it('detects completion', () => { for (const c of 'hello world') engine.type(c); expect(engine.isComplete).toBe(true); });
  it('not complete mid-way', () => { engine.type('h'); expect(engine.isComplete).toBe(false); });
  it('calculates WPM', () => {
    const e = createEngine('hello world');
    e._startTime = Date.now() - 60_000;
    for (const c of 'hello worl') e.type(c);
    expect(e.wpm).toBe(2);
  });
  it('WPM is 0 before typing', () => expect(engine.wpm).toBe(0));
  it('rawWpm tracks all keystrokes', () => {
    const e = createEngine('hello');
    e._startTime = Date.now() - 60_000;
    e.type('h'); e.type('x'); e.type('Backspace'); e.type('e');
    expect(e.rawWpm).toBeGreaterThanOrEqual(0);
  });
});
