// Liens et lecteurs Allflix par tableur.
//   export : crée un CSV (une ligne par œuvre), pré-rempli avec les plateformes légales
//            où l'œuvre est disponible en France (TMDB / JustWatch).
//   import : valide le CSV (édité dans Excel, LibreOffice…) et l'écrit dans public/allflix/playback.json.
// Sources autorisées uniquement : un lien n'est accepté que si son domaine figure dans
// config/allflix-sources.json. Aucune extraction de sites tiers.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLUMNS = ['id', 'titre', 'type_oeuvre', 'annee', 'saison', 'episode', 'lecture', 'url', 'libelle', 'plateformes_fr'];
const TYPES = ['video', 'embed', 'link'];

/** CSV séparé par « ; » (Excel français) ou « , », guillemets gérés. */
export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g) ?? []).length >= (firstLine.match(/,/g) ?? []).length ? ';' : ',';
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header = [], ...body] = rows.filter(r => r.some(cell => cell.trim()));
  const keys = header.map(h => h.trim().toLowerCase());
  return body.map((cells, i) => ({ line: i + 2, ...Object.fromEntries(keys.map((k, j) => [k, (cells[j] ?? '').trim()])) }));
}

const csvCell = value => /[;"\r\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value);
export function toCsv(rows) {
  return '﻿' + [COLUMNS.join(';'), ...rows.map(r => COLUMNS.map(c => csvCell(r[c] ?? '')).join(';'))].join('\r\n') + '\r\n';
}

export function isAllowedUrl(raw, domains) {
  let url;
  try { url = new URL(raw); } catch { return false; }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return domains.some(d => host === d || host.endsWith('.' + d));
}

/** Valide les lignes et produit les entrées playback.json. Une ligne sans url est ignorée. */
export function buildPlayback(rows, titles, domains) {
  const byId = new Map(titles.map(t => [t.id, t]));
  const entries = {}, errors = [];
  let skipped = 0;
  for (const r of rows) {
    if (!r.url) { skipped++; continue; }
    const title = byId.get(r.id);
    if (!title) { errors.push(`ligne ${r.line} : œuvre inconnue « ${r.id} »`); continue; }
    const type = (r.lecture || 'link').toLowerCase();
    if (!TYPES.includes(type)) { errors.push(`ligne ${r.line} : lecture « ${r.lecture} » (attendu : link, embed ou video)`); continue; }
    if (!isAllowedUrl(r.url, domains)) { errors.push(`ligne ${r.line} : URL refusée (HTTPS et domaine de config/allflix-sources.json requis) : ${r.url}`); continue; }
    const hasS = r.saison !== '' && r.saison !== undefined, hasE = r.episode !== '' && r.episode !== undefined;
    let key = title.id;
    if (hasS || hasE) {
      const s = Number(r.saison), e = Number(r.episode);
      if (title.media !== 'tv' || !hasS || !hasE || !Number.isInteger(s) || s < 0 || !Number.isInteger(e) || e < 1) {
        errors.push(`ligne ${r.line} : saison et épisode à renseigner ensemble, et seulement pour une série`); continue;
      }
      key = `${title.id}:s${s}:e${e}`;
    }
    const label = (r.libelle ?? '').slice(0, 80);
    entries[key] = label ? { type, url: r.url, label } : { type, url: r.url };
  }
  return { entries, errors, skipped };
}

export function providerRow(title, fr) {
  const names = [...new Set(['flatrate', 'free', 'ads', 'rent', 'buy'].flatMap(k => (fr?.[k] ?? []).map(p => p.provider_name)))];
  const available = !!fr?.link && names.length > 0;
  return {
    id: title.id, titre: title.title, type_oeuvre: title.media === 'movie' ? 'film' : 'série', annee: title.year ?? '',
    saison: '', episode: '',
    lecture: available ? 'link' : '', url: available ? fr.link : '', libelle: available ? 'Où regarder' : '',
    plateformes_fr: names.length ? names.join(', ') : 'Aucune plateforme référencée en France',
  };
}

async function readJson(file, fallback) {
  const text = await fs.readFile(file, 'utf8').catch(() => null);
  return text === null ? fallback : JSON.parse(text);
}

async function readText(file) {
  const bytes = await fs.readFile(file);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return new TextDecoder('windows-1252').decode(bytes); } // CSV « standard » d'Excel
}

async function exportCsv(out) {
  const env = await fs.readFile(path.join(root, '.env.local'), 'utf8').catch(() => '');
  const key = process.env.TMDB_API_KEY || env.match(/^TMDB_API_KEY=["']?([^\s"']+)/m)?.[1];
  if (!key) throw new Error('TMDB_API_KEY est requis (variable d’environnement ou .env.local).');
  const { titles } = await readJson(path.join(root, 'public/allflix/catalog.json'), { titles: [] });
  const rows = [];
  for (const [i, t] of titles.entries()) {
    const url = new URL(`https://api.themoviedb.org/3/${t.media}/${t.tmdbId}/watch/providers`);
    url.searchParams.set('api_key', key);
    let fr = null;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (response.ok) fr = (await response.json()).results?.FR ?? null;
    } catch { /* œuvre exportée sans plateforme */ }
    rows.push(providerRow(t, fr));
    process.stdout.write(`\r[${i + 1}/${titles.length}] ${t.title.slice(0, 50).padEnd(50)}`);
    await new Promise(r => setTimeout(r, 60));
  }
  await fs.writeFile(out, toCsv(rows));
  const linked = rows.filter(r => r.url).length;
  console.log(`\n✓ ${out} : ${rows.length} œuvres, ${linked} disponibles sur au moins une plateforme en France.`);
  console.log('  Ouvre-le dans Excel, ajoute ou corrige les liens, enregistre en CSV, puis : npm run allflix:links -- import <fichier.csv>');
}

async function importCsv(file, dryRun) {
  const { titles } = await readJson(path.join(root, 'public/allflix/catalog.json'), { titles: [] });
  const { domaines = [] } = await readJson(path.join(root, 'config/allflix-sources.json'), {});
  const rows = parseCsv(await readText(file));
  const { entries, errors, skipped } = buildPlayback(rows, titles, domaines.map(d => String(d).toLowerCase()));
  const target = path.join(root, 'public/allflix/playback.json');
  const merged = { ...(await readJson(target, {})), ...entries };
  if (!dryRun) await fs.writeFile(target, JSON.stringify(merged, null, 2) + '\n');
  console.log(`${dryRun ? '(essai, rien n’est écrit) ' : ''}✓ ${Object.keys(entries).length} lien(s) importé(s), ${skipped} ligne(s) sans URL ignorée(s), ${errors.length} refusée(s).`);
  for (const e of errors) console.log('  ✗ ' + e);
  if (!dryRun) console.log('  Publier : commit de public/allflix/playback.json puis push sur main.');
  if (errors.length) process.exitCode = 1;
}

async function main() {
  const [command, file, ...rest] = process.argv.slice(2);
  if (command === 'export') return exportCsv(path.resolve(file ?? 'allflix-liens.csv'));
  if (command === 'import' && file) return importCsv(path.resolve(file), rest.includes('--dry-run'));
  console.log('Usage :\n  npm run allflix:links -- export [allflix-liens.csv]\n  npm run allflix:links -- import <fichier.csv> [--dry-run]');
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error('✗ ' + error.message); process.exitCode = 1; });
}
