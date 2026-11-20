// lib/mentions.ts — @mentions du tchat : un profil (@[Alpha](u:<uuid>)) ou un personnage (@[Light](c:<id>)).
// Le libellé n'est qu'un affichage : la fiche affichée vient toujours du serveur, à partir de l'identifiant.
// Aucun import à l'exécution : testé par scripts/test-mentions.cjs.

export type MentionKind = 'u' | 'c';
export type Mention = { kind: MentionKind; id: string; label: string };
export type Segment = { type: 'text'; value: string } | ({ type: 'mention' } & Mention);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHARACTER = /^(tmdb-credit-[0-9a-f]{6,40}|anilist-char-\d{1,9}|community-char-[0-9a-f-]{36})$/;
const TOKEN = /@\[([^\[\]()\n]{1,60})\]\((u|c):([A-Za-z0-9-]{1,80})\)/g;

export const validMentionId = (kind: MentionKind, id: string) => (kind === 'u' ? UUID.test(id) : CHARACTER.test(id));

/** Libellé sûr : sans crochets, parenthèses ni retour à la ligne, 60 caractères maximum. */
export const cleanLabel = (label: string) => label.replace(/[\[\]()\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

export function encodeMention(m: Mention): string {
  return `@[${cleanLabel(m.label) || '?'}](${m.kind}:${m.id})`;
}

/** Découpe un message en texte et mentions ; une mention à l'identifiant invalide reste du texte. */
export function parseMentions(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const [raw, label, kind, id] = m;
    if (!validMentionId(kind as MentionKind, id)) continue;
    const at = m.index ?? 0;
    if (at > last) out.push({ type: 'text', value: text.slice(last, at) });
    out.push({ type: 'mention', kind: kind as MentionKind, id, label: cleanLabel(label) });
    last = at + raw.length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

/** Mention en cours de saisie juste avant le curseur : « @Ali| » → { start, query: 'Ali' }. */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  if (query.length > 30 || /[\n@\[\]()]/.test(query) || /^\s/.test(query)) return null;
  return { start: at, query };
}

/** Remplace la saisie « @requête » par « @Libellé  » ; renvoie le texte et la nouvelle position du curseur. */
export function insertMention(text: string, caret: number, label: string): { text: string; caret: number } {
  const q = mentionQuery(text, caret);
  if (!q) return { text, caret };
  const insert = '@' + cleanLabel(label) + ' ';
  return { text: text.slice(0, q.start) + insert + text.slice(caret), caret: q.start + insert.length };
}

/** À l'envoi : chaque « @Libellé » choisi devient un jeton ; une mention effacée ou modifiée reste du texte. */
export function applyMentions(text: string, picks: Mention[]): string {
  let out = text;
  let from = 0;
  for (const p of picks) {
    const visible = '@' + cleanLabel(p.label);
    const i = out.indexOf(visible, from);
    if (i < 0) continue;
    const token = encodeMention(p);
    out = out.slice(0, i) + token + out.slice(i + visible.length);
    from = i + token.length;
  }
  return out;
}
