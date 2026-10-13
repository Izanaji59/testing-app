# Concentration et priorités dans Grindleveling

La page `/donjon/` présente par défaut les projets actifs, planifiés et en sommeil dans les quatre quadrants d’Eisenhower. Les projets terminés ou abandonnés restent consultables en dessous. La vue Liste est toujours accessible.

Chaque carte propose Importance et Urgence, utilisables au clavier ou au toucher. Le glisser-déposer entre quadrants est disponible sur ordinateur. Sans choix enregistré, un projet est suggéré important ; une échéance dans les sept prochains jours ou déjà dépassée suggère l’urgence. Un choix manuel prend toujours le dessus. Les dates départagent l’ordre des cartes dans chaque quadrant.

Le classement est enregistré dans les préférences du compte Supabase (`auth.users.user_metadata`, clé `grind_priority_<projectId>`). Chaque modification écrit seulement la clé concernée, via le compte connecté. Il ne s’agit pas de données d’autorisation. Aucun changement du schéma SQL n’est requis. En cas d’échec, la carte garde son ancien classement et affiche une erreur. Le chargement sur un autre appareil récupère ces préférences.

## Sessions de concentration

Le bouton Concentration est accessible sur toutes les pages authentifiées. « Me concentrer » sur une carte préremplit son projet et son titre ; l’objectif de session reste modifiable. Une session libre est également possible.

Formats : 25/5, 50/10, 60/10, 90/15, rituel 20/20/20 et personnalisé (5 à 180 minutes de travail, 0 à 60 minutes de pause). Le rituel enchaîne Bouger, Réfléchir et Apprendre pendant vingt minutes chacun, à l’heure choisie par l’utilisateur.

Les trois premières minutes des blocs de travail affichent l’entrée en concentration et sont incluses dans le budget de travail. Ce repère n’est pas une mesure de l’attention. « Je me suis déconcentré » suspend le travail et lance dix minutes comptées séparément. « Replonger » reprend le temps restant immédiatement, avec une nouvelle entrée de trois minutes au maximum, incluse dans le restant. Au terme de la distraction, le minuteur attend le clic du joueur.

Après le travail, la récupération démarre, puis le minuteur attend un bilan. Aucune nouvelle session ne démarre automatiquement. On peut aussi terminer un bloc plus tôt et enregistrer son bilan. Ni XP ni validation de mission ne sont attribuées par le minuteur.

Les horodatages absolus évitent la dérive des intervalles en arrière-plan. Fermer le panneau, changer de page ou recharger ne remet pas le compteur à zéro. Les onglets du même compte partagent les changements par l’événement storage. Session et vingt derniers bilans sont conservés dans localStorage, avec des clés séparées par compte ; ils ne sont pas synchronisés entre appareils. Une erreur de stockage est annoncée à l’utilisateur.

## Vérifications

- `node scripts/test-grind-focus.cjs` : calculs de temps, entrées, interruptions, reprise, retour après suspension du navigateur, rituel, arrêt manuel, données invalides et priorités.
- `PLAYWRIGHT_MODULE=<module Playwright> node scripts/test-grind-focus-browser.cjs` : utilise le site local sur le port 3006 (modifiable via GRIND_TEST_URL). Le compte et toutes les requêtes Supabase sont simulés, aucune donnée réelle n’est modifiée. Vérifie classement, échec d’enregistrement, navigation, rechargement, tous les états du minuteur, bilans et responsive.
- `npm run build` : compilation, validation TypeScript et export statique.

Les règles de sauvegarde du classement utilisent l’API Auth existante ; aucun accès administrateur Supabase n’est nécessaire pour publier cette version.
