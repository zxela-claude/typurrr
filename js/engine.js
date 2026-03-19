/**
 * Typing engine — pure logic, no DOM.
 * @param {string} prompt — the text to type
 */
export function createEngine(prompt) {
  const engine = {
    prompt,
    cursor: 0,
    hasError: false,
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    _startTime: null,

    type(char) {
      if (this._startTime === null) this._startTime = Date.now();

      if (char === 'Backspace') {
        if (this.hasError) this.hasError = false;
        return;
      }

      this.totalKeystrokes++;

      if (this.hasError) return; // must backspace before typing again

      if (char === this.prompt[this.cursor]) {
        this.correctKeystrokes++;
        this.cursor++;
      } else {
        this.hasError = true;
      }
    },

    get isComplete() {
      return this.cursor === this.prompt.length;
    },

    get accuracy() {
      if (this.totalKeystrokes === 0) return 100;
      return Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100);
    },

    get elapsedMinutes() {
      if (!this._startTime) return 0;
      return (Date.now() - this._startTime) / 60_000;
    },

    get wpm() {
      const mins = this.elapsedMinutes;
      if (mins === 0) return 0;
      return Math.round((this.correctKeystrokes / 5) / mins);
    },

    get rawWpm() {
      const mins = this.elapsedMinutes;
      if (mins === 0) return 0;
      return Math.round((this.totalKeystrokes / 5) / mins);
    },
  };

  return engine;
}
