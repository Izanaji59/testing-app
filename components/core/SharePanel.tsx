'use client';

// Panneau de partage d'une quête ou d'un défi : tchat, lien à copier, partage natif (téléphone).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sendChatMessage } from '@/hooks/useChat';
import { shareMessage } from '@/lib/share';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';

type Props = {
  /** Ex. « ⚔ Quête partagée » */
  prefix: string;
  /** Titre ou résumé, retiré du message s'il est trop long pour le tchat. */
  detail: string;
  /** Chemin interne, ex. /defis/?defi=… */
  path: string;
  onClose: () => void;
};

export function SharePanel({ prefix, detail, path, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'' | 'sent' | 'copied'>('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(`${location.origin}${path}`);
    setCanShare(typeof navigator.share === 'function');
  }, [path]);

  const message = url ? shareMessage(prefix, detail, url) : null;

  async function toChat() {
    if (!message || busy) return;
    setBusy(true); setError(''); setStatus('');
    try { await sendChatMessage(message); setStatus('sent'); }
    catch { setError('Le message n’a pas pu être envoyé. Réessaie.'); }
    finally { setBusy(false); }
  }

  async function copy() {
    setError(''); setStatus('');
    try { await navigator.clipboard.writeText(url); setStatus('copied'); }
    catch { setError('Copie impossible : sélectionne le lien ci-dessous.'); }
  }

  async function nativeShare() {
    try { await navigator.share({ title: detail, text: `${prefix} : ${detail}`, url }); }
    catch { /* partage annulé */ }
  }

  return (
    <div role="group" aria-label="Partager" style={{ marginTop: 10, padding: 12, border: `1px solid ${T.lineMid}`, background: 'rgba(78,205,255,0.04)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <DataReadout size={9} color={T.cyan}>⇪ PARTAGER</DataReadout>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => void toChat()} disabled={!message || busy || status === 'sent'} style={btn(true)}>
          {busy ? '…' : status === 'sent' ? '✓ ENVOYÉ' : 'DANS LE TCHAT'}
        </button>
        <button type="button" onClick={() => void copy()} disabled={!url} style={btn(false)}>{status === 'copied' ? '✓ LIEN COPIÉ' : 'COPIER LE LIEN'}</button>
        {canShare && <button type="button" onClick={() => void nativeShare()} disabled={!url} style={btn(false)}>AUTRE APPLI…</button>}
        <button type="button" onClick={onClose} style={{ ...btn(false), color: T.textDim, borderColor: T.line }}>FERMER</button>
      </div>
      <label style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.16em' }}>
        LIEN
        <input readOnly value={url} onFocus={e => e.currentTarget.select()} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4, background: 'rgba(0,0,0,0.25)', border: `1px solid ${T.line}`, color: T.textDim, padding: '8px 10px', fontFamily: T.mono, fontSize: 11 }} />
      </label>
      {status === 'sent' && <p role="status" style={{ margin: 0, fontSize: 12, color: T.green }}>Envoyé dans la salle des opérateurs. <Link href="/chat" style={{ color: T.cyan }}>Voir le tchat</Link></p>}
      {status === 'copied' && <p role="status" style={{ margin: 0, fontSize: 12, color: T.green }}>Lien copié : colle-le où tu veux.</p>}
      {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>{error}</p>}
    </div>
  );
}

const btn = (primary: boolean): React.CSSProperties => ({
  background: primary ? T.cyan : 'transparent', color: primary ? T.bg : T.cyan,
  border: `1px solid ${primary ? T.cyan : T.lineMid}`, padding: '8px 12px', minHeight: 40,
  fontFamily: T.mono, fontSize: 9, fontWeight: primary ? 700 : 400, letterSpacing: '0.18em', cursor: 'pointer',
});
