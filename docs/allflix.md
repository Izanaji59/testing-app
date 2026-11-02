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

## Vérification

- Films, séries, animés, recherche sans accents, tri, état sans résultat et reprise sur erreur.
- Une fiche charge ses épisodes à la demande. Saison et épisode sont inscrits dans son URL.
- Le lecteur revient à l'état initial au changement d'épisode ; les boutons précédent/suivant restent dans la saison.
- Catalogue et fichiers détaillés versionnés ; clé absente des fichiers publiés.
