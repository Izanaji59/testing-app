// lib/engine/rankTitles.ts — Titres de rang évolutifs selon le MBTI.
// Le rang (E → S) reste piloté par le niveau (rank.ts) ; ici on ne fait que
// nommer chaque palier selon le profil : un INTJ devient Observateur →
// Concepteur → Structurant…, un ESFP Spontané → Animateur → Énergique…

import type { RankLetter } from '@/lib/types';
import { MBTI_CLASSES, type MbtiType } from '@/lib/engine/mbtiClasses';

export type StageLetter = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type MbtiGroupKey = 'ANALYSTES' | 'DIPLOMATES' | 'SENTINELLES' | 'EXPLORATEURS';

/** Étape d'évolution commune aux 16 profils. */
export const RANK_STAGES: Record<StageLetter, { name: string; desc: string }> = {
  E: { name: 'Réceptif',        desc: 'Découverte et observation' },
  D: { name: 'Pratique',        desc: 'Expérimentation et acquisition' },
  C: { name: 'Méthodique',      desc: 'Structuration et maîtrise' },
  B: { name: 'Autonome',        desc: 'Mise en œuvre et indépendance' },
  A: { name: 'Souverain',       desc: 'Excellence et influence' },
  S: { name: 'Interdépendance', desc: 'Impact durable et coopération' },
};

export const MBTI_GROUPS: Record<MbtiGroupKey, { label: string; pattern: string; keywords: string }> = {
  ANALYSTES:    { label: 'Les Analystes',    pattern: 'XNTX', keywords: 'Analyse · Système · Innovation · Stratégie' },
  DIPLOMATES:   { label: 'Les Diplomates',   pattern: 'XNFX', keywords: 'Vision · Relation · Sens · Influence' },
  SENTINELLES:  { label: 'Les Sentinelles',  pattern: 'XSJX', keywords: 'Organisation · Fiabilité · Service · Stabilité' },
  EXPLORATEURS: { label: 'Les Explorateurs', pattern: 'XSPX', keywords: 'Action · Adaptation · Technique · Expérience' },
};

type Titles = readonly [string, string, string, string, string, string]; // E, D, C, B, A, S

