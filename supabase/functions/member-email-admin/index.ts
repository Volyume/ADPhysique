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
//   save_campaign    { id?, subject, preheader, body, button_label, button_url, survey_id }
//                                                    -> { ok, campaign, lint }   (drafts only)
//   delete_campaign  { id }                          -> { ok }                   (drafts only)
//   preview          { id }                          -> { ok, subject, html, text, lint }
//   send_test        { id }                          -> { ok, sent_to: 'you' }
//   send_campaign    { id, expected_recipients }     -> { ok, status, sent, failed,
//                                                         total_sent, total_failed, recipients }
//   save_survey      { id?, title, intro, questions } -> { ok, survey }
//   set_survey_status { id, status }                 -> { ok, survey }
//   survey_results   { id }                          -> { ok, survey, total, questions }
//   export_survey    { id }                          -> { ok, filename, csv }
//   list_members     { query?, offset?, limit? }     -> { ok, total, members }
//   exclude          { user_id?, email?, note? }     -> { ok, exclusion, already }
//   include          { id }                          -> { ok, removed }
//   list_exclusions  {}                              -> { ok, exclusions }
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
import {
  adminLoginUrl,
  type AnswerRow,
  FROM_ADDRESS,
  LOGIN_NONCE_MINUTES,
  MAX_OPEN_LOGINS,
  RESEND_BATCH_MAX,
  corsHeaders,
  jsonResponse as baseJson,
  lintCampaign,
  makeAdminSession,
  makeSurveyToken,
  makeUnsubscribeToken,
  oneClickUnsubscribeUrl,
  type OutgoingEmail,
  randomHex,
  renderEmail,
  safeHttpsUrl,
  sendBatch,
  sendOne,
  sha256Hex,
  type SurveyQuestion,
  surveyCsv,
  surveyResults,
  surveyUrl,
  unsubscribeHeaders,
  unsubscribePageUrl,
  UUID_RE,
  validateQuestions,
  validateSurveyMeta,
  verifyToken,
} from '../_shared/memberEmail.ts'

const CORS = corsHeaders('POST, OPTIONS')
const MAX_BODY_BYTES = 256 * 1024
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}$/
const LOGIN_RE = /^[0-9a-f]{64}$/
const STALE_SENDING_MS = 15 * 60 * 1000
const SEND_BUDGET_MS = 120 * 1000
const REQUEST_LOGIN_MIN_MS = 1200
// The test unsubscribe link names no account: the RPC answers "gone" and
// writes nothing, so the founder can try the page safely.
const NO_ACCOUNT = '00000000-0000-0000-0000-000000000000'

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

