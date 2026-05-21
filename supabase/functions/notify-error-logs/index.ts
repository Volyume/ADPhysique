// Edge Function: notify-error-logs
//
// Triggered by a Supabase Database Webhook on debug_log_uploads INSERT.
// Implements per-error dedup so the dev channel only pings on the FIRST
// occurrence of each unique (level, scope, message[0:80]) in a 24h window.
// Subsequent occurrences are silently absorbed — no Slack/Discord
// firestorm during heavy beta.
//
// Flow per incoming insert:
//   1. Filter by level (default: warn+error, configurable).
//   2. Look up dedup_key in the same row (set by the table's
//      compute_debug_log_dedup_key trigger from migrate_010).
//   3. Query: has any row with this dedup_key been notified
//      in the last 24h?
//        yes → silently skip (still mark notified_at on this row so
//              the digest cron can summarise the burst later)
//        no  → POST formatted message to ALERT_WEBHOOK_URL, then
//              mark THIS row's notified_at = NOW().
//
// Setup:
//   1. Apply migrate_010_debug_log_notified.sql (adds notified_at,
//      dedup_key + trigger + indexes).
//   2. Deploy this function: Dashboard → Edge Functions → New →
//      paste this file → name `notify-error-logs` → Deploy.
//   3. Set the destination as a function secret:
//        ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
//      Optional secrets:
//        ALERT_MIN_LEVEL=error      // 'error' or 'warn' (default: warn)
//        ALERT_FORMAT=discord       // 'slack' (default) | 'discord' | 'raw'
//        ALERT_DEDUP_HOURS=24       // dedup window length (default: 24)
//   4. Create the Database Webhook (Dashboard → Database → Webhooks):
//        Table: debug_log_uploads
//        Events: INSERT only
//        Type: HTTP Request → POST
//        URL: https://<project>.supabase.co/functions/v1/notify-error-logs
//        Headers: Authorization: Bearer <SUPABASE_ANON_KEY> (auto-fills)
//
// The function uses the auto-injected SUPABASE_SERVICE_ROLE_KEY to do
// the dedup lookup + update — bypasses RLS but only ever reads/writes
// notified_at/dedup_key, never returns row data to the caller.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
  dedup_key: string | null
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

function formatSlack(r: Record, recurrence = 1): unknown {
  const emoji = r.level === 'error' ? ':rotating_light:' : ':warning:'
  const platform = r.platform ? ` · ${r.platform}` : ''
  const version = r.app_version ? ` · v${r.app_version}` : ''
  const recurrenceTag = recurrence > 1 ? ` · ${recurrence}× in last 24h` : ''
  const lines = [
    `${emoji} *${String(r.level).toUpperCase()}* in \`${r.scope || 'app'}\`${recurrenceTag}`,
    `> ${truncate(r.message, 300)}`,
  ]
  if (r.context) lines.push(`*ctx:* \`${truncate(r.context, 200)}\``)
  if (r.stack) lines.push('*stack:*\n```' + truncate(r.stack, 600) + '```')
  lines.push(`_user ${uidShort(r.user_id)} · device ${uidShort(r.device_id)}${platform}${version}_`)
  return { text: lines.join('\n') }
}

function formatDiscord(r: Record, recurrence = 1): unknown {
  const emoji = r.level === 'error' ? '🚨' : '⚠️'
  const platform = r.platform ? ` · ${r.platform}` : ''
  const version = r.app_version ? ` · v${r.app_version}` : ''
  const recurrenceTag = recurrence > 1 ? ` · ${recurrence}× in last 24h` : ''
  const lines = [
    `${emoji} **${String(r.level).toUpperCase()}** in \`${r.scope || 'app'}\`${recurrenceTag}`,
    `> ${truncate(r.message, 300)}`,
  ]
  if (r.context) lines.push(`**ctx:** \`${truncate(r.context, 200)}\``)
  if (r.stack) lines.push('**stack:**\n```' + truncate(r.stack, 600) + '```')
  lines.push(`*user ${uidShort(r.user_id)} · device ${uidShort(r.device_id)}${platform}${version}*`)
  return { content: lines.join('\n') }
}

function formatRaw(r: Record): unknown {
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
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const minLevel = (Deno.env.get('ALERT_MIN_LEVEL') ?? 'warn').toLowerCase() as Level
  const format = (Deno.env.get('ALERT_FORMAT') ?? 'slack').toLowerCase()
  const dedupHours = Math.max(1, Math.min(168, parseInt(Deno.env.get('ALERT_DEDUP_HOURS') ?? '24', 10)))

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch (_) {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!payload?.record || payload.type !== 'INSERT') {
    return new Response(JSON.stringify({ ok: true, skipped: 'not an INSERT' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  const r = payload.record
  const rowLevel = String(r.level || '').toLowerCase() as Level

  if (!(rowLevel in LEVELS) || LEVELS[rowLevel] < LEVELS[minLevel]) {
    return new Response(JSON.stringify({ ok: true, skipped: 'below min level' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!r.dedup_key) {
    // Shouldn't happen post-migrate-010, but defensive: if no dedup_key,
    // we don't dedup — alert anyway.
    console.warn('[notify-error-logs] row has no dedup_key — alerting without dedup')
  }

  // Service-role client for the dedup lookup + notified_at update.
  // Bypasses the table's INSERT-only RLS policy so the function can
  // read prior notifications.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Dedup lookup: has this exact issue already pinged within window?
  let recurrence = 1
  if (r.dedup_key) {
    const windowStart = new Date(Date.now() - dedupHours * 3600 * 1000).toISOString()
    const { data: priorHits, error: lookupErr } = await admin
      .from('debug_log_uploads')
      .select('id, notified_at', { count: 'exact', head: false })
      .eq('dedup_key', r.dedup_key)
      .gte('uploaded_at', windowStart)
      .order('uploaded_at', { ascending: false })
      .limit(200)

    if (lookupErr) {
      console.error('[notify-error-logs] dedup lookup failed', lookupErr.message)
      // Fail open — alert anyway rather than silently drop a real error.
    } else if (priorHits && priorHits.length > 0) {
      // Any prior row already notified? Then this is a recurrence — skip.
      const alreadyNotified = priorHits.find(h => h.notified_at != null)
      if (alreadyNotified) {
        // Still mark THIS row so the digest cron can count it.
        await admin
          .from('debug_log_uploads')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', r.id)
        return new Response(JSON.stringify({
          ok: true,
          skipped: 'recurrence',
          dedup_key: r.dedup_key,
          recurrences_in_window: priorHits.length,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      recurrence = priorHits.length + 1
    }
  }

  const body =
    format === 'discord' ? formatDiscord(r, recurrence) :
    format === 'raw'     ? formatRaw(r) :
                           formatSlack(r, recurrence)

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
        status: 502, headers: { 'Content-Type': 'application/json' },
      })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[notify-error-logs] fetch threw', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }

  // Successful notification — mark this row so future occurrences dedup off it.
  await admin
    .from('debug_log_uploads')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', r.id)

  return new Response(JSON.stringify({
    ok: true,
    notified: true,
    level: rowLevel,
    dedup_key: r.dedup_key,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
