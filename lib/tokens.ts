// lib/tokens.ts — Tokens DA LATRACTION
// Source unique de vérité pour toute l'identité visuelle.
// Reproduit la palette de hud.jsx existant.

export const T = {
  // Backgrounds
  bg:        '#03060D',
  bg2:       '#06091A',
  surf:      'rgba(10, 19, 32, 0.78)',
  surf2:     'rgba(14, 26, 46, 0.72)',

  // Lines / strokes
  line:      'rgba(120, 200, 255, 0.14)',
  lineMid:   'rgba(120, 200, 255, 0.26)',
  lineHot:   'rgba(120, 200, 255, 0.55)',

  // Brand cyan (Solo Leveling glacé) + accents
  cyan:      '#4ECDFF',
  cyanHi:    '#B8ECFF',
  cyanLo:    '#1A6E9E',
  cyanGlow:  'rgba(78, 205, 255, 0.5)',
  cyanWash:  'rgba(78, 205, 255, 0.08)',
  purple:    '#9B7CFF',
  purpleGlow:'rgba(155, 124, 255, 0.45)',
  amber:     '#FFB23D',
  green:     '#5CFFB2',
  danger:    '#FF5577',

  // Text
  text:      '#DCEAF7',
  textDim:   '#7E97B7',
  textMute:  '#4A607E',

  // Type
  display:   '"Chakra Petch", system-ui, sans-serif',
  mono:      '"JetBrains Mono", ui-monospace, monospace',
  rank:      '"Orbitron", system-ui, sans-serif',
} as const;

export type Token = typeof T;

// Easings canoniques pour Framer Motion
export const EASE = {
  outExpo: [0.22, 1, 0.36, 1] as const,
  inOutExpo: [0.87, 0, 0.13, 1] as const,
  outCirc: [0, 0.55, 0.45, 1] as const,
} as const;
