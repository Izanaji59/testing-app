'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { MobileChrome } from '@/components/hud/MobileChrome';
import { TabBar } from '@/components/shell/TabBar';
import { XpToaster } from '@/components/shell/XpToaster';
import { T } from '@/lib/tokens';

/**
 * Shell des écrans authentifiés.
 * - Garde-fou auth (redirect /login si pas de session)
 * - Tab bar fixée
 * - Toaster XP global (écoute le stream realtime et affiche les bursts)
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setUserId(data.session.user.id);
      setReady(true);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ready) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', position: 'relative' }}>
        <MobileChrome />
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.28em' }}>
          CHARGEMENT...
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', position: 'relative' }}>
      <MobileChrome />
      <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 110, position: 'relative' }}>
        {children}
      </div>
      <TabBar />
      {userId && <XpToaster userId={userId} />}
    </main>
  );
}
