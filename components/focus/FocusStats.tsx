'use client';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { HudPanel } from '@/components/hud/HudPanel';
import { clockText } from '@/lib/focus';

export function FocusStats() {
  const { data, error } = useSWR('focus-stats', async () => {
    const sb = supabase();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return [];
    const since = new Date(); since.setDate(since.getDate() - 6); since.setHours(0,0,0,0);
    const result = await sb.from('sessions').select('focus_seconds,quest_completed').eq('user_id',auth.user.id).gte('ended_at',since.toISOString()).not('focus_seconds','is',null);
    if (result.error) throw result.error;
    return result.data ?? [];
  }, { refreshInterval: 30_000 });
  const seconds = (data ?? []).reduce((total,s) => total + (s.focus_seconds ?? 0),0);
  return <HudPanel label="CONCENTRATION SUR LES QUÊTES" thin>
    <div style={{ padding:16 }}>
      <p style={{ margin:'0 0 12px',fontSize:13 }}>Ces 7 derniers jours</p>
      {error ? <p role="alert">Les statistiques de concentration sont indisponibles.</p> : !data ? <p>Chargement…</p> : <>
        <strong style={{fontSize:24}}>{Math.floor(seconds / 3600)} h {Math.floor(seconds % 3600 / 60)} min</strong>
        <p>{data.length} session{data.length > 1 ? 's' : ''} enregistrée{data.length > 1 ? 's' : ''} / {data.filter(s => s.quest_completed).length} quête(s) validée(s) au bilan</p>
        <p style={{fontSize:12,opacity:.8}}>Temps travaillé : {clockText(seconds * 1000)}. Les pauses et les distractions sont exclues. Les récompenses viennent des quêtes accomplies.</p>
      </>}
    </div>
  </HudPanel>;
}
