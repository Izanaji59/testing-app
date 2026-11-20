// robots.txt : les pages publiques sont explorables ; l'espace connecté de Grindleveling et
// les fiches dynamiques en double (/personnages/fiche/?id=) ne le sont pas.

import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/characterPages';

export const dynamic = 'force-static';

const PRIVATE = ['/cmd/', '/quests/', '/donjon/', '/defis/', '/chat/', '/evenements/', '/profile/', '/member/', '/stats/', '/calendar/', '/roadmap/', '/personnages/fiche/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
