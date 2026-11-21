// Plan du site pour les moteurs de recherche (généré à la construction : /sitemap.xml).

import type { MetadataRoute } from 'next';
import { loadCharacterData } from '@/lib/characterData';
import { SITE, characterUrl, typeUrl, workUrl } from '@/lib/characterPages';
import { MBTI_RANK_PROFILES } from '@/lib/engine/rankTitles';

export const dynamic = 'force-static';

// Allflix et les échecs sont en pause (accessibles par lien direct, hors menus et hors plan du site).
const PAGES = ['/', '/carnet/', '/livre/', '/personnages/', '/game/memoire/', '/grindleveling/', '/association/', '/boutique/', '/contact/', '/informations/', '/regles/'];

export default function sitemap(): MetadataRoute.Sitemap {
  const data = loadCharacterData();
  return [
    ...PAGES.map(p => ({ url: SITE + p, changeFrequency: 'weekly' as const, priority: p === '/' ? 1 : 0.7 })),
    ...Object.keys(MBTI_RANK_PROFILES).map(t => ({ url: SITE + typeUrl(t), changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...data.works.map(w => ({ url: SITE + workUrl(w.slug), changeFrequency: 'weekly' as const, priority: 0.5 })),
    ...data.characters.map(ch => ({ url: SITE + characterUrl(ch), changeFrequency: 'weekly' as const, priority: 0.5 })),
  ];
}
