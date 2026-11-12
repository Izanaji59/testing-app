// lib/sleep.ts — Heure de coucher idéale : cycles de sommeil de 90 minutes
// comptés à rebours depuis l'heure de réveil, plus le temps d'endormissement.

export const CYCLE_MIN = 90;
export const SLEEP_ONSET_MIN = 15;

/** Heure de coucher en minutes depuis minuit, ou null si l'entrée est invalide. */
export function bedtimeMinutes(wake: string, cycles: number): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(wake);
  if (!m || !Number.isInteger(cycles) || cycles < 3 || cycles > 7) return null;
  const wakeMin = Number(m[1]) * 60 + Number(m[2]);
  return (((wakeMin - cycles * CYCLE_MIN - SLEEP_ONSET_MIN) % 1440) + 1440) % 1440;
}

export const fmtClock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Durée de sommeil (« 7 h 30 ») pour un nombre de cycles. */
export const sleepLength = (cycles: number) => {
  const total = cycles * CYCLE_MIN;
  return `${Math.floor(total / 60)} h${total % 60 ? ` ${total % 60}` : ''}`;
};

/** Prochaine occurrence locale de cette heure, strictement après `now`. */
export function nextOccurrence(min: number, now = new Date()): Date {
  const d = new Date(now);
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}
