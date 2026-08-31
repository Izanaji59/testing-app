'use client';

import { T } from '@/lib/tokens';

/**
 * Écran plein cadre pour les états "profil en cours de chargement" / "profil
 * introuvable", affiché à la place des pages (app)/* tant que useProfile()
 * n'a pas de profil exploitable. Remplace un `return null` silencieux qui
 * rendait un écran totalement vide sans indiquer si c'est normal (chargement)
 * ou un vrai problème (ligne `profiles` manquante).
 */
export function ProfileState({ kind }: { kind: 'loading' | 'missing' }) {
  const isLoading = kind === 'loading';
  return (
    <div style={{
      minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center',
    }}>
      <div>
        <div style={{
          fontFamily: T.mono, fontSize: 11, letterSpacing: '0.32em',
          color: isLoading ? T.cyan : T.danger,
        }}>
          {isLoading ? 'CHARGEMENT DU PROFIL…' : 'PROFIL INTROUVABLE'}
        </div>
        {!isLoading && (
          <div style={{
            marginTop: 10, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em',
            color: T.textDim, lineHeight: 1.7, maxWidth: 280,
          }}>
            Déconnecte-toi puis reconnecte-toi. Si ça persiste, le compte n'a pas de profil en base.
          </div>
        )}
      </div>
    </div>
  );
}
