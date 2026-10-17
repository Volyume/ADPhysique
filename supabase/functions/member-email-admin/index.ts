// Edge Function: member-email-admin
//
// WRITTEN, NOT DEPLOYED (2026-10-17). Needs migrate_198 applied first and the
// founder's go to deploy. The back end of the private page
// https://volyume.app/members/ (spec docs/member-email-2026-10-17/SPEC.md
// section 2; founder decisions of 2026-10-17: members are emailed by default
// and can turn it off; the admin can exclude people).
//
// Auth model: NO Supabase JWT (deployed with verify_jwt = false, like
// community-public). The page signs in with a one-time link this function
// emails to an address in `marketing_admins` (15 minutes, single use, the
// nonce stored only as its SHA-256), exchanged for a 12-hour admin session
// token signed with `member_email_config.link_secret`. EVERY action after
// that re-checks that the session's email is STILL in `marketing_admins`, so
// removing an admin ends their sessions at once. Everything runs as the
// service role; the member email tables have no client access at all.
//
// POST JSON { action, session?, ... }, CORS for https://volyume.app only.
//   request_login    { email }                       -> { ok: true } ALWAYS
//   exchange         { login }                       -> { ok, session, email, expires_at }
//   overview         {}                              -> { ok, audience, members, excluded,
//                                                         turned_off, paused, unconfirmed,
//                                                         opted_out, campaigns, surveys }
//   delete_campaign  { id }                          -> { ok }                   (drafts only)
//   (save_campaign, preview, send_test and send_campaign moved to v2.ts, below:
//   Send now QUEUES the email behind the undo window and the runner sends it.)
//   save_survey      { id?, title, intro, questions } -> { ok, survey }
//   set_survey_status { id, status }                 -> { ok, survey }
//   survey_results   { id }                          -> { ok, survey, total, questions }
//   export_survey    { id }                          -> { ok, filename, csv }
//   list_members     { query?, offset?, limit? }     -> { ok, total, members }
//     (each member row is passed through from the RPC as is, including the
//     information-only last_seen_day, app_version, platform, workouts_7d,
//     workouts_30d and last_workout_at; none of them decides who is emailed)
//   exclude          { user_id?, email?, note? }     -> { ok, exclusion, already }
//   include          { id }                          -> { ok, removed }
//   list_exclusions  {}                              -> { ok, exclusions }
//
// Member email v2 (PLAN-V2, migrate_199), in ./v2.ts. Every input below is
// optional unless marked *; ids are uuids; times are ISO strings (UTC).
//   home            {}  -> { quota, kill_switch, last_30_days, delivery_health
//                         { level green|amber|red, bounce_rate, complaint_rate },
//                         campaigns_active, automations_on, alerts, resend_configured,
//                         webhook_configured }
//   insights        { days=30 }  -> { insights: { sent, failed, delivered,
//                         opened_unique, clicked_unique, bounced, complained, delayed,
//                         suppressed, unsubscribed, app_returned_7d, app_return_measured,
//                         opens_inflated, audience_now, unsubscribe_reasons,
//                         survey_answers, daily[{ day, sent }], quota } }
//   list_campaigns  { status, offset }  -> { campaigns }  (50 a page)
//   get_campaign    { id* }  -> { campaign, lint, count }
//   save_campaign   { id, subject*, preheader, blocks | (body, button_label,
//                     button_url, survey_id), topic=product_news, segment_id,
//                     ab_subject_b, ab_test_percent=20, ab_wait_hours=4,
//                     holdout_percent=0 }  -> { campaign, lint }   (drafts only)
//   duplicate_campaign { id* }  -> { campaign }   (a new draft)
//   preview         { id*, dark, below_latest, first_name, variant a|b }
//                     -> { subject, html, text, lint }
//   send_test       { id*, below_latest }  -> { sent, sent_to: 'you' }  (both
//                     subjects when A/B; counts against the daily cap)
//   send_seed       { id* }  -> { sent, sent_to: 'seed list' }
//   campaign_count  { id* }  -> { count: { will_receive, holdout, already_sent,
//                     daily_cap, days_needed } }
//   send_campaign   { id*, expected_recipients*, checklist* }  -> { status:
//                     'queued', undo_until, recipients, days_needed }
//   schedule_campaign { id*, scheduled_at*, expected_recipients*, checklist* }
//                     -> { status: 'scheduled', scheduled_at, recipients }
//     checklist = { audience_confirmed, topic_confirmed, test_sent,
//     links_checked } all true; a test or seed copy of THIS version must have
//     been sent; the lint must pass; a survey must be open.
//   cancel_campaign / undo_send { id* }  -> { status: 'draft' } before sending,
//                     { status: 'cancelled' } once started
//   pause_campaign  { id* }  -> { status: 'paused' }
//   resume_campaign { id*, confirm_alarm (required after an alarm) }
//                     -> { status: 'sending' }
//   schedule_resend { id*, subject*, after_days* 1..14, checklist* }  -> { campaign }
//   campaign_stats  { id* }  -> { stats: { ...insights counts, small_sample,
//                     links[{ url, clicks, unique }], variants{ a, b }, ab{ phase,
//                     winner, reason }, holdout{ members, app_returned_7d,
//                     measured }, survey_answers } }
//   list_segments   {}  -> { segments[{ ..., count{ matching, will_receive } }] }
//   save_segment    { id, name*, rules* }  -> { segment, count }
//   delete_segment  { id* }  -> { removed }   (409 segment_in_use)
//   segment_count   { id | rules, topic }  -> { matching, will_receive }
//     rules: AND-ed [{ field, op, value }]: joined before|after 'YYYY-MM-DD';
//     last_used within|over days; app_version below|at_least 'x.y.z' (unknown
//     counts as below); platform is|is_not ios|android|other|unknown;
//     workouts_30d at_least|at_most n; last_workout within|over days;
//     community is|is_not; email_received|email_opened|email_clicked yes|no
//     <campaign id>; topic on|off <topic>.
//   list_templates  {}  -> { templates }
//   save_template   { id, name*, subject*, preheader, blocks* }  -> { template, lint }
//   delete_template { id* }  -> { removed }
//   list_automations {}  -> { automations[{ ..., lint, stats_30d }] }
//   save_automation { key*, subject*, preheader, blocks*, topic, params }
//                     -> { automation, lint }  (a lint failure turns it off)
//   set_automation  { key*, enabled* }  -> { automation }
//   automation_stats { key*, days=30 }  -> { stats }
//   preview_automation { key*, sample, dark, first_name, below_latest }
//                     -> { subject, html, text, lint }
//   test_automation { key*, sample }  -> { sent_to: 'you' }
//     keys: welcome_1, welcome_2, welcome_3, win_back, update_nudge,
//     weekly_summary, anniversary, review_ask, re_permission
//   member_detail   { user_id* }  -> { member }   (status word only, never a reason)
//   export_member   { user_id* }  -> { filename, json }
//   get_settings    {}  -> { settings, quota, seeds, sender, timezone,
//                     resend_configured, webhook_configured, webhook_url }
//   save_settings   { settings*: { daily_cap, provider_daily_limit,
//                     weekly_member_cap, quiet_hours_start, quiet_hours_end,
//                     latest_app_version, alarm_complaint_rate, alarm_bounce_rate,
//                     retention_months, undo_minutes, sunset_days,
//                     review_ask_workouts } }  -> as get_settings
//   set_kill_switch { on*, reason }  -> { kill_switch }
//   add_seed / remove_seed { email* }  -> { ok } / { removed }
//   domain_status   {}  -> { domains[{ name, status, records, open_tracking,
//                     click_tracking, dmarc{ status, policy } }] }
//   set_domain_tracking { domain*, open*, click* }  -> { ok }
//   audit_log       { offset, limit<=100, filter_action }  -> { entries }
//   export_records  { kind*: audit|pref_events|suppressions|unsub_reasons }
//                     -> { filename, csv }
//   upload_asset    POST ?action=upload_asset { content_type*, data_base64* }
//                     -> { path, url }  (PNG, JPEG, GIF, WebP; 2 MB)
//   list_assets     {}  -> { assets[{ path, url, bytes, created_at }] }
//   delete_asset    { path* }  -> { ok }
//   set_survey_options { id*, closes_at, anonymous }  -> { survey }
// Every authenticated action is written to member_email_audit_log (who,
// what, target id, status), and a sign-in too.
// Errors: { ok: false, error: <code> } with 400, 401, 404, 409, 413, 500 or
// 503.
//
// Logging: ids, counts and status codes only. Never an address, a nonce, a
// token, a secret or an answer.
//
// Founder deployment: `supabase functions deploy member-email-admin
// --no-verify-jwt` (or the connector's deploy tool with verify_jwt false).
// Needs RESEND_API_KEY (Supabase dashboard, Edge Functions, Secrets);
// MEMBER_EMAIL_REPLY_TO is optional; SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { readBoundedJson, RequestBodyError } from '../_shared/boundedJson.ts'
import { audit, logDelivery } from '../_shared/memberEmailServer.ts'
import { handleV2, V2_ACTIONS } from './v2.ts'
import {
  adminLoginUrl,
  type AnswerRow,
  FROM_ADDRESS,
  LOGIN_NONCE_MINUTES,
  MAX_OPEN_LOGINS,
  corsHeaders,
  jsonResponse as baseJson,
  makeAdminSession,
  randomHex,
  sendOne,
  sha256Hex,
  type SurveyQuestion,
  surveyCsv,
  surveyResults,
  UUID_RE,
  validateQuestions,
  validateSurveyMeta,
  verifyToken,
} from '../_shared/memberEmail.ts'

