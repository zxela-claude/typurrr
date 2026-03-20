export function renderPrompt(engine) {
  document.getElementById('prompt-display').innerHTML = [...engine.prompt].map((ch, i) => {
    const s = ch === ' ' ? '&nbsp;' : ch.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    if (i < engine.cursor) return `<span class="char-correct">${s}</span>`;
    if (i === engine.cursor) return `<span class="${engine.hasError ? 'char-error' : 'char-cursor'}">${s}</span>`;
    return `<span class="char-pending">${s}</span>`;
  }).join('');
}
