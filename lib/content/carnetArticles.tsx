import type { ReactNode } from 'react';

export type CarnetArticle = {
  slug: string;
  num: string;
  date: string;
  tag: string;
  title: ReactNode;
  plainTitle: string;
  excerpt: string;
  body: string[];
};

export const CARNET_ARTICLES: CarnetArticle[] = [
  {
    slug: 'lumiere-chaude-2700k',
    num: 'N° 003',
    date: '17 nov. 2026',
    tag: 'Habiter',
    title: <>Pourquoi la <em>lumière chaude</em> à 2700K change une nuit de garde.</>,
    plainTitle: 'Pourquoi la lumière chaude à 2700K change une nuit de garde',
    excerpt: "Le veilleur d'hôpital, l'ouvrier en 3×8 et l'insomniaque partagent un même adversaire silencieux : la lumière blanche des néons. Retour sur un des rituels les plus simples et les plus sous-estimés du livre.",
    body: [
      "Il y a des ennemis qu'on n'apprend jamais à reconnaître parce qu'ils ne ressemblent à rien. Le néon du couloir, la veilleuse LED \"économique\" au-dessus de l'évier, l'écran laissé en mode automatique : tous diffusent une lumière proche de 5000-6000K, la même teneur en bleu que le ciel de midi. Le corps ne fait pas la différence entre \"il est 14h\" et \"il est 3h du matin, mais quelqu'un a laissé la cuisine allumée\". Il reçoit le signal, et il obéit : la mélatonine chute, l'horloge interne se recale sur un jour qui n'existe pas.",
      "Pour qui travaille ou vit la nuit, cette confusion a un coût réel — pas philosophique, mesurable. Une étude citée dans le carnet montre qu'une exposition de trente minutes à une lumière au-dessus de 4000K suffit à retarder la sécrétion de mélatonine de près de deux heures chez un sujet en horaires décalés. Deux heures, c'est le sommeil d'une nuit entière amputé d'un quart.",
      "2700K, en comparaison, c'est la température d'une bougie, d'un feu de cheminée, d'une ampoule à filament à l'ancienne. Le corps la lit comme un signal de fin de journée, même si le \"jour\" en question a commencé à 22 heures. Le rituel que je propose n'a rien de mystique : changer les ampoules des pièces où on rentre après le service, poser une lampe d'appoint à 2700K sur la table plutôt que d'allumer le plafonnier, couper l'écran bleu du téléphone une heure avant de viser le sommeil.",
      "Ce n'est pas une contrainte de plus dans une vie déjà cadrée par des horaires qu'on ne choisit pas. C'est l'inverse : une des rares variables qu'on contrôle entièrement, pour trois euros d'ampoule.",
    ],
  },
  {
    slug: 'blaise-barman-epanoui-la-nuit',
    num: 'N° 002',
    date: '03 nov. 2026',
    tag: 'Subir',
    title: <>Blaise, barman : <em>« Épanoui la nuit, la clientèle est différente. »</em></>,
    plainTitle: 'Blaise, barman : « Épanoui la nuit, la clientèle est différente »',
    excerpt: "Premier des entretiens de la série Fraternité silencieuse. Blaise raconte pourquoi la nuit lui va, comment il dort d'un seul bloc après le service, et ce que le jour ne lui offre plus depuis longtemps.",
    body: [
      "Blaise tient le bar du Central depuis onze ans. Service de 19h à 4h, cinq soirs sur sept. Je l'ai rencontré un mardi, à l'heure où la salle se vide et où il essuie les verres sans y penser, par automatisme pur.",
      "« Les gens qui viennent le jour, ils sont pressés, ils regardent leur montre. Ceux qui viennent après minuit, ils sont là parce qu'ils ont décidé d'être là. Ça change tout dans la conversation. » Il raconte les habitués du bout de comptoir, les infirmières qui finissent leur garde et passent boire un verre avant de rentrer, les insomniaques chroniques qui préfèrent parler à un inconnu plutôt que fixer le plafond.",
      "Sur le sommeil, il est catégorique : « Je dors d'un bloc, sept heures, de 5h à midi. Jamais de réveil au milieu. Le jour, sur les rares fois où j'ai dû me lever tôt, je fragmente, je me réveille toutes les deux heures. La nuit, mon corps sait que rien ne va venir m'interrompre — pas de livreur, pas de voisin qui perce, pas de téléphone. » Ce sommeil ininterrompu, il le doit à un rituel strict : rideaux occultants, téléphone en mode avion, et la même chanson instrumentale en fond, chaque matin, depuis six ans.",
      "Ce qu'il ne retrouve plus dans le jour, dit-il, c'est une forme de lenteur. « Le jour, tout le monde optimise son temps. La nuit, personne ne fait semblant d'être pressé. » Fin de l'entretien, retour au comptoir : un dernier client attend son verre, il est 3h47.",
    ],
  },
  {
    slug: 'couple-en-decale-geometrie-des-presences',
    num: 'N° 001',
    date: '20 oct. 2026',
    tag: 'Partager',
    title: <>Le couple <em>en décalé :</em> géométrie des présences.</>,
    plainTitle: 'Le couple en décalé : géométrie des présences',
    excerpt: "Quand l'un rentre, l'autre part. Les protocoles concrets — les trente minutes sacrées, le repas hebdomadaire ritualisé, les week-ends recalés — qui font tenir un couple séparé par les horaires.",
    body: [
      "Un couple sur deux, parmi ceux que j'ai interrogés pour ce chapitre, vit ce que j'appelle une géométrie des présences : les horaires ne se superposent presque jamais, seulement à la marge, dans les dix ou vingt minutes où l'un rentre pendant que l'autre part. Le risque n'est pas l'absence — c'est la disparition progressive du rituel de couple, remplacé par des croisements silencieux dans un couloir.",
      "Le premier protocole qui revient, presque mot pour mot, dans chaque entretien : les trente minutes sacrées. Pas de téléphone, pas de tâche ménagère, juste s'asseoir ensemble au moment du croisement — même épuisé, même à moitié endormi. Ce n'est pas un temps de qualité au sens marketing du terme ; c'est un ancrage, une preuve quotidienne que la relation existe en dehors des messages textes.",
      "Le deuxième : le repas hebdomadaire ritualisé. Un couple raconte avoir fixé, depuis quatre ans, un déjeuner le mercredi à 15h — l'heure où leurs deux emplois du temps se recoupent enfin. Peu importe l'heure absurde pour le reste du monde ; ce qui compte, c'est la régularité, calée dans les deux agendas comme un rendez-vous professionnel qu'on ne déplace pas.",
      "Le troisième, plus lourd à tenir : les week-ends recalés. Plutôt que de viser samedi-dimanche, coordonner deux jours de repos consécutifs, quels qu'ils soient dans la semaine, et les protéger comme on protégerait un vrai week-end — sans y glisser les courses, le ménage, les obligations qui débordent des jours \"normaux\" des autres.",
      "Aucun de ces protocoles ne compense un désalignement structurel. Mais tous les couples interrogés s'accordent sur un point : ce n'est pas le nombre d'heures partagées qui tient la relation, c'est la constance du rituel, même minuscule, qui la rend prévisible et donc habitable.",
    ],
  },
];

export function getCarnetArticle(slug: string): CarnetArticle | undefined {
  return CARNET_ARTICLES.find(a => a.slug === slug);
}
