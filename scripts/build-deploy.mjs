#!/usr/bin/env node
// scripts/build-deploy.mjs
// Copie le build statique (out/) vers le dossier Netlify de latraction.net,
// sous /game/, SANS toucher au site existant.

import { cp, rm, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'out');

// Chemin du dossier Netlify (site nettoyage). Ajustable via env.
const DEPLOY_ROOT =
  process.env.LATRACTION_DEPLOY_DIR ||
  path.resolve(ROOT, '..', '..', 'deploy-69b2220d883ee2298d02d348');

const TARGET = path.join(DEPLOY_ROOT, 'game');

async function main() {
  if (!existsSync(OUT)) {
    console.error('✗ Le dossier out/ n\'existe pas. Lance "npm run build" d\'abord.');
    process.exit(1);
  }
  if (!existsSync(DEPLOY_ROOT)) {
    console.error(`✗ DEPLOY_ROOT introuvable : ${DEPLOY_ROOT}`);
    console.error('  Ajuste avec LATRACTION_DEPLOY_DIR=... npm run deploy:game');
    process.exit(1);
  }

  console.log(`→ Nettoyage de ${TARGET}`);
  if (existsSync(TARGET)) {
    await rm(TARGET, { recursive: true, force: true });
  }
  await mkdir(TARGET, { recursive: true });

  console.log(`→ Copie ${OUT} → ${TARGET}`);
  await cp(OUT, TARGET, { recursive: true });

  // Vérifier le _redirects et rappeler la ligne SPA
  const redirectsPath = path.join(DEPLOY_ROOT, '_redirects');
  if (existsSync(redirectsPath)) {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(redirectsPath, 'utf-8');
    if (!content.includes('/game/*')) {
      console.warn('');
      console.warn('⚠ AJOUTE CETTE LIGNE à la fin de _redirects pour le SPA fallback :');
      console.warn('   /game/*   /game/index.html   200');
      console.warn('');
    }
  }

  console.log('');
  console.log('✓ Déploiement préparé.');
  console.log(`  → Pousse le dossier ${DEPLOY_ROOT} sur Netlify pour activer.`);
}

main().catch(err => {
  console.error('✗ Échec :', err);
  process.exit(1);
});
