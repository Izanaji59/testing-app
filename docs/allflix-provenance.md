# Sources des vidéos Allflix

## État corrigé du 19 novembre 2026

Le rapprochement exclut désormais les alias normalisés vides et respecte les identifiants MAL distincts. Les chiffres des entrées historiques ci-dessous sont remplacés par : 1 317 œuvres source distinctes, 1 256 nouvelles fiches, 5 692 fiches au total et 10 509 destinations d’épisodes. Les 1 030 vidéos antérieures sont conservées. Le filtre de collection a été retiré ; les titres sont intégrés aux catégories ordinaires.

4 224 affiches ont été complétées (TMDB, AniList, manifeste public Anime-Sama/IMG, Wikimedia Commons et miniatures Archive selon l’œuvre exacte). Le rapport public image-report.json conserve 51 affiches manquantes. Les images sans correspondance fiable restent absentes. Les lecteurs non vérifiés sont distingués des quelques épisodes effectivement testés. L’iframe est sans sandbox à la demande explicite de l’utilisateur.


## Intégration Ichidok — catalogue et liens d'épisodes, local

Mise à jour : à la demande explicite de l'utilisateur, l'attribut `sandbox` a été retiré et les 4 836 destinations ont été rétablies comme lecteurs intégrés. Le lien d'ouverture externe reste disponible. Ce choix remplace l'ouverture externe par défaut décrite ci-dessous.

