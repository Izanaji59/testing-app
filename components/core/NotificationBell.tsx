'use client';

// Cloche de Grindleveling : mentions, inscriptions, événements modifiés ou annulés, rappels.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { T } from '@/lib/tokens';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

const ICONS: Record<Notification['kind'], { icon: string; color: string }> = {
  mention: { icon: '@', color: T.cyan },
  inscription: { icon: '✚', color: T.green },
  evenement_modifie: { icon: '↻', color: T.amber },
  evenement_annule: { icon: '✕', color: T.danger },
  rappel: { icon: '◷', color: T.amber },
};

function ago(iso: string, kind: Notification['kind']) {
  if (kind === 'rappel') return 'bientôt';
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function NotificationBell({ userId }: { userId: string | null }) {
  const router = useRouter();
  const { items, unread, markRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); };
  }, [open]);

  if (!userId) return null;

  function go(n: Notification) {
    void markRead([n.id]);
    setOpen(false);
    router.push(n.link);
  }

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <button ref={button} type="button" aria-label={unread ? `Notifications : ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'} aria-expanded={open} aria-haspopup="dialog"
        onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', width: 44, height: 44, display: 'grid', placeItems: 'center', background: 'transparent', border: `1px solid ${open ? T.cyan : T.line}`, cursor: 'pointer', color: unread ? T.cyan : T.textDim }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {unread > 0 && <span aria-hidden="true" style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: T.cyan, color: T.bg, fontFamily: T.mono, fontSize: 9, fontWeight: 700, lineHeight: '16px', boxShadow: `0 0 8px ${T.cyanGlow}` }}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 60, width: 'min(340px, calc(100vw - 32px))', maxHeight: '60vh', overflowY: 'auto',
          background: '#070d18', border: `1px solid ${T.lineHot}`, boxShadow: `0 0 18px ${T.cyanGlow}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${T.line}` }}>
            <span style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.22em', color: T.cyan }}>NOTIFICATIONS</span>
            {unread > 0 && <button type="button" onClick={() => void markRead()} style={{ background: 'none', border: 'none', color: T.textDim, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', cursor: 'pointer', minHeight: 36 }}>TOUT MARQUER LU</button>}
          </div>
          {items.length === 0
            ? <p style={{ margin: 0, padding: 18, fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>Rien de nouveau. Tu seras prévenu quand on te mentionne, qu’un membre s’inscrit à ton événement ou qu’un événement change.</p>
            : <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map(n => {
                const meta = ICONS[n.kind];
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => go(n)} style={{
                      display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '10px 12px', minHeight: 56, cursor: 'pointer',
                      background: n.read_at ? 'transparent' : 'rgba(78,205,255,0.06)', border: 'none', borderBottom: `1px solid ${T.line}`, color: T.text,
                    }}>
                      <span aria-hidden="true" style={{ flex: '0 0 22px', fontFamily: T.mono, fontSize: 14, color: meta.color, textAlign: 'center' }}>{meta.icon}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: n.read_at ? 400 : 600, overflowWrap: 'anywhere' }}>{n.title}</span>
                        {n.body && <span style={{ display: 'block', fontSize: 12, color: T.textDim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</span>}
                        <span style={{ display: 'block', fontFamily: T.mono, fontSize: 9, color: T.textMute, marginTop: 4, letterSpacing: '0.1em' }}>{ago(n.created_at, n.kind)}</span>
                      </span>
                      {!n.read_at && <span aria-label="non lue" style={{ flex: '0 0 8px', width: 8, height: 8, borderRadius: 4, background: T.cyan, marginTop: 6 }} />}
                    </button>
                  </li>
                );
              })}
            </ul>}
        </div>
      )}
    </div>
  );
}
