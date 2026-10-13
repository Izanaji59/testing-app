'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PRIORITY_PREFIX, readPriorities, type Priority } from '@/lib/priorities';

export function usePriorities(userId: string | undefined) {
  const [values, setValues] = useState<Record<string, Priority>>({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setValues({}); setReady(false);
    async function load() {
      try {
        const { data, error: authError } = await supabase().auth.getUser();
        if (authError) throw authError;
        if (live && data.user?.id === userId) { setValues(readPriorities(data.user.user_metadata)); setReady(true); setError(''); }
      } catch { if (live) setError('Le classement n’a pas pu être chargé. Réessaie en rechargeant la page.'); }
    }
    if (userId) void load();
    return () => { live = false; };
  }, [userId]);
  async function save(id: string, value: Priority) {
    if (!ready || busy) return;
    setBusy(true); setError('');
    try {
      const { data, error: saveError } = await supabase().auth.updateUser({ data: { [PRIORITY_PREFIX + id]: value } });
      if (saveError) throw saveError;
      if (data.user?.id !== userId) throw new Error('Compte modifié');
      setValues(readPriorities(data.user.user_metadata));
    } catch { setError('Classement non enregistré. Vérifie ta connexion et réessaie.'); }
    finally { setBusy(false); }
  }
  return { values, ready, busy, error, save };
}