const CORS = corsHeaders('POST, OPTIONS')
const MAX_BODY_BYTES = 256 * 1024
// upload_asset only, chosen from the query string before the body is read:
// a 2 MB image is about 2.8 MB as base64.
const UPLOAD_BODY_BYTES = 3 * 1024 * 1024
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}$/
const LOGIN_RE = /^[0-9a-f]{64}$/
const REQUEST_LOGIN_MIN_MS = 1200

function json(body: unknown, status: number): Response {
  return baseJson(body, status, CORS)
}

function fail(error: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ ok: false, error, ...extra }, status)
}

interface AdminBody {
  action?: string
  session?: string
  [key: string]: unknown
}

let cachedSecret: string | null = null

async function linkSecret(admin: SupabaseClient): Promise<string> {
  if (cachedSecret) return cachedSecret
  const { data, error } = await admin
    .from('member_email_config').select('value').eq('key', 'link_secret').maybeSingle()
  if (error || !data || typeof data.value !== 'string' || data.value.length < 32) {
    throw new Error('link secret unavailable')
  }
  cachedSecret = data.value
  return data.value
}

async function isAdmin(admin: SupabaseClient, email: string): Promise<boolean> {
  const { data, error } = await admin
    .from('marketing_admins').select('email').eq('email', email.toLowerCase()).maybeSingle()
  if (error) throw new Error('admin check failed')
  return !!data
}

function cleanEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (email.length > 320 || !EMAIL_RE.test(email)) return null
  return email
}

function optionalText(raw: unknown, max: number): { ok: true; value: string | null } | { ok: false } {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false }
  const value = raw.trim()
  if (value.length > max) return { ok: false }
  return { ok: true, value: value || null }
}

async function padTo(startedMs: number, minMs: number): Promise<void> {
  const wait = minMs - (Date.now() - startedMs)
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
}

// ─── Sign-in ──────────────────────────────────────────────────────────

// ALWAYS answers { ok: true }, whatever the address and whatever fails, after
// the same minimum time, so the page cannot be used to learn who is an admin.
async function requestLogin(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  const started = Date.now()
  try {
    const email = cleanEmail(body.email)
    if (email && await isAdmin(admin, email)) {
      const nowIso = new Date().toISOString()
      // Housekeeping: expired sign-in rows older than a day are removed.
      await admin.from('member_email_admin_logins').delete()
        .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      const { count, error: countErr } = await admin
        .from('member_email_admin_logins')
        .select('nonce', { count: 'exact', head: true })
        .eq('email', email).is('used_at', null).gt('expires_at', nowIso)
      if (countErr) {
        console.error('[member-email-admin] open login count failed', countErr.code)
      } else if ((count ?? 0) >= MAX_OPEN_LOGINS) {
        console.warn('[member-email-admin] login rate limit reached')
      } else {
        const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
        if (!apiKey) {
          console.error('[member-email-admin] RESEND_API_KEY missing; sign-in email not sent')
        } else {
          const nonce = randomHex(32)
          const { error: insErr } = await admin.from('member_email_admin_logins').insert({
            nonce: await sha256Hex(nonce),
            email,
            expires_at: new Date(Date.now() + LOGIN_NONCE_MINUTES * 60 * 1000).toISOString(),
          })
          if (insErr) {
            console.error('[member-email-admin] login insert failed', insErr.code)
          } else {
            const link = adminLoginUrl(nonce)
            const result = await sendOne(apiKey, {
              from: FROM_ADDRESS,
              to: [email],
              subject: 'Your Volyume sign-in link',
              text: `Use this link to sign in to the Volyume members page. It works once, for ${LOGIN_NONCE_MINUTES} minutes.\n\n${link}\n\nIf you did not ask for it, you can ignore this email.`,
              html: `<p>Use this link to sign in to the Volyume members page. It works once, for ${LOGIN_NONCE_MINUTES} minutes.</p><p><a href="${link}">Sign in</a></p><p>If you did not ask for it, you can ignore this email.</p>`,
            })
            if (!result.ok) console.error('[member-email-admin] sign-in email failed', result.code)
            // The sign-in link counts in the quota ledger (never refused by it).
            await logDelivery(admin, 'login', null, null, result.ok ? (result.ids[0] || null) : null,
              result.ok ? 'sent' : 'failed', result.ok ? null : result.code).catch(() => {})
          }
        }
      }
    }
  } catch (_) {
    console.error('[member-email-admin] request_login failed')
  }
  await padTo(started, REQUEST_LOGIN_MIN_MS)
  return json({ ok: true }, 200)
}

