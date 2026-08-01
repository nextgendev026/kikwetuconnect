import type { SupabaseClient } from '@supabase/supabase-js'

export interface ActivityInput {
  eventType: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
  severity?: 'info' | 'warn' | 'critical'
}

// All activity is recorded via the SECURITY DEFINER track_activity RPC, which
// derives the actor from auth.uid() and only falls back to the passed user id
// when no session is present (server-side events like signup). Never throws:
// tracking must not break the app.
export async function trackActivity(
  supabase: SupabaseClient<any> | null | undefined,
  input: ActivityInput,
  userId?: string | null
): Promise<void> {
  if (!supabase) return
  try {
    await supabase.rpc('track_activity', {
      p_user_id: userId ?? null,
      p_event_type: input.eventType,
      p_entity_type: input.entityType ?? null,
      p_entity_id: input.entityId ?? null,
      p_metadata: input.metadata ?? {},
      p_severity: input.severity ?? 'info',
    })
  } catch {
    // non-fatal
  }
}

export async function reportError(
  supabase: SupabaseClient<any> | null | undefined,
  source: string,
  error: unknown,
  extra?: { route?: string | null; metadata?: Record<string, unknown> }
): Promise<void> {
  if (!supabase) return
  try {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
    const stack = error instanceof Error ? error.stack : undefined
    await supabase.rpc('report_error', {
      p_source: source,
      p_route: extra?.route ?? (typeof window !== 'undefined' ? window.location.pathname : null),
      p_message: message,
      p_stack: stack ?? null,
      p_metadata: extra?.metadata ?? {},
    })
  } catch {
    // non-fatal
  }
}

export async function flagContent(
  supabase: SupabaseClient<any> | null | undefined,
  contentType: string,
  contentId: string,
  reason: string,
  riskScore = 0
): Promise<void> {
  if (!supabase) return
  try {
    await supabase.rpc('flag_content', {
      p_content_type: contentType,
      p_content_id: contentId,
      p_reason: reason,
      p_risk_score: riskScore,
    })
  } catch {
    // non-fatal
  }
}
