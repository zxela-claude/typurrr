const VARIANTS = {
  orange:    ['#e06b00', '#b85000', '#39ff14', '#ff6699'],
  grey:      ['#8a8a8a', '#555555', '#00cfff', '#ff6699'],
  tuxedo:    ['#1a1a1a', '#f0f0f0', '#ff2244', '#ff9999'],
  calico:    ['#d4a843', '#c0532a', '#9b59b6', '#ff6699'],
  ghost_cat: ['#c8d8e8', '#a0b8c8', '#ff88aa', '#ffffff'],  // pale blue-white ghost cat
  neon_cat:  ['#ff00ff', '#aa00ff', '#00ffff', '#ffff00'],  // neon magenta/purple
};

const CAT_BODY = [
  0b1100000000000110,0b1110000000001110,0b1111111111111111,0b1111111111111111,
  0b1111111111111111,0b1111111111111111,0b1111111111111111,0b0111111111111110,
  0b0011111111111100,0b0001111111111000,0b0011111111111100,0b0111111111111110,
  0b0111111111111110,0b0011111111111100,0b0000000000000000,0b0000000000000000,
];

const FRAME_LEGS = [
  [0b0110000001100000, 0b0110000001100000],
  [0b0110001100000000, 0b0110001100000000],
  [0b0000011000110000, 0b0000011000110000],
  [0b0000000001100110, 0b0000000001100110],
];

export function drawCat(ctx, x, y, frame, variant = 'orange', scale = 3) {
  const [body, stripe, eye, nose] = VARIANTS[variant] || VARIANTS.orange;
  const f = frame % 4;

  for (let row = 0; row < 16; row++) {
    let bits = (row === 14) ? FRAME_LEGS[f][0] : (row === 15) ? FRAME_LEGS[f][1] : CAT_BODY[row];
    for (let col = 0; col < 16; col++) {
      if (!((bits >> (15 - col)) & 1)) continue;
      let color = (row % 3 === 2) ? stripe : body;
      if (row < 2 && (col < 4 || col > 11)) color = stripe;
      if (row === 5 && (col === 5 || col === 10)) color = eye;
      if (row === 7 && (col === 7 || col === 8)) color = nose;
      ctx.fillStyle = color;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

export class CatSprite {
  constructor(variant = 'orange') {
    this.variant = variant; this.frame = 0; this._t = 0; this._dur = 110;
  }
  update(dt) {
    this._t += dt;
    if (this._t >= this._dur) { this._t = 0; this.frame = (this.frame + 1) % 4; }
  }
  draw(ctx, x, y, scale = 3) { drawCat(ctx, Math.round(x), Math.round(y), this.frame, this.variant, scale); }
  static preview(variant, size = 48) {
    const c = document.createElement('canvas');
    c.width = c.height = size; c.style.imageRendering = 'pixelated';
    drawCat(c.getContext('2d'), 0, 0, 0, variant, Math.floor(size / 16));
    return c;
  }
}
