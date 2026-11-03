// lib/characters.ts — Personnages de fiction typés MBTI / Ennéagramme.
// Personnages importés depuis TMDB (films, séries) et AniList (animés) par
// scripts/import-characters.mjs ; typage éditorial saisi à la main dans
// public/characters/typings.json.

import type { MbtiType } from '@/lib/engine/mbtiClasses';

export type Character = {
  /** `tmdb-credit-<credit_id>` ou `anilist-char-<id>`. */
  id: string;
  name: string;
  nativeName?: string;
  /** Identifiant de l'œuvre dans Allflix (`tmdb-movie-155`). */
  titleId: string;
  title: string;
  /** Autres œuvres où apparaît le même personnage (série et film d'une même franchise). */
  alsoIn?: string[];
  image: string | null;
  /** `actor` : photo de l'interprète (TMDB) ; `illustration` : image du personnage (AniList). */
  imageKind: 'actor' | 'illustration';
  actor?: string;
  role?: string;
  source: 'tmdb' | 'anilist';
  sourceUrl: string;
};

export type CharacterIndex = { updatedAt: string; characters: Character[] };

/** Une entrée de typings.json telle que saisie à la main. */
export type TypingEntry = { personnage?: string; oeuvre?: string; mbti?: string; enneagramme?: string; note?: string };
export type Typing = { mbti: MbtiType | null; enneagram: string | null; note: string };

export const CHARACTER_ID = /^(tmdb-credit-[0-9a-f]{6,40}|anilist-char-\d{1,9})$/;

export function normalizeMbti(value: string | undefined): MbtiType | null {
  const v = (value ?? '').trim().toUpperCase();
  return /^[EI][NS][TF][JP]$/.test(v) ? (v as MbtiType) : null;
}

/** « 5 », « 5w4 » ou « 5w6 » : l'aile doit être un type voisin (1 ↔ 9 inclus). */
export function normalizeEnneagram(value: string | undefined): string | null {
  const v = (value ?? '').replace(/\s+/g, '').toLowerCase();
  const m = /^([1-9])(?:w([1-9]))?$/.exec(v);
  if (!m) return null;
  const core = Number(m[1]);
  if (!m[2]) return String(core);
  const wing = Number(m[2]);
  const neighbours = [(core % 9) + 1, ((core + 7) % 9) + 1];
  return neighbours.includes(wing) ? `${core}w${wing}` : null;
}

/** Typage exploitable d'une entrée, ou null si rien de valide n'est renseigné. */
export function readTyping(entry: TypingEntry | undefined): Typing | null {
  if (!entry) return null;
  const mbti = normalizeMbti(entry.mbti);
  const enneagram = normalizeEnneagram(entry.enneagramme);
  if (!mbti && !enneagram) return null;
  return { mbti, enneagram, note: (entry.note ?? '').trim().slice(0, 600) };
}

/** Entrées remplies mais mal écrites (ex. « INTJ-A », « 5w7 ») : à signaler, jamais affichées. */
export function invalidTypings(typings: Record<string, TypingEntry>): string[] {
  const bad: string[] = [];
  for (const [id, entry] of Object.entries(typings)) {
    const mbti = (entry.mbti ?? '').trim(), enneagram = (entry.enneagramme ?? '').trim();
    if ((mbti && !normalizeMbti(mbti)) || (enneagram && !normalizeEnneagram(enneagram))) bad.push(id);
  }
  return bad;
}

export type TypedCharacter = Character & { typing: Typing | null };

export function withTypings(index: CharacterIndex | undefined, typings: Record<string, TypingEntry> | undefined): TypedCharacter[] {
  return (index?.characters ?? []).map(c => ({ ...c, typing: readTyping(typings?.[c.id]) }));
}

export const characterHref = (id: string) => `/personnages/fiche/?id=${encodeURIComponent(id)}`;
