# Empreinte : les seize

## Choix confirmés

Le joueur a choisi trois actions par tour, sans limite de temps, avec les seize MBTI dans chaque camp. Cette version est jouable dans `tactique.html`. La nouvelle version est aussi l’entrée `index.html`. L’essai précédent reste dans `precedent.html` pour comparaison.

Le plateau est un 16 × 16 vu du dessus. Les 32 personnages sont présents dès le départ, NT compris. Chaque unité occupe une case. L’adversaire permute sa formation et tire un style d’assaut, de siège ou de prudence. Aucune connexion, aucun compte, aucune requête externe.

## Boucle

- Trois actions pour toute l’équipe à chaque tour. Déplacement ou frappe : une action. Capacité : deux actions, sauf la permutation ENTP chargée qui coûte une action.
- Deux ordres maximum par personnage dans un tour. Une capacité compte comme un ordre tout en consommant deux actions.
- La capacité utilisée redevient disponible après un tour allié complet de recharge : utilisée au premier tour du joueur, indisponible à son deuxième, prête au troisième.
- Le joueur termine son tour explicitement. Le bot annonce et joue ses ordres, puis rend la main. Aucun chrono ne réduit le temps de réflexion.
- Les PV persistent. Aucun soin automatique, aucune résurrection dans cet essai. Les boucliers expirent au début du prochain tour de leur propriétaire.
- Chaque camp possède deux portes, une par passage. Une porte détruite ouvre la ligne de défense. Atteindre la dernière rangée adverse avec une unité vivante, ou éliminer tous les adversaires, gagne la partie.

La monnaie de décision est le budget de trois actions. Il n’y a pas de revenu par seconde, d’élixir ou de déploiement payant dans cette version : ces systèmes étaient l’autre option proposée avant le choix du tour par tour. Attendre ne procure donc aucun avantage économique.

## Clic et toucher

Sélectionner une unité, choisir Déplacer / Frapper / Capacité, puis toucher une case pour voir l’effet. Toucher à nouveau la même case confirme, sans exiger un double-clic rapide. Le bouton Confirmer donne le même résultat. Un clic isolé ne dépense rien.

Les cases éclairées indiquent les déplacements disponibles. Pour une attaque, la case choisie donne la direction et le motif apparaît avant confirmation. Une unité adverse sélectionnée affiche sa fiche et son champ de frappe actuel. Le zoom rapproche une portion de 8 × 8 cases, avec quatre boutons de déplacement de la vue. Les listes de personnages et le choix d’une coordonnée fournissent également des commandes au clavier.

## Identités

Ce sont des identités de personnages conçues pour le jeu. Elles reprennent les familles SF / NF / ST / NT utilisées dans le prototype ; elles ne prétendent pas décrire les capacités réelles des personnes.

| MBTI | Déplacement | Capacité propre |
| --- | --- | --- |
| INTJ | Ligne / colonne, 3 | Mur temporaire de trois cases : modifier une approche. |
| INTP | Diagonale, 3 | Une cible précise à portée 4 ; ignore le bouclier. |
| ENTJ | Toutes directions, 2 | Renforce la prochaine attaque des alliés dans une zone. |
| ENTP | Saut en L | Échange sa position avec un ennemi à portée 3. |
| ESFP | Toutes directions, 3 | Un pas puis une frappe sur les huit cases voisines. |
| ISFP | Diagonale, 3 | Frappe ses flancs puis se replie. |
| ESFJ | Ligne / colonne, 3 | Bouclier sur les alliés d’une croix ciblée à distance. |
| ISFJ | Toutes directions, 2 | Échange de place avec un allié et le protège. |
| ENFP | Saut en L | Frappe avec deux rebonds sur des ennemis proches. |
| INFP | Diagonale, 3 | Anneau annoncé, résolu au prochain tour allié. |
| ENFJ | Toutes directions, 2 | Attire une cible de deux cases et inflige 1 dégât. |
| INFJ | Diagonale, 3 | Inflige 1 dégât et immobilise pendant le prochain tour adverse. |
| ESTP | Ligne / colonne, 4 | Charge de trois cases, impact et repoussement. |
| ISTP | Toutes directions, 2 | Tir en ligne, puis deux branches perpendiculaires au premier impact. |
| ESTJ | Ligne / colonne, 3 | Zone de garde visible : premier entrant adverse frappé et arrêté. |
| ISTJ | Toutes directions, 2 | Bouclier personnel et résistance aux déplacements forcés. |

Les familles partagent une frappe normale : SF sur les flancs et diagonales proches, NF sur deux diagonales de deux cases, ST en croix proche, NT en ligne de trois cases arrêtée au premier obstacle ou personnage. L’orientation se choisit en attaquant. Les portées, déplacements et capacités créent les différences individuelles.

Les P ont en plus une cadence simple et visible : ESFP repousse après deux déplacements ; ISFP renforce sa frappe après deux déplacements ; ESTP gagne un bouclier après deux déplacements ; ENFP ajoute un rebond après deux attaques ; INFP laisse un écho après deux attaques ; ISTP renforce le deuxième impact sur une porte ; INTP renforce sa deuxième attaque ; ENTP charge une permutation moins coûteuse après deux attaques. Les J portent davantage leur effet dans la capacité choisie activement.

## Mémoire et lisibilité

Il n’y a plus de phase où les motifs disparaissent pour forcer la mémorisation. Les échos et zones de garde restent annoncés jusqu’à leur résolution. La mémoire sert à reconnaître les capacités, les déplacements, les portées et les cadences de chaque MBTI. Consulter une fiche reste toujours possible.

Les effets différés sont bornés, les murs expirent, et une seule zone de garde se déclenche sur un même passage. Les échanges ne traversent pas les lignes de défense fermées. Une charge interrompue ne peut pas frapper sa cible initiale à distance. L’IA paie les mêmes actions et respecte les mêmes portées.

## Vérification et limites

`node scripts/test-memoire-tactique.cjs` vérifie les 16 capacités, les budgets, les protections, les durées, les portes, la cadence ENTP et plusieurs parties simulées jusqu’à leur résultat.

Dans l’espace de développement, le test navigateur tactile vérifie les commandes tactiles simulées, l’attente libre, la confirmation, le combat, le bot, le zoom, l’annulation d’une ancienne partie et les écrans de 320 à 1280 pixels.

Ce prototype sert à éprouver les décisions et à apprendre les 16 personnages. Les valeurs de dégâts et de portée restent à équilibrer par des parties humaines. Le rendu est en 2D, sans son ni multijoueur. La formation adverse varie, mais chaque camp possède les mêmes 16 types par choix du joueur.
