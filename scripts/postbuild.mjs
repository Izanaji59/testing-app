/**
 * postbuild.mjs
 * Runs automatically after `npm run build` (via "postbuild" npm lifecycle).
 *
 * Adds two files to `out/` that Netlify needs for a correct manual deploy
 * (drag-and-drop) or any static hosting that requires a root index.html:
 *
 *   out/index.html   → meta-refresh redirect to /game/
 *   out/_redirects   → Netlify SPA fallback rules
 */

import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'out');

if (!existsSync(outDir)) {
  console.error('❌  out/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

// 1. Root index.html — redirects visitors landing on / toward /game/
const rootHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=/game/">
  <title>LATRACTION</title>
  <script>window.location.replace('/game/');</script>
</head>
<body></body>
</html>
`;
writeFileSync(join(outDir, 'index.html'), rootHtml, 'utf8');
console.log('✅  out/index.html created (root → /game/ redirect)');

// 2. _redirects — Netlify SPA fallback so page refreshes on /game/* work
const redirects = `/          /game/            302
/game/*    /game/index.html  200
`;
writeFileSync(join(outDir, '_redirects'), redirects, 'utf8');
console.log('✅  out/_redirects created (SPA fallback for /game/*)');