async function exchange(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  const login = typeof body.login === 'string' ? body.login.trim().toLowerCase() : ''
  if (!LOGIN_RE.test(login)) return fail('invalid_login', 401)
  const hash = await sha256Hex(login)
  // Single use: the claim is the conditional update itself, so two
  // exchanges of one link cannot both succeed.
  const { data, error } = await admin
    .from('member_email_admin_logins')
    .update({ used_at: new Date().toISOString() })
    .eq('nonce', hash).is('used_at', null).gt('expires_at', new Date().toISOString())
    .select('email')
  if (error) {
    console.error('[member-email-admin] exchange failed', error.code)
    return fail('server_error', 500)
  }
  const row = Array.isArray(data) ? data[0] : null
  if (!row || typeof row.email !== 'string') return fail('invalid_login', 401)
  if (!await isAdmin(admin, row.email)) return fail('invalid_login', 401)
  const { session, expires_at } = await makeAdminSession(row.email, await linkSecret(admin))
  await audit(admin, row.email, 'sign_in', null, 200).catch(() => {})
  return json({ ok: true, session, email: row.email, expires_at }, 200)
}

// The admin email of a valid session that is STILL in marketing_admins, or
// null. Called before every action other than request_login and exchange.
async function requireAdmin(admin: SupabaseClient, session: unknown): Promise<string | null> {
  const payload = await verifyToken(session, await linkSecret(admin), 'admin')
  if (!payload || typeof payload.e !== 'string') return null
  return await isAdmin(admin, payload.e) ? payload.e : null
}

// ─── Overview ─────────────────────────────────────────────────────────

