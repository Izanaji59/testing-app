// lib/characterPages.ts — Adresses des pages statiques des personnages (référencement Google).
// Une page par personnage (/personnages/light-yagami-a80/), par œuvre et par type MBTI.
// Aucun import à l'exécution : testé par scripts/test-character-pages.cjs.

export const SITE = 'https://slumbywise.com';

type CharacterRef = { id: string; name: string; source?: string };

/** « Lélouch Lamperouge ! » → « lelouch-lamperouge » (60 caractères max). */
export function slugify(text: string): string {
  return text.replace(/œ/g, 'oe').replace(/Œ/g, 'Oe').replace(/æ/g, 'ae').replace(/Æ/g, 'Ae').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
}

/** Suffixe court et stable tiré de l'identifiant : anilist-char-80 → a80, tmdb-credit-52fe4… → t52fe4… */
export function shortId(id: string): string | null {
  let m = /^anilist-char-(\d{1,9})$/.exec(id);
  if (m) return 'a' + m[1];
  m = /^tmdb-credit-([0-9a-f]{6,40})$/.exec(id);
  if (m) return 't' + m[1].slice(0, 10);
  return null;
}

/** Seuls les personnages importés (TMDB, AniList) ont une page statique ; ceux de la communauté gardent la fiche dynamique. */
export function characterSlug(ch: CharacterRef): string | null {
  const suffix = shortId(ch.id);
  if (!suffix) return null;
  return `${slugify(ch.name) || 'personnage'}-${suffix}`;
}

export function characterUrl(ch: CharacterRef): string {
  const slug = characterSlug(ch);
  return slug ? `/personnages/${slug}/` : `/personnages/fiche/?id=${encodeURIComponent(ch.id)}`;
}

export const typeUrl = (type: string) => `/personnages/type/${type.toLowerCase()}/`;

/** Slugs d'œuvres uniques : le titre seul, sinon titre + identifiant en cas de doublon. */
export function workSlugs(works: Array<{ titleId: string; title: string }>): Map<string, string> {
  const byTitle = new Map<string, string[]>();
  for (const w of works) {
    const base = slugify(w.title) || 'oeuvre';
    byTitle.set(base, [...new Set([...(byTitle.get(base) ?? []), w.titleId])]);
  }
  const out = new Map<string, string>();
  for (const [base, ids] of byTitle)
    for (const id of ids) out.set(id, ids.length === 1 ? base : `${base}-${slugify(id)}`);
  return out;
}

export const workUrl = (slug: string) => `/personnages/oeuvre/${slug}/`;

/** Description Google (≤ 160 caractères) d'une fiche personnage. */
export function characterDescription(name: string, title: string, mbti: string | null, enneagram: string | null): string {
  const typed = [mbti, enneagram && `ennéagramme ${enneagram}`].filter(Boolean).join(', ');
  const text = typed
    ? `${name} (${title}) : type MBTI ${typed}. Vote, débats et arguments de la communauté Grindleveling.`
    : `Quel est le type MBTI de ${name} (${title}) ? Vote et donne tes arguments avec la communauté Grindleveling.`;
  return text.length <= 160 ? text : text.slice(0, 157).replace(/\s+\S*$/, '') + '…';
}
