# Empreinte — prototype solo contre IA

Ouvrir `/game/memoire/index.html` avec `npm run dev`. Le dossier peut aussi être servi statiquement. Aucun déploiement public n’est effectué.

## Boucle et mémoire

1. **Observation, 2 secondes.** Les nouvelles empreintes apparaissent une seconde puis disparaissent. Une ancienne empreinte invisible n’est jamais révélée à nouveau.
2. **Placement, 10 secondes.** Sélectionner un champion avec 1/2 ou au clic, puis cliquer une destination. Chaque case coûte un point, avec 4 à 5 points par champion et par cycle. Les alliés sont traversables, mais une destination occupée est refusée. R ou les flèches fixent l’orientation des attaques. NT, sbires et délais de combat sont figés.
3. **Action, 10 secondes.** Une vague arrive. Les champions tiennent leur case et attaquent automatiquement selon leur champ et leur ordre. Seul le NT se pilote en ZQSD. Espace : attaque de 33 ; A : carte NT ; Maj : élan ; Échap : pause. Entrée termine le placement plus tôt.

Une empreinte maximum par champion et par cycle : visible une seconde, invisible pendant deux secondes d’action, puis explosion de 55 dégâts. Les délais cachés sont suspendus pendant le placement. Les propositions de trajet et l’IA ne consultent jamais les pièges cachés : mémoriser leurs cases permet de corriger les ordres.

## Cinq ordres persistants

Les missions restent actives d’une vague à l’autre. Le trajet proposé apparaît au début du placement et démarre après deux secondes, ou immédiatement avec **Appliquer**. Un clic ajuste le placement pour le cycle courant. **Manuel** suspend la proposition ce cycle sans effacer la mission.

| Ordre | Comportement |
| --- | --- |
| Attaquer une cible | Cherche un angle contre le champion ou NT désigné. |
| Stacker les sbires | Accompagne la formation, attend les last-hits en l’absence de personnage menaçant et réserve ses empreintes aux personnages. |
| Protéger le NT | Se rapproche du NT et menace ses assaillants. Un ST à moins de 2,1 cases intercepte la moitié d’un impact par seconde ; au début de l’action, un ST proche confère 30 de bouclier. |
| Tenir sa voie | Reste dans la voie choisie une fois rejoint et y concentre ses attaques. |
| Gank agressif | Rejoint l’autre voie choisie pour aider un allié et créer du surnombre. |

Les champions alliés avancent une case toutes les 0,28 s en placement, les adversaires toutes les 0,5 s. Recliquer ne restaure pas les points dépensés. Pendant l’action, les champions restent immobiles et conservent leur orientation ; les contrôles peuvent les repousser.

## Familles et champs d’attaque

Les cases grises du dessin fourni définissent exactement les champs. Le centre appartient au personnage et ne reçoit pas sa propre attaque.

| Famille | MBTI | Cases attaquées |
| --- | --- | --- |
| SF — guerriers | ESFP, ISFP, ESFJ, ISFJ | Les deux côtés et leurs deux diagonales avant : quatre cases proches. |
| NF — sorciers | ENFP, INFP, ENFJ, INFJ | Deux diagonales avant, deux cases chacune. |
| ST — tanks | ESTP, ISTP, ESTJ, ISTJ | Devant, derrière, gauche, droite : quatre cases adjacentes. |

Les attaques normales infligent 33 à chaque ennemi dans le champ, toutes les 1,6 s. Une structure ne subit qu’un impact par attaque même si elle occupe plusieurs cases. Les cases absentes du dessin restent hors du champ. Les SF repoussent lors de l’explosion ; les NF appliquent deux secondes de silence ; les ST ralentissent deux secondes et peuvent protéger les alliés touchés par leur empreinte. Le silence bloque les capacités et l’élan, le ralentissement réduit la vitesse.

