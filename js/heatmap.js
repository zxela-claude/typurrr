// js/heatmap.js

const ROWS = [
  ['`','1','2','3','4','5','6','7','8','9','0','-','='],
  ['q','w','e','r','t','y','u','i','o','p','[',']','\\'],
  ['a','s','d','f','g','h','j','k','l',';',"'"],
  ['z','x','c','v','b','n','m',',','.','/', ' '],
];

export function drawHeatmap(canvas) {
  const data = JSON.parse(localStorage.getItem('typurrr-heatmap') || '{}');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Compute average latency per key
  const avgs = {};
  let maxAvg = 0;
  for (const [char, { total, count }] of Object.entries(data)) {
    if (count > 0) {
      avgs[char.toLowerCase()] = total / count;
      maxAvg = Math.max(maxAvg, avgs[char.toLowerCase()]);
    }
  }

  const keyW = Math.floor((W - 20) / 14);
  const keyH = Math.floor((H - 10) / 5);

  ROWS.forEach((row, ri) => {
    const offsetX = ri * keyW * 0.5;
    row.forEach((key, ki) => {
      const x = 10 + ki * keyW + offsetX;
      const y = 5 + ri * keyH;
      const avg = avgs[key] || avgs[key.toUpperCase()] || 0;
      const intensity = maxAvg > 0 ? avg / maxAvg : 0;

      // Color: green (fast) → yellow → red (slow)
      const r = Math.round(intensity * 255);
      const g = Math.round((1 - intensity) * 180);
      ctx.fillStyle = avg === 0 ? 'rgba(255,255,255,0.05)' : `rgb(${r},${g},0)`;
      ctx.fillRect(x, y, keyW - 2, keyH - 2);

      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(6, keyW * 0.35)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(key === ' ' ? '___' : key.toUpperCase(), x + keyW/2 - 1, y + keyH/2 + 2);

      if (avg > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '5px monospace';
        ctx.fillText(`${Math.round(avg)}ms`, x + keyW/2 - 1, y + keyH - 3);
      }
    });
  });
  ctx.textAlign = 'left';
}
