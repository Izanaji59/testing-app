'use client';

// Vote rapide d'un personnage : 4 axes MBTI, ennéagramme (type + aile), argument, résultats, marathon.
// Le serveur valide tout (cast_fiction_vote, 0027) ; aucune XP n'est donnée pour voter.

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { AXES, EMPTY_AXES, axesFromType, axesWithKey, consensusOf, joinEnneagram, share, splitEnneagram, typeFromAxes, wingsOf, type AxisPicks } from '@/lib/engine/fictionVote';
import { useFictionCommunity } from './useFictionCommunity';
import s from './characters.module.css';

type Reason = { display_name: string; mbti: string | null; enneagram: string | null; reason: string; updated_at: string; is_me: boolean };
const MARATHON_KEY = 'fiction-marathon';
const ENNEAGRAM_LABELS: Record<number, string> = { 1: 'Perfectionniste', 2: 'Altruiste', 3: 'Battant', 4: 'Individualiste', 5: 'Observateur', 6: 'Loyal', 7: 'Épicurien', 8: 'Meneur', 9: 'Médiateur' };

function message(error: unknown) {
  const text = (error as { message?: string })?.message ?? '';
  if (/^(Choisis|Argument|Trop de votes|Personnage introuvable|Connecte-toi)/.test(text)) return text + '.';
  return 'Le vote n’a pas abouti. Tes choix sont conservés, tu peux réessayer.';
}