export const MBTI_RANK_PROFILES: Record<MbtiType, { profile: string; group: MbtiGroupKey; titles: Titles }> = {
  INTJ: { profile: 'Architecte',    group: 'ANALYSTES',    titles: ['Observateur', 'Concepteur', 'Structurant', 'Indépendant', 'Stratège', 'Maître d\'Œuvre'] },
  INTP: { profile: 'Logicien',      group: 'ANALYSTES',    titles: ['Curieux', 'Analyste', 'Théoricien', 'Explorateur', 'Référent', 'Architecte de Vérité'] },
  ENTJ: { profile: 'Commandant',    group: 'ANALYSTES',    titles: ['Apprenti', 'Coordinateur', 'Pilote', 'Dirigeant', 'Stratège', 'Bâtisseur de Systèmes'] },
  ENTP: { profile: 'Innovateur',    group: 'ANALYSTES',    titles: ['Explorateur', 'Concepteur', 'Visionnaire', 'Inventeur', 'Stratège', 'Catalyseur de Progrès'] },

  INFJ: { profile: 'Avocat',        group: 'DIPLOMATES',   titles: ['Réceptif', 'Analytique', 'Éclaireur', 'Autonome', 'Rassembleur', 'Harmonisateur'] },
  INFP: { profile: 'Médiateur',     group: 'DIPLOMATES',   titles: ['Idéaliste', 'Créatif', 'Pragmatique', 'Libre', 'Protecteur', 'Tisseur de Liens'] },
  ENFJ: { profile: 'Protagoniste',  group: 'DIPLOMATES',   titles: ['Apprenti', 'Guide', 'Organisateur', 'Leader', 'Mentor', 'Fédérateur Collectif'] },
  ENFP: { profile: 'Inspirateur',   group: 'DIPLOMATES',   titles: ['Curieux', 'Catalyseur', 'Concepteur', 'Réalisateur', 'Mentor', 'Catalyseur Universel'] },

  ISTJ: { profile: 'Logisticien',   group: 'SENTINELLES',  titles: ['Apprenti', 'Spécialiste', 'Pragmatique', 'Autonome', 'Référent', 'Pilier de la Cité'] },
  ISFJ: { profile: 'Défenseur',     group: 'SENTINELLES',  titles: ['Attentionné', 'Assistant', 'Praticien', 'Protecteur', 'Gardien', 'Appui Collectif'] },
  ESTJ: { profile: 'Directeur',     group: 'SENTINELLES',  titles: ['Exécutant', 'Gestionnaire', 'Organisateur', 'Directeur', 'Pilier', 'Protecteur de Structure'] },
  ESFJ: { profile: 'Consul',        group: 'SENTINELLES',  titles: ['Accueillant', 'Coordinateur', 'Animateur', 'Fédérateur', 'Protecteur', 'Cœur de Communauté'] },

  ISTP: { profile: 'Virtuose',      group: 'EXPLORATEURS', titles: ['Observateur', 'Technicien', 'Spécialiste', 'Autonome', 'Expert', 'Maître Artisan'] },
  ISFP: { profile: 'Aventurier',    group: 'EXPLORATEURS', titles: ['Sensible', 'Praticien', 'Créatif', 'Libre', 'Inspirateur', 'Harmonisateur Visuel'] },
  ESTP: { profile: 'Entrepreneur',  group: 'EXPLORATEURS', titles: ['Fonceur', 'Pragmatique', 'Tactique', 'Leader', 'Audacieux', 'Moteur d\'Impact'] },
  ESFP: { profile: 'Amuseur',       group: 'EXPLORATEURS', titles: ['Spontané', 'Animateur', 'Énergique', 'Fédérateur', 'Rayonnant', 'Synergiste Social'] },
};

const STAGE_INDEX: Record<StageLetter, number> = { E: 0, D: 1, C: 2, B: 3, A: 4, S: 5 };

function asMbtiType(mbti: string | null | undefined): MbtiType | null {
  const key = (mbti ?? '').toUpperCase().trim() as MbtiType;
  return key in MBTI_RANK_PROFILES ? key : null;
}

/** Retrouve le type MBTI depuis le libellé de classe stocké en base (profil public : seul `mbti_class` est exposé). */
export function mbtiFromClassLabel(label: string | null | undefined): MbtiType | null {
  const wanted = (label ?? '').toUpperCase().trim();
  if (!wanted) return null;
  for (const [type, meta] of Object.entries(MBTI_CLASSES)) {
    if (meta.label === wanted) return type as MbtiType;
  }
  return null;
}

export type RankTitle = {
  /** Titre propre au profil (ex. « Structurant »), ou nom de l'étape si le MBTI n'est pas renseigné. */
  title: string;
  /** Nom de l'étape commune (ex. « Méthodique »). */
  stage: string;
  /** Sous-titre de l'étape (ex. « Structuration et maîtrise »). */
  desc: string;
};

/**
 * Titre de rang pour un profil. Sans MBTI : on retombe sur le nom de l'étape,
 * le rang reste lisible. MONARCH n'existe pas dans la grille MBTI (6 paliers
 * E → S) : titre unique pour tous les profils.
 */
export function getRankTitle(mbti: string | null | undefined, letter: RankLetter): RankTitle {
  if (letter === 'MONARCH') {
    return { title: 'Monarque', stage: 'Souveraineté', desc: 'Au-delà de la grille — légende vivante' };
  }
  const stage = RANK_STAGES[letter];
  const type = asMbtiType(mbti);
  const title = type ? MBTI_RANK_PROFILES[type].titles[STAGE_INDEX[letter]] : stage.name;
  return { title, stage: stage.name, desc: stage.desc };
}
