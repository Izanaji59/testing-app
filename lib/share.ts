// lib/share.ts — Liens de partage : une quête (copiée chez celui qui la relève) ou un défi commun.
// La quête voyage dans l'URL (aucune donnée serveur) ; seul ce que le joueur voit est partagé
// (jamais de montant en euros, d'échéance ni d'identifiant de quête).

import type { DifficultyTier, StatKind } from '@/lib/types';

export type SharedQuest = { title: string; minutes: number; tier: DifficultyTier; stats: StatKind[] };
export type ShareLink =
  | { kind: 'quest'; path: string; quest: SharedQuest; raw: string }
  | { kind: 'challenge'; path: string; id: string; raw: string };

// Ordre figé : les liens déjà partagés en dépendent. Ajouter à la fin, ne jamais réordonner.
const TIERS: DifficultyTier[] = ['TRIVIAL', 'ROUTINE', 'NOTABLE', 'HARD', 'LEGENDARY'];
const STATS: StatKind[] = ['DISCIPLINE', 'FOCUS', 'INTELLIGENCE', 'CREATIVITY', 'LEADERSHIP', 'FORCE', 'MENTALITE', 'TECHNIQUE', 'SOCIAL', 'AGUERRISSEMENT'];

export const SHARE_TITLE_MAX = 120;
const CODE_MAX = 700;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cleanTitle = (t: string) => t.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, SHARE_TITLE_MAX);

function toBase64Url(text: string) {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(code: string) {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

export function encodeSharedQuest(q: SharedQuest): string {
  const stats = Array.from(new Set(q.stats)).map(s => STATS.indexOf(s)).filter(i => i >= 0).slice(0, 2);
  return toBase64Url(JSON.stringify({ v: 1, t: cleanTitle(q.title), m: Math.round(q.minutes), d: Math.max(0, TIERS.indexOf(q.tier)), s: stats }));
}

/** Décode et valide un code de partage ; null si le lien est abîmé ou invalide. */
export function decodeSharedQuest(code: string | null | undefined): SharedQuest | null {
  if (!code || code.length > CODE_MAX || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const o = JSON.parse(fromBase64Url(code)) as { v?: unknown; t?: unknown; m?: unknown; d?: unknown; s?: unknown };
    if (o.v !== 1 || typeof o.t !== 'string') return null;
    const title = cleanTitle(o.t);
    const minutes = o.m;
    if (!title || typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 5 || minutes > 240) return null;
    if (typeof o.d !== 'number' || !TIERS[o.d]) return null;
    const stats = Array.isArray(o.s)
      ? Array.from(new Set(o.s.filter((i): i is number => typeof i === 'number' && !!STATS[i]).map(i => STATS[i]))).slice(0, 2)
      : [];
    return { title, minutes, tier: TIERS[o.d], stats };
  } catch {
    return null;
  }
}

export const questSharePath = (q: SharedQuest) => `/quests/?partage=${encodeSharedQuest(q)}`;
export const challengeSharePath = (id: string) => `/defis/?defi=${id}`;

/**
 * Repère le premier lien de partage dans un message du tchat. Le chemin renvoyé est reconstruit
 * à partir des données validées : on reste dans l'application, quel que soit le domaine du lien.
 */
export function findShareLink(text: string): ShareLink | null {
  for (const raw of text.match(/https?:\/\/[^\s<>"]+/g) ?? []) {
    let url: URL;
    try { url = new URL(raw); } catch { continue; }
    const path = url.pathname.replace(/\/+$/, '');
    if (path === '/quests') {
      const quest = decodeSharedQuest(url.searchParams.get('partage'));
      if (quest) return { kind: 'quest', path: questSharePath(quest), quest, raw };
    }
    if (path === '/defis') {
      const id = url.searchParams.get('defi') ?? '';
      if (UUID.test(id)) return { kind: 'challenge', path: challengeSharePath(id.toLowerCase()), id: id.toLowerCase(), raw };
    }
  }
  return null;
}

/** Message du tchat (500 caractères maximum) : le titre est retiré s'il ferait dépasser la limite. */
export function shareMessage(prefix: string, detail: string, url: string, max = 500) {
  const full = `${prefix} : ${detail} ${url}`;
  if (full.length <= max) return full;
  const short = `${prefix} ${url}`;
  return short.length <= max ? short : null;
}
