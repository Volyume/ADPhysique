// member-email-admin, the v2 actions (docs/member-email-2026-10-17/PLAN-V2.md
// M1 to M14; migrate_199). index.ts signs the admin in, re-checks
// `marketing_admins` on every call, audits every action, and hands every
// action named in V2_ACTIONS to `handleV2`. Nothing here sends a campaign:
// Send queues it (status 'queued', the undo window) and the runner sends it
// through the caps and holds; only a test or seed copy goes out from here,
// and those count against the daily cap too.
//
// Every action: POST JSON { action, session, ...inputs } -> { ok: true, ... }
// or { ok: false, error } with 400, 404, 409, 413, 502 or 503. The complete
// list, with inputs and outputs, is in the header of index.ts.
//
// Logging: ids, counts and codes only.

import {
  ASSET_MAX_BYTES,
  ASSET_TYPES,
  type Block,
  blocksPlainText,
  blocksSurveyId,
  buildWeeklySummary,
  CHECKLIST_ITEMS,
  claimsLint,
  corsHeaders,
  decodeBase64Bounded,
  FROM_ADDRESS,
  isHhMm,
  isTopic,
  jsonResponse as baseJson,
  legacyToBlocks,
  lintCampaign,
  makePrefsToken,
  makeUnsubscribeToken,
  oneClickUnsubscribeUrl,
  preferencesPageUrl,
  randomHex,
  renderBlocksEmail,
  resendDomains,
  safeHttpsUrl,
  sendOne,
  setResendTracking,
  sniffImageType,
  surveyUrl,
  unsubscribeHeaders,
  unsubscribePageUrl,
  UUID_RE,
  validateBlocks,
  validateChecklist,
  validateSegmentRules,
} from '../_shared/memberEmail.ts'
import {
  cfgInt,
  type Db,
  EDITABLE_SETTINGS,
  killSwitchOn,
  linkSecret,
  logDelivery,
  quota,
  READABLE_SETTINGS,
  readConfig,
  replyTo,
  surveyFor,
} from '../_shared/memberEmailServer.ts'

const CORS = corsHeaders('POST, OPTIONS')
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}$/
const SEMVER_RE = /^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$/
const ASSET_PATH_RE = /^[0-9a-f]{32}\.(png|jpg|gif|webp)$/
const BUCKET = 'member-email-assets'
// The test unsubscribe and preferences links name no account (as phase 1).
const NO_ACCOUNT = '00000000-0000-0000-0000-000000000000'
const MAX_SEEDS = 10
const AUTOMATION_KEYS = ['welcome_1', 'welcome_2', 'welcome_3', 'win_back', 'update_nudge', 'weekly_summary',
  'anniversary', 'review_ask', 're_permission']

export const V2_ACTIONS = [
  'home', 'insights',
  'list_campaigns', 'get_campaign', 'save_campaign', 'duplicate_campaign', 'preview', 'send_test', 'send_seed',
  'campaign_count', 'send_campaign', 'schedule_campaign', 'cancel_campaign', 'undo_send', 'pause_campaign',
  'resume_campaign', 'schedule_resend', 'campaign_stats',
  'list_segments', 'save_segment', 'delete_segment', 'segment_count',
  'list_templates', 'save_template', 'delete_template',
  'list_automations', 'save_automation', 'set_automation', 'automation_stats', 'preview_automation', 'test_automation',
  'member_detail', 'export_member',
  'get_settings', 'save_settings', 'set_kill_switch', 'add_seed', 'remove_seed', 'domain_status', 'set_domain_tracking',
  'audit_log', 'export_records',
  'upload_asset', 'list_assets', 'delete_asset',
  'set_survey_options',
] as const

export interface V2Context {
  db: Db
  adminEmail: string
  body: Record<string, unknown>
  supabaseUrl: string
}

function json(body: unknown, status: number): Response {
  return baseJson(body, status, CORS)
}

function fail(error: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ ok: false, error, ...extra }, status)
}

function idOf(v: unknown): string | null {
  return typeof v === 'string' && UUID_RE.test(v) ? v.toLowerCase() : null
}

function textOrNull(raw: unknown, max: number): { ok: true; value: string | null } | { ok: false } {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false }
  const v = raw.trim()
  if (v.length > max || /[\r\n]/.test(v)) return { ok: false }
  return { ok: true, value: v || null }
}

function intIn(raw: unknown, min: number, max: number): number | null {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= min && raw <= max ? raw : null
}

// ─── Campaign rows ────────────────────────────────────────────────────

interface Campaign {
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
  segment_id: string | null
  kind: string
  parent_campaign_id: string | null
  ab_subject_b: string | null
  holdout_percent: number
  paused_reason: string | null
  updated_at: string
  finished_at: string | null
  sent_at: string | null
}

async function loadCampaign(db: Db, id: unknown): Promise<Campaign | null> {
  const cid = idOf(id)
  if (!cid) return null
  const { data, error } = await db.from('member_email_campaigns').select('*').eq('id', cid).maybeSingle()
  if (error) throw new Error('campaign read failed')
  return (data as Campaign | null) ?? null
}

function blocksOf(c: Campaign): Block[] {
  return c.blocks && c.blocks.length > 0 ? c.blocks : legacyToBlocks(c)
}

function lintOf(c: Campaign) {
  const lint = c.blocks && c.blocks.length > 0
    ? claimsLint({ subject: c.subject, preheader: c.preheader, blocks: c.blocks })
    : claimsLint({ subject: c.subject, preheader: c.preheader, body: c.body, button_label: c.button_label, button_url: c.button_url })
  if (!(c.blocks && c.blocks.length > 0)) {
    for (const p of lintCampaign(c)) if (!lint.errors.some((e) => e.code === p.code && e.field === p.field)) lint.errors.push(p)
  }
  if (c.ab_subject_b) {
    const b = claimsLint({ subject: c.ab_subject_b, preheader: 'x', blocks: [{ type: 'paragraph', text: 'x' }] })
    for (const e of b.errors) lint.errors.push({ ...e, field: 'ab_subject_b' })
  }
  return lint
}

async function campaignCount(db: Db, id: string) {
  const { data, error } = await db.rpc('member_email_campaign_count', { _campaign_id: id })
  if (error) throw new Error(`count failed ${error.code ?? ''}`)
  return (data ?? {}) as { will_receive: number; holdout: number; already_sent: number; daily_cap: number; days_needed: number }
}

async function previewSurvey(db: Db, surveyId: string | null) {
  const s = await surveyFor(db, surveyId)
  return s ? { id: s.id, url: surveyUrl(s.id, null), first: s.first } : null
}

// ─── Home and insights ────────────────────────────────────────────────

