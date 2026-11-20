'use client';

// Zone de saisie du tchat avec @mentions : « @ » propose des pseudos (serveur) et des personnages (catalogue).

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { T } from '@/lib/tokens';
import { applyMentions, insertMention, mentionQuery, type Mention } from '@/lib/mentions';
import { useCharacters } from '@/components/characters/useCharacters';

type Suggestion = Mention & { hint: string };
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function MentionComposer({ onSend }: { onSend: (text: string) => Promise<void> }) {
  const [draft, setDraft] = useState('');
  const [picks, setPicks] = useState<Mention[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const caretAfter = useRef<number | null>(null);
  const { characters } = useCharacters();

  // Pseudos : recherche serveur (préfixe), légèrement différée.
  useEffect(() => {
    if (query === null || query.length < 1) { setProfiles([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await supabase().rpc('search_mention_profiles', { p_query: query });
      if (!cancelled) setProfiles(((data ?? []) as { user_id: string; display_name: string }[]).map(p => ({ kind: 'u', id: p.user_id, label: p.display_name, hint: 'profil' })));
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (query === null || query.length < 1) return [];
    const q = normalize(query);
    const chars = query.length < 2 ? [] : characters
      .filter(c => normalize(c.name).startsWith(q) || normalize(c.name).includes(' ' + q))
      .slice(0, 5)
      .map(c => ({ kind: 'c' as const, id: c.id, label: c.name, hint: c.title }));
    return [...profiles.slice(0, 5), ...chars];
  }, [query, profiles, characters]);
  const open = suggestions.length > 0;

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    if (caretAfter.current !== null && input.current) {
      input.current.setSelectionRange(caretAfter.current, caretAfter.current);
      caretAfter.current = null;
    }
  });

  function update(value: string, caret: number) {
    setDraft(value);
    setQuery(mentionQuery(value, caret)?.query ?? null);
  }

  function pick(s: Suggestion) {
    const caret = input.current?.selectionStart ?? draft.length;
    const next = insertMention(draft, caret, s.label);
    setDraft(next.text);
    setPicks(p => [...p, { kind: s.kind, id: s.id, label: s.label }]);
    setQuery(null);
    caretAfter.current = next.caret;
    input.current?.focus();
  }

  async function send() {
    const text = applyMentions(draft.trim(), picks);
    if (!text || sending) return;
    if (text.length > 500) { setError('Message trop long une fois les mentions ajoutées : raccourcis-le un peu.'); return; }
    setSending(true); setError('');
    try {
      await onSend(text);
      setDraft(''); setPicks([]); setQuery(null);
    } catch {
      setError('Le message n’a pas pu être envoyé. Réessaie.');
    } finally { setSending(false); }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % suggestions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(suggestions[active]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setQuery(null); return; }
    }
    if (e.key === 'Enter') { e.preventDefault(); void send(); }
  }

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      {open && (
        <ul id="mention-list" role="listbox" aria-label="Mentionner" style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20, listStyle: 'none', margin: 0, padding: 4,
          background: '#070d18', border: `1px solid ${T.lineHot}`, boxShadow: `0 0 16px ${T.cyanGlow}`, maxHeight: 280, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <li key={s.kind + s.id} id={`mention-${i}`} role="option" aria-selected={i === active}
              onPointerDown={e => { e.preventDefault(); pick(s); }} onMouseEnter={() => setActive(i)}
              style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', minHeight: 44, cursor: 'pointer', background: i === active ? 'rgba(78,205,255,0.1)' : 'transparent' }}>
              <span aria-hidden="true" style={{ color: s.kind === 'u' ? T.cyan : T.amber, fontFamily: T.mono, width: 16 }}>{s.kind === 'u' ? '◉' : '◈'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: T.mono, fontSize: 12, color: T.text }}>@{s.label}</span>
                <span style={{ display: 'block', fontSize: 11, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.kind === 'u' ? 'Profil' : `Personnage · ${s.hint}`}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          ref={input}
          role="combobox"
          aria-expanded={open}
          aria-controls="mention-list"
          aria-activedescendant={open ? `mention-${active}` : undefined}
          aria-label="Message (tape @ pour mentionner un joueur ou un personnage)"
          value={draft}
          onChange={e => update(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setQuery(null), 150)}
          maxLength={500}
          placeholder="Message… tape @ pour mentionner"
          style={{
            flex: 1, minWidth: 0, background: 'rgba(78, 205, 255, 0.04)', border: `1px solid ${T.lineMid}`,
            color: T.text, padding: '12px 14px', fontFamily: T.mono, fontSize: 13, outline: 'none', minHeight: 44,
          }}
        />
        <button onClick={() => void send()} disabled={sending || !draft.trim()} style={{
          background: T.cyan, color: T.bg, border: 'none', padding: '0 18px', minHeight: 44,
          fontFamily: T.mono, fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer',
          opacity: !draft.trim() ? 0.5 : 1, boxShadow: `0 0 10px ${T.cyanGlow}`,
        }}>
          {sending ? '…' : 'ENVOYER'}
        </button>
      </div>
      {error && <p role="alert" style={{ margin: '8px 0 0', fontSize: 12, color: T.danger }}>{error}</p>}
    </div>
  );
}
