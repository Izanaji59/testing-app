// lib/engine/xp.ts — Mirror TypeScript des formules SQL.
// AUTORITATIF côté SERVEUR (SQL). Ces fonctions sont utilisées uniquement
// pour des PREVIEWS côté client (ex : "tu gagnerais ~80 XP").

/** XP cumulé requis pour atteindre le niveau global L. */
export function xpForLevel(L: number): number {
  return Math.floor(100 * Math.pow(L, 1.6));
}

/** XP requis pour passer le niveau L d'une stat. */
export function statXpForLevel(L: number): number {
  return Math.floor(60 + 18 * L + 3 * Math.pow(L, 1.5));
}

/** Calcule l'XP "dans" le niveau courant + l'XP requis pour le suivant. */
export function currentLevelXp(totalXp: number, level: number) {
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    xpInLevel: Math.max(0, totalXp - base),
    xpForNext: next - base,
  };
}

/** Niveau atteint pour un total XP donné. */
export function levelForXp(totalXp: number): number {
  let L = 1;
  while (xpForLevel(L + 1) <= totalXp) L++;
  return L;
}
