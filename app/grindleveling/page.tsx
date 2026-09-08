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
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: T.textDim }}>
      <MobileChrome />
      <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.3em' }}>
        INITIALISATION...
      </div>
    </main>
  );
}