export function CharacterVote({ characterId, nextId, onNext }: { characterId: string; nextId?: string | null; onNext?: (id: string) => void }) {
  const community = useFictionCommunity();
  const data = community.data;
  const summary = data?.votes[characterId];
  const ennSummary = data?.enneagrams?.[characterId];
  const mineType = data?.myVotes[characterId] ?? '';
  const mineEnn = data?.myEnneagrams?.[characterId] ?? '';
  const mineReason = data?.myReasons?.[characterId] ?? '';
  const voted = !!(mineType || mineEnn);
  const canVote = !!community.user && community.available;

  const [axes, setAxes] = useState<AxisPicks>([...EMPTY_AXES]);
  const [core, setCore] = useState<number | null>(null);
  const [wing, setWing] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [marathon, setMarathon] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => { try { setMarathon(localStorage.getItem(MARATHON_KEY) === '1'); } catch {} }, []);
  // Reprend le vote enregistré quand on change de personnage ou quand il arrive du serveur.
  useEffect(() => {
    setAxes(axesFromType(mineType));
    const e = splitEnneagram(mineEnn); setCore(e.core); setWing(e.wing);
    setReason(mineReason);
  }, [characterId, mineType, mineEnn, mineReason]);
  useEffect(() => { setError(''); setSuccess(''); }, [characterId]);

  const type = typeFromAxes(axes);
  const enneagram = joinEnneagram(core, wing);
  const dirty = (type ?? '') !== mineType || (enneagram ?? '') !== mineEnn || reason.trim() !== mineReason;
  const ready = !!(type || enneagram) && dirty;

  const reasons = useSWR<Reason[]>(community.user && community.available ? ['fiction-reasons', characterId] : null, async () => {
    const { data: rows, error: failure } = await supabase().rpc('get_fiction_reasons', { p_character_id: characterId });
    if (failure) throw failure;
    return (rows ?? []) as Reason[];
  });

  const submit = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy || !ready || !canVote) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const { error: failure } = await supabase().rpc('cast_fiction_vote', { p_character_id: characterId, p_mbti: type, p_enneagram: enneagram, p_reason: reason.trim() || null });
      if (failure) throw failure;
      await Promise.all([community.refresh(), reasons.mutate()]);
      if (marathon && nextId && onNext) { onNext(nextId); return; }
      setSuccess('Ton vote est enregistré. Tu peux le modifier à tout moment.');
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }, [busy, ready, canVote, characterId, type, enneagram, reason, community, reasons, marathon, nextId, onNext]);

  async function clear() {
    if (busy || !voted) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const { error: failure } = await supabase().rpc('clear_fiction_vote', { p_character_id: characterId });
      if (failure) throw failure;
      await Promise.all([community.refresh(), reasons.mutate()]);
      setSuccess('Ton vote est retiré.');
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }

  // Raccourcis clavier (ordinateur) : E/I S/N T/F J/P, 1 à 9, Entrée pour voter, → pour passer au suivant.
  useEffect(() => {
    if (!canVote) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const next = axesWithKey(axes, e.key);
      if (next) { e.preventDefault(); setAxes(next); return; }
      if (/^[1-9]$/.test(e.key)) { e.preventDefault(); const c = Number(e.key); setCore(prev => (prev === c ? null : c)); setWing(null); return; }
      if (e.key === 'Enter' && target?.tagName !== 'BUTTON' && target?.tagName !== 'A') { e.preventDefault(); void submit(); return; }
      if (e.key === 'ArrowRight' && nextId && onNext) { e.preventDefault(); onNext(nextId); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canVote, axes, submit, nextId, onNext]);

  function toggleMarathon(value: boolean) {
    setMarathon(value);
    try { localStorage.setItem(MARATHON_KEY, value ? '1' : '0'); } catch {}
  }

  const badge = consensusOf(summary);
  const ennBadge = consensusOf(ennSummary);

  return <section className={s.communityPanel} aria-labelledby="votes-heading">
    <div className={s.voteHead}>
      <h2 id="votes-heading">Le vote de la communauté</h2>
      {badge === 'consensus' && <span className={s.badgeConsensus}>Consensus</span>}
      {badge === 'serre' && <span className={s.badgeClose}>Vote serré</span>}
    </div>
    <p className={s.hint}>{summary?.total ?? 0} vote{(summary?.total ?? 0) > 1 ? 's' : ''} MBTI{summary?.leader ? ` · en tête : ${summary.leader}` : ''}{ennSummary?.total ? ` · ${ennSummary.total} pour l’ennéagramme${ennSummary.leader ? ` (${ennSummary.leader})` : ''}` : ''}. Une voix par compte et par personnage.</p>

    <div className={s.results}>
      {summary && summary.total > 0 && <ul className={s.voteResults} aria-label="Répartition MBTI">
        {Object.entries(summary.counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t, n]) => <li key={t}><strong>{t}</strong><progress max={summary.total} value={n} aria-label={`${t} : ${n} votes`} /><span>{share(n, summary.total)} %</span></li>)}
      </ul>}
      {ennSummary && ennSummary.total > 0 && <ul className={s.voteResults} aria-label="Répartition de l’ennéagramme">
        {Object.entries(ennSummary.counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t, n]) => <li key={t}><strong>Type {t}</strong><progress max={ennSummary.total} value={n} aria-label={`Type ${t} : ${n} votes`} /><span>{share(n, ennSummary.total)} %</span></li>)}
        {ennBadge === 'consensus' && <li className={s.hint}>Consensus sur l’ennéagramme.</li>}
      </ul>}
    </div>

    {!community.user && !community.authLoading && <p className={s.hint}><Link href="/login/">Connecte-toi avec ton compte Slumbywise</Link> pour voter, le même que Grindleveling.</p>}
    {community.user && !community.available && !community.loading && <p className={s.hint}>Les votes ne sont pas disponibles pour le moment. Réessaie un peu plus tard.</p>}

    {canVote && <form ref={formRef} onSubmit={submit} className={s.quickVote}>
      <fieldset>
        <legend>Ton MBTI {type && <strong className={s.typePreview}>{type}</strong>}</legend>
        <div className={s.axes}>
          {AXES.map((axis, i) => <div key={axis.key} role="radiogroup" aria-label={`${axis.labels[0]} ou ${axis.labels[1]}`} className={s.axis}>
            {axis.letters.map((letter, j) => <button key={letter} type="button" role="radio" aria-checked={axes[i] === letter}
              onClick={() => setAxes(prev => { const next = [...prev] as AxisPicks; next[i] = prev[i] === letter ? '' : letter; return next; })}>
              <strong>{letter}</strong><small>{axis.labels[j]}</small>
            </button>)}
          </div>)}
        </div>
      </fieldset>

      <fieldset>
        <legend>Ennéagramme <small>(facultatif)</small> {enneagram && <strong className={s.typePreview}>{enneagram}</strong>}</legend>
        <div role="radiogroup" aria-label="Type d’ennéagramme" className={s.ennea}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} type="button" role="radio" aria-checked={core === n} title={ENNEAGRAM_LABELS[n]}
            onClick={() => { setCore(core === n ? null : n); setWing(null); }}><strong>{n}</strong><small>{ENNEAGRAM_LABELS[n]}</small></button>)}
        </div>
        {core && <div role="radiogroup" aria-label="Aile" className={s.wings}>
          <span>Aile :</span>
          <button type="button" role="radio" aria-checked={wing === null} onClick={() => setWing(null)}>Sans aile</button>
          {wingsOf(core).map(w => <button key={w} type="button" role="radio" aria-checked={wing === w} onClick={() => setWing(w)}>{core}w{w}</button>)}
        </div>}
      </fieldset>

      <label className={s.reason}>Pourquoi ? <small>(facultatif, visible avec ton pseudo par les membres)</small>
        <textarea maxLength={400} rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex. : il suit ses valeurs avant tout, Fi dominant." />
        <small>{reason.length}/400</small>
      </label>

      <div className={s.voteActions}>
        <button type="submit" disabled={busy || !ready}>{busy ? 'Enregistrement…' : voted ? 'Modifier mon vote' : 'Voter'}</button>
        {voted && <button type="button" className={s.secondaryButton} disabled={busy} onClick={() => void clear()}>Retirer mon vote</button>}
        {nextId && onNext && <button type="button" className={s.secondaryButton} onClick={() => onNext(nextId)}>Personnage suivant →</button>}
      </div>
      {nextId && onNext && <label className={s.marathon}><input type="checkbox" checked={marathon} onChange={e => toggleMarathon(e.target.checked)} /> Mode marathon : passer au personnage suivant de l’œuvre après chaque vote</label>}
      <p className={`${s.hint} ${s.shortcuts}`}>Clavier : E/I · S/N · T/F · J/P, 1 à 9 pour l’ennéagramme, Entrée pour voter, → pour le suivant.</p>
    </form>}
    {error && <p role="alert" className={s.formError}>{error}</p>}
    {success && <p role="status">{success}</p>}

    {canVote && <div className={s.reasons}>
      <h3>Les arguments {reasons.data?.length ? `(${reasons.data.length})` : ''}</h3>
      {reasons.error && <p className={s.hint}>Les arguments n’ont pas pu être chargés.</p>}
      {reasons.data?.length === 0 && <p className={s.hint}>Pas encore d’argument. Explique ton vote pour lancer le débat.</p>}
      {reasons.data && reasons.data.length > 0 && <ul>
        {reasons.data.map((r, i) => <li key={i} className={r.is_me ? s.myReason : undefined}>
          <span className={s.reasonMeta}><strong>{r.display_name}{r.is_me ? ' (toi)' : ''}</strong> · {[r.mbti, r.enneagram].filter(Boolean).join(' / ')} · {new Date(r.updated_at).toLocaleDateString('fr-FR')}</span>
          <p>{r.reason}</p>
        </li>)}
      </ul>}
    </div>}
  </section>;
}