async function home(ctx: V2Context): Promise<Response> {
  const { db } = ctx
  const cfg = await readConfig(db)
  const q = await quota(db)
  const { data: ins, error } = await db.rpc('member_email_insights', { _days: 30 })
  if (error) throw new Error('insights failed')
  const i = (ins ?? {}) as Record<string, number>
  const sent = Number(i.sent ?? 0)
  const bounceRate = sent > 0 ? Number(i.bounced ?? 0) / sent : 0
  const complaintRate = sent > 0 ? Number(i.complained ?? 0) / sent : 0
  const cRate = Number(cfg.alarm_complaint_rate ?? '0.003')
  const bRate = Number(cfg.alarm_bounce_rate ?? '0.05')
  const health = complaintRate > cRate || bounceRate > bRate ? 'red'
    : complaintRate > cRate / 3 || bounceRate > bRate / 2 ? 'amber' : 'green'
  const { data: upcoming } = await db.from('member_email_campaigns')
    .select('id, subject, status, scheduled_at, undo_until, started_at, paused_reason, topic')
    .in('status', ['queued', 'scheduled', 'sending', 'paused']).order('created_at', { ascending: false }).limit(20)
  const { count: autosOn } = await db.from('member_email_automations').select('id', { count: 'exact', head: true }).eq('enabled', true)
  const { data: alerts } = await db.from('member_email_alerts').select('key, created_at')
    .gt('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).order('created_at', { ascending: false }).limit(20)
  return json({
    ok: true,
    quota: q,
    kill_switch: { on: killSwitchOn(cfg), reason: cfg.kill_switch_reason || null },
    last_30_days: ins,
    delivery_health: { level: health, bounce_rate: bounceRate, complaint_rate: complaintRate },
    campaigns_active: upcoming ?? [],
    automations_on: autosOn ?? 0,
    // Alert keys only: finished-<id>, alarm-<id>-<reason>, quota-<date>, lint-auto-<id>.
    alerts: alerts ?? [],
    resend_configured: !!Deno.env.get('RESEND_API_KEY'),
    webhook_configured: !!Deno.env.get('RESEND_WEBHOOK_SECRET'),
  }, 200)
}

async function insights(ctx: V2Context): Promise<Response> {
  const days = intIn(ctx.body.days, 1, 365) ?? 30
  const { data, error } = await ctx.db.rpc('member_email_insights', { _days: days })
  if (error) throw new Error('insights failed')
  return json({ ok: true, insights: data }, 200)
}

// ─── Campaigns ────────────────────────────────────────────────────────

const CAMPAIGN_LIST_FIELDS = 'id, subject, status, topic, segment_id, kind, parent_campaign_id, scheduled_at, undo_until, '
  + 'started_at, finished_at, sent_at, paused_reason, recipient_count, sent_count, failed_count, ab_subject_b, '
  + 'holdout_percent, created_at, updated_at'

async function listCampaigns(ctx: V2Context): Promise<Response> {
  const offset = intIn(ctx.body.offset, 0, 100000) ?? 0
  let q = ctx.db.from('member_email_campaigns').select(CAMPAIGN_LIST_FIELDS)
  if (typeof ctx.body.status === 'string') q = q.eq('status', ctx.body.status)
  const { data, error } = await q.order('created_at', { ascending: false }).range(offset, offset + 49)
  if (error) throw new Error('campaigns read failed')
  return json({ ok: true, campaigns: data ?? [] }, 200)
}

async function getCampaign(ctx: V2Context): Promise<Response> {
  const c = await loadCampaign(ctx.db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  const count = await campaignCount(ctx.db, c.id)
  return json({ ok: true, campaign: c, lint: lintOf(c), count }, 200)
}

async function saveCampaign(ctx: V2Context): Promise<Response> {
  const { db, body, adminEmail } = ctx
  const subject = textOrNull(body.subject, 150)
  if (!subject.ok || !subject.value) return fail('bad_subject', 400)
  const preheader = textOrNull(body.preheader, 200)
  if (!preheader.ok) return fail('bad_preheader', 400)
  const topic = body.topic == null ? 'product_news' : body.topic
  if (!isTopic(topic)) return fail('bad_topic', 400)
  const abB = textOrNull(body.ab_subject_b, 150)
  if (!abB.ok) return fail('bad_ab_subject_b', 400)
  const abPct = body.ab_test_percent == null ? 20 : intIn(body.ab_test_percent, 10, 50)
  const abWait = body.ab_wait_hours == null ? 4 : intIn(body.ab_wait_hours, 1, 48)
  const holdout = body.holdout_percent == null ? 0 : intIn(body.holdout_percent, 0, 50)
  if (abPct === null || abWait === null || holdout === null) return fail('bad_ab_or_holdout', 400)

  let blocks: Block[] | null = null
  let text: string
  let buttonLabel: string | null = null
  let buttonUrl: string | null = null
  let surveyId: string | null = null
  if (body.blocks != null) {
    const v = validateBlocks(body.blocks)
    if (!v.ok) return fail(v.error, 400, v.question ? { where: v.question } : {})
    blocks = v.value
    text = blocksPlainText(blocks)
    surveyId = blocksSurveyId(blocks)
  } else {
    text = typeof body.body === 'string' ? body.body.replace(/\r\n?/g, '\n').trim() : ''
    if (text.length < 1 || text.length > 20000) return fail('bad_body', 400)
    const bl = textOrNull(body.button_label, 40)
    if (!bl.ok) return fail('bad_button_label', 400)
    buttonLabel = bl.value
    if (body.button_url != null && body.button_url !== '') {
      buttonUrl = safeHttpsUrl(body.button_url)
      if (!buttonUrl) return fail('button_url_not_https', 400)
    }
    if (body.survey_id != null && body.survey_id !== '') {
      surveyId = idOf(body.survey_id)
      if (!surveyId) return fail('bad_survey_id', 400)
    }
  }
  if (surveyId) {
    const { data: s, error } = await db.from('member_surveys').select('id').eq('id', surveyId).maybeSingle()
    if (error) throw new Error('survey read failed')
    if (!s) return fail('survey_not_found', 404)
  }
  let segmentId: string | null = null
  if (body.segment_id != null && body.segment_id !== '') {
    segmentId = idOf(body.segment_id)
    if (!segmentId) return fail('bad_segment_id', 400)
    const { data: g, error } = await db.from('member_email_segments').select('id').eq('id', segmentId).maybeSingle()
    if (error) throw new Error('segment read failed')
    if (!g) return fail('segment_not_found', 404)
  }
  const fields = {
    subject: subject.value, preheader: preheader.value, body: text, blocks, button_label: buttonLabel,
    button_url: buttonUrl, survey_id: surveyId, topic, segment_id: segmentId, ab_subject_b: abB.value,
    ab_test_percent: abPct, ab_wait_hours: abWait, holdout_percent: holdout, updated_at: new Date().toISOString(),
  }
  let row: Campaign | null
  if (body.id != null) {
    const id = idOf(body.id)
    if (!id) return fail('bad_id', 400)
    const { data, error } = await db.from('member_email_campaigns').update(fields).eq('id', id).eq('status', 'draft').select('*')
    if (error) throw new Error('campaign update failed')
    row = Array.isArray(data) && data[0] ? data[0] as Campaign : null
    if (!row) return fail('not_a_draft', 409)
  } else {
    const { data, error } = await db.from('member_email_campaigns')
      .insert({ ...fields, status: 'draft', created_by: adminEmail }).select('*').single()
    if (error) throw new Error('campaign insert failed')
    row = data as Campaign
  }
  return json({ ok: true, campaign: row, lint: lintOf(row) }, 200)
}

async function duplicateCampaign(ctx: V2Context): Promise<Response> {
  const c = await loadCampaign(ctx.db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  const { data, error } = await ctx.db.from('member_email_campaigns').insert({
    subject: c.subject.slice(0, 150), preheader: c.preheader, body: c.body, blocks: c.blocks,
    button_label: c.button_label, button_url: c.button_url, survey_id: c.survey_id, topic: c.topic,
    segment_id: c.segment_id, ab_subject_b: c.ab_subject_b, holdout_percent: c.holdout_percent,
    status: 'draft', created_by: ctx.adminEmail,
  }).select('*').single()
  if (error) throw new Error('campaign insert failed')
  return json({ ok: true, campaign: data }, 200)
}

async function preview(ctx: V2Context): Promise<Response> {
  const c = await loadCampaign(ctx.db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  const blocks = blocksOf(c)
  const subject = ctx.body.variant === 'b' && c.ab_subject_b ? c.ab_subject_b : c.subject
  const rendered = renderBlocksEmail({ subject, preheader: c.preheader, blocks }, {
    firstName: typeof ctx.body.first_name === 'string' ? ctx.body.first_name : null,
    appVersion: null, belowLatest: ctx.body.below_latest === true, platform: null,
  }, {
    unsubscribeUrl: unsubscribePageUrl('preview'), preferencesUrl: preferencesPageUrl('preview'),
    survey: await previewSurvey(ctx.db, blocksSurveyId(blocks)),
  }, { forceDark: ctx.body.dark === true })
  return json({ ok: true, subject: rendered.subject, html: rendered.html, text: rendered.text, lint: lintOf(c) }, 200)
}

// A copy to the signed-in admin (send_test) or to the seed list (send_seed).
// Never to an address from the request; refused under the kill switch and
// at the daily cap; recorded in the ledger against the campaign.
async function sendCopies(ctx: V2Context, kind: 'test' | 'seed'): Promise<Response> {
  const { db } = ctx
  const c = await loadCampaign(db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  const lint = lintOf(c)
  if (lint.errors.length > 0) return fail('lint_failed', 409, { lint })
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!apiKey) return fail('email_not_configured', 503)
  const cfg = await readConfig(db)
  if (killSwitchOn(cfg)) return fail('kill_switch_on', 409)
  let to: string[]
  if (kind === 'test') {
    to = [ctx.adminEmail]
  } else {
    const { data, error } = await db.from('member_email_seeds').select('email').limit(MAX_SEEDS)
    if (error) throw new Error('seeds read failed')
    to = ((data ?? []) as { email: string }[]).map((r) => r.email)
    if (to.length === 0) return fail('no_seeds', 409)
  }
  const q = await quota(db)
  if (q.remaining < to.length) return fail('daily_cap_reached', 409, { remaining: q.remaining })
  const secret = await linkSecret(db)
  const unsub = await makeUnsubscribeToken(NO_ACCOUNT, secret)
  const prefs = await makePrefsToken(NO_ACCOUNT, secret)
  const blocks = blocksOf(c)
  const survey = await previewSurvey(db, blocksSurveyId(blocks))
  let sent = 0
  for (const variant of c.ab_subject_b ? ['a', 'b'] : ['a']) {
    const rendered = renderBlocksEmail(
      { subject: variant === 'b' ? c.ab_subject_b ?? c.subject : c.subject, preheader: c.preheader, blocks },
      { firstName: null, appVersion: null, belowLatest: ctx.body.below_latest === true, platform: null },
      { unsubscribeUrl: unsubscribePageUrl(unsub), preferencesUrl: preferencesPageUrl(prefs), survey },
    )
    for (const address of to) {
      // eslint-disable-next-line no-await-in-loop
      const result = await sendOne(apiKey, {
        from: FROM_ADDRESS, to: [address], subject: `Test: ${rendered.subject}`, html: rendered.html, text: rendered.text,
        headers: unsubscribeHeaders(oneClickUnsubscribeUrl(ctx.supabaseUrl, unsub)),
        tags: [{ name: 'stream', value: 'member' }, { name: 'kind', value: kind }], ...replyTo(),
      })
      // eslint-disable-next-line no-await-in-loop
      await logDelivery(db, kind, c.id, null, result.ok ? (result.ids[0] || null) : null, result.ok ? 'sent' : 'failed',
        result.ok ? null : result.code)
      if (!result.ok) {
        console.error('[member-email-admin] copy send failed', { campaign_id: c.id, kind, code: result.code })
        return fail('send_failed', 502, { code: result.code, sent })
      }
      sent += 1
    }
  }
  return json({ ok: true, sent, sent_to: kind === 'test' ? 'you' : 'seed list' }, 200)
}

async function countAction(ctx: V2Context): Promise<Response> {
  const c = await loadCampaign(ctx.db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  return json({ ok: true, count: await campaignCount(ctx.db, c.id) }, 200)
}

// The checks every Send and Schedule passes: a draft, the lint clean, an
// open survey, the founder's four ticks, a test of THIS version sent, and
// the live number of recipients equal to the one the founder confirmed.
async function readyToQueue(ctx: V2Context, c: Campaign): Promise<Response | { checklist: Record<string, true>; count: { will_receive: number; days_needed: number } }> {
  if (c.status !== 'draft') return fail('not_a_draft', 409)
  const lint = lintOf(c)
  if (lint.errors.length > 0) return fail('lint_failed', 409, { lint })
  if (!Deno.env.get('RESEND_API_KEY')) return fail('email_not_configured', 503)
  const surveyId = blocksSurveyId(blocksOf(c))
  if (surveyId) {
    const s = await surveyFor(ctx.db, surveyId)
    if (!s || !s.open) return fail('survey_not_open', 409)
  }
  const checklist = validateChecklist(ctx.body.checklist)
  if (!checklist.ok) return fail(checklist.error, 400, { items: CHECKLIST_ITEMS, missing: checklist.question ?? null })
  const { count: tests, error: tErr } = await ctx.db.from('member_email_deliveries').select('id', { count: 'exact', head: true })
    .eq('campaign_id', c.id).in('kind', ['test', 'seed']).eq('status', 'sent').gte('created_at', c.updated_at)
  if (tErr) throw new Error('test check failed')
  if ((tests ?? 0) === 0) return fail('test_not_sent', 409)
  const expected = ctx.body.expected_recipients
  if (typeof expected !== 'number' || !Number.isSafeInteger(expected) || expected < 0) return fail('bad_expected_recipients', 400)
  const count = await campaignCount(ctx.db, c.id)
  if (count.will_receive !== expected) return fail('audience_changed', 409, { audience: count.will_receive })
  if (count.will_receive === 0) return fail('no_recipients', 409)
  return { checklist: checklist.value, count }
}

async function sendCampaign(ctx: V2Context): Promise<Response> {
  const c = await loadCampaign(ctx.db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  const ready = await readyToQueue(ctx, c)
  if (ready instanceof Response) return ready
  const cfg = await readConfig(ctx.db)
  const undoMinutes = Math.min(Math.max(cfgInt(cfg, 'undo_minutes', 10), 1), 60)
  const undoUntil = new Date(Date.now() + undoMinutes * 60000).toISOString()
  const { data, error } = await ctx.db.from('member_email_campaigns').update({
    status: 'queued', undo_until: undoUntil, scheduled_at: null, checklist: { ...ready.checklist, at: new Date().toISOString() },
    queued_by: ctx.adminEmail, recipient_count: ready.count.will_receive,
  }).eq('id', c.id).eq('status', 'draft').select('id')
  if (error) throw new Error('queue failed')
  if (!Array.isArray(data) || data.length === 0) return fail('not_a_draft', 409)
  console.log('[member-email-admin] campaign queued', { campaign_id: c.id, recipients: ready.count.will_receive })
  return json({ ok: true, status: 'queued', undo_until: undoUntil, recipients: ready.count.will_receive,
    days_needed: ready.count.days_needed }, 200)
}

async function scheduleCampaign(ctx: V2Context): Promise<Response> {
  const c = await loadCampaign(ctx.db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  const at = typeof ctx.body.scheduled_at === 'string' ? Date.parse(ctx.body.scheduled_at) : NaN
  const cfg = await readConfig(ctx.db)
  const undoMinutes = Math.min(Math.max(cfgInt(cfg, 'undo_minutes', 10), 1), 60)
  if (!Number.isFinite(at) || at < Date.now() + undoMinutes * 60000 || at > Date.now() + 90 * 86400000) {
    return fail('bad_scheduled_at', 400, { earliest_minutes: undoMinutes })
  }
  const ready = await readyToQueue(ctx, c)
  if (ready instanceof Response) return ready
  const iso = new Date(at).toISOString()
  const { data, error } = await ctx.db.from('member_email_campaigns').update({
    status: 'scheduled', scheduled_at: iso, undo_until: null, checklist: { ...ready.checklist, at: new Date().toISOString() },
    queued_by: ctx.adminEmail, recipient_count: ready.count.will_receive,
  }).eq('id', c.id).eq('status', 'draft').select('id')
  if (error) throw new Error('schedule failed')
  if (!Array.isArray(data) || data.length === 0) return fail('not_a_draft', 409)
  return json({ ok: true, status: 'scheduled', scheduled_at: iso, recipients: ready.count.will_receive }, 200)
}

// Undo or cancel: before anything is sent it goes back to a draft; once
// sending started it becomes 'cancelled' (what was sent stays sent).
async function cancelCampaign(ctx: V2Context): Promise<Response> {
  const c = await loadCampaign(ctx.db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  const nowIso = new Date().toISOString()
  if (c.status === 'queued' || c.status === 'scheduled') {
    const { data, error } = await ctx.db.from('member_email_campaigns').update({
      status: 'draft', undo_until: null, scheduled_at: null, checklist: null, updated_at: nowIso,
    }).eq('id', c.id).in('status', ['queued', 'scheduled']).select('id')
    if (error) throw new Error('cancel failed')
    if (!Array.isArray(data) || data.length === 0) return fail('already_started', 409)
    return json({ ok: true, status: 'draft' }, 200)
  }
  if (c.status === 'sending' || c.status === 'paused' || c.status === 'partial') {
    const { error } = await ctx.db.from('member_email_campaigns').update({ status: 'cancelled', cancelled_at: nowIso, updated_at: nowIso })
      .eq('id', c.id).in('status', ['sending', 'paused', 'partial'])
    if (error) throw new Error('cancel failed')
    return json({ ok: true, status: 'cancelled' }, 200)
  }
  return fail('not_cancellable', 409, { status: c.status })
}

async function pauseCampaign(ctx: V2Context): Promise<Response> {
  const c = await loadCampaign(ctx.db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  const { data, error } = await ctx.db.from('member_email_campaigns')
    .update({ status: 'paused', paused_reason: 'admin', updated_at: new Date().toISOString() })
    .eq('id', c.id).in('status', ['sending', 'queued', 'scheduled']).select('id')
  if (error) throw new Error('pause failed')
  if (!Array.isArray(data) || data.length === 0) return fail('not_sending', 409)
  return json({ ok: true, status: 'paused' }, 200)
}

async function resumeCampaign(ctx: V2Context): Promise<Response> {
  const c = await loadCampaign(ctx.db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  if (c.status !== 'paused' && c.status !== 'partial') return fail('not_paused', 409)
  if ((c.paused_reason === 'alarm_complaints' || c.paused_reason === 'alarm_bounces') && ctx.body.confirm_alarm !== true) {
    return fail('alarm_confirm_required', 409, { reason: c.paused_reason })
  }
  const lint = lintOf(c)
  if (lint.errors.length > 0) return fail('lint_failed', 409, { lint })
  const surveyId = blocksSurveyId(blocksOf(c))
  if (surveyId) {
    const s = await surveyFor(ctx.db, surveyId)
    if (!s || !s.open) return fail('survey_not_open', 409)
  }
  const nowIso = new Date().toISOString()
  const { error } = await ctx.db.from('member_email_campaigns')
    .update({ status: 'sending', paused_reason: null, started_at: c.sent_at ?? nowIso, updated_at: nowIso })
    .eq('id', c.id).in('status', ['paused', 'partial'])
  if (error) throw new Error('resume failed')
  return json({ ok: true, status: 'sending' }, 200)
}

// Resend to non-openers: once per campaign, after N days, a new subject,
// to members who got it and neither opened nor clicked it.
async function scheduleResend(ctx: V2Context): Promise<Response> {
  const c = await loadCampaign(ctx.db, ctx.body.id)
  if (!c) return fail('not_found', 404)
  if (c.kind !== 'broadcast' || (c.status !== 'sent' && c.status !== 'partial')) return fail('not_sent', 409)
  const subject = textOrNull(ctx.body.subject, 150)
  if (!subject.ok || !subject.value) return fail('bad_subject', 400)
  const days = intIn(ctx.body.after_days, 1, 14)
  if (days === null) return fail('bad_after_days', 400)
  const checklist = validateChecklist(ctx.body.checklist)
  if (!checklist.ok) return fail(checklist.error, 400, { items: CHECKLIST_ITEMS })
  const draft = { ...c, subject: subject.value, ab_subject_b: null }
  const lint = lintOf(draft)
  if (lint.errors.length > 0) return fail('lint_failed', 409, { lint })
  const base = Date.parse(c.finished_at ?? c.sent_at ?? new Date().toISOString())
  const at = new Date(Math.max(base + days * 86400000, Date.now() + 15 * 60000)).toISOString()
  const { data, error } = await ctx.db.from('member_email_campaigns').insert({
    subject: subject.value, preheader: c.preheader, body: c.body, blocks: c.blocks, button_label: c.button_label,
    button_url: c.button_url, survey_id: c.survey_id, topic: c.topic, segment_id: c.segment_id,
    kind: 'resend', parent_campaign_id: c.id, status: 'scheduled', scheduled_at: at,
    checklist: { ...checklist.value, at: new Date().toISOString() }, queued_by: ctx.adminEmail, created_by: ctx.adminEmail,
  }).select('*').single()
  if (error) {
    if (error.code === '23505') return fail('resend_exists', 409)
    throw new Error('resend insert failed')
  }
  return json({ ok: true, campaign: data }, 200)
}

async function campaignStats(ctx: V2Context): Promise<Response> {
  const id = idOf(ctx.body.id)
  if (!id) return fail('bad_id', 400)
  const { data, error } = await ctx.db.rpc('member_email_campaign_stats', { _campaign_id: id })
  if (error) throw new Error('stats failed')
  if (!data) return fail('not_found', 404)
  return json({ ok: true, stats: data }, 200)
}

// ─── Segments ─────────────────────────────────────────────────────────

async function segmentCountOf(db: Db, rules: unknown, topic: string | null) {
  const { data, error } = await db.rpc('member_email_segment_count', { _rules: rules, _topic: topic })
  if (error) {
    if (error.code === '22023') return null
    throw new Error('segment count failed')
  }
  return data as { matching: number; will_receive: number }
}

async function listSegments(ctx: V2Context): Promise<Response> {
  const { data, error } = await ctx.db.from('member_email_segments').select('*').order('created_at', { ascending: false }).limit(50)
  if (error) throw new Error('segments read failed')
  const out = []
  for (const g of (data ?? []) as { rules: unknown }[]) {
    // eslint-disable-next-line no-await-in-loop
    out.push({ ...g, count: await segmentCountOf(ctx.db, g.rules, null) })
  }
  return json({ ok: true, segments: out }, 200)
}

async function saveSegment(ctx: V2Context): Promise<Response> {
  const name = textOrNull(ctx.body.name, 80)
  if (!name.ok || !name.value) return fail('bad_name', 400)
  const rules = validateSegmentRules(ctx.body.rules)
  if (!rules.ok) return fail(rules.error, 400)
  const count = await segmentCountOf(ctx.db, rules.value, null)
  if (!count) return fail('bad_rules', 400)
  const fields = { name: name.value, rules: rules.value, updated_at: new Date().toISOString() }
  if (ctx.body.id != null) {
    const id = idOf(ctx.body.id)
    if (!id) return fail('bad_id', 400)
    // A segment behind a queued, scheduled or sending email is not changed under it.
    const { count: busy } = await ctx.db.from('member_email_campaigns').select('id', { count: 'exact', head: true })
      .eq('segment_id', id).in('status', ['queued', 'scheduled', 'sending', 'paused'])
    if ((busy ?? 0) > 0) return fail('segment_in_use', 409)
    const { data, error } = await ctx.db.from('member_email_segments').update(fields).eq('id', id).select('*')
    if (error) throw new Error('segment update failed')
    if (!Array.isArray(data) || !data[0]) return fail('not_found', 404)
    return json({ ok: true, segment: data[0], count }, 200)
  }
  const { data, error } = await ctx.db.from('member_email_segments').insert({ ...fields, created_by: ctx.adminEmail }).select('*').single()
  if (error) throw new Error('segment insert failed')
  return json({ ok: true, segment: data, count }, 200)
}

async function deleteSegment(ctx: V2Context): Promise<Response> {
  const id = idOf(ctx.body.id)
  if (!id) return fail('bad_id', 400)
  const { data, error } = await ctx.db.from('member_email_segments').delete().eq('id', id).select('id')
  if (error) {
    if (error.code === '23503') return fail('segment_in_use', 409)
    throw new Error('segment delete failed')
  }
  return json({ ok: true, removed: Array.isArray(data) && data.length > 0 }, 200)
}

async function segmentCount(ctx: V2Context): Promise<Response> {
  let rules: unknown
  if (ctx.body.id != null) {
    const id = idOf(ctx.body.id)
    if (!id) return fail('bad_id', 400)
    const { data, error } = await ctx.db.from('member_email_segments').select('rules').eq('id', id).maybeSingle()
    if (error) throw new Error('segment read failed')
    if (!data) return fail('not_found', 404)
    rules = data.rules
  } else {
    const v = validateSegmentRules(ctx.body.rules ?? [])
    if (!v.ok) return fail(v.error, 400)
    rules = v.value
  }
  const topic = ctx.body.topic == null ? null : ctx.body.topic
  if (topic !== null && !isTopic(topic)) return fail('bad_topic', 400)
  const count = await segmentCountOf(ctx.db, rules, topic as string | null)
  if (!count) return fail('bad_rules', 400)
  return json({ ok: true, ...count }, 200)
}

// ─── Templates ────────────────────────────────────────────────────────

async function listTemplates(ctx: V2Context): Promise<Response> {
  const { data, error } = await ctx.db.from('member_email_templates').select('*').order('updated_at', { ascending: false }).limit(100)
  if (error) throw new Error('templates read failed')
  return json({ ok: true, templates: data ?? [] }, 200)
}

async function saveTemplate(ctx: V2Context): Promise<Response> {
  const name = textOrNull(ctx.body.name, 80)
  const subject = textOrNull(ctx.body.subject, 150)
  const preheader = textOrNull(ctx.body.preheader, 200)
  if (!name.ok || !name.value) return fail('bad_name', 400)
  if (!subject.ok || !subject.value) return fail('bad_subject', 400)
  if (!preheader.ok) return fail('bad_preheader', 400)
  const blocks = validateBlocks(ctx.body.blocks)
  if (!blocks.ok) return fail(blocks.error, 400, blocks.question ? { where: blocks.question } : {})
  const fields = { name: name.value, subject: subject.value, preheader: preheader.value, blocks: blocks.value, updated_at: new Date().toISOString() }
  const lint = claimsLint({ subject: subject.value, preheader: preheader.value, blocks: blocks.value })
  if (ctx.body.id != null) {
    const id = idOf(ctx.body.id)
    if (!id) return fail('bad_id', 400)
    const { data, error } = await ctx.db.from('member_email_templates').update(fields).eq('id', id).select('*')
    if (error) throw new Error('template update failed')
    if (!Array.isArray(data) || !data[0]) return fail('not_found', 404)
    return json({ ok: true, template: data[0], lint }, 200)
  }
  const { data, error } = await ctx.db.from('member_email_templates').insert({ ...fields, created_by: ctx.adminEmail }).select('*').single()
  if (error) throw new Error('template insert failed')
  return json({ ok: true, template: data, lint }, 200)
}

async function deleteTemplate(ctx: V2Context): Promise<Response> {
  const id = idOf(ctx.body.id)
  if (!id) return fail('bad_id', 400)
  const { data, error } = await ctx.db.from('member_email_templates').delete().eq('id', id).select('id')
  if (error) throw new Error('template delete failed')
  return json({ ok: true, removed: Array.isArray(data) && data.length > 0 }, 200)
}

// ─── Automations ──────────────────────────────────────────────────────

interface AutomationRow {
  id: string
  key: string
  enabled: boolean
  topic: string | null
  subject: string
  preheader: string | null
  blocks: Block[]
  params: Record<string, unknown>
}

async function loadAutomation(db: Db, key: unknown): Promise<AutomationRow | null> {
  if (typeof key !== 'string' || !AUTOMATION_KEYS.includes(key)) return null
  const { data, error } = await db.from('member_email_automations').select('*').eq('key', key).maybeSingle()
  if (error) throw new Error('automation read failed')
  return (data as AutomationRow | null) ?? null
}

const SAMPLE_WEEK = { sessions_last_week: 3, sessions_4w: 10, streak_weeks: 4 }

function automationContent(a: AutomationRow, sample = SAMPLE_WEEK) {
  if (a.key === 'weekly_summary') {
    const built = buildWeeklySummary(sample)
    return { ...built, blocks: [...built.blocks, ...(a.blocks ?? [])] }
  }
  return { subject: a.subject, preheader: a.preheader, blocks: a.blocks }
}

function automationLint(a: AutomationRow) {
  return claimsLint(automationContent(a))
}

function validParams(key: string, raw: unknown): Record<string, number> | null {
  const p = raw == null ? {} : raw
  if (typeof p !== 'object' || Array.isArray(p)) return null
  const r = p as Record<string, unknown>
  const allowed: Record<string, [number, number]> = key.startsWith('welcome_') ? { delay_days: [0, 30] }
    : key === 'win_back' ? { days: [14, 30] }
      : key === 'update_nudge' ? { after_days: [1, 90] }
        : key === 're_permission' ? { grace_days: [7, 60] } : {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(r)) {
    const range = allowed[k]
    if (!range || intIn(v, range[0], range[1]) === null) return null
    if (key === 'win_back' && v !== 14 && v !== 30) return null
    out[k] = v as number
  }
  return out
}

async function listAutomations(ctx: V2Context): Promise<Response> {
  const { data, error } = await ctx.db.from('member_email_automations').select('*').order('created_at')
  if (error) throw new Error('automations read failed')
  const out = []
  for (const a of (data ?? []) as AutomationRow[]) {
    // eslint-disable-next-line no-await-in-loop
    const { data: stats } = await ctx.db.rpc('member_email_automation_stats', { _automation_id: a.id, _days: 30 })
    out.push({ ...a, lint: automationLint(a), stats_30d: stats ?? null })
  }
  return json({ ok: true, automations: out }, 200)
}

async function saveAutomation(ctx: V2Context): Promise<Response> {
  const a = await loadAutomation(ctx.db, ctx.body.key)
  if (!a) return fail('not_found', 404)
  const subject = textOrNull(ctx.body.subject, 150)
  const preheader = textOrNull(ctx.body.preheader, 200)
  if (!subject.ok || !subject.value) return fail('bad_subject', 400)
  if (!preheader.ok) return fail('bad_preheader', 400)
  let blocks: Block[] = []
  if (a.key === 'weekly_summary' && Array.isArray(ctx.body.blocks) && ctx.body.blocks.length === 0) {
    blocks = []
  } else {
    const v = validateBlocks(ctx.body.blocks)
    if (!v.ok) return fail(v.error, 400, v.question ? { where: v.question } : {})
    blocks = v.value
    // The automations carry no survey block (a survey goes out as a campaign).
    if (blocksSurveyId(blocks)) return fail('no_survey_in_automation', 400)
  }
  let topic = a.topic
  if (a.key !== 're_permission' && a.key !== 'weekly_summary' && ctx.body.topic != null) {
    if (!isTopic(ctx.body.topic) || ctx.body.topic === 'weekly_summary') return fail('bad_topic', 400)
    topic = ctx.body.topic
  }
  const params = validParams(a.key, ctx.body.params ?? a.params)
  if (!params) return fail('bad_params', 400)
  const next = { ...a, subject: subject.value, preheader: preheader.value, blocks, topic, params }
  const lint = automationLint(next)
  // An automation whose copy now fails the lint is turned off at once.
  const { data, error } = await ctx.db.from('member_email_automations').update({
    subject: subject.value, preheader: preheader.value, blocks, topic, params, updated_by: ctx.adminEmail,
    updated_at: new Date().toISOString(),
    ...(lint.errors.length > 0 ? { enabled: false, disabled_reason: 'lint' } : {}),
  }).eq('id', a.id).select('*')
  if (error) throw new Error('automation update failed')
  return json({ ok: true, automation: Array.isArray(data) ? data[0] : null, lint }, 200)
}

async function setAutomation(ctx: V2Context): Promise<Response> {
  const a = await loadAutomation(ctx.db, ctx.body.key)
  if (!a) return fail('not_found', 404)
  if (typeof ctx.body.enabled !== 'boolean') return fail('bad_enabled', 400)
  const nowIso = new Date().toISOString()
  if (ctx.body.enabled) {
    const lint = automationLint(a)
    if (lint.errors.length > 0) return fail('lint_failed', 409, { lint })
    if (!Deno.env.get('RESEND_API_KEY')) return fail('email_not_configured', 503)
    // enabled_at is when it was turned on: the welcome series and the review
    // ask only ever reach members after this moment, never everyone at once.
    const { data, error } = await ctx.db.from('member_email_automations').update({
      enabled: true, enabled_at: a.enabled ? undefined : nowIso, disabled_reason: null, updated_by: ctx.adminEmail, updated_at: nowIso,
    }).eq('id', a.id).select('*')
    if (error) throw new Error('automation update failed')
    return json({ ok: true, automation: Array.isArray(data) ? data[0] : null }, 200)
  }
  const { data, error } = await ctx.db.from('member_email_automations').update({
    enabled: false, disabled_reason: 'admin', updated_by: ctx.adminEmail, updated_at: nowIso,
  }).eq('id', a.id).select('*')
  if (error) throw new Error('automation update failed')
  return json({ ok: true, automation: Array.isArray(data) ? data[0] : null }, 200)
}

async function automationStats(ctx: V2Context): Promise<Response> {
  const a = await loadAutomation(ctx.db, ctx.body.key)
  if (!a) return fail('not_found', 404)
  const days = intIn(ctx.body.days, 1, 730) ?? 30
  const { data, error } = await ctx.db.rpc('member_email_automation_stats', { _automation_id: a.id, _days: days })
  if (error) throw new Error('stats failed')
  return json({ ok: true, stats: data }, 200)
}

function sampleWeek(raw: unknown) {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    sessions_last_week: intIn(r.sessions_last_week, 1, 99) ?? SAMPLE_WEEK.sessions_last_week,
    sessions_4w: intIn(r.sessions_4w, 1, 400) ?? SAMPLE_WEEK.sessions_4w,
    streak_weeks: intIn(r.streak_weeks, 0, 52) ?? SAMPLE_WEEK.streak_weeks,
  }
}

async function previewAutomation(ctx: V2Context): Promise<Response> {
  const a = await loadAutomation(ctx.db, ctx.body.key)
  if (!a) return fail('not_found', 404)
  const content = automationContent(a, sampleWeek(ctx.body.sample))
  const rendered = renderBlocksEmail(content, {
    firstName: typeof ctx.body.first_name === 'string' ? ctx.body.first_name : null, appVersion: null,
    belowLatest: a.key === 'update_nudge' || ctx.body.below_latest === true, platform: null, years: 1,
  }, { unsubscribeUrl: unsubscribePageUrl('preview'), preferencesUrl: preferencesPageUrl('preview') },
  { forceDark: ctx.body.dark === true })
  return json({ ok: true, subject: rendered.subject, html: rendered.html, text: rendered.text, lint: claimsLint(content) }, 200)
}

async function testAutomation(ctx: V2Context): Promise<Response> {
  const a = await loadAutomation(ctx.db, ctx.body.key)
  if (!a) return fail('not_found', 404)
  const content = automationContent(a, sampleWeek(ctx.body.sample))
  const lint = claimsLint(content)
  if (lint.errors.length > 0) return fail('lint_failed', 409, { lint })
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!apiKey) return fail('email_not_configured', 503)
  const cfg = await readConfig(ctx.db)
  if (killSwitchOn(cfg)) return fail('kill_switch_on', 409)
  const q = await quota(ctx.db)
  if (q.remaining < 1) return fail('daily_cap_reached', 409, { remaining: q.remaining })
  const secret = await linkSecret(ctx.db)
  const unsub = await makeUnsubscribeToken(NO_ACCOUNT, secret)
  const prefs = await makePrefsToken(NO_ACCOUNT, secret)
  const rendered = renderBlocksEmail(content, {
    firstName: null, appVersion: null, belowLatest: a.key === 'update_nudge', platform: null, years: 1,
  }, { unsubscribeUrl: unsubscribePageUrl(unsub), preferencesUrl: preferencesPageUrl(prefs) })
  const result = await sendOne(apiKey, {
    from: FROM_ADDRESS, to: [ctx.adminEmail], subject: `Test: ${rendered.subject}`, html: rendered.html, text: rendered.text,
    headers: unsubscribeHeaders(oneClickUnsubscribeUrl(ctx.supabaseUrl, unsub)),
    tags: [{ name: 'stream', value: 'member' }, { name: 'kind', value: 'test' }], ...replyTo(),
  })
  await logDelivery(ctx.db, 'test', null, a.id, result.ok ? (result.ids[0] || null) : null, result.ok ? 'sent' : 'failed',
    result.ok ? null : result.code)
  if (!result.ok) return fail('send_failed', 502, { code: result.code })
  return json({ ok: true, sent_to: 'you' }, 200)
}

// ─── Members ──────────────────────────────────────────────────────────

async function memberDetail(ctx: V2Context): Promise<Response> {
  const id = idOf(ctx.body.user_id)
  if (!id) return fail('bad_user_id', 400)
  const { data, error } = await ctx.db.rpc('member_email_member_detail', { _user_id: id })
  if (error) throw new Error('member read failed')
  if (!data) return fail('not_found', 404)
  return json({ ok: true, member: data }, 200)
}

// A member's email records (M11), for a request from that member.
async function exportMember(ctx: V2Context): Promise<Response> {
  const id = idOf(ctx.body.user_id)
  if (!id) return fail('bad_user_id', 400)
  const { data: member, error } = await ctx.db.rpc('member_email_member_detail', { _user_id: id })
  if (error) throw new Error('member read failed')
  if (!member) return fail('not_found', 404)
  const { data: deliveries } = await ctx.db.from('member_email_deliveries')
    .select('id, kind, campaign_id, automation_id, variant, status, created_at, app_returned').eq('user_id', id).limit(5000)
  const { data: events } = await ctx.db.from('member_email_events')
    .select('type, occurred_at, campaign_id, automation_id, link_url').eq('user_id', id).limit(10000)
  const { data: prefEvents } = await ctx.db.from('member_email_pref_events')
    .select('subscribed, source, topic, notice_version, created_at').eq('user_id', id).limit(5000)
  const { data: answers } = await ctx.db.from('member_survey_answers').select('survey_id, answers, created_at').eq('user_id', id).limit(1000)
  const { data: reasons } = await ctx.db.from('member_email_unsub_reasons').select('reason, created_at').eq('user_id', id).limit(1000)
  const records = { exported_at: new Date().toISOString(), member, deliveries, events, preference_events: prefEvents,
    survey_answers: answers, unsubscribe_reasons: reasons }
  return json({ ok: true, filename: `volyume-member-email-${id}.json`, json: JSON.stringify(records, null, 2) }, 200)
}

// ─── Settings ─────────────────────────────────────────────────────────

async function getSettings(ctx: V2Context): Promise<Response> {
  const cfg = await readConfig(ctx.db)
  const settings: Record<string, string> = {}
  for (const k of READABLE_SETTINGS) settings[k] = cfg[k] ?? ''
  const { data: seeds } = await ctx.db.from('member_email_seeds').select('email, created_at').order('created_at')
  return json({
    ok: true, settings, quota: await quota(ctx.db), seeds: seeds ?? [],
    sender: FROM_ADDRESS, timezone: 'Europe/London',
    resend_configured: !!Deno.env.get('RESEND_API_KEY'),
    webhook_configured: !!Deno.env.get('RESEND_WEBHOOK_SECRET'),
    webhook_url: `${ctx.supabaseUrl.replace(/\/+$/, '')}/functions/v1/member-email-webhook`,
  }, 200)
}

function checkSetting(key: string, v: unknown, cfg: Record<string, string>, next: Record<string, string>): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null
  const s = String(v).trim()
  const int = (min: number, max: number) => (/^[0-9]{1,9}$/.test(s) && Number(s) >= min && Number(s) <= max ? s : null)
  const rate = () => (/^0(\.[0-9]{1,6})?$/.test(s) && Number(s) > 0 && Number(s) <= 0.5 ? s : null)
  switch (key) {
    case 'provider_daily_limit': return int(1, 1000000)
    case 'daily_cap': {
      // Computed against Resend's daily limit: member email may use at most
      // 60 percent of it, so account email always has room (60 of 100).
      const limit = Number(next.provider_daily_limit ?? cfg.provider_daily_limit ?? '100')
      return int(0, Math.floor(limit * 0.6))
    }
    case 'weekly_member_cap': return int(1, 14)
    case 'quiet_hours_start':
    case 'quiet_hours_end': return isHhMm(s) ? s : null
    case 'latest_app_version': return s === '' || SEMVER_RE.test(s) ? s : null
    case 'alarm_complaint_rate':
    case 'alarm_bounce_rate': return rate()
    case 'retention_months': return int(1, 120)
    case 'undo_minutes': return int(1, 60)
    case 'sunset_days': return int(90, 730)
    case 'review_ask_workouts': return int(1, 1000)
    default: return null
  }
}

async function saveSettings(ctx: V2Context): Promise<Response> {
  const input = ctx.body.settings
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('bad_settings', 400)
  const cfg = await readConfig(ctx.db)
  const next: Record<string, string> = {}
  const entries = Object.entries(input as Record<string, unknown>)
  // provider_daily_limit first, so a new limit and a new cap can go together.
  entries.sort(([a], [b]) => (a === 'provider_daily_limit' ? -1 : b === 'provider_daily_limit' ? 1 : 0))
  for (const [k, v] of entries) {
    if (!(EDITABLE_SETTINGS as readonly string[]).includes(k)) return fail('unknown_setting', 400, { key: k })
    const ok = checkSetting(k, v, cfg, next)
    if (ok === null) return fail('bad_setting', 400, { key: k })
    next[k] = ok
  }
  if (next.provider_daily_limit && !next.daily_cap) {
    const cap = Number(cfg.daily_cap ?? '60')
    if (cap > Math.floor(Number(next.provider_daily_limit) * 0.6)) return fail('bad_setting', 400, { key: 'daily_cap' })
  }
  if ('latest_app_version' in next && next.latest_app_version !== cfg.latest_app_version) {
    next.latest_app_version_set_at = next.latest_app_version ? new Date().toISOString() : ''
  }
  for (const [key, value] of Object.entries(next)) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await ctx.db.from('member_email_config').upsert({ key, value }, { onConflict: 'key' })
    if (error) throw new Error('setting write failed')
  }
  return await getSettings(ctx)
}

async function setKillSwitch(ctx: V2Context): Promise<Response> {
  if (typeof ctx.body.on !== 'boolean') return fail('bad_on', 400)
  const reason = textOrNull(ctx.body.reason, 200)
  if (!reason.ok) return fail('bad_reason', 400)
  const rows = [
    { key: 'kill_switch', value: ctx.body.on ? 'on' : 'off' },
    { key: 'kill_switch_reason', value: ctx.body.on ? (reason.value ?? '') : '' },
  ]
  const { error } = await ctx.db.from('member_email_config').upsert(rows, { onConflict: 'key' })
  if (error) throw new Error('kill switch write failed')
  const on = ctx.body.on === true
  console.log('[member-email-admin] kill switch', { on })
  return json({ ok: true, kill_switch: { on: ctx.body.on, reason: ctx.body.on ? reason.value : null } }, 200)
}

async function addSeed(ctx: V2Context): Promise<Response> {
  const email = typeof ctx.body.email === 'string' ? ctx.body.email.trim().toLowerCase() : ''
  if (email.length > 320 || !EMAIL_RE.test(email)) return fail('bad_email', 400)
  const { count } = await ctx.db.from('member_email_seeds').select('email', { count: 'exact', head: true })
  if ((count ?? 0) >= MAX_SEEDS) return fail('too_many_seeds', 409, { max: MAX_SEEDS })
  const { error } = await ctx.db.from('member_email_seeds').upsert({ email, added_by: ctx.adminEmail }, { onConflict: 'email' })
  if (error) throw new Error('seed write failed')
  return json({ ok: true }, 200)
}

async function removeSeed(ctx: V2Context): Promise<Response> {
  const email = typeof ctx.body.email === 'string' ? ctx.body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email)) return fail('bad_email', 400)
  const { data, error } = await ctx.db.from('member_email_seeds').delete().eq('email', email).select('email')
  if (error) throw new Error('seed delete failed')
  return json({ ok: true, removed: Array.isArray(data) && data.length > 0 }, 200)
}

// DMARC is not in Resend's domain records, so it is read from DNS where the
// runtime allows it; otherwise it is reported as unknown (never assumed).
async function dmarc(domain: string): Promise<{ status: 'found' | 'missing' | 'unknown'; policy: string | null }> {
  try {
    const resolve = (Deno as unknown as { resolveDns?: (n: string, t: string) => Promise<string[][]> }).resolveDns
    if (typeof resolve !== 'function') return { status: 'unknown', policy: null }
    const txt = await resolve(`_dmarc.${domain}`, 'TXT')
    const record = txt.map((parts) => parts.join('')).find((r) => /^v=DMARC1/i.test(r))
    if (!record) return { status: 'missing', policy: null }
    const m = record.match(/;\s*p=([a-z]+)/i)
    return { status: 'found', policy: m ? m[1].toLowerCase() : null }
  } catch (_) {
    return { status: 'unknown', policy: null }
  }
}

async function domainStatus(_ctx: V2Context): Promise<Response> {
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!apiKey) return fail('email_not_configured', 503)
  const result = await resendDomains(apiKey)
  // A sending-only Resend key cannot read domains; the page says so.
  if (!result.ok) return fail('domain_read_failed', 502, { code: result.code })
  const out = []
  for (const d of result.domains) {
    // eslint-disable-next-line no-await-in-loop
    out.push({ ...d, dmarc: d.name ? await dmarc(d.name) : { status: 'unknown', policy: null } })
  }
  return json({ ok: true, domains: out }, 200)
}

async function setDomainTracking(ctx: V2Context): Promise<Response> {
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!apiKey) return fail('email_not_configured', 503)
  const domain = typeof ctx.body.domain === 'string' ? ctx.body.domain.trim().toLowerCase() : ''
  if (!/^[a-z0-9.-]{3,253}$/.test(domain)) return fail('bad_domain', 400)
  if (typeof ctx.body.open !== 'boolean' || typeof ctx.body.click !== 'boolean') return fail('bad_tracking', 400)
  const result = await setResendTracking(apiKey, domain, ctx.body.open, ctx.body.click)
  if (!result.ok) return fail('tracking_update_failed', 502, { code: result.code })
  return json({ ok: true }, 200)
}

// ─── Records ──────────────────────────────────────────────────────────

async function auditLog(ctx: V2Context): Promise<Response> {
  const offset = intIn(ctx.body.offset, 0, 1000000) ?? 0
  const limit = intIn(ctx.body.limit, 1, 100) ?? 50
  let q = ctx.db.from('member_email_audit_log').select('id, admin_email, action, target, status, detail, created_at')
  if (typeof ctx.body.filter_action === 'string' && /^[a-z_]{1,60}$/.test(ctx.body.filter_action)) {
    q = q.eq('action', ctx.body.filter_action)
  }
  const { data, error } = await q.order('id', { ascending: false }).range(offset, offset + limit - 1)
  if (error) throw new Error('audit read failed')
  return json({ ok: true, entries: data ?? [] }, 200)
}

function csv(rows: Record<string, unknown>[], cols: string[]): string {
  const cell = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
    return `"${safe.replace(/"/g, '""')}"`
  }
  return [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n'
}

const EXPORTS: Record<string, { table: string; cols: string[]; order: string }> = {
  audit: { table: 'member_email_audit_log', cols: ['created_at', 'admin_email', 'action', 'target', 'status', 'detail'], order: 'id' },
  pref_events: { table: 'member_email_pref_events', cols: ['created_at', 'user_id', 'subscribed', 'source', 'topic', 'notice_version'], order: 'created_at' },
  suppressions: { table: 'member_email_suppressions', cols: ['created_at', 'user_id', 'reason', 'cleared_at'], order: 'created_at' },
  unsub_reasons: { table: 'member_email_unsub_reasons', cols: ['created_at', 'user_id', 'reason'], order: 'created_at' },
}

async function exportRecords(ctx: V2Context): Promise<Response> {
  const kind = typeof ctx.body.kind === 'string' ? ctx.body.kind : ''
  const spec = EXPORTS[kind]
  if (!spec) return fail('bad_kind', 400, { kinds: Object.keys(EXPORTS) })
  const { data, error } = await ctx.db.from(spec.table).select(spec.cols.join(', ')).order(spec.order, { ascending: false }).limit(20000)
  if (error) throw new Error('export read failed')
  return json({ ok: true, filename: `volyume-member-email-${kind}.csv`, csv: csv((data ?? []) as unknown as Record<string, unknown>[], spec.cols) }, 200)
}

// ─── Assets ───────────────────────────────────────────────────────────

async function uploadAsset(ctx: V2Context): Promise<Response> {
  const claimed = typeof ctx.body.content_type === 'string' ? ctx.body.content_type : ''
  if (!(claimed in ASSET_TYPES)) return fail('bad_content_type', 400, { allowed: Object.keys(ASSET_TYPES) })
  const bytes = decodeBase64Bounded(ctx.body.data_base64, ASSET_MAX_BYTES)
  if (!bytes) return fail('bad_or_too_large', 413, { max_bytes: ASSET_MAX_BYTES })
  // The type is read from the bytes, never trusted from the request.
  const sniffed = sniffImageType(bytes)
  if (!sniffed || sniffed !== claimed) return fail('not_that_image_type', 400)
  const path = `${randomHex(16)}.${ASSET_TYPES[sniffed]}`
  const { error } = await ctx.db.storage.from(BUCKET).upload(path, bytes, { contentType: sniffed, upsert: false, cacheControl: '31536000' })
  if (error) throw new Error('asset upload failed')
  const { data } = ctx.db.storage.from(BUCKET).getPublicUrl(path)
  console.log('[member-email-admin] asset uploaded', { bytes: bytes.length })
  return json({ ok: true, path, url: data.publicUrl }, 200)
}

async function listAssets(ctx: V2Context): Promise<Response> {
  const { data, error } = await ctx.db.storage.from(BUCKET).list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw new Error('asset list failed')
  const assets = (data ?? []).filter((f) => ASSET_PATH_RE.test(f.name)).map((f) => ({
    path: f.name, url: ctx.db.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
    bytes: (f.metadata as Record<string, unknown> | null)?.size ?? null, created_at: f.created_at,
  }))
  return json({ ok: true, assets }, 200)
}

async function deleteAsset(ctx: V2Context): Promise<Response> {
  const path = typeof ctx.body.path === 'string' ? ctx.body.path : ''
  if (!ASSET_PATH_RE.test(path)) return fail('bad_path', 400)
  const { error } = await ctx.db.storage.from(BUCKET).remove([path])
  if (error) throw new Error('asset delete failed')
  return json({ ok: true }, 200)
}

// ─── Surveys (v2 options) ─────────────────────────────────────────────

async function setSurveyOptions(ctx: V2Context): Promise<Response> {
  const id = idOf(ctx.body.id)
  if (!id) return fail('bad_id', 400)
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('closes_at' in ctx.body) {
    if (ctx.body.closes_at === null || ctx.body.closes_at === '') fields.closes_at = null
    else {
      const at = typeof ctx.body.closes_at === 'string' ? Date.parse(ctx.body.closes_at) : NaN
      if (!Number.isFinite(at)) return fail('bad_closes_at', 400)
      fields.closes_at = new Date(at).toISOString()
    }
  }
  if ('anonymous' in ctx.body) {
    if (typeof ctx.body.anonymous !== 'boolean') return fail('bad_anonymous', 400)
    fields.anonymous = ctx.body.anonymous
  }
  const { data, error } = await ctx.db.from('member_surveys').update(fields).eq('id', id).select('*')
  if (error) throw new Error('survey update failed')
  if (!Array.isArray(data) || !data[0]) return fail('not_found', 404)
  return json({ ok: true, survey: data[0] }, 200)
}

// ─── Dispatch ─────────────────────────────────────────────────────────

export async function handleV2(action: string, ctx: V2Context): Promise<Response | null> {
  switch (action) {
    case 'home': return await home(ctx)
    case 'insights': return await insights(ctx)
    case 'list_campaigns': return await listCampaigns(ctx)
    case 'get_campaign': return await getCampaign(ctx)
    case 'save_campaign': return await saveCampaign(ctx)
    case 'duplicate_campaign': return await duplicateCampaign(ctx)
    case 'preview': return await preview(ctx)
    case 'send_test': return await sendCopies(ctx, 'test')
    case 'send_seed': return await sendCopies(ctx, 'seed')
    case 'campaign_count': return await countAction(ctx)
    case 'send_campaign': return await sendCampaign(ctx)
    case 'schedule_campaign': return await scheduleCampaign(ctx)
    case 'cancel_campaign':
    case 'undo_send': return await cancelCampaign(ctx)
    case 'pause_campaign': return await pauseCampaign(ctx)
    case 'resume_campaign': return await resumeCampaign(ctx)
    case 'schedule_resend': return await scheduleResend(ctx)
    case 'campaign_stats': return await campaignStats(ctx)
    case 'list_segments': return await listSegments(ctx)
    case 'save_segment': return await saveSegment(ctx)
    case 'delete_segment': return await deleteSegment(ctx)
    case 'segment_count': return await segmentCount(ctx)
    case 'list_templates': return await listTemplates(ctx)
    case 'save_template': return await saveTemplate(ctx)
    case 'delete_template': return await deleteTemplate(ctx)
    case 'list_automations': return await listAutomations(ctx)
    case 'save_automation': return await saveAutomation(ctx)
    case 'set_automation': return await setAutomation(ctx)
    case 'automation_stats': return await automationStats(ctx)
    case 'preview_automation': return await previewAutomation(ctx)
    case 'test_automation': return await testAutomation(ctx)
    case 'member_detail': return await memberDetail(ctx)
    case 'export_member': return await exportMember(ctx)
    case 'get_settings': return await getSettings(ctx)
    case 'save_settings': return await saveSettings(ctx)
    case 'set_kill_switch': return await setKillSwitch(ctx)
    case 'add_seed': return await addSeed(ctx)
    case 'remove_seed': return await removeSeed(ctx)
    case 'domain_status': return await domainStatus(ctx)
    case 'set_domain_tracking': return await setDomainTracking(ctx)
    case 'audit_log': return await auditLog(ctx)
    case 'export_records': return await exportRecords(ctx)
    case 'upload_asset': return await uploadAsset(ctx)
    case 'list_assets': return await listAssets(ctx)
    case 'delete_asset': return await deleteAsset(ctx)
    case 'set_survey_options': return await setSurveyOptions(ctx)
    default: return null
  }
}
