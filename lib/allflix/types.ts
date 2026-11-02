export type Playback = { type: 'video' | 'embed' | 'link'; url: string; label?: string };
export type Episode = { number: number; title: string; synopsis: string; minutes: number | null; image: string | null; date: string | null };
export type Season = { number: number; title: string; episodes: Episode[] };
export type Title = {
  id: string; tmdbId: number; media: 'movie' | 'tv'; anime: boolean;
  title: string; originalTitle: string; synopsis: string; year: string;
  poster: string | null; backdrop: string | null; genres: string[];
  minutes: number | null; rating: number; seasons: Season[]; source: string;
};
export type Catalog = { updatedAt: string | null; titles: Title[] };
export function playbackKey(title: Title, season?: number, episode?: number) {
  return title.media === 'movie' ? title.id : `${title.id}:s${season}:e${episode}`;
}
export function safePlayback(source?: Playback): Playback | undefined {
  if (!source || !['video','embed','link'].includes(source.type)) return;
  try { const url = new URL(source.url); if (url.protocol === 'https:' && !url.username && !url.password) return source; } catch {}
}
