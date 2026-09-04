'use client';

import { useEffect, useRef, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useChat } from '@/hooks/useChat';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { PublicProfileModal } from '@/components/core/PublicProfileModal';
import { T } from '@/lib/tokens';

export default function ChatPage() {
  const { profile, loading } = useProfile();
  const { messages, send } = useChat();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  if (!profile) return <ProfileState kind={loading ? 'loading' : 'missing'} />;

  async function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await send(text);
      setDraft('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="SALLE OPÉRATEURS" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <HudPanel thin glow={0.15}>
          <div
            ref={listRef}
            style={{
              padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
              maxHeight: '58vh', overflowY: 'auto',
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.2em' }}>
                AUCUN MESSAGE. SOIS LE PREMIER.
              </div>
            ) : (
              messages.map(m => {
                const isMe = m.user_id === profile.user_id;
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <button
                      onClick={() => setOpenProfileId(m.user_id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
                        color: isMe ? T.cyan : T.textDim,
                      }}
                    >
                      {isMe ? 'TOI' : m.sender_name}
                    </button>
                    <div style={{
                      marginTop: 3, padding: '8px 12px', maxWidth: '82%',
                      border: `1px solid ${isMe ? T.lineHot : T.line}`,
                      background: isMe ? 'rgba(78, 205, 255, 0.06)' : 'rgba(255,255,255,0.02)',
                      fontFamily: T.mono, fontSize: 12, color: T.text,
                      lineHeight: 1.5, wordBreak: 'break-word',
                    }}>
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </HudPanel>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            maxLength={500}
            placeholder="Message…"
            style={{
              flex: 1,
              background: 'rgba(78, 205, 255, 0.04)',
              border: `1px solid ${T.lineMid}`,
              color: T.text, padding: '12px 14px',
              fontFamily: T.mono, fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onClick={submit}
            disabled={sending || !draft.trim()}
            style={{
              background: T.cyan, color: T.bg, border: 'none',
              padding: '0 18px',
              fontFamily: T.mono, fontWeight: 700, fontSize: 11, letterSpacing: '0.2em',
              cursor: 'pointer',
              opacity: !draft.trim() ? 0.5 : 1,
              boxShadow: `0 0 10px ${T.cyanGlow}`,
            }}
          >
            ENVOYER
          </button>
        </div>

        <DataReadout size={8} color={T.textMute} style={{ display: 'block', textAlign: 'center', marginBottom: 8 }}>
          SALLE UNIQUE · TOUS LES OPÉRATEURS · CLIQUE UN PSEUDO POUR VOIR SON PROFIL
        </DataReadout>
      </div>

      {openProfileId && (
        <PublicProfileModal userId={openProfileId} onClose={() => setOpenProfileId(null)} />
      )}
    </div>
  );
}
