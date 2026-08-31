import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Crée la ligne `profiles` du user si elle n'existe pas encore.
 * Le trigger SQL `trg_on_profile_created` se charge ensuite de seeder les 9 stats.
 *
 * Appelé à l'inscription ET à la connexion (filet de sécurité) : un compte
 * créé avant ce correctif, ou via un chemin qui aurait sauté cette étape,
 * se répare tout seul au prochain login au lieu de rester bloqué sur un
 * écran vide.
 */
export async function ensureProfile(sb: SupabaseClient, userId: string) {
  const { data } = await sb
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (data) return;
  await sb.from('profiles').insert({ user_id: userId });
}
