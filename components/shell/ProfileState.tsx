'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { T } from '@/lib/tokens';

/**
 * Écran plein cadre pour les états "profil en cours de chargement" / "profil
 * introuvable", affiché à la place des pages (app)/* tant que useProfile()
 * n'a pas de profil exploitable. Remplace un `return null` silencieux qui
 * rendait un écran totalement vide sans indiquer si c'est normal (chargement)
 * ou un vrai problème (ligne `profiles` manquante).
 *
 * Le bouton déconnexion vit ICI (pas seulement dans le contenu de /profile,
 * gardé derrière `if (!profile)`) : sinon un compte déjà connecté sans ligne
 * `profiles` reste coincé sans aucun moyen de se déconnecter pour redéclencher
 * la réparation automatique au prochain login.
 */
export function ProfileState({ kind }: { kind: 'loading' | 'missing' }) {
  const router = useRouter();
  const isLoading = kind === 'loading';

  async function logout() {
    await supabase().auth.signOut();
    router.replace('/login');
  }

  return (
    <div style={{
      minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
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
              Déconnecte-toi puis reconnecte-toi pour relancer la réparation du compte.
            </div>
          )}
        </div>

        <button
          onClick={logout}
          style={{
            background: 'transparent',
            color: T.danger,
            border: `1px solid ${T.danger}55`,
            padding: '12px 20px',
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.28em',
            cursor: 'pointer',
          }}
        >
          DÉCONNEXION
        </button>
      </div>
    </div>
  );
}
