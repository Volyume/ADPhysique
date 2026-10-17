// Edge Function: member-email-runner
//
// WRITTEN, NOT DEPLOYED (2026-10-17). Needs migrate_198 and migrate_199
// applied first and the founder's go to deploy. The scheduler of member
// email v2 (docs/member-email-2026-10-17/PLAN-V2.md, M5, M6, M9, M11, M13).
//
// Called by pg_cron every 5 minutes through pg_net (migrate_199 job
// `member-email-runner`), with the header `x-runner-secret` that the job
// reads from `member_email_config.runner_secret` at run time. Deployed with
// verify_jwt = false (pg_net holds no user JWT); a request without the
// matching secret is refused 401 before anything is read or sent. A lease
// (`member_email_runner_claim`) keeps two overlapping calls from sending.
//
// Each run, in this order:
//   1. Housekeeping, always: lift sunsets on engagement, record app returns
//      7 days after each email, the complaint and bounce alarms (a campaign
//      above 0.3 percent complaints or 5 percent bounces is PAUSED, an
//      automation is turned OFF, the founder is emailed), A/B winners
//      (unique opens, then clicks, then subject A) after the wait, and the
//      retention clean-up once a day (rows older than retention_months).
//   2. Nothing is sent while the kill switch is on, RESEND_API_KEY is
//      missing, or it is quiet hours (21:00 to 08:00 UK by default).
//   3. Due campaigns start: a queued send once its undo window has passed,
//      a scheduled send at its time. The claims lint runs again; a failure
//      pauses it.
//   4. The daily cap: every email this system sends in the last rolling 24
//      hours counts (member_email_quota); at most daily_cap (60, so account
//      email always has room in Resend's 100 a day). A larger send simply
//      continues on the next runs, so it spreads across days by itself.
//      The founder is emailed once a day when the cap is reached.
//   5. Automations first (welcome series, weekly summary on Mondays, update
//      nudge, win-back, anniversary, review ask, re-permission), then
//      campaigns, in batches of at most 100. Every recipient comes from a
//      migrate_199 function built on `member_email_sendable`, so every hold
//      (master switch, topic, opt-out, exclusions, suppression, sunset, the
//      ED hold fail closed, the weekly per-member cap) is re-checked for
//      every batch. Calm mode is never read; app version never removes
//      anyone (it only shows the update-prompt block).
//
// Logging: ids, counts and codes only. Never an address, a token, a secret,
// a name or any content.
//
// Founder deployment: `supabase functions deploy member-email-runner
// --no-verify-jwt` (or the connector's deploy tool with verify_jwt false).
// Needs RESEND_API_KEY; MEMBER_EMAIL_REPLY_TO is optional; SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  abWinner,
  type Block,
  blocksSurveyId,
  type BlocksContent,
  buildWeeklySummary,
  claimsLint,
  inQuietHours,
  legacyToBlocks,
  lintCampaign,
  londonParts,
  type OutgoingEmail,
  RESEND_BATCH_MAX,
  sendBatch,
  sha256Hex,
  type WeeklyFacts,
} from '../_shared/memberEmail.ts'
import {
  cfgInt,
  contentOf,
  type Db,
  founderAlert,
  killSwitchOn,
  linkSecret,
  memberEmail,
  quota,
  readConfig,
  type Recipient,
  surveyFor,
} from '../_shared/memberEmailServer.ts'

const RUN_BUDGET_MS = 100 * 1000
const LEASE_SECONDS = 240
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

// The order automations run in: time-sensitive first.
const AUTOMATION_ORDER = ['welcome_1', 'welcome_2', 'welcome_3', 'weekly_summary', 'update_nudge', 'win_back',
  'anniversary', 'review_ask', 're_permission']

interface CampaignRow {
  id: string
  subject: string
  preheader: string | null
  body: string
  button_label: string | null
  button_url: string | null
  survey_id: string | null
  blocks: Block[] | null
  status: string
  topic: string
  ab_subject_b: string | null
  ab_wait_hours: number
  ab_phase: string | null
  ab_test_done_at: string | null
  holdout_percent: number
  started_at: string | null
  undo_until: string | null
  scheduled_at: string | null
}

interface AutomationRow {
  id: string
  key: string
  enabled: boolean
  topic: string | null
  subject: string
  preheader: string | null
  blocks: Block[]
}

interface Run {
  started: number
  remaining: number
  stopped: boolean
  sent: number
  failed: number
  notes: string[]
}

