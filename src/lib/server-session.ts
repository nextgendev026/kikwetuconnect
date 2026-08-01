import { getJwtSessionId } from './session'

/**
 * Stamps the caller's current session as the account's only active session.
 * Used right after a login (password or email-verification code exchange) so
 * that any older session becomes stale and is signed out client-side.
 */
export async function claimActiveSession(supabase: any): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const sessionId = getJwtSessionId(session?.access_token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !sessionId) return
  await supabase.from('profiles').update({ active_session_id: sessionId }).eq('id', user.id)
}
