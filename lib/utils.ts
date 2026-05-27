// lib/utils.ts — utilitaires divers.

/** Combine class strings safely (lightweight cn). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Clamp a number into [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Format a number with thin-space thousands separator (French style). */
export function fmt(n: number): string {
  return n.toLocaleString('fr-FR').replace(/,/g, ' ');
}

/** Format duration seconds → "1h24" / "42min". */
export function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const mm = m - h * 60;
  return mm === 0 ? `${h}h` : `${h}h${mm.toString().padStart(2, '0')}`;
}

/** Rank letter + tier → display string ("B+", "A-", "S"). */
export function fmtRank(letter: string, tier: 'MINUS' | 'NEUTRAL' | 'PLUS'): string {
  const t = tier === 'PLUS' ? '+' : tier === 'MINUS' ? '−' : '';
  return `${letter}${t}`;
}
