// lib/engine/mbtiClasses.ts — Classe affichée à partir du MBTI.
// Système à part du spec_kind (7 spécialisations, déblocage niveau 25) :
// la classe MBTI est visible dès la création du compte, personnalisation
// immédiate indépendante de toute progression.

export type MbtiType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

export const MBTI_CLASSES: Record<MbtiType, { label: string; identity: string }> = {
  INTJ: { label: 'VISIONNAIRE',     identity: 'Voit le système avant qu\'il existe.' },
  INTP: { label: 'ANALYSTE',        identity: 'Démonte tout pour comprendre.' },
  ENTJ: { label: 'COMMANDANT',      identity: 'Impose la direction, tient le cap.' },
  ENTP: { label: 'CATALYSEUR',      identity: 'Provoque, teste, itère vite.' },
  INFJ: { label: 'ORACLE',          identity: 'Lit ce que les autres ne disent pas.' },
  INFP: { label: 'IDÉALISTE',       identity: 'Avance par cohérence intérieure.' },
  ENFJ: { label: 'MENTOR',          identity: 'Fait grandir ceux qui l\'entourent.' },
  ENFP: { label: 'ÉTINCELLE',       identity: 'Allume, connecte, propage.' },
  ISTJ: { label: 'GARDIEN',         identity: 'Tient la structure envers et contre tout.' },
  ISFJ: { label: 'PROTECTEUR',      identity: 'Sécurise, discret, indispensable.' },
  ESTJ: { label: 'EXÉCUTANT',       identity: 'Transforme le plan en résultats.' },
  ESFJ: { label: 'FÉDÉRATEUR',      identity: 'Tient le groupe soudé.' },
  ISTP: { label: 'ARTISAN',         identity: 'Résout avec les mains, sans bruit.' },
  ISFP: { label: 'OBSERVATEUR',     identity: 'Capte l\'instant, agit sans forcer.' },
  ESTP: { label: 'AUDACIEUX',       identity: 'Fonce, ajuste en vol.' },
  ESFP: { label: 'ÉLECTRON LIBRE',  identity: 'Vit et joue à pleine intensité.' },
};

export const UNCALIBRATED_CLASS = {
  label: 'NON CALIBRÉ',
  identity: 'Signal brut, pas encore décodé. La progression, elle, ne s\'arrête pas.',
};

export function getMbtiClass(mbti: string | null | undefined) {
  const key = (mbti ?? '').toUpperCase() as MbtiType;
  return MBTI_CLASSES[key] ?? UNCALIBRATED_CLASS;
}
