'use client';

import { useEffect, useRef, useState } from 'react';
import { T } from '@/lib/tokens';

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

const ERRORS: Record<string, string> = {
  'not-allowed': 'Micro refusé : autorise-le dans les réglages du navigateur.',
  'service-not-allowed': 'Dictée indisponible dans ce navigateur.',
  'no-speech': 'Rien entendu. Réessaie en parlant près du micro.',
  'audio-capture': 'Aucun micro détecté.',
  network: 'Dictée indisponible : connexion au service vocal impossible.',
};

/**
 * Dictée vocale pour ordinateur (les claviers de téléphone ont déjà la leur) :
 * n'apparaît qu'avec un pointeur précis et un navigateur qui gère la reconnaissance
 * vocale (Chrome, Edge). Le texte reconnu est ajouté au champ.
 */
export function DictationButton({ onText, label }: { onText: (text: string) => void; label: string }) {
  const [ctor, setCtor] = useState<RecognitionCtor | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
    if (Ctor && window.matchMedia('(pointer: fine)').matches) setCtor(() => Ctor);
    return () => rec.current?.abort();
  }, []);

  if (!ctor) return null;

  function toggle() {
    if (listening) { rec.current?.stop(); return; }
    setError('');
    const r = new ctor!();
    r.lang = 'fr-FR'; r.continuous = false; r.interimResults = false;
    r.onresult = e => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text.trim()) onText(text.trim());
    };
    r.onerror = e => { if (e.error !== 'aborted') setError(ERRORS[e.error] ?? 'La dictée a été interrompue.'); };
    r.onend = () => setListening(false);
    rec.current = r;
    try { r.start(); setListening(true); } catch { setError('La dictée n’a pas pu démarrer.'); }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? `Arrêter la dictée : ${label}` : `Dicter : ${label}`}
        title="Dictée vocale (le navigateur transmet l’audio à son service de reconnaissance)"
        style={{
          flexShrink: 0, minWidth: 44, minHeight: 40, padding: '0 12px',
          background: listening ? T.danger : 'transparent',
          color: listening ? T.bg : T.cyan,
          border: `1px solid ${listening ? T.danger : T.lineMid}`,
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em', cursor: 'pointer',
          animation: listening ? 'lt-pulse 1.2s ease-in-out infinite' : undefined,
        }}
      >
        {listening ? '■ ÉCOUTE…' : '🎙 DICTER'}
      </button>
      {error && <span role="alert" style={{ flexBasis: '100%', fontSize: 11, color: T.danger }}>{error}</span>}
    </>
  );
}

/** Ajoute le texte dicté à la suite de la saisie existante. */
export const appendDictation = (current: string, text: string) => (current.trim() ? `${current.trim()} ${text}` : text);
