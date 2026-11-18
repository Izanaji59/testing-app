// lib/engine/projectTemplates.ts — Catalogue du Système : modèles de donjons (une identité + ses quêtes).
// Un donjon décrit qui l'on est (« Je suis quelqu'un qui… ») ; ses quêtes sont les moyens d'y arriver.
// Une quête est émise une seule fois (`daily` absent) ou chaque jour jusqu'à la fin du donjon (`daily: true`).
// Les suggestions de mission (`lib/engine/missionCatalog.ts`) puisent dans ce même catalogue.

import type { DifficultyTier, ProjectType, StatKind } from '@/lib/types';

export type TemplateQuest = { title: string; minutes: number; tier: DifficultyTier; daily?: boolean };

export type ProjectTemplate = {
  id: string;
  domain: string;
  title: string;
  /** Phrase d'identité enregistrée sur le donjon. */
  identity: string;
  pitch: string;
  type: ProjectType;
  stat: StatKind;
  difficulty: DifficultyTier;
  days: number | null;
  quests: TemplateQuest[];
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'forme-30', domain: 'Santé', title: 'Remise en forme — 30 jours', type: 'CAMPAIGN', stat: 'FORCE', difficulty: 'NOTABLE', days: 30,
    identity: 'Je suis quelqu’un qui prend soin de son corps.',
    pitch: 'Reprendre une activité physique régulière, sans se blesser.',
    quests: [
      { title: 'Définir mon programme d’entraînement de la semaine', minutes: 20, tier: 'ROUTINE' },
      { title: 'Première séance de sport de 30 minutes', minutes: 30, tier: 'ROUTINE' },
      { title: 'Marcher 8 000 pas', minutes: 60, tier: 'ROUTINE', daily: true },
      { title: 'Préparer mes repas sains de la semaine', minutes: 60, tier: 'NOTABLE' },
    ],
  },
  {
    id: 'sommeil-21', domain: 'Santé', title: 'Sommeil réparateur — 21 jours', type: 'CAMPAIGN', stat: 'FORCE', difficulty: 'ROUTINE', days: 21,
    identity: 'Je suis quelqu’un qui respecte son sommeil.',
    pitch: 'Des horaires réguliers et une vraie coupure avant de dormir.',
    quests: [
      { title: 'Fixer mon heure de réveil pour les 21 jours', minutes: 10, tier: 'TRIVIAL' },
      { title: 'Ranger le téléphone 30 minutes avant de dormir', minutes: 30, tier: 'ROUTINE', daily: true },
      { title: 'Me coucher à l’heure idéale', minutes: 15, tier: 'ROUTINE', daily: true },
    ],
  },
  {
    id: 'alimentation', domain: 'Santé', title: 'Mieux manger', type: 'OPERATION', stat: 'FORCE', difficulty: 'NOTABLE', days: 14,
    identity: 'Je suis quelqu’un qui mange pour se sentir bien.',
    pitch: 'Remplacer petit à petit les habitudes qui fatiguent.',
    quests: [
      { title: 'Noter tout ce que je mange pendant 2 jours', minutes: 15, tier: 'ROUTINE' },
      { title: 'Faire une liste de courses équilibrée', minutes: 20, tier: 'ROUTINE' },
      { title: 'Boire 1,5 L d’eau dans la journée', minutes: 5, tier: 'TRIVIAL', daily: true },
    ],
  },
  {
    id: 'routine-matin', domain: 'Discipline', title: 'Routine du matin — 21 jours', type: 'CAMPAIGN', stat: 'DISCIPLINE', difficulty: 'NOTABLE', days: 21,
    identity: 'Je suis quelqu’un qui gagne sa première heure.',
    pitch: 'Commencer chaque journée par soi, avant les écrans.',
    quests: [
      { title: 'Écrire ma routine du matin idéale', minutes: 20, tier: 'ROUTINE' },
      { title: 'Me lever sans repousser le réveil', minutes: 5, tier: 'ROUTINE', daily: true },
      { title: 'Méthode 20/20/20 : bouger, réfléchir, apprendre', minutes: 60, tier: 'NOTABLE', daily: true },
    ],
  },
  {
    id: 'concentration', domain: 'Focus', title: 'Concentration retrouvée — 14 jours', type: 'CAMPAIGN', stat: 'FOCUS', difficulty: 'NOTABLE', days: 14,
    identity: 'Je suis quelqu’un qui fait une chose à la fois.',
    pitch: 'Moins d’interruptions, plus de travail profond.',
    quests: [
      { title: 'Couper les notifications inutiles du téléphone', minutes: 15, tier: 'TRIVIAL' },
      { title: 'Ranger mon espace de travail', minutes: 20, tier: 'ROUTINE' },
      { title: 'Une session de concentration de 25 minutes', minutes: 25, tier: 'ROUTINE', daily: true },
    ],
  },
  {
    id: 'lecture', domain: 'Intelligence', title: 'Lire un livre ce mois-ci', type: 'OPERATION', stat: 'INTELLIGENCE', difficulty: 'NOTABLE', days: 30,
    identity: 'Je suis quelqu’un qui lit.',
    pitch: 'Un livre, de la première à la dernière page.',
    quests: [
      { title: 'Choisir le livre et le poser en évidence', minutes: 10, tier: 'TRIVIAL' },
      { title: 'Lire 20 minutes', minutes: 20, tier: 'ROUTINE', daily: true },
      { title: 'Noter 3 idées à retenir', minutes: 15, tier: 'ROUTINE' },
    ],
  },
  {
    id: 'creer', domain: 'Créativité', title: 'Créer chaque jour — 21 jours', type: 'CAMPAIGN', stat: 'CREATIVITY', difficulty: 'NOTABLE', days: 21,
    identity: 'Je suis quelqu’un qui crée.',
    pitch: 'Dessin, musique, écriture : un peu, mais tous les jours.',
    quests: [
      { title: 'Choisir mon support de création', minutes: 10, tier: 'TRIVIAL' },
      { title: 'Créer pendant 15 minutes', minutes: 15, tier: 'ROUTINE', daily: true },
      { title: 'Montrer une création à quelqu’un', minutes: 15, tier: 'NOTABLE' },
    ],
  },
  {
    id: 'liens', domain: 'Social', title: 'Entretenir mes liens', type: 'OPERATION', stat: 'SOCIAL', difficulty: 'ROUTINE', days: 30,
    identity: 'Je suis quelqu’un qui prend des nouvelles.',
    pitch: 'Les personnes qui comptent, avant qu’il soit trop tard.',
    quests: [
      { title: 'Écrire à une personne perdue de vue', minutes: 10, tier: 'ROUTINE' },
      { title: 'Appeler un proche', minutes: 20, tier: 'ROUTINE' },
      { title: 'Proposer un moment ensemble', minutes: 15, tier: 'NOTABLE' },
    ],
  },
  {
    id: 'zone-confort', domain: 'Mentalité', title: 'Sortir de ma zone de confort', type: 'DUNGEON', stat: 'MENTALITE', difficulty: 'HARD', days: null,
    identity: 'Je suis quelqu’un qui avance malgré la peur.',
    pitch: 'Une salle par peur à affronter.',
    quests: [
      { title: 'Lister 5 choses que j’évite par peur', minutes: 15, tier: 'ROUTINE' },
      { title: 'Affronter la plus petite des cinq', minutes: 30, tier: 'NOTABLE' },
    ],
  },
  {
    id: 'revenu', domain: 'Revenu', title: 'Lancer un projet qui rapporte', type: 'CAMPAIGN', stat: 'REVENU', difficulty: 'HARD', days: 60,
    identity: 'Je suis quelqu’un qui crée de la valeur.',
    pitch: 'De l’idée au premier euro gagné.',
    quests: [
      { title: 'Écrire l’offre en une phrase', minutes: 20, tier: 'ROUTINE' },
      { title: 'Parler de l’offre à 3 personnes concernées', minutes: 60, tier: 'NOTABLE' },
      { title: 'Obtenir un premier client ou une précommande', minutes: 120, tier: 'HARD' },
    ],
  },
];

/** Stat récompensée par les quêtes d'un modèle : le revenu se gagne en euros, ses quêtes font monter la Discipline. */
export const templateQuestStat = (t: Pick<ProjectTemplate, 'stat'>): StatKind => (t.stat === 'REVENU' ? 'DISCIPLINE' : t.stat);
