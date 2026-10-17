// Edge Function: member-email-public
//
// WRITTEN, NOT DEPLOYED (2026-10-17). Needs migrate_198 applied first and the
// founder's go to deploy. The public half of member email (spec
// docs/member-email-2026-10-17/SPEC.md section 2): the survey page
// (https://volyume.app/survey/?id=&t=), the unsubscribe page
// (https://volyume.app/email/unsubscribe/?t=) and the one-click
// unsubscribe a mail provider posts to (RFC 8058).
//
// Auth model: anonymous, NO Supabase JWT (deployed with verify_jwt = false,
// like community-public: neither a mail provider's one-click POST nor a
// person on the website holds one). A person is identified ONLY by a token
// the admin function signed with `member_email_config.link_secret` for that
// purpose: an `unsub` token for unsubscribe, a `survey` token (bound to one
// survey) for a signed-in answer. Everything runs as the service role.
//
//   GET  ?action=get_survey&id=<uuid>
//        -> { ok, title, intro, questions }   (open surveys only, else 404)
//   POST { action: 'submit_survey', id, answers, t? }
//        -> { ok: true, anonymous }  answers validated against the questions;
//           a valid `t` for THIS survey binds the member (a second submit
//           replaces the first); no `t`, or a `t` that is expired or not for
//           this survey, is saved as an anonymous answer.
//   POST { action: 'unsubscribe', t }
//        -> { ok: true }  or 400 { ok: false, error: 'invalid_link' }
//   POST ?action=unsubscribe&t=<token> with the form body
//        `List-Unsubscribe=One-Click` (the List-Unsubscribe-Post header)
//        -> 200 with an empty body (400 empty for a bad link)
// Unsubscribe calls `member_email_unsubscribe(uuid)` (migrate_198): the
// opt-out row, the preference off with source 'email' and one event;
// idempotent. A GET never unsubscribes (link scanners follow GETs).
//
// The email preferences page (https://volyume.app/email/preferences/?t=),
// member email v2 (PLAN-V2 M2, migrate_199). `t` is the `prefs` token every
// email's footer carries; the unsubscribe page's `unsub` token is accepted
// too (the same person, the same power). All POST JSON, so no token sits in
// a GET query string; none of them returns the address.
//   POST { action: 'get_preferences', t }
//        -> { ok, subscribed, topics: { product_news, surveys,
//             weekly_summary, community_events } }   (or { ok, gone: true })
//   POST { action: 'set_preferences', t, topics: { <topic>: boolean, ... } }
//        -> { ok, subscribed, topics }   unknown topics -> 400 bad_topics
//   POST { action: 'turn_all_off', t }   -> { ok, subscribed: false, topics }
//        (the same as unsubscribe: opt-out row, preference off, one event)
//   POST { action: 'turn_all_on', t }    -> { ok, subscribed: true, topics }
//        (a fresh, explicit yes: clears this person's opt-out, a bounce or
//        complaint suppression and a sunset; an admin exclusion stays)
//   POST { action: 'unsubscribe_reason', t, reason }
//        reason one of too_many, not_relevant, not_expected, other
//        -> { ok }  (optional; at most one a day is kept; no free text)
// Surveys honour the v2 close date (`closes_at`) and the anonymous option
// (an anonymous survey never binds a member, whatever the link carries).
//
// CORS: https://volyume.app only. Logging: ids, counts and codes only, never
// an address, a token or an answer.
//
// Founder deployment: `supabase functions deploy member-email-public
// --no-verify-jwt` (or the connector's deploy tool with verify_jwt false).
// Needs the auto-populated SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { readBoundedJson, RequestBodyError } from '../_shared/boundedJson.ts'
import {
  corsHeaders,
  isTopic,
  jsonResponse as baseJson,
  readBoundedText,
  type SurveyQuestion,
  UUID_RE,
  validateAnswers,
  verifyToken,
} from '../_shared/memberEmail.ts'

const CORS = corsHeaders('GET, POST, OPTIONS')
const MAX_BODY_BYTES = 64 * 1024
const MAX_ONE_CLICK_BYTES = 1024

