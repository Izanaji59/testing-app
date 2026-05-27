'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { T } from '@/lib/tokens';
import { MobileChrome } from '@/components/hud/MobileChrome';

/**
 * Page racine. Décide où envoyer l'utilisateur :
 *  - session active → /cmd
 *  - sinon → /login
 */
export default function RootPage() {
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
