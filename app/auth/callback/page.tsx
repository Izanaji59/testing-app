'use client';

/**
 * Callback Magic Link Supabase — version client-side (PKCE).
 *
 * Pourquoi client-side et non route.ts :
 * L'app utilise `output: 'export'` (static export Netlify).
 * Les route handlers Next.js qui utilisent cookies/headers
 * ne sont pas compatibles avec ce mode.
 * createBrowserClient gère le PKCE et persiste la session
 * automatiquement dans les cookies du navigateur.
 *
 * URL (avec basePath /game) : http://localhost:3000/game/auth/callback
 * Params attendus : ?code=XXXX&next=/game
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { T } from '@/lib/tokens';
import { MobileChrome } from '@/components/hud/MobileChrome';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState('AUTHENTIFICATION...');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const sb = supabase();
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/cmd';

    async function run() {
      try {
        // Étape 1 : échange PKCE (code → session)
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Étape 2 : vérifie que la session est bien établie
        const { data, error: sessionErr } = await sb.auth.getSession();
        if (sessionErr || !data.session) {
          throw new Error(sessionErr?.message ?? 'Session introuvable après échange');
        }

        setMsg('OPÉRATEUR RECONNU · ENTRÉE...');

        // Étape 3 : bootstrap profil si premier login
        await ensureProfile(sb, data.session.user.id);

        // Étape 4 : redirection
        setTimeout(() => router.replace(next), 500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setIsError(true);
        setMsg(`ÉCHEC : ${msg}`);
        setTimeout(() => router.replace('/login'), 2500);
      }
    }

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', position: 'relative' }}>
      <MobileChrome />
      <div
        style={{
          fontFamily: T.mono,
          fontSize: 11,
          color: isError ? T.danger : T.cyan,
          letterSpacing: '0.32em',
          textShadow: `0 0 8px ${isError ? 'rgba(255,80,80,0.35)' : T.cyanGlow}`,
          maxWidth: 360,
          textAlign: 'center',
          lineHeight: 1.9,
          padding: '0 20px',
        }}
      >
        {msg}
        {isError && (
          <div style={{ marginTop: 14, fontSize: 9, color: T.textDim, letterSpacing: '0.18em' }}>
            REDIRECTION VERS /LOGIN...
          </div>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#4ECFFF',
              letterSpacing: '0.32em',
            }}
          >
            AUTHENTIFICATION...
          </div>
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

async function ensureProfile(sb: ReturnType<typeof supabase>, userId: string) {
  const { data } = await sb
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (data) return;
  await sb.from('profiles').insert({ user_id: userId });
}