async function audience(admin: SupabaseClient): Promise<{ user_id: string; email: string }[]> {
  const { data, error } = await admin.rpc('member_email_audience')
  if (error) throw new Error(`audience read failed ${error.code ?? ''}`)
  return Array.isArray(data) ? data as { user_id: string; email: string }[] : []
}

async function overview(admin: SupabaseClient): Promise<Response> {
  const list = await audience(admin)
  const { data: counts, error: countErr } = await admin.rpc('member_email_counts')
  if (countErr) throw new Error('counts read failed')
  const { data: campaigns, error: campErr } = await admin
    .from('member_email_campaigns').select('*').order('created_at', { ascending: false }).limit(50)
  if (campErr) throw new Error('campaigns read failed')
  const { data: surveys, error: survErr } = await admin
    .from('member_surveys')
    .select('id, title, intro, questions, status, created_at, updated_at, member_survey_answers(count)')
    .order('created_at', { ascending: false }).limit(50)
  if (survErr) throw new Error('surveys read failed')
  const c = (counts ?? {}) as Record<string, number>
  return json({
    ok: true,
    audience: list.length,
    members: c.members ?? 0,
    excluded: c.excluded ?? 0,
    turned_off: c.turned_off ?? 0,
    paused: c.paused ?? 0,
    unconfirmed: c.unconfirmed ?? 0,
    opted_out: c.opt_out_rows ?? 0,
    campaigns: campaigns ?? [],
    surveys: (surveys ?? []).map((s: Record<string, unknown>) => {
      const agg = s.member_survey_answers as { count?: number }[] | undefined
      const { member_survey_answers: _drop, ...rest } = s
      return { ...rest, responses: Array.isArray(agg) && agg[0] ? agg[0].count ?? 0 : 0 }
    }),
  }, 200)
}

// ─── Campaigns ────────────────────────────────────────────────────────

async function deleteCampaign(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return fail('bad_id', 400)
  const { data, error } = await admin.from('member_email_campaigns')
    .delete().eq('id', body.id).eq('status', 'draft').select('id')
  if (error) throw new Error('campaign delete failed')
  if (!Array.isArray(data) || data.length === 0) return fail('not_a_draft', 409)
  return json({ ok: true }, 200)
}

// ─── Surveys ──────────────────────────────────────────────────────────

async function saveSurvey(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  const meta = validateSurveyMeta(body.title, body.intro)
  if (!meta.ok) return fail(meta.error, 400)
  const questions = validateQuestions(body.questions)
  if (!questions.ok) return fail(questions.error, 400, questions.question ? { question: questions.question } : {})
  const fields = {
    title: meta.value.title,
    intro: meta.value.intro,
    questions: questions.value,
    updated_at: new Date().toISOString(),
  }
  if (body.id != null) {
    if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return fail('bad_id', 400)
    // Answers are validated against the questions they were given for, so
    // a survey that already has answers keeps its questions.
    const { count, error: cErr } = await admin.from('member_survey_answers')
      .select('id', { count: 'exact', head: true }).eq('survey_id', body.id)
    if (cErr) throw new Error('answers count failed')
    if ((count ?? 0) > 0) return fail('survey_has_answers', 409)
    const { data, error } = await admin.from('member_surveys').update(fields).eq('id', body.id).select('*')
    if (error) throw new Error('survey update failed')
    if (!Array.isArray(data) || !data[0]) return fail('not_found', 404)
    return json({ ok: true, survey: data[0] }, 200)
  }
  const { data, error } = await admin.from('member_surveys').insert({ ...fields, status: 'draft' }).select('*').single()
  if (error) throw new Error('survey insert failed')
  return json({ ok: true, survey: data }, 200)
}

async function setSurveyStatus(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return fail('bad_id', 400)
  if (body.status !== 'draft' && body.status !== 'open' && body.status !== 'closed') return fail('bad_status', 400)
  const { data, error } = await admin.from('member_surveys')
    .update({ status: body.status, updated_at: new Date().toISOString() }).eq('id', body.id).select('*')
  if (error) throw new Error('survey status update failed')
  if (!Array.isArray(data) || !data[0]) return fail('not_found', 404)
  return json({ ok: true, survey: data[0] }, 200)
}

