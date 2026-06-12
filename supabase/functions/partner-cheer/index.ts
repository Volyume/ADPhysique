// Edge Function: partner-cheer (NEW-002)
//
// A user-facing, authenticated endpoint that sends a one-tap cheer to a
// training partner. The client calls it with its own JWT; the function:
//
//   1. Verifies the caller and inserts the cheer AS the caller (so RLS proves
//      membership of an active partnership, and the UNIQUE(pair_id, sender_id,
//      sent_on) constraint enforces the one-per-local-day rate limit — a
//      duplicate returns 429, never a second push).
//   2. Resolves the recipient (the other member) from the partnership.
//   3. Checks the recipient's open ED/wellbeing flag with the service role.
//      If a flag is open, delivery downgrades to IN-APP ONLY: no push is sent
//      (pushing at a flagged user is the harm pattern, §5). The cheer row still
//      lands, so the recipient sees it in-app next open. Sending is never
//      restricted; only the recipient's push delivery is.
//   4. Otherwise invokes send-push (service role) with the partner_cheer
//      payload so the tap deep-links to the Progress partner row.
//
// Request body: { "pairId": "<uuid>", "sentOn"?: "YYYY-MM-DD" }
//   sentOn is the caller's LOCAL day (the rate-limit key); defaults to UTC date
//   if omitted. The client passes its local day so the limit follows the user's
//   midnight, matching the in-app button reset.
//
// Response:
//   { ok: true, delivered: 'push' | 'in_app' } on success
//   { ok: false, error: 'already_cheered' } 429 when the daily limit is hit
//   { ok: false, error } on bad input / auth failure
//
// Founder deployment: `supabase functions deploy partner-cheer`. Needs the
// auto-populated SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface CheerBody {
  pairId?: string
  sentOn?: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('[partner-cheer] missing env vars')
    return jsonResponse({ ok: false, error: 'Server misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return jsonResponse({ ok: false, error: 'Unauthorised' }, 401)

  let body: CheerBody
  try {
    body = await req.json()
  } catch (_) {
    return jsonResponse({ ok: false, error: 'Bad JSON' }, 400)
  }
  const pairId = body.pairId
  if (!pairId) return jsonResponse({ ok: false, error: 'pairId is required' }, 400)
  const sentOn = body.sentOn || new Date().toISOString().slice(0, 10)

  // Caller-scoped client: RLS applies, so reads/writes prove membership.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return jsonResponse({ ok: false, error: 'Unauthorised' }, 401)
  const senderId = user.id

  // Resolve the partnership under RLS (caller must be an active member).
  const { data: partnership, error: pErr } = await userClient
    .from('partnerships')
    .select('id, member_a, member_b, status')
    .eq('id', pairId)
    .single()
  if (pErr || !partnership || partnership.status !== 'active') {
    return jsonResponse({ ok: false, error: 'not_active' }, 403)
  }
  const recipientId = partnership.member_a === senderId ? partnership.member_b : partnership.member_a
  if (!recipientId) return jsonResponse({ ok: false, error: 'not_active' }, 403)

  // Insert the cheer AS the caller — RLS confirms membership, the UNIQUE
  // constraint is the rate limit. A duplicate is the daily limit, not an error.
  const { error: insErr } = await userClient
    .from('partner_cheers')
    .insert({ pair_id: pairId, sender_id: senderId, sent_on: sentOn })
  if (insErr) {
    // 23505 = unique_violation -> already cheered today.
    if ((insErr as { code?: string }).code === '23505') {
      return jsonResponse({ ok: false, error: 'already_cheered' }, 429)
    }
    console.error('[partner-cheer] insert failed', insErr)
    return jsonResponse({ ok: false, error: 'insert_failed' }, 500)
  }

  // Service-role admin for the cross-user reads the caller cannot make.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Recipient's open ED/wellbeing flag -> in-app only (no push).
  const { data: openFlag } = await admin
    .from('ed_pattern_flags')
    .select('id')
    .eq('user_id', recipientId)
    .is('cleared_at', null)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (openFlag) {
    // Cheer recorded; delivery downgrades to in-app only (§5).
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }

  // Sender's first name for the push title.
  const { data: senderProfile } = await admin
    .from('profiles')
    .select('first_name')
    .eq('id', senderId)
    .maybeSingle()
  const senderName = (senderProfile?.first_name as string) || 'Your partner'

  // Fan out via send-push (service-to-service, service-role auth).
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        user_id: recipientId,
        title: `${senderName} sent you a cheer`,
        body: `You trained this week. ${senderName} noticed.`,
        data: { type: 'partner_cheer', pairId },
      }),
    })
  } catch (e) {
    // The cheer is already recorded; a failed push is not a failed cheer.
    console.error('[partner-cheer] push fan-out failed', e)
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }

  return jsonResponse({ ok: true, delivered: 'push' }, 200)
})
