// lib/engine/radar.ts — Échelle du radar des statistiques.

const SCALE_STEPS = [5, 10, 15, 20, 30, 40, 50, 60, 75, 100, 125, 150];

/**
 * Niveau du cercle extérieur : la meilleure stat + 25 % de marge, arrondie au palier suivant.
 * Toutes les stats partagent cette échelle, la forme reste donc proportionnelle,
 * et elle reste lisible dès le rang E (niveaux 1 à 3 → échelle 5).
 */
export function radarScale(levels: number[]): number {
  const target = Math.max(1, ...levels.filter(Number.isFinite)) * 1.25;
  return SCALE_STEPS.find(step => step >= target) ?? Math.ceil(target / 50) * 50;
}