function respond(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

async function sameSecret(a: string, b: string): Promise<boolean> {
  // Compare digests, so the time taken says nothing about the secret.
  if (!a || !b) return false
  const [x, y] = await Promise.all([sha256Hex(a), sha256Hex(b)])
  let diff = 0
  for (let i = 0; i < x.length; i += 1) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0 && x.length === y.length
}

function timeLeft(run: Run): boolean {
  return !run.stopped && run.remaining > 0 && Date.now() - run.started < RUN_BUDGET_MS
}

function campaignContent(c: CampaignRow): { content: BlocksContent; surveyId: string | null } {
  const blocks = c.blocks && c.blocks.length > 0 ? c.blocks : legacyToBlocks(c)
  return { content: { subject: c.subject, preheader: c.preheader, blocks }, surveyId: blocksSurveyId(blocks) ?? c.survey_id }
}

function campaignLintErrors(c: CampaignRow): number {
  const v2 = claimsLint(c.blocks && c.blocks.length > 0
    ? { subject: c.subject, preheader: c.preheader, blocks: c.blocks }
    : { subject: c.subject, preheader: c.preheader, body: c.body, button_label: c.button_label, button_url: c.button_url })
  const v2b = c.ab_subject_b ? claimsLint({ subject: c.ab_subject_b, preheader: c.preheader, blocks: [{ type: 'paragraph', text: 'x' }] }) : null
  const v1 = c.blocks && c.blocks.length > 0 ? [] : lintCampaign(c)
  return v2.errors.length + (v2b ? v2b.errors.length : 0) + v1.length
}

// ─── Sending one batch ────────────────────────────────────────────────

async function sendRows(
  apiKey: string, emails: OutgoingEmail[], run: Run,
): Promise<{ ok: boolean; ids: string[]; code: string | null }> {
  const result = await sendBatch(apiKey, emails)
  if (result.ok) {
    run.sent += emails.length
    run.remaining -= emails.length
    return { ok: true, ids: result.ids, code: null }
  }
  run.failed += emails.length
  if (result.status === 429) run.stopped = true
  return { ok: false, ids: [], code: result.code }
}

// ─── Automations ──────────────────────────────────────────────────────

async function runAutomation(db: Db, a: AutomationRow, apiKey: string, secret: string, supabaseUrl: string, run: Run) {
  if (a.key !== 'weekly_summary') {
    const lint = claimsLint({ subject: a.subject, preheader: a.preheader, blocks: a.blocks })
    if (lint.errors.length > 0) {
      await db.from('member_email_automations').update({ enabled: false, disabled_reason: 'lint', updated_at: new Date().toISOString() }).eq('id', a.id)
      console.warn('[member-email-runner] automation turned off by the lint', { automation_id: a.id, errors: lint.errors.length })
      await founderAlert(db, apiKey, `lint-auto-${a.id}`, 'an automation was turned off',
        'An automation failed the claims lint and was turned off. Edit it on the members page and turn it back on.')
      return
    }
  }
  while (timeLeft(run)) {
    const limit = Math.min(run.remaining, RESEND_BATCH_MAX)
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await db.rpc('member_email_automation_candidates', { _key: a.key, _limit: limit })
    if (error) {
      console.error('[member-email-runner] automation candidates failed', { automation_id: a.id, code: error.code })
      return
    }
    const rows = (data ?? []) as (Recipient & { run_key: string; facts: Record<string, unknown> })[]
    if (rows.length === 0) return
    const emails: OutgoingEmail[] = []
    for (const m of rows) {
      let content: BlocksContent
      if (a.key === 'weekly_summary') {
        const built = buildWeeklySummary(m.facts as unknown as WeeklyFacts)
        content = { ...built, blocks: [...built.blocks, ...(a.blocks ?? [])] }
      } else {
        content = contentOf(a)
      }
      const years = typeof m.facts?.years === 'number' ? m.facts.years as number : null
      // eslint-disable-next-line no-await-in-loop
      emails.push(await memberEmail(content, m, secret, supabaseUrl, null, 'automation', { years }))
    }
    // eslint-disable-next-line no-await-in-loop
    const res = await sendRows(apiKey, emails, run)
    const logRows = rows.map((m, k) => ({
      user_id: m.user_id, run_key: m.run_key, status: res.ok ? 'sent' : 'failed',
      provider_id: res.ok ? (res.ids[k] || null) : null, error: res.code,
    }))
    // eslint-disable-next-line no-await-in-loop
    const { error: logErr } = await db.rpc('member_email_log_automation', { _automation_id: a.id, _rows: logRows })
    if (logErr) console.error('[member-email-runner] automation log failed', { automation_id: a.id, count: logRows.length, code: logErr.code })
    console.log('[member-email-runner] automation batch', { automation_id: a.id, count: rows.length, ok: res.ok, code: res.code })
    if (!res.ok) return
  }
}

// ─── Campaigns ────────────────────────────────────────────────────────

async function promoteDue(db: Db, run: Run) {
  const nowIso = new Date().toISOString()
  const { data, error } = await db.from('member_email_campaigns').select('*')
    .or(`and(status.eq.queued,undo_until.lte."${nowIso}"),and(status.eq.scheduled,scheduled_at.lte."${nowIso}")`)
    .limit(20)
  if (error) throw new Error('due campaigns read failed')
  for (const c of (data ?? []) as CampaignRow[]) {
    const { surveyId } = campaignContent(c)
    // eslint-disable-next-line no-await-in-loop
    const survey = surveyId ? await surveyFor(db, surveyId) : null
    const reason = campaignLintErrors(c) > 0 ? 'lint' : (surveyId && !survey?.open ? 'survey_closed' : null)
    const fields = reason
      ? { status: 'paused', paused_reason: reason, updated_at: nowIso }
      : { status: 'sending', started_at: c.started_at ?? nowIso, paused_reason: null, updated_at: nowIso }
    // eslint-disable-next-line no-await-in-loop
    await db.from('member_email_campaigns').update(fields).eq('id', c.id).in('status', ['queued', 'scheduled'])
    run.notes.push(reason ? `paused:${reason}` : 'started')
    console.log('[member-email-runner] campaign due', { campaign_id: c.id, outcome: reason ?? 'sending' })
  }
}

async function decideAb(db: Db, c: CampaignRow): Promise<boolean> {
  if (!c.ab_test_done_at) return false
  if (Date.now() < Date.parse(c.ab_test_done_at) + c.ab_wait_hours * 3600 * 1000) return false
  const { data, error } = await db.rpc('member_email_campaign_stats', { _campaign_id: c.id })
  if (error || !data) throw new Error('stats read failed')
  const v = ((data as Record<string, unknown>).variants ?? {}) as Record<string, { opened_unique?: number; clicked_unique?: number }>
  const pick = abWinner(
    { opened: v.a?.opened_unique ?? 0, clicked: v.a?.clicked_unique ?? 0 },
    { opened: v.b?.opened_unique ?? 0, clicked: v.b?.clicked_unique ?? 0 },
  )
  await db.from('member_email_campaigns').update({
    ab_phase: 'decided', ab_winner: pick.winner, ab_reason: pick.reason, updated_at: new Date().toISOString(),
  }).eq('id', c.id).eq('ab_phase', 'waiting')
  console.log('[member-email-runner] ab decided', { campaign_id: c.id, winner: pick.winner, reason: pick.reason })
  return true
}

async function finishCampaign(db: Db, c: CampaignRow, apiKey: string) {
  await db.rpc('member_email_record_holdouts', { _campaign_id: c.id })
  const { count: sent } = await db.from('member_email_sends').select('user_id', { count: 'exact', head: true })
    .eq('campaign_id', c.id).eq('status', 'sent')
  const { count: failed } = await db.from('member_email_sends').select('user_id', { count: 'exact', head: true })
    .eq('campaign_id', c.id).eq('status', 'failed')
  const nowIso = new Date().toISOString()
  const status = (failed ?? 0) > 0 ? 'partial' : 'sent'
  await db.from('member_email_campaigns').update({
    status, sent_count: sent ?? 0, failed_count: failed ?? 0, finished_at: nowIso, updated_at: nowIso,
    ...((sent ?? 0) > 0 ? { sent_at: nowIso } : {}),
  }).eq('id', c.id).eq('status', 'sending')
  console.log('[member-email-runner] campaign finished', { campaign_id: c.id, status, sent: sent ?? 0, failed: failed ?? 0 })
  await founderAlert(db, apiKey, `finished-${c.id}`, 'a send finished',
    `A member email finished sending: ${sent ?? 0} sent, ${failed ?? 0} not sent. The results are on the members page.`)
}

async function runCampaign(db: Db, c: CampaignRow, apiKey: string, secret: string, supabaseUrl: string, run: Run) {
  if (campaignLintErrors(c) > 0) {
    await db.from('member_email_campaigns').update({ status: 'paused', paused_reason: 'lint', updated_at: new Date().toISOString() })
      .eq('id', c.id).eq('status', 'sending')
    return
  }
  const { content, surveyId } = campaignContent(c)
  const survey = surveyId ? await surveyFor(db, surveyId) : null
  if (surveyId && !survey?.open) {
    await db.from('member_email_campaigns').update({ status: 'paused', paused_reason: 'survey_closed', updated_at: new Date().toISOString() })
      .eq('id', c.id).eq('status', 'sending')
    return
  }
  if (c.holdout_percent > 0) await db.rpc('member_email_record_holdouts', { _campaign_id: c.id })
  if (c.ab_subject_b && !c.ab_phase) {
    await db.from('member_email_campaigns').update({ ab_phase: 'testing' }).eq('id', c.id).is('ab_phase', null)
    c.ab_phase = 'testing'
  }
  if (c.ab_phase === 'waiting') {
    if (!await decideAb(db, c)) return
    c.ab_phase = 'decided'
  }
  while (timeLeft(run)) {
    const limit = Math.min(run.remaining, RESEND_BATCH_MAX)
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await db.rpc('member_email_campaign_recipients', { _campaign_id: c.id, _limit: limit })
    if (error) {
      console.error('[member-email-runner] recipients failed', { campaign_id: c.id, code: error.code })
      return
    }
    const rows = (data ?? []) as (Recipient & { variant: string | null })[]
    if (rows.length === 0) {
      if (c.ab_phase === 'testing') {
        // eslint-disable-next-line no-await-in-loop
        await db.from('member_email_campaigns').update({ ab_phase: 'waiting', ab_test_done_at: new Date().toISOString() })
          .eq('id', c.id).eq('ab_phase', 'testing')
        console.log('[member-email-runner] ab test sent; waiting', { campaign_id: c.id })
        return
      }
      // eslint-disable-next-line no-await-in-loop
      await finishCampaign(db, c, apiKey)
      return
    }
    const emails: OutgoingEmail[] = []
    for (const m of rows) {
      const subject = m.variant === 'b' && c.ab_subject_b ? c.ab_subject_b : c.subject
      // eslint-disable-next-line no-await-in-loop
      emails.push(await memberEmail({ ...content, subject }, m, secret, supabaseUrl, survey, 'campaign'))
    }
    // eslint-disable-next-line no-await-in-loop
    const res = await sendRows(apiKey, emails, run)
    const logRows = rows.map((m, k) => ({
      user_id: m.user_id, status: res.ok ? 'sent' : 'failed', provider_id: res.ok ? (res.ids[k] || null) : null,
      error: res.code, variant: m.variant,
    }))
    // eslint-disable-next-line no-await-in-loop
    const { error: logErr } = await db.rpc('member_email_log_campaign', { _campaign_id: c.id, _rows: logRows })
    if (logErr) console.error('[member-email-runner] send rows write failed', { campaign_id: c.id, count: logRows.length, code: logErr.code })
    // eslint-disable-next-line no-await-in-loop
    await db.from('member_email_campaigns').update({ updated_at: new Date().toISOString() }).eq('id', c.id)
    console.log('[member-email-runner] campaign batch', { campaign_id: c.id, count: rows.length, ok: res.ok, code: res.code })
    if (!res.ok) return
  }
}

// ─── One run ──────────────────────────────────────────────────────────

async function housekeeping(db: Db, cfg: Record<string, string>, apiKey: string, run: Run) {
  await db.rpc('member_email_sunset_maintenance')
  await db.rpc('member_email_app_return_sweep')
  const { data: alarms, error } = await db.rpc('member_email_alarm_check')
  if (error) throw new Error('alarm check failed')
  for (const a of (Array.isArray(alarms) ? alarms : []) as { campaign_id?: string; automation_id?: string; reason: string }[]) {
    const id = a.campaign_id ?? a.automation_id ?? 'unknown'
    console.warn('[member-email-runner] alarm stopped a send', { id, reason: a.reason })
    run.notes.push(`alarm:${a.reason}`)
    // eslint-disable-next-line no-await-in-loop
    await founderAlert(db, apiKey, `alarm-${id}-${a.reason}`, 'a send was stopped by an alarm',
      a.reason === 'alarm_complaints'
        ? 'Spam complaints went above the alarm level, so the send was stopped. Check it on the members page before resuming.'
        : 'Bounces went above the alarm level, so the send was stopped. Check it on the members page before resuming.')
  }
  const last = Date.parse(cfg.last_retention_at ?? '')
  if (!Number.isFinite(last) || Date.now() - last > 24 * 3600 * 1000) {
    const { data, error: rErr } = await db.rpc('member_email_retention')
    if (rErr) console.error('[member-email-runner] retention failed', rErr.code)
    else console.log('[member-email-runner] retention', data)
  }
  // A/B decisions do not send, so they run in quiet hours too.
  const { data: waiting } = await db.from('member_email_campaigns').select('*').eq('status', 'sending').eq('ab_phase', 'waiting').limit(20)
  for (const c of (waiting ?? []) as CampaignRow[]) {
    // eslint-disable-next-line no-await-in-loop
    await decideAb(db, c)
  }
}

async function tick(db: Db, supabaseUrl: string): Promise<Record<string, unknown>> {
  const run: Run = { started: Date.now(), remaining: 0, stopped: false, sent: 0, failed: 0, notes: [] }
  const cfg = await readConfig(db)
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  await housekeeping(db, cfg, apiKey, run)

  if (killSwitchOn(cfg)) return { ok: true, sending: 'kill_switch', notes: run.notes }
  if (!apiKey) return { ok: true, sending: 'not_configured', notes: run.notes }
  if (inQuietHours(Date.now(), cfg.quiet_hours_start ?? '21:00', cfg.quiet_hours_end ?? '08:00')) {
    return { ok: true, sending: 'quiet_hours', notes: run.notes }
  }

  await promoteDue(db, run)
  const q = await quota(db)
  run.remaining = q.remaining
  if (run.remaining <= 0) {
    const p = londonParts(Date.now())
    await founderAlert(db, apiKey, `quota-${p.year}-${p.month}-${p.day}`, 'the daily limit was reached',
      `Member email reached its limit of ${q.daily_cap} in 24 hours, so the rest will go out over the next days. Account emails are not affected.`)
    return { ok: true, sending: 'daily_cap', used_24h: q.used_24h, notes: run.notes }
  }
  const secret = await linkSecret(db)

  const { data: autos, error: aErr } = await db.from('member_email_automations').select('*').eq('enabled', true)
  if (aErr) throw new Error('automations read failed')
  const ordered = ((autos ?? []) as AutomationRow[]).sort((x, y) => AUTOMATION_ORDER.indexOf(x.key) - AUTOMATION_ORDER.indexOf(y.key))
  for (const a of ordered) {
    if (!timeLeft(run)) break
    // eslint-disable-next-line no-await-in-loop
    await runAutomation(db, a, apiKey, secret, supabaseUrl, run)
  }

  const { data: sending, error: cErr } = await db.from('member_email_campaigns').select('*')
    .eq('status', 'sending').order('started_at', { ascending: true }).limit(20)
  if (cErr) throw new Error('sending campaigns read failed')
  for (const c of (sending ?? []) as CampaignRow[]) {
    if (!timeLeft(run)) break
    // eslint-disable-next-line no-await-in-loop
    await runCampaign(db, c, apiKey, secret, supabaseUrl, run)
  }
  if (run.remaining <= 0 && cfgInt(cfg, 'daily_cap', 60) > 0) run.notes.push('daily_cap')
  return { ok: true, sent: run.sent, failed: run.failed, remaining: run.remaining, stopped: run.stopped, notes: run.notes }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return respond({ ok: false, error: 'method_not_allowed' }, 405)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[member-email-runner] missing env vars')
    return respond({ ok: false, error: 'server_misconfigured' }, 500)
  }
  // Nothing else is read before the request body is drained and discarded.
  await req.body?.cancel().catch(() => {})
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  try {
    const { data: row, error } = await db.from('member_email_config').select('value').eq('key', 'runner_secret').maybeSingle()
    if (error || !row || typeof row.value !== 'string' || row.value.length < 32) {
      console.error('[member-email-runner] runner secret unavailable')
      return respond({ ok: false, error: 'server_misconfigured' }, 500)
    }
    if (!await sameSecret(req.headers.get('x-runner-secret') ?? '', row.value)) {
      return respond({ ok: false, error: 'unauthorised' }, 401)
    }
    const { data: leased, error: leaseErr } = await db.rpc('member_email_runner_claim', { _seconds: LEASE_SECONDS })
    if (leaseErr) throw new Error('lease failed')
    if (leased !== true) return respond({ ok: true, skipped: 'busy' }, 200)
    try {
      const result = await tick(db, supabaseUrl)
      console.log('[member-email-runner] run', { sent: result.sent ?? 0, failed: result.failed ?? 0, sending: result.sending ?? 'yes' })
      return respond(result, 200)
    } finally {
      await db.rpc('member_email_runner_release')
    }
  } catch (e) {
    // The message is one of this file's own fixed strings; never a value.
    console.error('[member-email-runner] run failed', { reason: e instanceof Error ? e.message : 'unknown' })
    return respond({ ok: false, error: 'server_error' }, 500)
  }
})
