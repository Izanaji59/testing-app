// lib/engine/xp.ts — Mirror TypeScript des formules SQL.
// AUTORITATIF côté SERVEUR (SQL). Ces fonctions sont utilisées uniquement
// pour des PREVIEWS côté client (ex : "tu gagnerais ~80 XP").

/** XP cumulé requis pour atteindre le niveau global L. */
export function xpForLevel(L: number): number {
  if (L <= 1) return 0;
  if (L <= 10) return Math.floor((L - 1) * 4000 / 9);
  if (L <= 25) return Math.floor(4000 + (L - 10) * 8000 / 15);
  if (L <= 50) return Math.floor(12000 + (L - 25) * 18000 / 25);
  if (L <= 80) return Math.floor(30000 + (L - 50) * 35000 / 30);
  if (L <= 110) return Math.floor(65000 + (L - 80) * 85000 / 30);
  return Math.floor(150000 + (L - 110) * 5000);
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
