import type { Project } from './types';
export type Priority = { important: boolean; urgent: boolean };
export const PRIORITY_PREFIX = 'grind_priority_';
export const QUADRANTS = [
  { id: 'do', title: 'À faire en priorité', subtitle: 'Important et urgent', important: true, urgent: true, color: '#FFB23D' },
  { id: 'plan', title: 'À planifier', subtitle: 'Important, pas urgent', important: true, urgent: false, color: '#4ECDFF' },
  { id: 'delegate', title: 'À déléguer ou traiter', subtitle: 'Moins important, urgent', important: false, urgent: true, color: '#9B7CFF' },
  { id: 'later', title: 'À reporter ou écarter', subtitle: 'Moins important, pas urgent', important: false, urgent: false, color: '#7E97B7' },
];
export function readPriorities(metadata: Record<string, unknown>): Record<string, Priority> {
  const result: Record<string, Priority> = {};
  for (const [key, value] of Object.entries(metadata)) if (key.startsWith(PRIORITY_PREFIX) && value && typeof value === 'object') {
    const p = value as Priority;
    if (typeof p.important === 'boolean' && typeof p.urgent === 'boolean') result[key.slice(PRIORITY_PREFIX.length)] = { important: p.important, urgent: p.urgent };
  }
  return result;
}
export function priorityFor(project: Pick<Project, 'id' | 'ends_at'>, saved: Record<string, Priority>, now = Date.now()): Priority {
  if (saved[project.id]) return saved[project.id];
  const deadline = project.ends_at ? Date.parse(project.ends_at) : NaN;
  return { important: true, urgent: Number.isFinite(deadline) && deadline <= now + 7 * 86400000 };
}
export function quadrantFor(p: Priority): string { return QUADRANTS.find(q => q.important === p.important && q.urgent === p.urgent)!.id; }
