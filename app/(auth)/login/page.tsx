'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { T, EASE } from '@/lib/tokens';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { MobileChrome } from '@/components/hud/MobileChrome';

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(
    callbackError === 'callback_failed' ? 'Lien expiré ou déjà utilisé. Demande un nouveau lien.' : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('sending');
    setErrorMsg(null);
    try {
      const sb = supabase();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          // window.location.origin = http://localhost:3000 (pas de basePath dans l'origine)
          // Le basePath /game doit être inclus explicitement dans le chemin.
          emailRedirectTo: `${window.location.origin}/game/auth/callback?next=/game`,
        },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  return (
    <main style={{ minHeight: '100vh', position: 'relative', display: 'grid', placeItems: 'center', padding: 20 }}>
      <MobileChrome />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE.outExpo }}
        style={{ width: '100%', maxWidth: 380 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <DataReadout color={T.cyan} size={9} letterSpacing="0.4em">LATRACTION · LV</DataReadout>
          <div
            style={{
              marginTop: 10,
              fontFamily: T.display,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: T.text,
              textShadow: `0 0 18px ${T.cyanGlow}`,
            }}
          >
            ACCÈS OPÉRATEUR
          </div>
          <DataReadout size={9}>· système prêt ·</DataReadout>
        </div>

        <HudPanel label="AUTH · MAGIC LINK" glow={0.6}>
          <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ fontFamily: T.mono, fontSize: 9, color: T.textDim, letterSpacing: '0.28em' }}>
              EMAIL
            </label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@domain.com"
              disabled={status === 'sending' || status === 'sent'}
              style={{
                background: 'rgba(78, 205, 255, 0.04)',
                border: `1px solid ${T.lineMid}`,
                color: T.text,
                padding: '12px 14px',
                fontFamily: T.mono,
                fontSize: 13,
                letterSpacing: '0.05em',
                outline: 'none',
                width: '100%',
              }}
            />
            <button
              type="submit"
              disabled={status === 'sending' || status === 'sent' || !email}
              style={{
                marginTop: 8,
                background: T.cyan,
                color: T.bg,
                border: 'none',
                padding: '14px',
                fontFamily: T.mono,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                cursor: status === 'sending' ? 'wait' : 'pointer',
                opacity: status === 'sending' || !email ? 0.5 : 1,
                boxShadow: `0 0 14px ${T.cyanGlow}`,
                transition: 'opacity 0.2s ease',
              }}
            >
              {status === 'sending' ? 'Envoi…' : status === 'sent' ? 'Lien envoyé' : 'Envoyer le lien'}
            </button>

            {status === 'sent' && (
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.green, letterSpacing: '0.18em' }}>
                → vérifie ta boîte mail. clique le lien pour entrer.
              </div>
            )}
            {status === 'error' && errorMsg && (
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.danger, letterSpacing: '0.12em' }}>
                erreur : {errorMsg}
              </div>
            )}
          </form>
        </HudPanel>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.24em' }}>
          AUCUN MOT DE PASSE · LIEN UNIQUE PAR EMAIL
        </div>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ fontFamily: 'monospace', color: '#4ECFFF', letterSpacing: '0.3em', fontSize: 11 }}>
          CHARGEMENT...
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
