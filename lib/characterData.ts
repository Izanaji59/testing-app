// lib/characterData.ts — Lecture des personnages au moment de la construction (pages statiques, plan du site).
// Réservé au serveur : lit public/characters/*.json sur le disque. Ne jamais l'importer côté navigateur.

import fs from 'node:fs';
import path from 'node:path';
import { withTypings, type CharacterIndex, type TypedCharacter, type TypingEntry } from '@/lib/characters';
import { characterSlug, workSlugs } from '@/lib/characterPages';

type Data = {
  characters: TypedCharacter[];
  bySlug: Map<string, TypedCharacter>;
  works: Array<{ titleId: string; title: string; slug: string; characters: TypedCharacter[] }>;
  workSlugById: Map<string, string>;
};

let cache: Data | null = null;

export function loadCharacterData(): Data {
  if (cache) return cache;
  // Construction : dossier du projet. Aperçu local : le serveur peut être lancé depuis le dossier parent.
  const dir = [path.join(process.cwd(), 'public', 'characters'), path.join(process.cwd(), 'latraction-app', 'public', 'characters')]
    .find(d => fs.existsSync(path.join(d, 'index.json'))) ?? path.join(process.cwd(), 'public', 'characters');
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')) as CharacterIndex;
  const typings = JSON.parse(fs.readFileSync(path.join(dir, 'typings.json'), 'utf8')) as Record<string, TypingEntry>;
  const characters = withTypings(index, typings).filter(ch => characterSlug(ch));
  const bySlug = new Map(characters.map(ch => [characterSlug(ch)!, ch]));
  const grouped = new Map<string, { titleId: string; title: string; characters: TypedCharacter[] }>();
  for (const ch of characters) {
    const key = ch.titleId || 'titre:' + ch.title;
    const w = grouped.get(key) ?? { titleId: key, title: ch.title, characters: [] };
    w.characters.push(ch);
    grouped.set(key, w);
  }
  const workSlugById = workSlugs([...grouped.values()]);
  const works = [...grouped.values()].map(w => ({ ...w, slug: workSlugById.get(w.titleId)! }))
    .sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  cache = { characters, bySlug, works, workSlugById };
  return cache;
}

export const workKey = (ch: { titleId: string; title: string }) => ch.titleId || 'titre:' + ch.title;
