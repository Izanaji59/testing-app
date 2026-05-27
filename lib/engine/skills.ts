// lib/engine/skills.ts — Arbres de compétences par spécialisation.

import type { SpecKind } from '@/lib/types';

export type Skill = {
  code: string;
  label: string;
  description: string;
  unlockLevel: number;
  cost: number; // mastery points
};

export const SKILL_TREES: Record<SpecKind, Skill[]> = {
  ARCHITECT: [
    { code: 'long_vision',       label: 'Vision Longue',     description: 'Les quêtes longues (>14j) donnent +10% XP final.', unlockLevel: 30, cost: 1 },
    { code: 'mental_refactor',   label: 'Refactor Mental',   description: 'Autorise la réorganisation d\'une mission active (1×/sem).', unlockLevel: 40, cost: 2 },
    { code: 'architecture',      label: 'Architecture',      description: 'Débloque les Méta-Quêtes.', unlockLevel: 55, cost: 3 },
    { code: 'edifice',           label: 'Édifice',           description: 'Boss complétés donnent +50% XP en Technique.', unlockLevel: 80, cost: 5 },
  ],
  STRATEGIST: [
    { code: 'foresight',         label: 'Prévoyance',        description: '+15% XP sur quêtes planifiées >48h à l\'avance.', unlockLevel: 30, cost: 1 },
    { code: 'command',           label: 'Commandement',      description: 'Briefings hebdo enrichis avec analyse stratégique.', unlockLevel: 45, cost: 2 },
    { code: 'doctrine',          label: 'Doctrine',          description: 'Création de "playbooks" réutilisables.', unlockLevel: 60, cost: 3 },
  ],
  CREATOR: [
    { code: 'flow_state',        label: 'État de Flow',      description: '+20% XP après 60 min de session sans interruption.', unlockLevel: 30, cost: 1 },
    { code: 'original_voice',    label: 'Voix Originale',    description: 'Crit chance +5% sur quêtes de création.', unlockLevel: 45, cost: 2 },
    { code: 'masterpiece',       label: 'Chef-d\'œuvre',     description: 'Une création majeure peut devenir un Boss.', unlockLevel: 65, cost: 4 },
  ],
  WARRIOR: [
    { code: 'iron_will',         label: 'Volonté de Fer',    description: '+25% XP sur sessions matinales (<8h).', unlockLevel: 30, cost: 1 },
    { code: 'endurance',         label: 'Endurance',         description: 'Decay des stats divisé par 2.', unlockLevel: 50, cost: 3 },
    { code: 'unbroken',          label: 'Inflexible',        description: 'Bonus +100% sur 3e jour consécutif d\'effort soutenu.', unlockLevel: 70, cost: 4 },
  ],
  DIPLOMAT: [
    { code: 'rapport',           label: 'Rapport',           description: '+15% XP sur conversations >30 min documentées.', unlockLevel: 30, cost: 1 },
    { code: 'network',           label: 'Réseau',            description: 'Bonus XP pour entretien de liens (>1× / mois / personne).', unlockLevel: 45, cost: 2 },
  ],
  SCHOLAR: [
    { code: 'deep_read',         label: 'Lecture Profonde',  description: '+30% XP Intelligence sur sessions de lecture >45 min.', unlockLevel: 30, cost: 1 },
    { code: 'synthesis',         label: 'Synthèse',          description: 'Crit chance +8% sur quêtes de prise de notes.', unlockLevel: 45, cost: 2 },
    { code: 'polymath',          label: 'Polymathe',         description: 'Coefficient diversité boosté de +0.1.', unlockLevel: 65, cost: 4 },
  ],
  MONARCH: [
    { code: 'sovereign',         label: 'Souverain',         description: 'Accès aux quêtes "Monarch" — XP × 2.', unlockLevel: 140, cost: 6 },
    { code: 'legendary',         label: 'Légendaire',        description: 'Drop de Glyphes possible sur boss vaincus.', unlockLevel: 150, cost: 8 },
  ],
};
