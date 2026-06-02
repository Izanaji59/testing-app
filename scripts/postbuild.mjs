/**
 * postbuild.mjs
 * Runs automatically after `npm run build` (via "postbuild" npm lifecycle).
 *
 * Écrit out/_redirects pour le SPA fallback Netlify.
 * Next.js génère déjà out/index.html (page racine de l'app).
 * Le netlify.toml contient déjà la même règle — ce fichier est
 * un filet de sécurité pour les déploiements manuels (drag-and-drop).
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

// SPA fallback : toutes les routes non-statiques servent /index.html
// Netlify sert d'abord le fichier exact (ex: /login/ → out/login/index.html)
const redirects = `/*    /index.html    200\n`;
writeFileSync(join(outDir, '_redirects'), redirects, 'utf8');
console.log('✅  out/_redirects created (SPA fallback /*  →  /index.html)');
