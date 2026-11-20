'use client';

// @mention dans le tchat : une puce cliquable qui ouvre la « structure » du profil ou du personnage,
// comme une struct en C : un nom, des champs typés. Les données viennent du serveur (visibilité respectée).

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { T } from '@/lib/tokens';
import { fmtRank } from '@/lib/utils';
import { mbtiFromClassLabel } from '@/lib/engine/rankTitles';
import { characterHref } from '@/lib/characters';
import { useCharacters } from '@/components/characters/useCharacters';
import { useFictionCommunity } from '@/components/characters/useFictionCommunity';
import type { Mention } from '@/lib/mentions';
import type { PublicProfile } from '@/lib/types';

type Field = { name: string; value: string | null; type: string };
const HIDDEN = 'masqué';

type CardProps = { title: string; kind: string; fields: Field[] | null; link: { href: string; label: string } | null; onClose: () => void; anchor: React.RefObject<HTMLElement> };

function StructCard({ title, kind, fields, link, onClose, anchor }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); anchor.current?.focus(); } };
    // Un clic sur la puce elle-même la referme via son propre bouton.
    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !anchor.current?.contains(target)) onClose();
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, [onClose]);
  const width = Math.max(...(fields ?? []).map(f => f.name.length), 6);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-label={`Fiche de ${title}`} style={{
      // Fixe et centrée : jamais coupée par la liste des messages qui défile.
      position: 'fixed', zIndex: 80, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(320px, calc(100vw - 32px))',
      background: '#070d18', border: `1px solid ${T.lineHot}`, boxShadow: `0 0 18px ${T.cyanGlow}`, padding: 12,
      fontFamily: T.mono, fontSize: 12, color: T.text, textAlign: 'left', outline: 'none',
    }}>
      <div style={{ color: T.textDim, fontSize: 10, letterSpacing: '0.16em', marginBottom: 6 }}>STRUCT {kind}</div>
      <div style={{ color: T.cyan, marginBottom: 6, overflowWrap: 'anywhere' }}>@{title} {'{'}</div>
      {!fields && <div style={{ paddingLeft: 14, color: T.textDim }}>chargement…</div>}
      {fields?.map(f => (
        <div key={f.name} style={{ paddingLeft: 14, display: 'flex', gap: 6, flexWrap: 'wrap', lineHeight: 1.7 }}>
          <span style={{ color: T.textDim, whiteSpace: 'pre' }}>{f.name.padEnd(width)} :</span>
          <span style={{ color: f.value === HIDDEN ? T.textMute : T.text, fontStyle: f.value === HIDDEN ? 'italic' : 'normal', overflowWrap: 'anywhere' }}>{f.value ?? '—'}</span>
          <span style={{ color: T.textMute, fontSize: 10 }}>{f.type}</span>
        </div>
      ))}
      <div style={{ color: T.cyan, marginTop: 4 }}>{'}'}</div>
      {link && <Link href={link.href} style={{ display: 'inline-block', marginTop: 10, color: T.cyan, fontSize: 11 }}>{link.label} →</Link>}
    </div>
  );
}

function ProfileStruct({ mention, onClose, anchor }: { mention: Mention; onClose: () => void; anchor: React.RefObject<HTMLElement> }) {
  const { data } = useSWR(['mention-profile', mention.id], async () => {
    const sb = supabase();
    const [p, f] = await Promise.all([
      sb.rpc('get_public_profile', { target_user: mention.id }),
      sb.rpc('get_fiction_profile', { p_user: mention.id }),
    ]);
    const profile = (p.data as PublicProfile[] | null)?.[0] ?? null;
    const fiction = f.data as { visible: boolean; favoriteCount?: number } | null;
    return { profile, fiction };
  });
  const p = data?.profile;
  const fields: Field[] | null = !data ? null : !p ? [{ name: 'erreur', value: 'profil introuvable', type: '' }] : [
    { name: 'pseudo', value: `"${p.display_name || p.operator_code}"`, type: 'texte' },
    { name: 'mbti', value: p.mbti_class ? mbtiFromClassLabel(p.mbti_class) ?? p.mbti_class : HIDDEN, type: '4 lettres' },
    { name: 'rang', value: p.rank_letter ? fmtRank(p.rank_letter, p.rank_tier ?? 'NEUTRAL') : HIDDEN, type: 'E → S' },
    { name: 'niveau', value: p.level !== null ? String(p.level) : HIDDEN, type: 'entier' },
    { name: 'favoris', value: data.fiction?.visible ? String(data.fiction.favoriteCount ?? 0) : HIDDEN, type: 'entier' },
  ];
  return <StructCard title={p ? (p.display_name || p.operator_code) : mention.label} kind="PROFIL" fields={fields} link={p ? { href: `/member/?id=${mention.id}`, label: 'Voir le profil' } : null} onClose={onClose} anchor={anchor} />;
}

function CharacterStruct({ mention, onClose, anchor }: { mention: Mention; onClose: () => void; anchor: React.RefObject<HTMLElement> }) {
  const { characters, loading } = useCharacters();
  const community = useFictionCommunity();
  const ch = characters.find(c => c.id === mention.id);
  const votes = community.data?.votes[mention.id];
  const enn = community.data?.enneagrams?.[mention.id];
  const fields: Field[] | null = loading ? null : !ch ? [{ name: 'erreur', value: 'personnage introuvable', type: '' }] : [
    { name: 'nom', value: `"${ch.name}"`, type: 'texte' },
    { name: 'oeuvre', value: `"${ch.title}"`, type: 'texte' },
    { name: 'mbti', value: ch.typing?.mbti ?? 'non typé', type: '4 lettres' },
    { name: 'votes', value: String(votes?.total ?? 0), type: 'entier' },
    { name: 'enneagramme', value: enn?.leader ?? ch.typing?.enneagram ?? '—', type: 'type + aile' },
    { name: 'favoris', value: String(community.data?.favorites?.[mention.id] ?? 0), type: 'entier' },
  ];
  return <StructCard title={ch?.name ?? mention.label} kind="PERSONNAGE" fields={fields} link={ch ? { href: characterHref(ch.id), label: 'Ouvrir la fiche' } : null} onClose={onClose} anchor={anchor} />;
}

export function MentionChip({ mention }: { mention: Mention }) {
  const [open, setOpen] = useState(false);
  const chip = useRef<HTMLButtonElement>(null);
  const color = mention.kind === 'u' ? T.cyan : T.amber;
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button ref={chip} type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(o => !o)} style={{
        background: `${color}14`, border: `1px solid ${color}66`, color, padding: '0 6px', margin: '0 1px',
        font: 'inherit', cursor: 'pointer', borderRadius: 3, lineHeight: 1.6,
      }} title={mention.kind === 'u' ? 'Profil' : 'Personnage'}>
        @{mention.label}
      </button>
      {/* Rendue au niveau de la page : jamais coupée ni décalée par les panneaux 3D ou la liste qui défile. */}
      {open && createPortal(mention.kind === 'u'
        ? <ProfileStruct mention={mention} onClose={close} anchor={chip} />
        : <CharacterStruct mention={mention} onClose={close} anchor={chip} />, document.body)}
    </>
  );
}
