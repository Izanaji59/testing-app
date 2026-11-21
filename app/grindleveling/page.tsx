'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { T } from '@/lib/tokens';
import { MobileChrome } from '@/components/hud/MobileChrome';

/**
 * Point d'entrée Grindleveling. Décide où envoyer l'utilisateur :
 *  - session active → /cmd
 *  - sinon → /login
 * (contenu identique à l'ancien app/page.tsx, déplacé ici pour laisser la
 * racine "/" à la landing Slumbywise — voir app/page.tsx)
 */
export default function GrindlevelingEntryPage() {
  const router = useRouter();

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      router.replace(data.session ? '/cmd' : '/login');
    });
  }, [router]);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: T.textDim, padding: 24 }}>
      <MobileChrome />
      {/* Présent dans le HTML statique (référencement) ; la redirection ci-dessus ne change pas. */}
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h1 style={{ margin: 0, fontFamily: T.display, fontSize: 22, fontWeight: 700, letterSpacing: '0.08em', color: T.text, textShadow: `0 0 14px ${T.cyanGlow}` }}>Grindleveling</h1>
        <p style={{ margin: '10px 0 22px', fontSize: 13, lineHeight: 1.6, color: T.textDim }}>
          Un système de progression pour avancer vers n’importe quel objectif, une quête après l’autre : donjons, quêtes, concentration et statistiques.
        </p>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.3em' }}>
          INITIALISATION...
        </div>
        <noscript><p style={{ marginTop: 16, fontSize: 13 }}>Grindleveling a besoin de JavaScript. <a href="/login" style={{ color: T.cyan }}>Se connecter</a></p></noscript>
      </div>
    </main>
  );
}
