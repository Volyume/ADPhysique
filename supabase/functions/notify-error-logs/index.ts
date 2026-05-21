// Edge Function: notify-error-logs
//
// Triggered by a Supabase Database Webhook on debug_log_uploads INSERT.
// Filters out info-level noise, formats the entry for the configured
// destination (Slack, Discord, generic webhook), and POSTs it. Result:
// developer gets pinged the moment a beta tester hits an error or
// warning — no manual action by the tester required.
//
// Setup:
//   1. Deploy this function:    supabase functions deploy notify-error-logs
//   2. Set the destination URL:
//        Dashboard → Edge Functions → notify-error-logs → Secrets
//        ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...  (or Discord, or generic)
//      Optional:
//        ALERT_MIN_LEVEL=error    // 'error' or 'warn' (default: 'warn')
//        ALERT_FORMAT=slack       // 'slack' (default) | 'discord' | 'raw'
//   3. Create the Database Webhook:
//        Dashboard → Database → Webhooks → Create
//        Table:    debug_log_uploads
//        Events:   INSERT
//        Type:     HTTP Request
//        Method:   POST
//        URL:      https://<project>.supabase.co/functions/v1/notify-error-logs
//        Headers:  Authorization: Bearer <SUPABASE_ANON_KEY> (auto-populated as 'apikey')
//        That's it — no payload template needed, Supabase sends the
//        standard shape and the function unpacks it.
//
// Payload shape from Supabase webhooks:
//   {
//     type: 'INSERT',
//     table: 'debug_log_uploads',
//     schema: 'public',
//     record: { id, user_id, device_id, ts, level, scope, message, ... },
//     old_record: null
//   }
//
// Why an Edge Function and not the raw webhook → Slack:
//   Slack/Discord expect a specific JSON shape (`{text: ...}` / `{content: ...}`)
//   and Supabase sends the row payload, not a chat message. Function does
//   the transform + level filter + truncation in one place.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const LEVELS = { info: 0, warn: 1, error: 2 } as const
type Level = keyof typeof LEVELS

interface Record {
  id: string
  user_id: string | null
  device_id: string | null
  ts: number
  level: string
  scope: string | null
  message: string | null
  stack: string | null
  context: string | null
  app_version: string | null
  platform: string | null
}

interface WebhookPayload {
  type: string
  table: string
  schema: string
  record: Record
}

function truncate(s: string | null, n: number): string {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}

function uidShort(uid: string | null): string {
  if (!uid) return 'anon'
  return uid.slice(0, 8)
}

function formatSlack(r: Record): unknown {
  const emoji = r.level === 'error' ? ':rotating_light:' : ':warning:'
  const platform = r.platform ? ` · ${r.platform}` : ''
  const version = r.app_version ? ` · v${r.app_version}` : ''
  const lines = [
    `${emoji} *${String(r.level).toUpperCase()}* in \`${r.scope || 'app'}\``,
    `> ${truncate(r.message, 300)}`,
  ]
  if (r.context) lines.push(`*ctx:* \`${truncate(r.context, 200)}\``)
  if (r.stack) lines.push('*stack:*\n```' + truncate(r.stack, 600) + '```')
  lines.push(`_user ${uidShort(r.user_id)} · device ${uidShort(r.device_id)}${platform}${version}_`)
  return { text: lines.join('\n') }
}

function formatDiscord(r: Record): unknown {
  const emoji = r.level === 'error' ? '🚨' : '⚠️'
  const platform = r.platform ? ` · ${r.platform}` : ''
  const version = r.app_version ? ` · v${r.app_version}` : ''
  const lines = [
    `${emoji} **${String(r.level).toUpperCase()}** in \`${r.scope || 'app'}\``,
    `> ${truncate(r.message, 300)}`,
  ]
  if (r.context) lines.push(`**ctx:** \`${truncate(r.context, 200)}\``)
  if (r.stack) lines.push('**stack:**\n```' + truncate(r.stack, 600) + '```')
  lines.push(`*user ${uidShort(r.user_id)} · device ${uidShort(r.device_id)}${platform}${version}*`)
  return { content: lines.join('\n') }
}

function formatRaw(r: Record): unknown {
  // For users wiring up their own receiver — full row, no transformation
  return r
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const dest = Deno.env.get('ALERT_WEBHOOK_URL')
  if (!dest) {
    console.error('[notify-error-logs] ALERT_WEBHOOK_URL secret not set')
    return new Response(JSON.stringify({ error: 'ALERT_WEBHOOK_URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const minLevel = (Deno.env.get('ALERT_MIN_LEVEL') ?? 'warn').toLowerCase() as Level
  const format = (Deno.env.get('ALERT_FORMAT') ?? 'slack').toLowerCase()

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Sanity: Supabase webhooks send `type` and `record`. If neither is
  // present the caller is probably probing the URL — answer ok and exit.
  if (!payload?.record || payload.type !== 'INSERT') {
    return new Response(JSON.stringify({ ok: true, skipped: 'not an INSERT' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const r = payload.record
  const rowLevel = String(r.level || '').toLowerCase() as Level
  if (!(rowLevel in LEVELS) || LEVELS[rowLevel] < LEVELS[minLevel]) {
    return new Response(JSON.stringify({ ok: true, skipped: 'below min level', rowLevel, minLevel }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body =
    format === 'discord' ? formatDiscord(r) :
    format === 'raw'     ? formatRaw(r) :
                           formatSlack(r)

  try {
    const res = await fetch(dest, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error('[notify-error-logs] destination rejected', res.status, txt.slice(0, 200))
      return new Response(JSON.stringify({ error: `dest ${res.status}`, body: txt.slice(0, 200) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ ok: true, level: rowLevel }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[notify-error-logs] fetch threw', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
