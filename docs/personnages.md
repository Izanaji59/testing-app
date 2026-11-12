# Personnages (typage MBTI de la fiction)

`/personnages/` liste les personnages des œuvres Allflix, filtrables par type (`/personnages/?type=INTJ` : « Les INTJ de la fiction »). `/personnages/fiche/?id=…` présente un personnage : son type, sa famille et sa classe MBTI, son ennéagramme, la note éditoriale, les autres personnages du même type et de la même œuvre. Chaque fiche Allflix affiche une rangée « Personnages ».

## Données

- `public/characters/index.json` : généré par l'import, ne pas éditer à la main.
- `public/characters/typings.json` : **typage éditorial**, le seul fichier à remplir à la main.
- `public/characters/sources.json` : corrections de correspondance AniList (facultatif).

Sources : API officielles uniquement. TMDB pour les films et séries (la photo est celle de l'interprète), AniList pour les animés (illustration du personnage, noms en romaji : « Satoshi » pour Sacha). Aucune extraction de sites tiers comme PDB ou Boo : leurs typages sont le contenu de leurs communautés, protégé par le droit des bases de données.

## Importer

```sh
npm run characters:import                         # les 80 œuvres, 10 personnages chacune
npm run characters:import -- --only=tmdb-tv-1396  # une seule œuvre
npm run characters:import -- --per-title=15
```

Nécessite `TMDB_API_KEY` dans `.env.local` (comme Allflix). AniList n'a pas besoin de clé ; l'import respecte sa limite d'environ 30 requêtes par minute (compter 3 à 4 minutes pour tout le catalogue). Un personnage présent dans plusieurs œuvres (série et film) n'a qu'une fiche et un seul typage. Une œuvre en échec garde ses personnages précédents.

Si un animé est mal associé ou introuvable sur AniList, fixer sa correspondance dans `sources.json`, puis relancer l'import de cette œuvre :

```json
{ "tmdb-movie-1218925": { "anilistId": 171627 }, "tmdb-tv-123": { "anilistId": null } }
```

`null` force l'import via TMDB.

## Typer un personnage

Dans `typings.json`, chaque personnage a déjà son entrée (triée par œuvre) :

```json
"tmdb-credit-52fe421fc3a36847f8005cbf": {
  "personnage": "Joker",
  "oeuvre": "The Dark Knight : Le Chevalier noir",
  "mbti": "ENTP",
  "enneagramme": "7w8",
  "note": "Une phrase qui justifie le typage (facultatif, 600 caractères)."
}
```

- `mbti` : 4 lettres (`INTJ`, `enfp`…). `enneagramme` : `5`, `5w4` ou `5w6` (l'aile doit être voisine).
- `statut` : `suggestion` (pré-rempli, affiché « Suggestion de typage, à valider »), `valide` après relecture, ou vide pour un typage saisi à la main. 454 personnages ont été pré-remplis en `suggestion` par Claude (jugement propre, aucune base tierce ; certains d’après le roman ou les comics d’origine, mentionné dans la note). Restent vides (293) : les figurants, les personnages de films 2025-2026 que Claude ne connaît pas (Hope, Fall 2, The Mongoose, Matchbox…), les entrées TMDB regroupant plusieurs personnages d’un même doubleur (Les Simpson, Les Griffin, Elena / Katherine…), quelques personnages secondaires peu caractérisés.
- Une valeur mal écrite n'est jamais affichée. Vérifier avant de publier : `npm run characters:check`.
- Un nouvel import ne modifie jamais une entrée remplie ; il ajoute les nouveaux personnages et retire seulement les entrées vides devenues orphelines.
- Publier : commit puis push sur `main` (Netlify redéploie).

## Limites de la V1

Pas de votes de la communauté, pas de pages indexées individuellement par Google (le site est exporté en statique, les fiches passent par `?id=`), noms d'animés en romaji. Licences TMDB et AniList à vérifier avant tout usage commercial.
