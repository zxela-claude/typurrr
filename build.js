import fs from 'fs';
import path from 'path';

const SUPABASE_URL      = process.env.SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️  SUPABASE_URL or SUPABASE_ANON_KEY not set — app will use placeholder values');
}

const SRC  = new URL('.', import.meta.url).pathname;
const DIST = path.join(SRC, 'dist');
fs.rmSync(DIST, { recursive: true, force: true });
copyDir(SRC, DIST, ['dist', 'node_modules', '.git', 'supabase', 'tests', '.github', '.vercel']);

// Inject env vars into index.html
const htmlPath = path.join(DIST, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');
html = html.replace('</head>', `<script>
  window.__TYPURRR_SUPABASE_URL__ = ${JSON.stringify(SUPABASE_URL)};
  window.__TYPURRR_SUPABASE_ANON_KEY__ = ${JSON.stringify(SUPABASE_ANON_KEY)};
</script>\n</head>`);
fs.writeFileSync(htmlPath, html);

console.log('✓ Build complete →', DIST);

function copyDir(src, dest, exclude = []) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.includes(entry.name)) continue;
    const s = path.join(src, entry.name), d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d, exclude) : fs.copyFileSync(s, d);
  }
}
