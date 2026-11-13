// lib/engine/projectTemplates.ts — Modèles de projets prêts à l'emploi (santé, discipline…),
// créés avec leurs premières quêtes. Les quêtes sont sans échéance : le joueur les planifie.

import type { DifficultyTier, ProjectType, StatKind } from '@/lib/types';

export type ProjectTemplate = {
  id: string;
  domain: string;
  title: string;
  pitch: string;
  type: ProjectType;
  stat: StatKind;
  difficulty: DifficultyTier;
  days: number | null;
  quests: Array<{ title: string; minutes: number; tier: DifficultyTier }>;
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'forme-30', domain: 'Santé', title: 'Remise en forme — 30 jours', type: 'CAMPAIGN', stat: 'FORCE', difficulty: 'NOTABLE', days: 30,
    pitch: 'Reprendre une activité physique régulière, sans se blesser.',
    quests: [
      { title: 'Définir mon programme d’entraînement de la semaine', minutes: 20, tier: 'ROUTINE' },
      { title: 'Première séance de sport de 30 minutes', minutes: 30, tier: 'ROUTINE' },
      { title: 'Marcher 8 000 pas', minutes: 60, tier: 'ROUTINE' },
      { title: 'Préparer mes repas sains de la semaine', minutes: 60, tier: 'NOTABLE' },
    ],
  },
  {
    id: 'sommeil-21', domain: 'Santé', title: 'Sommeil réparateur — 21 jours', type: 'CAMPAIGN', stat: 'FORCE', difficulty: 'ROUTINE', days: 21,
    pitch: 'Des horaires réguliers et une vraie coupure avant de dormir.',
    quests: [
      { title: 'Fixer mon heure de réveil pour les 21 jours', minutes: 10, tier: 'TRIVIAL' },
      { title: 'Ranger le téléphone 30 minutes avant de dormir', minutes: 30, tier: 'ROUTINE' },
      { title: 'Me coucher à l’heure idéale', minutes: 15, tier: 'ROUTINE' },
    ],
  },
  {
    id: 'alimentation', domain: 'Santé', title: 'Mieux manger', type: 'OPERATION', stat: 'FORCE', difficulty: 'NOTABLE', days: 14,
    pitch: 'Remplacer petit à petit les habitudes qui fatiguent.',
    quests: [
      { title: 'Noter tout ce que je mange pendant 2 jours', minutes: 15, tier: 'ROUTINE' },
      { title: 'Faire une liste de courses équilibrée', minutes: 20, tier: 'ROUTINE' },
      { title: 'Boire 1,5 L d’eau dans la journée', minutes: 5, tier: 'TRIVIAL' },
    ],
  },
  {
    id: 'routine-matin', domain: 'Discipline', title: 'Routine du matin — 21 jours', type: 'CAMPAIGN', stat: 'DISCIPLINE', difficulty: 'NOTABLE', days: 21,
    pitch: 'Gagner la première heure de la journée.',
    quests: [
      { title: 'Écrire ma routine du matin idéale', minutes: 20, tier: 'ROUTINE' },
      { title: 'Me lever sans repousser le réveil', minutes: 5, tier: 'ROUTINE' },
      { title: 'Rituel 20/20/20 : bouger, réfléchir, apprendre', minutes: 60, tier: 'NOTABLE' },
    ],
  },
  {
    id: 'lecture', domain: 'Intelligence', title: 'Lire un livre ce mois-ci', type: 'OPERATION', stat: 'INTELLIGENCE', difficulty: 'NOTABLE', days: 30,
    pitch: 'Un livre, de la première à la dernière page.',
    quests: [
      { title: 'Choisir le livre et le poser en évidence', minutes: 10, tier: 'TRIVIAL' },
      { title: 'Lire les 30 premières pages', minutes: 40, tier: 'ROUTINE' },
      { title: 'Noter 3 idées à retenir', minutes: 15, tier: 'ROUTINE' },
    ],
  },
  {
    id: 'zone-confort', domain: 'Mentalité', title: 'Sortir de ma zone de confort', type: 'DUNGEON', stat: 'MENTALITE', difficulty: 'HARD', days: null,
    pitch: 'Une salle par peur à affronter.',
    quests: [
      { title: 'Lister 5 choses que j’évite par peur', minutes: 15, tier: 'ROUTINE' },
      { title: 'Affronter la plus petite des cinq', minutes: 30, tier: 'NOTABLE' },
    ],
  },
  {
    id: 'revenu', domain: 'Revenu', title: 'Lancer un projet qui rapporte', type: 'CAMPAIGN', stat: 'REVENU', difficulty: 'HARD', days: 60,
    pitch: 'De l’idée au premier euro gagné.',
    quests: [
      { title: 'Écrire l’offre en une phrase', minutes: 20, tier: 'ROUTINE' },
      { title: 'Parler de l’offre à 3 personnes concernées', minutes: 60, tier: 'NOTABLE' },
      { title: 'Obtenir un premier client ou une précommande', minutes: 120, tier: 'HARD' },
    ],
  },
];
