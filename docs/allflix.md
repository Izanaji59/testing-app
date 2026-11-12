# Allflix

`/allflix/` est le catalogue. `/allflix/fiche/?id=tmdb-movie-123` ou `?id=tmdb-tv-123&s=1&e=2` réunit synopsis et lecture. Les saisons et épisodes sont consultables même sans vidéo. La recherche porte sur les titres importés, pas encore sur tout TMDB en direct.

## Importer les fiches

Mettre `TMDB_API_KEY` dans l'environnement ou `.env.local` (ignoré par Git). Ne jamais employer `NEXT_PUBLIC_` pour cette clé. Puis :

```sh
npm run allflix:import -- --start=1 --pages=1
```

Chaque page importe une sélection de films, séries, animés et films d'animation japonais depuis les pages de découverte TMDB. `--start=2` poursuit la sélection. L'import fusionne les identifiants existants ; il ne prétend pas être exhaustif. Il récupère toutes les saisons et leurs épisodes, puis sépare les fiches détaillées de l'index pour limiter le téléchargement initial. Les contenus marqués adultes sont exclus. L'étiquette Animé correspond ici aux animations japonaises ; elle pourra être affinée éditorialement.

Les métadonnées sont en français lorsqu'elles existent chez TMDB. La première version comprend 80 œuvres. Le crédit et le logo TMDB officiel figurent en bas de page. Vérifier la licence TMDB si le catalogue devient commercial : https://developer.themoviedb.org/docs/faq.

## Ajouter une lecture

Éditer `public/allflix/playback.json`. Cette table est indépendante des imports :

```json
{
  "tmdb-movie-123": { "type": "video", "url": "https://votre-hebergeur.example/film.mp4" },
  "tmdb-tv-456:s1:e2": { "type": "embed", "url": "https://votre-hebergeur.example/embed/episode-2" }
}
```

Utiliser les vrais identifiants des fiches. Une URL HTTPS de vidéo MP4/WebM utilise le lecteur natif ; `embed` attend une page de lecteur intégrable ; `link` ouvre un lecteur externe. L'intégration dépend des autorisations de l'hébergeur (X-Frame-Options/CSP), et les flux HLS/DRM nécessitent une intégration adaptée. Aucun lien ni abonnement de lecture n'est fourni par TMDB. Ajouter seulement les sources de diffusion autorisées.

Enregistrer, reconstruire puis déployer. Aucun changement de code de la fiche n'est nécessaire. Un lien manquant affiche « Lecture à venir ». Il n'y a pas de lecture ni de chargement d'un lecteur tiers avant le clic. Les résumés d'épisodes restent repliés pour éviter les révélations involontaires.

## Liens par tableur (Excel / CSV)

```sh
npm run allflix:links -- export allflix-liens.csv           # une ligne par œuvre, pré-remplie
npm run allflix:links -- import allflix-liens.csv --dry-run # vérifier sans rien écrire
npm run allflix:links -- import allflix-liens.csv           # écrit public/allflix/playback.json
```

L'export (clé TMDB requise) pré-remplit chaque œuvre avec ses plateformes légales en France (données JustWatch via TMDB) : `lecture = link`, `url` = page « Où regarder » de TMDB, et la liste des plateformes en information. Colonnes : `id; titre; type_oeuvre; annee; saison; episode; lecture; url; libelle; plateformes_fr`.

Dans Excel : garder `id`, modifier `url` / `lecture` (`link`, `embed`, `video`) / `libelle`, ajouter une ligne par épisode si besoin (`saison` + `episode`), vider `url` pour ignorer une ligne. Enregistrer sous **CSV UTF-8 (délimité par des points-virgules)** ; le CSV classique d'Excel est aussi lu. Pour une série, une ligne sans saison ni épisode vaut pour toute l'œuvre ; une ligne d'épisode est prioritaire.

L'import refuse toute URL non HTTPS ou dont le domaine n'est pas dans `config/allflix-sources.json` (plateformes officielles, YouTube, Vimeo, Archive.org…). Ajouter votre propre CDN à cette liste pour vos vidéos. Jamais de site de streaming non autorisé. Les lignes refusées sont listées avec leur numéro. Puis commit de `playback.json` et push. Tests : `node scripts/test-allflix-links.cjs`.

## Brancher une API de lecture (lien ou lecteur)

Emplacement prêt, **inactif** tant qu'il n'est pas configuré. Une API externe renvoie, pour chaque œuvre ou épisode, un lien ou un lecteur. Elle est appelée par la fonction Netlify `netlify/functions/playback.mjs`, côté serveur : la clé n'est jamais envoyée au navigateur. Même principe que le module de streaming de TechBeme/Allflix (`STREAMING_API_URL` + `STREAMING_API_TOKEN`).

Activer (Netlify → Site configuration → Environment variables), puis redéployer :

| Variable | Valeur |
| --- | --- |
| `ALLFLIX_PLAYBACK_API_URL` | Adresse HTTPS de l'API (secrète côté serveur) |
| `ALLFLIX_PLAYBACK_API_TOKEN` | Clé de l'API, envoyée en `Authorization: Bearer …` (facultative) |
| `NEXT_PUBLIC_ALLFLIX_PLAYBACK_API` | `on` pour que les fiches interrogent l'API (lu au build) |

Contrat attendu de l'API — requête `POST` JSON :

```json
{ "media": "movie", "tmdbId": 155 }
{ "media": "tv", "tmdbId": 1396, "season": 1, "episode": 2 }
```

Réponse `200` : `{ "type": "video" | "embed" | "link", "url": "https://…", "label": "facultatif" }`. Réponse `404` si l'œuvre n'est pas disponible. Toute URL non HTTPS ou type inconnu est rejeté. Si l'API impose un autre format, adapter seulement `resolvePlayback` dans la fonction.

Priorité sur une fiche : l'entrée de `playback.json` si elle existe, sinon l'API, sinon « Lecture à venir ». Réponses mises en cache 5 minutes (15 minutes pour « non disponible ») : les URL signées expirent.

**Sources autorisées uniquement** : vos propres vidéos (stockage S3, R2, CDN), un catalogue sous licence ou un fournisseur officiel. Jamais un site de streaming non autorisé (refusé pour Darlav : copies pirates intégrées depuis des hébergeurs de fichiers, pop-ups publicitaires).

Tests : `node scripts/test-playback-api.cjs`.

## Vérification

- Films, séries, animés, recherche sans accents, tri, état sans résultat et reprise sur erreur.
- Une fiche charge ses épisodes à la demande. Saison et épisode sont inscrits dans son URL.
- Le lecteur revient à l'état initial au changement d'épisode ; les boutons précédent/suivant restent dans la saison.
- Catalogue et fichiers détaillés versionnés ; clé absente des fichiers publiés.