Les quatre NT gardent leurs champs et profils : INTJ protège une zone, INTP exécute un sbire sur une case précise et gagne un bonus tous les deux last-hits, ENTJ accélère ses sbires et reçoit un bonus à la première porte détruite, ENTP propage des dégâts après un last-hit. Leur attaque de base touche une seule cible proche, en donnant priorité à un last-hit, toutes les 0,95 s. Le NT a 400 PV ; les champions ont entre 360 et 640 PV selon leur profil.

## Front complet et économie

Chaque camp fait apparaître **16 sbires : un sur chaque ligne du plateau**, à gauche ou à droite. Les huit lignes du haut alimentent la voie haute, les huit du bas la voie basse. Le front garde toute sa largeur jusqu’au milieu, puis se resserre progressivement en trois files devant les portes. Une priorité de passage évite les blocages au regroupement.

Maximum **32 sbires vivants par camp** : 16 par moitié de plateau et deux par ligne d’origine. Les places encore occupées ne génèrent pas de file d’attente de nouvelles unités. Chaque sbire a 100 PV, frappe à 25 contre les sbires/portes et à 12 contre les personnages. Les sbires échangent leurs coups simultanément, toutes les secondes au contact. Leur vitesse de base est de 0,75 case/s.

Un dernier coup de champion ou NT sur un sbire rapporte **50 G** au camp concerné. Les coups des sbires ne rapportent pas d’or. Les deux camps utilisent les mêmes règles, coûts et plafonds, sans revenu gratuit pour l’IA.

| Achat en placement | Prix | Effet |
| --- | --- | --- |
| Renforcer une voie | 250 G | 25 de bouclier aux huit prochains sbires qui y apparaissent. Les protections attendent les places libres. |
| Fortifier une voie | 200 G | 150 de bouclier sur sa première porte encore vivante, pour la prochaine action. |
| Seconde activation NT | 250 G | Une activation supplémentaire pour le prochain cycle, sans remplacer un effet encore actif. |

Les deux voies peuvent être soutenues séparément. Pas de nouvel achat de renforts sur une voie tant que le précédent attend encore ses unités, ni de double achat de la seconde activation. Un bouclier ne répare jamais les PV. Les protections temporaires des portes expirent à la vague suivante.

## Survie, progression et victoire

**Aucune régénération automatique**, pendant ou entre les phases. Un personnage éliminé manque la prochaine vague et revient avec la deuxième vague après son élimination, à pleine vie. Cela concerne aussi le NT ; sa mort ne termine pas la partie.

Chaque voie possède deux portes successives de 300 puis 400 PV. La seconde reste invulnérable jusqu’à destruction de la première. Les portes alliées sont traversables. La dernière ligne empêche de contourner les passages fermés.

Victoire lorsqu’une unité vivante franchit la dernière ligne adverse après destruction des deux portes de sa voie. Deux infiltrations simultanées donnent une égalité.

L’IA prépare ses ordres une fois par placement. Vagues 1–2 : installation, farm et budget volontairement réduit à trois pas. Vagues 3–5 : pression sur des cibles. Vague 6 et suivantes : ganks et coordination. Elle adapte ses priorités aux intrusions et à un NT blessé. Son NT cherche les last-hits, soutient les champions et recule si nécessaire. Elle dépense uniquement l’or gagné.

## Affichage et vérification

Rendu WebGL local avec Three.js 0.180.0, licence MIT dans `vendor/THREE-LICENSE.txt` : plateau en relief, figurines par famille, ombres, portes, vie, dégâts et sélection au clic. Le bouton **Vue du dessus** permet de revenir en 2D ; ce rendu sert aussi de secours si WebGL échoue. Les figurines sont procédurales, sans design artistique définitif propre à chaque MBTI. Prototype sans multijoueur, sauvegarde ni son.

`node scripts/test-memoire.cjs` vérifie les classes et motifs, les missions et déplacements, les phases et pièges invisibles, les vagues sur 16 lignes et leur regroupement, les plafonds de population, les achats des deux camps, les last-hits, les protections, l’absence de régénération, les réapparitions, l’infiltration et une partie simulée sur plusieurs cycles.