async function loadSurveyWithAnswers(admin: SupabaseClient, id: unknown) {
  if (typeof id !== 'string' || !UUID_RE.test(id)) return null
  const { data: survey, error } = await admin.from('member_surveys').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error('survey read failed')
  if (!survey) return null
  const { data: answers, error: aErr } = await admin.from('member_survey_answers')
    .select('created_at, user_id, answers').eq('survey_id', id)
    .order('created_at', { ascending: false }).limit(10000)
  if (aErr) throw new Error('answers read failed')
  return { survey, rows: (answers ?? []) as AnswerRow[] }
}

async function surveyResultsAction(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  const loaded = await loadSurveyWithAnswers(admin, body.id)
  if (!loaded) return fail('not_found', 404)
  const results = surveyResults(loaded.survey.questions as SurveyQuestion[], loaded.rows)
  return json({
    ok: true,
    survey: { id: loaded.survey.id, title: loaded.survey.title, status: loaded.survey.status },
    total: results.total,
    questions: results.questions,
  }, 200)
}

async function exportSurvey(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  const loaded = await loadSurveyWithAnswers(admin, body.id)
  if (!loaded) return fail('not_found', 404)
  const csv = surveyCsv(loaded.survey.questions as SurveyQuestion[], loaded.rows)
  return json({ ok: true, filename: `volyume-survey-${loaded.survey.id}.csv`, csv }, 200)
}

// ─── Members and exclusions ───────────────────────────────────────────

async function listMembers(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  const query = typeof body.query === 'string' ? body.query.slice(0, 200) : null
  const offset = typeof body.offset === 'number' && Number.isSafeInteger(body.offset) && body.offset >= 0 ? body.offset : 0
  const limit = typeof body.limit === 'number' && Number.isSafeInteger(body.limit)
    ? Math.min(Math.max(body.limit, 1), 50) : 50
  const { data, error } = await admin.rpc('member_email_members', { _query: query, _offset: offset, _limit: limit })
  if (error) throw new Error('members read failed')
  const d = (data ?? {}) as { total?: number; members?: unknown[] }
  return json({ ok: true, total: d.total ?? 0, members: d.members ?? [] }, 200)
}

const EXCLUSION_FIELDS = 'id, user_id, email, note, added_by, created_at'

async function exclude(admin: SupabaseClient, adminEmail: string, body: AdminBody): Promise<Response> {
  let userId: string | null = null
  if (body.user_id != null && body.user_id !== '') {
    if (typeof body.user_id !== 'string' || !UUID_RE.test(body.user_id)) return fail('bad_user_id', 400)
    userId = body.user_id.toLowerCase()
  }
  let email: string | null = null
  if (body.email != null && body.email !== '') {
    email = cleanEmail(body.email)
    if (!email) return fail('bad_email', 400)
  }
  if (!userId && !email) return fail('user_id_or_email_required', 400)
  const note = optionalText(body.note, 200)
  if (!note.ok) return fail('bad_note', 400)

  const findExisting = async () => {
    if (userId) {
      const { data, error } = await admin.from('member_email_exclusions').select(EXCLUSION_FIELDS).eq('user_id', userId).maybeSingle()
      if (error) throw new Error('exclusion read failed')
      if (data) return data
    }
    if (email) {
      // Stored lower-case, so equality is the case-insensitive match.
      const { data, error } = await admin.from('member_email_exclusions').select(EXCLUSION_FIELDS).eq('email', email).maybeSingle()
      if (error) throw new Error('exclusion read failed')
      if (data) return data
    }
    return null
  }

  const existing = await findExisting()
  if (existing) return json({ ok: true, exclusion: existing, already: true }, 200)
  const { data, error } = await admin.from('member_email_exclusions')
    .insert({ user_id: userId, email, note: note.value, added_by: adminEmail })
    .select(EXCLUSION_FIELDS).single()
  if (error) {
    if (error.code === '23503') return fail('no_such_member', 404)
    if (error.code === '23505') {
      const raced = await findExisting()
      if (raced) return json({ ok: true, exclusion: raced, already: true }, 200)
    }
    throw new Error('exclusion insert failed')
  }
  console.log('[member-email-admin] exclusion added', { id: data.id })
  return json({ ok: true, exclusion: data, already: false }, 200)
}

