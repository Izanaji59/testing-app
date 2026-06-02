'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { T, EASE } from '@/lib/tokens';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { MobileChrome } from '@/components/hud/MobileChrome';

type Mode = 'login' | 'register' | 'magic';
type Status = 'idle' | 'sending' | 'sent' | 'error';

const inputStyle = {
  background: 'rgba(78, 205, 255, 0.04)',
  border: `1px solid ${T.lineMid}`,
  color: T.text,
  padding: '12px 14px',
  fontFamily: T.mono,
  fontSize: 13,
  letterSpacing: '0.05em',
  outline: 'none',
  width: '100%',
};

const labelStyle = {
  fontFamily: T.mono,
  fontSize: 9,
  color: T.textDim,
  letterSpacing: '0.28em',
};

function submitBtn(disabled: boolean) {
  return {
    marginTop: 8,
    background: T.cyan,
    color: T.bg,
    border: 'none',
    padding: '14px',
    fontFamily: T.mono,
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.28em',
    textTransform: 'uppercase' as const,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    boxShadow: `0 0 14px ${T.cyanGlow}`,
    transition: 'opacity 0.2s ease',
    width: '100%',
  };
}

function tabBtn(active: boolean) {
  return {
    flex: 1,
    padding: '10px 4px',
    fontFamily: T.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    border: `1px solid ${active ? T.cyan : T.lineMid}`,
    background: active ? 'rgba(78, 205, 255, 0.1)' : 'transparent',
    color: active ? T.cyan : T.textDim,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get('error');

  const [mode, setMode] = useState<Mode>('login');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(
    callbackError === 'callback_failed' ? 'Lien expiré ou déjà utilisé. Demande un nouveau lien.' : null,
  );

  function switchMode(m: Mode) {
    setMode(m);
    setStatus('idle');
    setErrorMsg(null);
    setPassword('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg(null);
    try {
      const sb = supabase();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace('/cmd');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg(null);
    try {
      const sb = supabase();
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: pseudo },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/cmd`,
        },
      });
      if (error) throw error;
      if (data.session) {
        router.replace('/cmd');
      } else {
        setStatus('sent');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg(null);
    try {
      const sb = supabase();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/cmd`,
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

        <HudPanel label="AUTH" glow={0.6}>
          <div style={{ padding: '16px 24px 0' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={tabBtn(mode === 'login')} onClick={() => switchMode('login')}>Connexion</button>
              <button style={tabBtn(mode === 'register')} onClick={() => switchMode('register')}>Inscription</button>
              <button style={tabBtn(mode === 'magic')} onClick={() => switchMode('magic')}>Lien mail</button>
            </div>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>EMAIL</label>
              <input
                type="email" required autoFocus autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} placeholder="operator@domain.com"
                disabled={status === 'sending'}
              />
              <label style={labelStyle}>MOT DE PASSE</label>
              <input
                type="password" required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle} placeholder="••••••••"
                disabled={status === 'sending'}
              />
              <button
                type="submit"
                disabled={status === 'sending' || !email || !password}
                style={submitBtn(status === 'sending' || !email || !password)}
              >
                {status === 'sending' ? 'Connexion…' : 'Se connecter'}
              </button>
              {status === 'error' && errorMsg && (
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.danger, letterSpacing: '0.12em' }}>
                  erreur : {errorMsg}
                </div>
              )}
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>PSEUDO</label>
              <input
                type="text" required autoFocus
                value={pseudo} onChange={e => setPseudo(e.target.value)}
                style={inputStyle} placeholder="OperatorX"
                disabled={status === 'sending' || status === 'sent'}
              />
              <label style={labelStyle}>EMAIL</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} placeholder="operator@domain.com"
                disabled={status === 'sending' || status === 'sent'}
              />
              <label style={labelStyle}>MOT DE PASSE</label>
              <input
                type="password" required autoComplete="new-password" minLength={6}
                value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle} placeholder="••••••••  (min. 6 car.)"
                disabled={status === 'sending' || status === 'sent'}
              />
              <button
                type="submit"
                disabled={status === 'sending' || status === 'sent' || !email || !password || !pseudo}
                style={submitBtn(status === 'sending' || status === 'sent' || !email || !password || !pseudo)}
              >
                {status === 'sending' ? 'Création…' : status === 'sent' ? 'Compte créé ✓' : 'Créer mon compte'}
              </button>
              {status === 'sent' && (
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.green, letterSpacing: '0.18em' }}>
                  → vérifie ta boîte mail pour confirmer ton compte.
                </div>
              )}
              {status === 'error' && errorMsg && (
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.danger, letterSpacing: '0.12em' }}>
                  erreur : {errorMsg}
                </div>
              )}
            </form>
          )}

          {mode === 'magic' && (
            <form onSubmit={handleMagicLink} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>EMAIL</label>
              <input
                type="email" required autoFocus autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} placeholder="operator@domain.com"
                disabled={status === 'sending' || status === 'sent'}
              />
              <button
                type="submit"
                disabled={status === 'sending' || status === 'sent' || !email}
                style={submitBtn(status === 'sending' || status === 'sent' || !email)}
              >
                {status === 'sending' ? 'Envoi…' : status === 'sent' ? 'Lien envoyé ✓' : 'Envoyer le lien'}
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
          )}
        </HudPanel>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.24em' }}>
          SYSTÈME SÉCURISÉ · ACCÈS OPÉRATEUR UNIQUEMENT
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