Import reproductible à partir du [seed](https://github.com/forbigbang81-netizen/ichidok/blob/2b7a4d1a53b39529c7251cdccae62ea51f9558fd/src/lib/seed.ts), du [cache de métadonnées](https://github.com/forbigbang81-netizen/ichidok/blob/2b7a4d1a53b39529c7251cdccae62ea51f9558fd/scripts/anilist_cache.json) et de [l'audit de catalogue](https://github.com/forbigbang81-netizen/ichidok/blob/2b7a4d1a53b39529c7251cdccae62ea51f9558fd/download/anime_catalog_audit.json). 1 317 lignes source rapprochées de 1 003 œuvres, dont 942 nouvelles fiches ; les dates et épisodes génériques non documentés restent inconnus. La collection inclut 111 œuvres datées 2024–2026 hors annonces à venir.

4 836 destinations d'épisodes pour 290 œuvres reprennent le format de lecteur public de [video-sources.ts](https://github.com/forbigbang81-netizen/ichidok/blob/2b7a4d1a53b39529c7251cdccae62ea51f9558fd/src/lib/video-sources.ts). **TMDB fournit les métadonnées, Zokoanime fournit ces lecteurs**. Le lecteur refuse explicitement les iframes protégées ; les destinations s'ouvrent donc dans un nouvel onglet. Un épisode de Steins;Gate a démarré depuis une fiche Allflix dans ce parcours, au-delà de deux secondes sans erreur média. Les autres destinations restent marquées à vérifier ; aucune affirmation de disponibilité complète du catalogue. Les liens précédents et les 1 030 fichiers vidéo directs sont conservés.

Scripts : `import-allflix-ichidok.mjs`, puis `link-allflix-ichidok.mjs`. Le rapprochement détaillé est dans `public/allflix/ichidok-import.json`. Aucun déploiement.

## Audit Ichidok — 19 novembre 2026

Le [code des sources actuel](https://github.com/forbigbang81-netizen/ichidok/blob/main/src/lib/video-sources.ts) et [sa route serveur](https://github.com/forbigbang81-netizen/ichidok/blob/main/src/app/api/zoko-source/route.ts) dépendent de zokoanime.video. Le README ne suffit donc pas à décrire la lecture actuelle. Deux pages publiques de lecteur (MAL 52991 et 31964, épisode 1, sub) ont été ouvertes directement dans Chrome : HTTP 200, readyState 4, currentTime supérieur à six secondes, paused false, aucune erreur média. Aucune extraction manuelle de flux ni intégration dans Allflix effectuée. Ce test ne couvre ni tous les épisodes, ni la VF. `hasVideoSource` renvoie toujours vrai et `hasDub` suppose une disponibilité par défaut : ces indicateurs ne prouvent pas la disponibilité effective.

## État du lot de 1 000 films — 19 novembre 2026, local uniquement

L'import `node scripts/import-allflix-wikiflix.mjs --target=1000` a ajouté 699 films au lot précédent. Le catalogue contient 4 436 fiches. Les entrées de type `video` couvrent 1 000 films hors animés japonais, 13 animés et 3 séries : 1 016 œuvres et 1 030 fichiers vidéo. Les sept liens YouTube récents, les offres de plateformes et les redirections CSV sont exclus de ces chiffres. Ce millier est principalement un fonds d'archives, pas un millier de nouveautés. La vérification automatisée des fichiers et de leur licence ne signifie pas que chaque film a été regardé ou testé intégralement.

## Recherche GitHub reproductible

Requêtes à saisir dans la recherche de dépôts, puis trier par mise à jour :

```text
anime streaming api in:readme archived:false pushed:>=2026-01-01
movie streaming api in:readme archived:false pushed:>=2026-01-01
"official" "full episodes" in:readme
"public domain" "movies" in:readme
"Gachiakuta" in:readme
"Boku no Hero Academia" in:readme
```

Le filtre `pushed` concerne la mise à jour du code, pas l'année de sortie des œuvres. Chercher aussi le titre original et le titre anglais, puis les forks et les releases si le dépôt principal est abandonné. Consulter les problèmes ouverts et tester une œuvre récente, une ancienne et un épisode précis avant d'annoncer une couverture.

Critères retenus : destination réelle par œuvre/épisode ou fichier vidéo complet, source identifiable et autorisée, langue et région explicites, accès effectivement disponible, absence de dépendance cachée à un abonnement ou un serveur non fourni. Une API de métadonnées, une bande-annonce ou une page de recherche ne compte pas comme lecture complète. La licence du code n'est pas celle des vidéos.

Pistes complémentaires pour les publications récentes : [chaînes officielles YouTube](https://github.com/SuperAB123/Free-Official-Youtube-Content) et [services d'animés par région](https://github.com/otakulogy/anime-streaming). Ces annuaires servent à découvrir des sources ; ils ne sont pas intégrés comme API de lecture.

Les dépôts GitHub servent à repérer des catalogues et des œuvres. Pour chaque vidéo ci-dessous, la fiche de conservation documente le fichier utilisé et sa provenance. Le lien technique exact de chaque vidéo est enregistré dans `public/allflix/playback.json`.

## Sélection 2024–2026

- **Singularity (2026)** : [Blender Studio](https://studio.blender.org/projects/singularity/), MP4 complet obtenu par [l’API vidéo officielle](https://video.blender.org/api/v1/videos/1ba07bbb-1456-4293-99a6-833fa450eda0), directement lisible dans Allflix.
- **New Saga (2025)** : [premier épisode complet sur la chaîne Crunchyroll](https://www.youtube.com/watch?v=0MHRPs9RwFc). Lien externe vers l’épisode. Le reste de la saison n’est pas inclus.
- **The Gaslight District (2025)** : [pilote complet sur la chaîne GLITCH](https://www.youtube.com/watch?v=IC8KsZniulw).
- **Knights of Guinevere (2025)** : [pilote complet sur la chaîne GLITCH](https://www.youtube.com/watch?v=MCAdbUaMlAE).
- **Gameoverse (2026)** : [pilote complet sur la chaîne GLITCH](https://www.youtube.com/watch?v=1jNk5tmjhpc).
- **Gachiakuta (2025)** : [premier épisode complet en VF sur Crunchyroll FR](https://www.youtube.com/watch?v=Jfy2vjyAXeM).
- **Tougen Anki (2025)** : [premier épisode complet en VOSTFR sur ADN](https://www.youtube.com/watch?v=jmtKj6TwPqo).
- **Loner Life in Another World (2024)** : [premier épisode complet en VF sur ADN](https://www.youtube.com/watch?v=sr0G0-5EF4E).

La réponse oEmbed de YouTube a confirmé le titre et la chaîne officielle de chacune des sept vidéos. Les liens pointent vers les vidéos, pas vers une recherche ou une offre commerciale.

## Lot WikiFlix : vidéos directes

[API et client WikiFlix sur GitHub](https://github.com/magnusmanske/wikistream/tree/main/kodi/plugin.video.wikiflix/lib). L'import `node scripts/import-allflix-wikiflix.mjs` interroge les sections film, animation japonaise et épisodes de cette API. Il retient les fichiers Commons vidéo marqués comme œuvres et non comme bandes-annonces, compare leur durée quand elle est renseignée et vérifie la mention de licence dans l’API Wikimedia Commons. Les épisodes sont regroupés par appartenance et numéro Wikidata.

Les fiches `open-movie-wikiflix-…` et `open-tv-wikiflix-…` reprennent les identifiants Wikidata. Chaque entrée de lecture conserve le fichier exact et sa fiche Wikimedia dans `playback.json`. Les 900 offres du filtre « Où regarder » ne font pas partie de ce lot.

## Sélection France : 300 films, 300 séries et 300 animés

Le script `node scripts/import-allflix-availability.mjs --target=300` utilise [TMDB Discover](https://developer.themoviedb.org/reference/discover-tv) pour chercher les œuvres par popularité, puis [Watch Providers](https://developer.themoviedb.org/reference/movie-watch-providers) pour vérifier les offres JustWatch en France. Les catégories sont exclusives. Les films d’animation japonais sont comptés dans « Animés ». Les destinations pointent vers les offres par œuvre. Une offre peut être gratuite, sur abonnement, en location ou à l’achat.

Les fiches ajoutées par ce lot contiennent les métadonnées TMDB et le lien vers les offres. Le détail par épisode reste dans les fiches préexistantes qui le fournissaient. Les liens de catalogues externes et le filtre « Lecture intégrée » restent accessibles.

## My Hero Academia

- Métadonnées et liste des épisodes : [TMDB, série 65930](https://www.themoviedb.org/tv/65930). Import ciblé : `npm run allflix:import -- --title=tv:65930`.
- [Crunchyroll](https://www.crunchyroll.com/fr/series/G6NQ5DWZ6/my-hero-academia) : 13 pages d’épisode de la saison 1 dans `public/allflix/playback.json`. Les autres épisodes proposent la fiche Crunchyroll de la série. Il s’agit de destinations externes. Le lancement vidéo dépend du compte, du territoire et de l’offre Crunchyroll.
- Piste GitHub consultée : [aryaniiil/anime-api](https://github.com/aryaniiil/anime-api) mentionne la série dans son README. Ce dépôt n’est pas la source des liens Crunchyroll.

## Lot archives et animation

Le code de [WikiFlix sur GitHub](https://github.com/magnusmanske/wikistream) mène aux galeries [d’animés](https://commons.wikimedia.org/wiki/User:Spinster/WikiFlix/Anime_films) et [des années 1900](https://commons.wikimedia.org/wiki/User:Spinster/WikiFlix/1900s). Les fichiers ont été sélectionnés sur Wikimedia Commons titre par titre. Le projet [Reel Archive](https://github.com/auxclark/reel-archive) a été consulté comme exemple de catalogue qui associe des vidéos d’archive à des fiches.

| Œuvre | Fichier ou fiche de conservation |
| --- | --- |
| Le Voyage dans la Lune | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Le_Voyage_dans_la_Lune_%281902%29.webm) |
| Le Voyage de Gulliver | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Le_Voyage_de_Gulliver_%281902%29.webm) |
| Le Monstre | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Le_Monstre_%281903%29.webm) |
| Le Chaudron infernal | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Le_Chaudron_infernal_%28Georges_M%C3%A9li%C3%A8s%2C_1903%29.webm) |
| Le Voyage à travers l’impossible | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Le_Voyage_%C3%A0_travers_l%27impossible_%28Georges_M%C3%A9li%C3%A8s%2C_1904%29.webm) |
| The Golden Flower | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_Golden_Flower_%281929%29.webm) |
| Monkey and the Crabs | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Monkey_and_the_Crabs_%281927%29.webm) |
| The Animal Olympics | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_Animal_Olympics_%281928%29.webm) |
| Morevna, épisode 3 | [Piste GitHub](https://github.com/jcolag/entropy-arbitrage/blob/main/2020-08-08-morevna3.md), [Internet Archive](https://archive.org/details/morevna-ep3) |
| Morevna, épisode 4 | [Morevna Project](https://morevnaproject.org/anime/), [Internet Archive](https://archive.org/details/morevna-ep4) |
