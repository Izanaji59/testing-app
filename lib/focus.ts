export type FocusPhase = 'work' | 'distraction' | 'ready' | 'recovery' | 'complete';
export interface FocusSession {
  version: 1; id: string; projectId: string; projectTitle: string; objective: string;
  label: string; ritual: boolean; totalMs: number; workedMs: number; distractionMs: number;
  breakMs: number; entryLeftMs: number; phase: FocusPhase; leftMs: number; anchor: number;
  startedAt: number; interruptions: number;
}
export interface FocusRecord extends FocusSession { note: string; savedAt: number }
export const PRESETS = [
  { id: '25', label: 'Démarrer', minutes: 25, rest: 5 },
  { id: '50', label: 'Approfondir', minutes: 50, rest: 10 },
  { id: '60', label: 'Concentration longue', minutes: 60, rest: 10 },
  { id: '90', label: 'Projet prioritaire', minutes: 90, rest: 15 },
  { id: 'ritual', label: 'Rituel 20 / 20 / 20', minutes: 60, rest: 0 },
];
export function createFocus(input: { minutes: number; rest: number; label: string; ritual?: boolean; projectId?: string; projectTitle?: string; objective: string }, now: number, id: string): FocusSession {
  if (!Number.isFinite(input.minutes) || input.minutes < 5 || input.minutes > 180 || !Number.isFinite(input.rest) || input.rest < 0 || input.rest > 60) throw new Error('Choisis 5 à 180 minutes de travail et 0 à 60 minutes de pause.');
  if (!input.objective.trim()) throw new Error('Indique ce que tu veux avancer.');
  const totalMs = Math.round(input.minutes * 60000);
  return { version: 1, id, projectId: input.projectId || '', projectTitle: input.projectTitle || '', objective: input.objective.trim().slice(0, 200), label: input.label, ritual: !!input.ritual, totalMs, workedMs: 0, distractionMs: 0, breakMs: Math.round(input.rest * 60000), entryLeftMs: input.ritual ? 0 : 180000, phase: 'work', leftMs: totalMs, anchor: now, startedAt: now, interruptions: 0 };
}
// Horodatages absolus : le navigateur peut suspendre ses intervalles en arrière-plan.
export function advanceFocus(source: FocusSession, now: number): FocusSession {
  const s = { ...source };
  if (s.phase === 'ready' || s.phase === 'complete') return s;
  const elapsed = Math.max(0, now - s.anchor), used = Math.min(s.leftMs, elapsed);
  s.leftMs -= used; s.anchor = Math.max(s.anchor, now);
  if (s.phase === 'work') { s.workedMs = Math.min(s.totalMs, s.workedMs + used); s.entryLeftMs = Math.max(0, s.entryLeftMs - used); }
  if (s.phase === 'distraction') s.distractionMs += used;
  if (s.leftMs > 0) return s;
  if (s.phase === 'work') {
    s.phase = s.breakMs ? 'recovery' : 'complete';
    s.leftMs = Math.max(0, s.breakMs - (elapsed - used));
    if (!s.leftMs) s.phase = 'complete';
  } else s.phase = s.phase === 'distraction' ? 'ready' : 'complete';
  return s;
}
export function distractFocus(source: FocusSession, now: number): FocusSession {
  const s = advanceFocus(source, now);
  if (s.phase !== 'work') return s;
  return { ...s, phase: 'distraction', leftMs: 600000, anchor: now, interruptions: s.interruptions + 1 };
}
export function resumeFocus(source: FocusSession, now: number): FocusSession {
  const s = advanceFocus(source, now);
  if (s.phase !== 'distraction' && s.phase !== 'ready') return s;
  return { ...s, phase: 'work', leftMs: s.totalMs - s.workedMs, entryLeftMs: s.ritual ? 0 : Math.min(180000, s.totalMs - s.workedMs), anchor: now };
}
export function finishFocus(source: FocusSession, now: number): FocusSession { return { ...advanceFocus(source, now), phase: 'complete', leftMs: 0, anchor: now }; }
export function phaseLabel(s: FocusSession): string {
  if (s.phase === 'distraction') return 'Distraction';
  if (s.phase === 'ready') return 'Prêt à reprendre';
  if (s.phase === 'recovery') return 'Pause de récupération';
  if (s.phase === 'complete') return 'Bilan de la session';
  if (s.ritual) return ['Bouger', 'Réfléchir', 'Apprendre'][Math.min(2, Math.floor(s.workedMs / 1200000))];
  return s.entryLeftMs > 0 ? 'Entrée en concentration' : 'Concentration';
}
export function clockText(ms: number): string { const seconds = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + (seconds % 60).toString().padStart(2, '0'); }
export function validFocus(value: unknown): value is FocusSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as FocusSession;
  return s.version === 1 && typeof s.id === 'string' && typeof s.objective === 'string' && typeof s.label === 'string' && typeof s.projectId === 'string' && typeof s.projectTitle === 'string' && typeof s.ritual === 'boolean' && ['work','distraction','ready','recovery','complete'].includes(s.phase) && [s.totalMs,s.workedMs,s.distractionMs,s.breakMs,s.entryLeftMs,s.leftMs,s.anchor,s.startedAt,s.interruptions].every(v => Number.isFinite(v) && v >= 0) && s.totalMs >= 300000 && s.totalMs <= 10800000 && s.workedMs <= s.totalMs && s.leftMs <= 10800000 && s.breakMs <= 3600000;
}
