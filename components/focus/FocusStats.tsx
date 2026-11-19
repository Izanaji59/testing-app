'use client';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { HudPanel } from '@/components/hud/HudPanel';
import { T } from '@/lib/tokens';
import { clockText } from '@/lib/focus';

export function FocusStats() {
  const { data, error, mutate, isValidating } = useSWR('focus-stats', async () => {
    const sb = supabase();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return { sessions: [], completed: 0 };
    const since = new Date(); since.setDate(since.getDate() - 6); since.setHours(0,0,0,0);
    const until = new Date().toISOString();
    const [sessions, quests] = await Promise.all([
      sb.from('sessions').select('focus_seconds').eq('user_id',auth.user.id).gte('ended_at',since.toISOString()).lte('ended_at',until).not('focus_seconds','is',null),
      sb.from('quests').select('id', { count: 'exact', head: true }).eq('user_id',auth.user.id).eq('status','COMPLETED').gte('completed_at',since.toISOString()).lte('completed_at',until),
    ]);
    if (sessions.error) throw sessions.error;
    if (quests.error) throw quests.error;
    if (quests.count === null) throw new Error('Le nombre de quêtes validées est indisponible.');
    return { sessions: sessions.data ?? [], completed: quests.count };
  }, { refreshInterval: 30_000 });
  const seconds = (data?.sessions ?? []).reduce((total,s) => total + (s.focus_seconds ?? 0),0);
  return <HudPanel label="CONCENTRATION SUR LES QUÊTES" thin>
    <div style={{ padding:16 }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,margin:'0 0 12px' }}>
        <p style={{ margin:0,fontSize:13 }}>Ces 7 derniers jours</p>
        <button type="button" onClick={() => void mutate()} disabled={isValidating} style={{ background:'transparent',color:T.cyan,border:`1px solid ${T.lineMid}`,padding:'8px 12px',minHeight:44,fontFamily:T.mono,fontSize:9,letterSpacing:'0.18em',cursor:'pointer' }}>
          {isValidating ? 'RAFRAÎCHISSEMENT…' : 'RAFRAÎCHIR'}
        </button>
      </div>
      {error ? <p role="alert">Les statistiques de concentration sont indisponibles.</p> : !data ? <p>Chargement…</p> : <>
        <strong style={{fontSize:24}}>{Math.floor(seconds / 3600)} h {Math.floor(seconds % 3600 / 60)} min</strong>
        <p>{data.sessions.length} session{data.sessions.length > 1 ? 's' : ''} de concentration enregistrée{data.sessions.length > 1 ? 's' : ''}</p>
        <p><strong>{data.completed} quête{data.completed > 1 ? 's' : ''} validée{data.completed > 1 ? 's' : ''}</strong> sur ces 7 jours, avec ou sans minuteur.</p>
        <p style={{fontSize:12,opacity:.8}}>Temps travaillé : {clockText(seconds * 1000)}. Les pauses et les distractions sont exclues. Les récompenses viennent des quêtes accomplies.</p>
      </>}
    </div>
  </HudPanel>;
}