interface CampaignRow {
  id: string
  subject: string
  preheader: string | null
  body: string
  button_label: string | null
  button_url: string | null
  survey_id: string | null
  status: string
  recipient_count: number | null
  sent_count: number
  failed_count: number
  created_at: string
  updated_at: string
  sent_at: string | null
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

function replyTo(): Record<string, string> {
  const raw = (Deno.env.get('MEMBER_EMAIL_REPLY_TO') ?? '').trim()
  return raw && EMAIL_RE.test(raw) ? { reply_to: raw } : {}
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

async function loadCampaign(admin: SupabaseClient, id: unknown): Promise<CampaignRow | null> {
  if (typeof id !== 'string' || !UUID_RE.test(id)) return null
  const { data, error } = await admin.from('member_email_campaigns').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error('campaign read failed')
  return (data as CampaignRow | null) ?? null
}

async function saveCampaign(admin: SupabaseClient, adminEmail: string, body: AdminBody): Promise<Response> {
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const text = typeof body.body === 'string' ? body.body.replace(/\r\n?/g, '\n').trim() : ''
  if (subject.length < 1 || subject.length > 150) return fail('bad_subject', 400)
  if (text.length < 1 || text.length > 20000) return fail('bad_body', 400)
  const preheader = optionalText(body.preheader, 200)
  if (!preheader.ok) return fail('bad_preheader', 400)
  const buttonLabel = optionalText(body.button_label, 40)
  if (!buttonLabel.ok) return fail('bad_button_label', 400)
  const buttonUrlRaw = optionalText(body.button_url, 2000)
  if (!buttonUrlRaw.ok) return fail('bad_button_url', 400)
  const buttonUrl = buttonUrlRaw.value ? safeHttpsUrl(buttonUrlRaw.value) : null
  if (buttonUrlRaw.value && !buttonUrl) return fail('button_url_not_https', 400)
  let surveyId: string | null = null
  if (body.survey_id != null && body.survey_id !== '') {
    if (typeof body.survey_id !== 'string' || !UUID_RE.test(body.survey_id)) return fail('bad_survey_id', 400)
    const { data: s, error: sErr } = await admin.from('member_surveys').select('id').eq('id', body.survey_id).maybeSingle()
    if (sErr) throw new Error('survey read failed')
    if (!s) return fail('survey_not_found', 404)
    surveyId = body.survey_id
  }
  const fields = {
    subject,
    preheader: preheader.value,
    body: text,
    button_label: buttonLabel.value,
    button_url: buttonUrl,
    survey_id: surveyId,
    updated_at: new Date().toISOString(),
  }
  let row: CampaignRow | null = null
  if (body.id != null) {
    if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return fail('bad_id', 400)
    const { data, error } = await admin.from('member_email_campaigns')
      .update(fields).eq('id', body.id).eq('status', 'draft').select('*')
    if (error) throw new Error('campaign update failed')
    row = Array.isArray(data) && data[0] ? data[0] as CampaignRow : null
    if (!row) return fail('not_a_draft', 409)
  } else {
    const { data, error } = await admin.from('member_email_campaigns')
      .insert({ ...fields, status: 'draft', created_by: adminEmail }).select('*').single()
    if (error) throw new Error('campaign insert failed')
    row = data as CampaignRow
  }
  return json({ ok: true, campaign: row, lint: lintCampaign(row) }, 200)
}

async function deleteCampaign(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return fail('bad_id', 400)
  const { data, error } = await admin.from('member_email_campaigns')
    .delete().eq('id', body.id).eq('status', 'draft').select('id')
  if (error) throw new Error('campaign delete failed')
  if (!Array.isArray(data) || data.length === 0) return fail('not_a_draft', 409)
  return json({ ok: true }, 200)
}

async function preview(admin: SupabaseClient, body: AdminBody): Promise<Response> {
  const c = await loadCampaign(admin, body.id)
  if (!c) return fail('not_found', 404)
  const rendered = renderEmail(c, {
    unsubscribeUrl: unsubscribePageUrl('preview'),
    surveyUrl: c.survey_id ? surveyUrl(c.survey_id, null) : null,
  })
  return json({ ok: true, subject: rendered.subject, html: rendered.html, text: rendered.text, lint: lintCampaign(c) }, 200)
}

async function sendTest(admin: SupabaseClient, adminEmail: string, body: AdminBody, supabaseUrl: string): Promise<Response> {
  const c = await loadCampaign(admin, body.id)
  if (!c) return fail('not_found', 404)
  const lint = lintCampaign(c)
  if (lint.length > 0) return fail('lint_failed', 409, { lint })
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!apiKey) return fail('email_not_configured', 503)
  const secret = await linkSecret(admin)
  const unsub = await makeUnsubscribeToken(NO_ACCOUNT, secret)
  const rendered = renderEmail(c, {
    unsubscribeUrl: unsubscribePageUrl(unsub),
    surveyUrl: c.survey_id ? surveyUrl(c.survey_id, null) : null,
  })
  // To the signed-in admin's own address only: never an address from the
  // request.
  const result = await sendOne(apiKey, {
    from: FROM_ADDRESS,
    to: [adminEmail],
    subject: `Test: ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    headers: unsubscribeHeaders(oneClickUnsubscribeUrl(supabaseUrl, unsub)),
    ...replyTo(),
  })
  if (!result.ok) {
    console.error('[member-email-admin] test send failed', { campaign_id: c.id, code: result.code })
    return fail('send_failed', 502, { code: result.code })
  }
  return json({ ok: true, sent_to: 'you' }, 200)
}

// The whole send. Refuses unless the LIVE audience count equals the number
// the founder confirmed on the page. Sends only to audience members with no
// 'sent' row for this campaign, so a second call on a 'partial' campaign
// finishes the job and never sends anyone the same campaign twice (the
// sends table's primary key is (campaign_id, user_id)).
async function sendCampaign(admin: SupabaseClient, body: AdminBody, supabaseUrl: string): Promise<Response> {
  const started = Date.now()
  const c = await loadCampaign(admin, body.id)
  if (!c) return fail('not_found', 404)
  if (c.status === 'sent') return fail('already_sent', 409)
  const lint = lintCampaign(c)
  if (lint.length > 0) return fail('lint_failed', 409, { lint })
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!apiKey) return fail('email_not_configured', 503)
  const expected = body.expected_recipients
  if (typeof expected !== 'number' || !Number.isSafeInteger(expected) || expected < 0) {
    return fail('bad_expected_recipients', 400)
  }
  if (c.survey_id) {
    const { data: s, error: sErr } = await admin.from('member_surveys').select('status').eq('id', c.survey_id).maybeSingle()
    if (sErr) throw new Error('survey read failed')
    if (!s || s.status !== 'open') return fail('survey_not_open', 409)
  }

  const list = await audience(admin)
  if (list.length !== expected) {
    return fail('audience_changed', 409, { audience: list.length })
  }

  // Claim the campaign. A 'sending' campaign is only taken over once it has
  // been idle for 15 minutes (a run that died part way).
  const staleIso = new Date(Date.now() - STALE_SENDING_MS).toISOString()
  const { data: claimed, error: claimErr } = await admin.from('member_email_campaigns')
    .update({ status: 'sending', recipient_count: list.length, updated_at: new Date().toISOString() })
    .eq('id', c.id)
    .or(`status.in.(draft,partial),and(status.eq.sending,updated_at.lt."${staleIso}")`)
    .select('id')
  if (claimErr) throw new Error('campaign claim failed')
  if (!Array.isArray(claimed) || claimed.length === 0) return fail('already_sending', 409)

  const { data: done, error: doneErr } = await admin.from('member_email_sends')
    .select('user_id').eq('campaign_id', c.id).eq('status', 'sent')
  if (doneErr) throw new Error('sends read failed')
  const alreadySent = new Set((done ?? []).map((r: { user_id: string }) => r.user_id))
  const pending = list.filter((m) => !alreadySent.has(m.user_id))

  const secret = await linkSecret(admin)
  let sentNow = 0
  let failedNow = 0
  let stopped = false
  for (let i = 0; i < pending.length && !stopped; i += RESEND_BATCH_MAX) {
    if (Date.now() - started > SEND_BUDGET_MS) {
      stopped = true
      break
    }
    const chunk = pending.slice(i, i + RESEND_BATCH_MAX)
    const emails: OutgoingEmail[] = []
    for (const m of chunk) {
      // eslint-disable-next-line no-await-in-loop
      const unsub = await makeUnsubscribeToken(m.user_id, secret)
      // eslint-disable-next-line no-await-in-loop
      const surveyToken = c.survey_id ? await makeSurveyToken(m.user_id, c.survey_id, secret) : null
      const rendered = renderEmail(c, {
        unsubscribeUrl: unsubscribePageUrl(unsub),
        surveyUrl: c.survey_id ? surveyUrl(c.survey_id, surveyToken) : null,
      })
      emails.push({
        from: FROM_ADDRESS,
        to: [m.email],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: unsubscribeHeaders(oneClickUnsubscribeUrl(supabaseUrl, unsub)),
        ...replyTo(),
      })
    }
    // eslint-disable-next-line no-await-in-loop
    const result = await sendBatch(apiKey, emails)
    const nowIso = new Date().toISOString()
    const rows = chunk.map((m, k) => result.ok
      ? { campaign_id: c.id, user_id: m.user_id, status: 'sent', provider_id: result.ids[k] || null, error: null, sent_at: nowIso }
      : { campaign_id: c.id, user_id: m.user_id, status: 'failed', provider_id: null, error: result.code, sent_at: null })
    // eslint-disable-next-line no-await-in-loop
    const { error: rowErr } = await admin.from('member_email_sends').upsert(rows, { onConflict: 'campaign_id,user_id' })
    if (rowErr) console.error('[member-email-admin] send rows write failed', { campaign_id: c.id, count: rows.length, code: rowErr.code })
    if (result.ok) {
      sentNow += chunk.length
    } else {
      failedNow += chunk.length
      console.error('[member-email-admin] batch failed', { campaign_id: c.id, count: chunk.length, code: result.code })
      // Rate limited: stop here; the rest have no row and go on the next call.
      if (result.status === 429) stopped = true
    }
  }

  const { count: totalSent } = await admin.from('member_email_sends')
    .select('user_id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'sent')
  const { count: totalFailed } = await admin.from('member_email_sends')
    .select('user_id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'failed')
  const sentTotal = totalSent ?? 0
  const failedTotal = totalFailed ?? 0
  const complete = failedNow === 0 && !stopped && sentNow === pending.length
  const status = complete ? 'sent' : 'partial'
  await admin.from('member_email_campaigns').update({
    status,
    sent_count: sentTotal,
    failed_count: failedTotal,
    updated_at: new Date().toISOString(),
    ...(sentTotal > 0 && !c.sent_at ? { sent_at: new Date().toISOString() } : {}),
  }).eq('id', c.id)
  console.log('[member-email-admin] campaign send', { campaign_id: c.id, status, sent: sentNow, failed: failedNow, recipients: list.length })
  return json({
    ok: true, status, sent: sentNow, failed: failedNow,
    total_sent: sentTotal, total_failed: failedTotal, recipients: list.length,
  }, 200)
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

  let body: AdminBody
  try {
    body = await readBoundedJson<AdminBody>(req, MAX_BODY_BYTES)
  } catch (error) {
    if (error instanceof RequestBodyError && error.status === 413) return fail('payload_too_large', 413)
    return fail('bad_json', 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('bad_json', 400)

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

    switch (action) {
      case 'overview': return await overview(admin)
      case 'save_campaign': return await saveCampaign(admin, adminEmail, body)
      case 'delete_campaign': return await deleteCampaign(admin, body)
      case 'preview': return await preview(admin, body)
      case 'send_test': return await sendTest(admin, adminEmail, body, supabaseUrl)
      case 'send_campaign': return await sendCampaign(admin, body, supabaseUrl)
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
  } catch (e) {
    // The message is one of this file's own fixed strings; never a value.
    console.error('[member-email-admin] action failed', { action, reason: e instanceof Error ? e.message : 'unknown' })
    return fail('server_error', 500)
  }
})
