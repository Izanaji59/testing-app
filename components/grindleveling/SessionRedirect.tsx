'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/** Un joueur déjà connecté passe directement à son Commandement ; les autres restent sur l'accueil. */
export function SessionRedirect() {
  const router = useRouter();
  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/cmd');
    });
  }, [router]);
  return null;
}
