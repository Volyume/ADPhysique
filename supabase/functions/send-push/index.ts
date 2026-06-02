// Edge Function: send-push
//
// Server-side push fan-out. Reads device_push_tokens (migration 053)
// for a target user and delivers a notification to every live device
// via Expo's push API (https://exp.host/--/api/v2/push/send).
//
// Why this exists:
//   Some notifications can only originate on the server. The headline
//   case is subscription payment failure: the device cannot know a
//   renewal charge failed; only Google's RTDN (the play-billing-rtdn
//   function) hears about it. That function calls this one to push the
//   "we couldn't take your payment" notice. Cascade-gate and weekly-
//   coach pushes are scheduled locally on-device and do NOT use this
//   function.
//
// Auth model:
//   This is a service-to-service endpoint, NOT user-facing. Callers
//   (play-billing-rtdn, future cron workers) authenticate with the
//   service-role key in the Authorization header. A request without it
//   is rejected 401. The client app must never call this; it has no
//   need to and no service-role key.
//
// Request body:
//   { "user_id": "<uuid>",
//     "title": "string",
//     "body": "string",
//     "data": { "type": "subscription_payment_failure", ... } }
//
// Response:
//   { ok: true, sent: <n>, removed: <n> } on success
//   { ok: false, error } on bad input / auth failure
//
// Expo receipts:
//   Expo returns a per-message ticket. A ticket with status "error"
//   and details.error === "DeviceNotRegistered" means the token is
//   dead (app uninstalled / token rotated). We delete those rows so
//   the table self-prunes and the next send doesn't waste a call.
//
// Founder deployment:
//   1. supabase functions deploy send-push
//   2. No extra secrets beyond the auto-populated SUPABASE_URL and
//      SUPABASE_SERVICE_ROLE_KEY. Expo's push endpoint needs no API
//      key for sending to ExponentPushToken[...] tokens.
//
// Until migration 053 is applied this function runs but finds no
// tokens and returns { ok: true, sent: 0 }.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Constant-time secret comparison. Hashing both sides to fixed-length
// SHA-256 digests first means the XOR loop runs over a constant 32 bytes
// regardless of input length, so neither the length nor the contents of the
// presented token leak through timing. Used for the service-role check below.
async function timingSafeEqualStr(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ])
  const va = new Uint8Array(ha)
  const vb = new Uint8Array(hb)
  let diff = 0
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i]
  return diff === 0
}

interface SendPushBody {
  user_id?: string
  title?: string
  body?: string
  data?: Record<string, unknown>
}

interface ExpoTicket {
  status?: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[send-push] missing env vars')
    return jsonResponse({ ok: false, error: 'Server misconfigured' }, 500)
  }

  // Service-to-service auth: the caller must present the service-role
  // key. This endpoint writes to no user-scoped state on the caller's
  // behalf, but it CAN push to any user, so it must not be callable by
  // an ordinary client. Compared in constant time (timingSafeEqualStr)
  // so the secret can't be recovered through a timing side-channel.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!(await timingSafeEqualStr(token, serviceRoleKey))) {
    console.error('[send-push] unauthorised: caller is not service-role')
    return jsonResponse({ ok: false, error: 'Unauthorised' }, 401)
  }

  let payload: SendPushBody
  try {
    payload = await req.json()
  } catch (_) {
    return jsonResponse({ ok: false, error: 'Bad JSON' }, 400)
  }

  const userId = payload.user_id
  const title = payload.title
  const messageBody = payload.body
  if (!userId || !title || !messageBody) {
    return jsonResponse({ ok: false, error: 'user_id, title and body are required' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Read every live token for the user. Service role bypasses RLS.
  const { data: rows, error: readErr } = await admin
    .from('device_push_tokens')
    .select('expo_push_token')
    .eq('user_id', userId)
  if (readErr) {
    console.error('[send-push] token read failed', readErr)
    return jsonResponse({ ok: false, error: 'token read failed' }, 500)
  }
  const tokens: string[] = (rows ?? [])
    .map((r: { expo_push_token: string }) => r.expo_push_token)
    .filter(Boolean)
  if (tokens.length === 0) {
    return jsonResponse({ ok: true, sent: 0, removed: 0 }, 200)
  }

  // 2. Build one Expo message per token. sound omitted: the app's
  //    design drives sound/haptics in-app and OS audio is off by
  //    policy (see permissions.js allowSound:false).
  const messages = tokens.map((to) => ({
    to,
    title,
    body: messageBody,
    data: payload.data ?? {},
    channelId: 'default',
  }))

  // 3. POST to Expo. One batch call; Expo accepts an array.
  let tickets: ExpoTicket[] = []
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[send-push] Expo push failed', res.status, text)
      return jsonResponse({ ok: false, error: `Expo ${res.status}` }, 502)
    }
    const json = await res.json()
    // Expo wraps tickets in { data: [...] }.
    tickets = Array.isArray(json?.data) ? json.data : []
  } catch (e) {
    console.error('[send-push] Expo push threw', e)
    return jsonResponse({ ok: false, error: 'Expo request failed' }, 502)
  }

  // 4. Prune dead tokens. Tickets line up positionally with `tokens`.
  const deadTokens: string[] = []
  tickets.forEach((ticket, i) => {
    if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
      deadTokens.push(tokens[i])
    }
  })
  let removed = 0
  if (deadTokens.length > 0) {
    const { error: delErr } = await admin
      .from('device_push_tokens')
      .delete()
      .eq('user_id', userId)
      .in('expo_push_token', deadTokens)
    if (delErr) {
      console.error('[send-push] dead-token prune failed', delErr)
    } else {
      removed = deadTokens.length
    }
  }

  const sent = tickets.filter((t) => t?.status === 'ok').length
  return jsonResponse({ ok: true, sent, removed }, 200)
})
