// lib/events.ts — Événements communautaires (0028) : catégories, dates, fichier calendrier (.ics).
// Aucun import à l'exécution : testé par scripts/test-mentions.cjs.

export type EventCategory = 'rencontre' | 'jeux' | 'personnages' | 'sommeil' | 'grindleveling' | 'autre';
export type EventMode = 'en_ligne' | 'sur_place';

export type CommunityEvent = {
  id: string; title: string; description: string; category: EventCategory;
  starts_at: string; ends_at: string | null; mode: EventMode; place: string; online_url: string | null;
  capacity: number | null; cancelled: boolean; organizer_id: string; organizer_name: string;
  participants: number; registered: boolean; is_organizer: boolean;
};

export const EVENT_CATEGORIES: Record<EventCategory, { label: string; icon: string }> = {
  rencontre: { label: 'Rencontre', icon: '☕' },
  jeux: { label: 'Jeux', icon: '♟' },
  personnages: { label: 'Personnages & MBTI', icon: '◈' },
  sommeil: { label: 'Sommeil', icon: '☾' },
  grindleveling: { label: 'Grindleveling', icon: '⚔' },
  autre: { label: 'Autre', icon: '✦' },
};

export const eventPath = (id: string) => `/evenements/?id=${id}`;

/** Fin effective (3 h par défaut), comme f_event_end en base. */
export const eventEnd = (e: Pick<CommunityEvent, 'starts_at' | 'ends_at'>) =>
  e.ends_at ? new Date(e.ends_at) : new Date(Date.parse(e.starts_at) + 3 * 3600_000);

export const isFull = (e: Pick<CommunityEvent, 'capacity' | 'participants'>) => e.capacity !== null && e.participants >= e.capacity;

/** « 20251231T183000Z » */
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
/** Échappement RFC 5545 : antislash, point-virgule, virgule, retours à la ligne. */
export const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Fichier calendrier d'un événement. Le lien en ligne n'y figure que si on le connaît (inscrit ou organisateur). */
export function buildIcs(e: CommunityEvent, origin: string, now = new Date()): string {
  const location = e.mode === 'sur_place' ? e.place : e.online_url ?? 'En ligne';
  const description = [e.description, `Organisé par ${e.organizer_name} sur Slumbywise.`, origin + eventPath(e.id)].filter(Boolean).join('\n\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Slumbywise//Evenements//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@slumbywise.com`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(new Date(e.starts_at))}`,
    `DTEND:${icsDate(eventEnd(e))}`,
    `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText(description)}`,
    `LOCATION:${icsText(location)}`,
    `URL:${origin}${eventPath(e.id)}`,
    e.cancelled ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

/** Date locale (aaaa-mm-jj) + heure (hh:mm) → ISO ; null si invalide. */
export function localToIso(day: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${day}T${time}:00`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
