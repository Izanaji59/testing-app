'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase browser-side.
 * Le build étant en static export, on n'utilise QUE le client browser.
 * Auth + Realtime + DB fonctionnent intégralement client-side.
 *
 * Les env vars NEXT_PUBLIC_* sont inlinées à BUILD time. Il faut donc
 * qu'elles soient présentes dans .env.local AVANT `npm run dev` / `npm run build`.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      '[LATRACTION] Variables Supabase manquantes.\n' +
      '→ Crée un fichier .env.local à la racine de latraction-app/ avec :\n' +
      '    NEXT_PUBLIC_SUPABASE_URL=https://<ton-projet>.supabase.co\n' +
      '    NEXT_PUBLIC_SUPABASE_ANON_KEY=<ton anon key>\n' +
      'puis relance `npm run dev`.',
    );
  }
}

export function createClient() {
  assertEnv();
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Singleton pratique pour usage hors React (engine, ai, etc.)
let _client: ReturnType<typeof createClient> | null = null;
export function supabase() {
  if (!_client) _client = createClient();
  return _client;
}