function json(body: unknown, status: number): Response {
  return baseJson(body, status, CORS)
}

function fail(error: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ ok: false, error, ...extra }, status)
}

function empty(status: number): Response {
  return new Response(null, { status, headers: { ...CORS, 'Cache-Control': 'no-store' } })
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

async function openSurvey(admin: SupabaseClient, id: unknown) {
  if (typeof id !== 'string' || !UUID_RE.test(id)) return null
  const { data, error } = await admin.from('member_surveys')
    .select('id, title, intro, questions, status, closes_at, anonymous').eq('id', id).eq('status', 'open').maybeSingle()
  if (error) throw new Error('survey read failed')
  if (!data) return null
  // A survey past its close date answers as closed.
  if (typeof data.closes_at === 'string' && Date.parse(data.closes_at) <= Date.now()) return null
  return data
}

const PREF_REASONS = ['too_many', 'not_relevant', 'not_expected', 'other']

// The member a preferences link names: a prefs token, or an unsub token.
async function prefsMember(admin: SupabaseClient, token: unknown): Promise<string | null> {
  const secret = await linkSecret(admin)
  const payload = await verifyToken(token, secret, 'prefs') ?? await verifyToken(token, secret, 'unsub')
  return payload && typeof payload.u === 'string' ? payload.u : null
}

function prefsReply(data: unknown): Response {
  const d = (data ?? {}) as Record<string, unknown>
  if (d.gone === true) return json({ ok: true, gone: true }, 200)
  return json({ ok: true, subscribed: d.subscribed === true, topics: d.topics ?? {} }, 200)
}

async function preferencesAction(admin: SupabaseClient, action: string, body: Record<string, unknown>): Promise<Response> {
  const userId = await prefsMember(admin, body.t)
  if (!userId) return fail('invalid_link', 400)
  if (action === 'get_preferences') {
    const { data, error } = await admin.rpc('member_email_get_prefs', { _user_id: userId })
    if (error) throw new Error(`prefs read failed ${error.code ?? ''}`)
    return prefsReply(data)
  }
  if (action === 'set_preferences') {
    const topics = body.topics
    if (!topics || typeof topics !== 'object' || Array.isArray(topics)) return fail('bad_topics', 400)
    const entries = Object.entries(topics as Record<string, unknown>)
    if (entries.length === 0 || entries.some(([k, v]) => !isTopic(k) || typeof v !== 'boolean')) return fail('bad_topics', 400)
    const { data, error } = await admin.rpc('member_email_set_prefs', { _user_id: userId, _topics: topics })
    if (error) throw new Error(`prefs write failed ${error.code ?? ''}`)
    console.log('[member-email-public] topics changed', { count: entries.length })
    return prefsReply(data)
  }
  if (action === 'turn_all_off') {
    const { error } = await admin.rpc('member_email_unsubscribe', { _user_id: userId })
    if (error) throw new Error(`unsubscribe failed ${error.code ?? ''}`)
    const { data, error: rErr } = await admin.rpc('member_email_get_prefs', { _user_id: userId })
    if (rErr) throw new Error(`prefs read failed ${rErr.code ?? ''}`)
    console.log('[member-email-public] unsubscribe recorded')
    return prefsReply(data)
  }
  if (action === 'turn_all_on') {
    const { data, error } = await admin.rpc('member_email_resubscribe', { _user_id: userId })
    if (error) throw new Error(`resubscribe failed ${error.code ?? ''}`)
    console.log('[member-email-public] turned back on')
    return prefsReply(data)
  }
  // unsubscribe_reason
  if (typeof body.reason !== 'string' || !PREF_REASONS.includes(body.reason)) return fail('bad_reason', 400)
  const { error } = await admin.rpc('member_email_unsub_reason', { _user_id: userId, _reason: body.reason })
  if (error) throw new Error(`reason write failed ${error.code ?? ''}`)
  return json({ ok: true }, 200)
}

// True when the unsubscribe was recorded (or the account no longer exists);
// false for a bad link.
async function unsubscribe(admin: SupabaseClient, token: unknown): Promise<boolean> {
  const payload = await verifyToken(token, await linkSecret(admin), 'unsub')
  if (!payload || typeof payload.u !== 'string') return false
  const { error } = await admin.rpc('member_email_unsubscribe', { _user_id: payload.u })
  if (error) throw new Error(`unsubscribe failed ${error.code ?? ''}`)
  console.log('[member-email-public] unsubscribe recorded')
  return true
}

async function submitSurvey(admin: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const survey = await openSurvey(admin, body.id)
  if (!survey) return fail('not_found', 404)
  const checked = validateAnswers(survey.questions as SurveyQuestion[], body.answers)
  if (!checked.ok) return fail(checked.error, 400, checked.question ? { question: checked.question } : {})

  let userId: string | null = null
  // An anonymous survey never binds a member, whatever the link carries.
  if (survey.anonymous !== true && body.t != null && body.t !== '') {
    const payload = await verifyToken(body.t, await linkSecret(admin), 'survey')
    if (payload && payload.s === survey.id && typeof payload.u === 'string') userId = payload.u
  }

  const row = { survey_id: survey.id, answers: checked.value, created_at: new Date().toISOString() }
  if (userId) {
    // One answer per member per survey: a second submit replaces the first.
    const { error } = await admin.from('member_survey_answers')
      .upsert({ ...row, user_id: userId }, { onConflict: 'survey_id,user_id' })
    if (!error) return json({ ok: true, anonymous: false }, 200)
    // The account has gone since the link was sent: keep the answer, unsigned.
    if (error.code !== '23503') throw new Error(`answer write failed ${error.code ?? ''}`)
  }
  const { error } = await admin.from('member_survey_answers').insert({ ...row, user_id: null })
  if (error) throw new Error(`answer write failed ${error.code ?? ''}`)
  return json({ ok: true, anonymous: true }, 200)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[member-email-public] missing env vars')
    return fail('server_misconfigured', 500)
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const url = new URL(req.url)
  const queryAction = url.searchParams.get('action') ?? ''

  try {
    if (req.method === 'GET') {
      if (queryAction !== 'get_survey') return fail('unknown_action', 400)
      const survey = await openSurvey(admin, url.searchParams.get('id'))
      if (!survey) return fail('not_found', 404)
      return json({ ok: true, title: survey.title, intro: survey.intro, questions: survey.questions }, 200)
    }
    if (req.method !== 'POST') return fail('method_not_allowed', 405)

    // RFC 8058 one-click: the mail provider POSTs the form body
    // `List-Unsubscribe=One-Click` to the List-Unsubscribe URL, which carries
    // the token in its query string. Answered with an empty body.
    const contentType = (req.headers.get('content-type') ?? '').toLowerCase()
    if (queryAction === 'unsubscribe' && !contentType.includes('application/json')) {
      const text = await readBoundedText(req, MAX_ONE_CLICK_BYTES)
      if (text === null) return empty(400)
      const form = new URLSearchParams(text)
      if (form.get('List-Unsubscribe') !== 'One-Click') return empty(400)
      return (await unsubscribe(admin, url.searchParams.get('t'))) ? empty(200) : empty(400)
    }

    let body: Record<string, unknown>
    try {
      body = await readBoundedJson<Record<string, unknown>>(req, MAX_BODY_BYTES)
    } catch (error) {
      if (error instanceof RequestBodyError && error.status === 413) return fail('payload_too_large', 413)
      return fail('bad_json', 400)
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('bad_json', 400)

    if (body.action === 'unsubscribe') {
      return (await unsubscribe(admin, body.t)) ? json({ ok: true }, 200) : fail('invalid_link', 400)
    }
    if (body.action === 'submit_survey') return await submitSurvey(admin, body)
    if (typeof body.action === 'string' && ['get_preferences', 'set_preferences', 'turn_all_off', 'turn_all_on',
      'unsubscribe_reason'].includes(body.action)) {
      return await preferencesAction(admin, body.action, body)
    }
    return fail('unknown_action', 400)
  } catch (e) {
    // The message is one of this file's own fixed strings plus a code.
    console.error('[member-email-public] request failed', { action: queryAction || 'body', reason: e instanceof Error ? e.message : 'unknown' })
    return fail('server_error', 500)
  }
})
