// Edge Function: member-email-webhook
//
// WRITTEN, NOT DEPLOYED (2026-10-17). Needs migrate_198 and migrate_199
// applied first, RESEND_WEBHOOK_SECRET set, this URL added in Resend
// (Webhooks), and the founder's go to deploy. Resend's delivery events for
// member email (docs/member-email-2026-10-17/PLAN-V2.md M9, M10; founder
// decision 2026-10-17: opens and clicks tracked per member).
//
// Resend signs every delivery with Svix: headers `svix-id`,
// `svix-timestamp` and `svix-signature` over `${id}.${timestamp}.${body}`
// with the endpoint secret (RESEND_WEBHOOK_SECRET, `whsec_...`). The
// signature and a five-minute timestamp window are checked with Web Crypto
// (no Svix library) before the body is parsed. Deployed with verify_jwt =
// false (Svix holds no Supabase JWT); an unsigned or badly signed request is
// refused 401 and nothing is written.
//
//   POST (Resend) -> 200 { ok: true }    stored, a duplicate, or a type not kept
//                    401 { ok: false }   bad or missing signature, stale timestamp
//                    503                 RESEND_WEBHOOK_SECRET not set
// Stored against the send (by Resend's email id): sent, delivered,
// delivery_delayed, opened, clicked (with the link), bounced (with the
// bounce type), complained, failed, suppressed. A hard bounce or a complaint
// turns that member off automatically, with the source 'bounce' or
// 'complaint' (member_email_webhook_event -> member_email_suppress); a
// complaint also writes the permanent opt-out. Idempotent by svix-id, so
// Resend's retries never double count.
//
// The recipient address Resend includes in `data.to` is never read, stored
// or logged. Logging: the event type and codes only.
//
// Founder deployment: `supabase functions deploy member-email-webhook
// --no-verify-jwt`. Webhook URL for Resend:
// https://sujrylzzxcqxxfygptns.supabase.co/functions/v1/member-email-webhook
// (events: sent, delivered, delivery_delayed, opened, clicked, bounced,
// complained, failed, suppressed).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { readBoundedText, verifySvixSignature, webhookEventType } from '../_shared/memberEmail.ts'

const MAX_BODY_BYTES = 256 * 1024
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

function respond(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function text(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= max ? v : null
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return respond({ ok: false, error: 'method_not_allowed' }, 405)
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!secret) {
    console.error('[member-email-webhook] RESEND_WEBHOOK_SECRET missing')
    return respond({ ok: false, error: 'not_configured' }, 503)
  }
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[member-email-webhook] missing env vars')
    return respond({ ok: false, error: 'server_misconfigured' }, 500)
  }

  const raw = await readBoundedText(req, MAX_BODY_BYTES)
  if (raw === null) return respond({ ok: false, error: 'bad_body' }, 400)
  const svixId = req.headers.get('svix-id')
  const verified = await verifySvixSignature(
    secret, svixId, req.headers.get('svix-timestamp'), req.headers.get('svix-signature'), raw,
  )
  if (!verified) return respond({ ok: false, error: 'invalid_signature' }, 401)

  let event: Record<string, unknown>
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return respond({ ok: false, error: 'bad_json' }, 400)
    event = parsed as Record<string, unknown>
  } catch (_) {
    return respond({ ok: false, error: 'bad_json' }, 400)
  }

  const type = webhookEventType(event.type)
  if (!type) return respond({ ok: true, ignored: true }, 200)
  const data = (event.data && typeof event.data === 'object' ? event.data : {}) as Record<string, unknown>
  const providerId = text(data.email_id, 100)
  if (!providerId) return respond({ ok: true, ignored: true }, 200)
  const occurred = text(event.created_at, 40) ?? text(data.created_at, 40)
  const occurredAt = occurred && Number.isFinite(Date.parse(occurred)) ? new Date(occurred).toISOString() : new Date().toISOString()
  const bounce = (data.bounce && typeof data.bounce === 'object' ? data.bounce : {}) as Record<string, unknown>
  const click = (data.click && typeof data.click === 'object' ? data.click : {}) as Record<string, unknown>

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: out, error } = await db.rpc('member_email_webhook_event', {
    _svix_id: (svixId ?? '').slice(0, 100),
    _type: type,
    _provider_id: providerId,
    _occurred_at: occurredAt,
    _bounce_type: text(bounce.type, 40),
    _link: type === 'clicked' ? text(click.link, 2000) : null,
  })
  if (error) {
    // A 500 makes Resend retry later; the svix id keeps the retry idempotent.
    console.error('[member-email-webhook] store failed', { type, code: error.code })
    return respond({ ok: false, error: 'server_error' }, 500)
  }
  const r = (out ?? {}) as Record<string, unknown>
  if (r.suppressed === true) console.log('[member-email-webhook] member turned off', { type })
  return respond({ ok: true }, 200)
})
