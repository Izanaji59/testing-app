'use client';

import { useEffect, useRef, useState } from 'react';
import { MentionComposer } from '@/components/core/MentionComposer';
import { MentionChip } from '@/components/core/MentionChip';
import { CommunityNav } from '@/components/core/CommunityNav';
import { parseMentions } from '@/lib/mentions';
import { useProfile } from '@/hooks/useProfile';
import { useChat } from '@/hooks/useChat';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { PublicProfileModal } from '@/components/core/PublicProfileModal';
import { ChatShareCard } from '@/components/core/ChatShareCard';
import { useChallenges } from '@/hooks/useChallenges';
import { findShareLink } from '@/lib/share';
import { T } from '@/lib/tokens';

export default function ChatPage() {
  const { profile, loading } = useProfile();
  const { messages, send } = useChat();
  const { challenges } = useChallenges();
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  if (!profile) return <ProfileState kind={loading ? 'loading' : 'missing'} />;

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="COMMUNAUTÉ" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CommunityNav />
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
                const link = findShareLink(m.body);
                const text = link ? m.body.replace(link.raw, '').trim() : m.body;
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
                    {text && <div style={{
                      marginTop: 3, padding: '8px 12px', maxWidth: '82%',
                      border: `1px solid ${isMe ? T.lineHot : T.line}`,
                      background: isMe ? 'rgba(78, 205, 255, 0.06)' : 'rgba(255,255,255,0.02)',
                      fontFamily: T.mono, fontSize: 12, color: T.text,
                      lineHeight: 1.5, wordBreak: 'break-word',
                    }}>
                      {parseMentions(text).map((seg, i) => seg.type === 'text' ? <span key={i}>{seg.value}</span> : <MentionChip key={i} mention={seg} />)}
                    </div>}
                    {link && <ChatShareCard link={link} challenges={challenges} />}
                  </div>
                );
              })
            )}
          </div>
        </HudPanel>

        <MentionComposer onSend={send} />

        <DataReadout size={8} color={T.textMute} style={{ display: 'block', textAlign: 'center', marginBottom: 8 }}>
          SALLE COMMUNE · TAPE @ POUR MENTIONNER UN JOUEUR OU UN PERSONNAGE · CLIQUE UN PSEUDO POUR VOIR SON PROFIL
        </DataReadout>
      </div>

      {openProfileId && (
        <PublicProfileModal userId={openProfileId} onClose={() => setOpenProfileId(null)} />
      )}
    </div>
  );
}