async function include(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return fail('bad_id', 400)
  const { data, error } = await admin.from('member_email_exclusions').delete().eq('id', body.id).select('id')
  if (error) throw new Error('exclusion delete failed')
  const removed = Array.isArray(data) && data.length > 0
  if (removed) console.log('[member-email-admin] exclusion removed', { id: body.id })
  return json({ ok: true, removed }, 200)
}

async function listExclusions(admin: SupabaseClient): Promise<Response> {
  const { data, error } = await admin.from('member_email_exclusions')
    .select(EXCLUSION_FIELDS).order('created_at', { ascending: false }).limit(500)
  if (error) throw new Error('exclusions read failed')
  return json({ ok: true, exclusions: data ?? [] }, 200)
}

// ─── Entry ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail('method_not_allowed', 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[member-email-admin] missing env vars')
    return fail('server_misconfigured', 500)
  }

  const upload = new URL(req.url).searchParams.get('action') === 'upload_asset'
  const bodyCap = upload ? UPLOAD_BODY_BYTES : MAX_BODY_BYTES
  let body: AdminBody
  try {
    body = await readBoundedJson<AdminBody>(req, bodyCap)
  } catch (error) {
    if (error instanceof RequestBodyError && error.status === 413) return fail('payload_too_large', 413)
    return fail('bad_json', 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('bad_json', 400)
  // The large cap is for an image upload and nothing else.
  if (upload && body.action !== 'upload_asset') return fail('bad_json', 400)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const action = typeof body.action === 'string' ? body.action : ''
  try {
    if (action === 'request_login') return await requestLogin(admin, body)
    if (action === 'exchange') return await exchange(admin, body)

    // Every other action: a valid session whose email is STILL an admin.
    const adminEmail = await requireAdmin(admin, body.session)
    if (!adminEmail) return fail('unauthorised', 401)

    const res = await route(admin, adminEmail, action, body, supabaseUrl)
    // Who, what, when: ids only (the target id the request named).
    const target = [body.id, body.user_id, body.key, body.path].find((v) => typeof v === 'string' && v.length <= 100)
    await audit(admin, adminEmail, action.slice(0, 60) || 'none', (target as string | undefined) ?? null, res.status)
      .catch(() => console.error('[member-email-admin] audit write failed'))
    return res
  } catch (e) {
    // The message is one of this file's own fixed strings; never a value.
    console.error('[member-email-admin] action failed', { action, reason: e instanceof Error ? e.message : 'unknown' })
    return fail('server_error', 500)
  }
})

async function route(
  admin: SupabaseClient, adminEmail: string, action: string, body: AdminBody, supabaseUrl: string,
): Promise<Response> {
  if ((V2_ACTIONS as readonly string[]).includes(action)) {
    const res = await handleV2(action, { db: admin, adminEmail, body, supabaseUrl })
    if (res) return res
  }
  switch (action) {
    case 'overview': return await overview(admin)
    case 'delete_campaign': return await deleteCampaign(admin, body)
    case 'save_survey': return await saveSurvey(admin, body)
    case 'set_survey_status': return await setSurveyStatus(admin, body)
    case 'survey_results': return await surveyResultsAction(admin, body)
    case 'export_survey': return await exportSurvey(admin, body)
    case 'list_members': return await listMembers(admin, body)
    case 'exclude': return await exclude(admin, adminEmail, body)
    case 'include': return await include(admin, body)
    case 'list_exclusions': return await listExclusions(admin)
    default: return fail('unknown_action', 400)
  }
}

