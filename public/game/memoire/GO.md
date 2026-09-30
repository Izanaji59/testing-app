# Empreinte — Go MBTI

Prototype solo sans compte, au clic ou au toucher. Le jeu reprend les groupes, libertés et captures du go, avec des pouvoirs et une victoire par captures. Ce n’est pas une implémentation du règlement traditionnel du go.

## Une décision par tour

- Plateau de 9 × 9 intersections. Deux pierres par camp sont installées au centre.
- Le joueur choisit trois pouvoirs distincts parmi les quatre NT, puis commence.
- Un coup est une pose normale, un pouvoir ou une passe. L’IA répond ensuite. Aucun temps limite ni ressource liée au temps réel.
- Les pierres de même couleur se relient par les côtés, jamais par les diagonales. Les intersections vides adjacentes constituent les libertés du groupe. Un groupe sans liberté est capturé.
- Une pose sans liberté est interdite sauf si elle capture et libère ainsi une intersection. Recréer une position déjà apparue est interdit. Les passes restent autorisées.
- Première équipe à cinq captures gagnante. Après deux passes consécutives ou 80 coups au total, les captures départagent les camps. En cas d’égalité, compter les pierres présentes et les intersections vides bordées par un seul camp. Une nouvelle égalité donne un match nul.

## Réserve et pouvoirs

Chaque pose normale rapporte un point, jusqu’à six en réserve. Passer, capturer ou jouer un pouvoir ne rapporte rien. Chaque pouvoir consomme le coup et son coût ; un coup refusé ne modifie ni le plateau ni la réserve.

| Type | Pouvoir | Coût | Règle |
| --- | --- | --- | --- |
| INTJ | Prévision | 2 | Pose une pierre et annonce une autre intersection libre. Au début du prochain tour du lanceur, une seconde pierre apparaît si cette pose est alors légale. L’adversaire peut occuper cette intersection pour la bloquer. Aucun remboursement si la prévision échoue. |
| INTP | Déconstruction | 1 | Retire une pierre alliée pour changer la forme d’un groupe ou ouvrir une liberté. Ce retrait ne compte pas comme une capture. |
| ENTJ | Offensive | 4 | Pose deux pierres sur deux intersections initialement libres et voisines par un côté. Chaque pose et chaque position intermédiaire doivent être légales. Si la seconde échoue, tout le coup est annulé. |
| ENTP | Permutation | 3 | Déplace une pierre alliée vers une intersection vide voisine par un côté. Le retrait et la pose forment une seule action. La pose peut capturer. |

La prévision est visible par les deux camps. Elle se résout après le coup adverse, avant le prochain choix de son propriétaire ; si le coup adverse a déjà terminé la partie, elle ne se résout pas. Une prévision réussie peut remporter la partie. La mémoire intervient par la connaissance des pouvoirs adverses, sans empreintes cachées.

## Interaction

Une pose normale se joue d’un clic. Une option permet de confirmer chaque pose. Toucher une pierre montre son groupe et ses libertés. Les pouvoirs affichent un aperçu avant confirmation et peuvent être annulés gratuitement. Après un aperçu, toucher de nouveau la dernière intersection valide aussi le coup.

Les commandes rapides restent sous le plateau sur téléphone. Sur clavier, les flèches parcourent les intersections, Entrée joue et Échap annule un aperçu. Les captures ont un retour visuel et apparaissent dans le journal. Les animations respectent la préférence de mouvement réduit.

## Adversaire

L’IA reçoit trois pouvoirs aléatoires et un profil offensif, patient ou mobile. Elle utilise le même moteur et la même économie que le joueur. Elle évalue captures, libertés, groupes menacés, formes et prévisions. Une réponse normale adverse est examinée pour ses meilleures options ; ce n’est pas une recherche exhaustive de toutes les suites de pouvoirs. L’équilibrage des coûts et la difficulté restent à affiner par des parties humaines.

## Fichiers et vérifications

- `index.html` et `go.html` : page du prototype.
- `go-core.js` : règles pures, exportées aussi pour Node.
- `go.js` : commandes, aperçu, rendu et réponse de l’IA.
- `go.css` : plateau et présentation responsive.
- `node scripts/test-memoire-go.cjs` : captures simples et multiples, libertés, suicide, répétition, atomicité, quatre pouvoirs, prévisions, réserve, fins de partie et douze parties simulées.

Les interactions ont également été vérifiées dans un navigateur avec émulation tactile : choix des pouvoirs, pose, confirmation, annulation, quatre pouvoirs, réponses de l’IA, remise à zéro pendant son tour et absence de débordement de 320 à 1280 pixels. Cela ne remplace pas un essai sur téléphone physique.

Le duel précédent reste accessible à `tactique.html`, le tout premier prototype à `precedent.html`.
