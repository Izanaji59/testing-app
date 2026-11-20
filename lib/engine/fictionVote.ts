// lib/engine/fictionVote.ts — Vote rapide des personnages : 4 axes MBTI, ennéagramme, consensus, marathon.
// Miroir des règles SQL de 0027 (le serveur fait foi). Aucun import à l'exécution : testé par scripts/test-fiction-vote.cjs.

export const AXES = [
  { key: 'EI', letters: ['E', 'I'], labels: ['Extraverti', 'Introverti'] },
  { key: 'SN', letters: ['S', 'N'], labels: ['Sensation', 'Intuition'] },
  { key: 'TF', letters: ['T', 'F'], labels: ['Pensée', 'Sentiment'] },
  { key: 'JP', letters: ['J', 'P'], labels: ['Jugement', 'Perception'] },
] as const;

/** Lettres choisies par axe ('' = pas encore choisi). */
export type AxisPicks = [string, string, string, string];

export const EMPTY_AXES: AxisPicks = ['', '', '', ''];

export function axesFromType(type: string | null | undefined): AxisPicks {
  const t = (type ?? '').toUpperCase();
  if (!/^[EI][NS][TF][JP]$/.test(t)) return [...EMPTY_AXES];
  // L'ordre des axes (S/N) suit l'ordre des lettres du type (N ou S en 2e position).
  return [t[0], t[1], t[2], t[3]];
}

/** Type complet si les 4 axes sont choisis, sinon null. */
export function typeFromAxes(axes: AxisPicks): string | null {
  const t = axes.join('');
  return /^[EI][NS][TF][JP]$/.test(t) ? t : null;
}

/** Applique une touche clavier (e, i, s, n, t, f, j, p) aux axes ; null si la touche n'est pas un axe. */
export function axesWithKey(axes: AxisPicks, key: string): AxisPicks | null {
  const k = key.toUpperCase();
  const index = AXES.findIndex(a => (a.letters as readonly string[]).includes(k));
  if (index < 0) return null;
  const next = [...axes] as AxisPicks;
  next[index] = next[index] === k ? '' : k;
  return next;
}

/** Les deux ailes possibles d'un type d'ennéagramme (1 et 9 sont voisins). */
export function wingsOf(core: number): [number, number] {
  return [core === 1 ? 9 : core - 1, core === 9 ? 1 : core + 1];
}

export function validEnneagram(value: string | null | undefined): boolean {
  const m = /^([1-9])(?:w([1-9]))?$/.exec(value ?? '');
  if (!m) return false;
  if (!m[2]) return true;
  return wingsOf(Number(m[1])).includes(Number(m[2]));
}

export function splitEnneagram(value: string | null | undefined): { core: number | null; wing: number | null } {
  const m = /^([1-9])(?:w([1-9]))?$/.exec(value ?? '');
  return m ? { core: Number(m[1]), wing: m[2] ? Number(m[2]) : null } : { core: null, wing: null };
}

export function joinEnneagram(core: number | null, wing: number | null): string | null {
  if (!core) return null;
  return wing && wingsOf(core).includes(wing) ? `${core}w${wing}` : String(core);
}

export type VoteSummary = { counts: Record<string, number>; total: number; leader: string | null };

/** « consensus » : au moins 5 votes et plus de la moitié pour le premier ; « serre » : écart d'au plus une voix. */
export function consensusOf(summary: VoteSummary | undefined): 'consensus' | 'serre' | null {
  if (!summary || summary.total < 4) return null;
  const sorted = Object.values(summary.counts).sort((a, b) => b - a);
  if (summary.total >= 5 && sorted[0] / summary.total > 0.5) return 'consensus';
  if (sorted.length > 1 && sorted[0] - sorted[1] <= 1) return 'serre';
  return null;
}

/** Part en pourcentage, arrondie. */
export const share = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

/**
 * Personnage suivant pour le mode marathon : d'abord ceux de la même œuvre sans vote de ma part
 * (dans l'ordre de la liste, en reprenant après le personnage courant), sinon le suivant de l'œuvre.
 */
export function nextToVote(sameWorkIds: string[], currentId: string, voted: Set<string>): string | null {
  const others = sameWorkIds.filter(id => id !== currentId);
  if (!others.length) return null;
  const start = sameWorkIds.indexOf(currentId);
  const ordered = start < 0 ? others : [...sameWorkIds.slice(start + 1), ...sameWorkIds.slice(0, start)].filter(id => id !== currentId);
  return ordered.find(id => !voted.has(id)) ?? ordered[0];
}
