'use server';

import { createClient } from '@/lib/supabase/server';
import { nextMidnight } from '@/lib/data/pause';
import { revalidatePath } from 'next/cache';

/**
 * Set or clear the pause switch.
 *
 * Writes go through the request's own Supabase client, so they carry the signed-in user's session
 * and are checked by row-level security. The service key never reaches the browser, and an
 * unauthenticated caller is rejected by the database rather than by this code.
 */

async function setPausedUntil(value: string | null) {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    // Belt and braces: RLS would refuse anyway, but failing here keeps the error honest.
    return { error: 'You need to be signed in to change this.' };
  }

  const { error } = await supabase
    .from('system_control')
    .update({
      paused_until: value,
      updated_at: new Date().toISOString(),
      updated_by: String(claims.claims.email ?? ''),
    })
    .eq('id', 1);

  if (error) {
    console.error('pause switch update failed:', error.message);
    return { error: 'Could not reach the database. Nothing changed.' };
  }

  revalidatePath('/');
  return {};
}

/** Withhold commands until midnight in the controller's zone. */
export async function disableUntilMidnight() {
  return setPausedUntil(nextMidnight().toISOString());
}

/** Resume immediately. */
export async function enableNow() {
  return setPausedUntil(null);
}
