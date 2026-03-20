/**
 * Toast notification system.
 * showToast(msg, type) — displays a small fixed notification top-right.
 * type: 'error' (red-ish) | 'info' (primary color)
 */
export function showToast(msg, type = 'error') {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = [
    'position:fixed',
    'top:16px',
    'right:16px',
    'z-index:9999',
    'padding:10px 16px',
    'font-family:monospace',
    'font-size:13px',
    'border:1px solid var(--border, #2a5e2a)',
    'border-radius:4px',
    'opacity:1',
    'transition:opacity 0.4s ease',
    'pointer-events:none',
  ].join(';');

  if (type === 'error') {
    toast.style.background = '#1a0000';
    toast.style.color = '#ff4444';
    toast.style.borderColor = '#ff4444';
  } else {
    toast.style.background = 'var(--bg, #000)';
    toast.style.color = 'var(--primary, #39ff14)';
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}
