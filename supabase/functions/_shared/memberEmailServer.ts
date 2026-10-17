// Database-bound helpers shared by member-email-admin, member-email-runner
// and member-email-webhook (docs/member-email-2026-10-17/PLAN-V2.md;
// migrate_199). The pure logic stays in ./memberEmail.ts; this file holds
// the reads and writes every send path shares, so the caps, the ledger and
// the per-member email are built in exactly one way. No logging here: the
// callers log ids, counts and codes only.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import {
  type Block,
  type BlocksContent,
  FROM_ADDRESS,
  type MemberContext,
  makePrefsToken,
  makeSurveyToken,
  makeUnsubscribeToken,
  oneClickUnsubscribeUrl,
  type OutgoingEmail,
  preferencesPageUrl,
  renderBlocksEmail,
  sendOne,
  type SurveyLink,
  type SurveyQuestion,
  surveyUrl,
  unsubscribeHeaders,
  unsubscribePageUrl,
} from './memberEmail.ts'

export type Db = SupabaseClient

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}$/

// The keys the admin page may read and change. Secrets (link_secret,
// runner_secret) and the runner's own bookkeeping are never in this list.
export const EDITABLE_SETTINGS = [
  'daily_cap', 'weekly_member_cap', 'quiet_hours_start', 'quiet_hours_end', 'latest_app_version',
  'alarm_complaint_rate', 'alarm_bounce_rate', 'retention_months', 'undo_minutes', 'sunset_days',
  'review_ask_workouts', 'provider_daily_limit',
] as const
export const READABLE_SETTINGS = [...EDITABLE_SETTINGS, 'kill_switch', 'kill_switch_reason', 'latest_app_version_set_at',
  'last_retention_at'] as const

export async function readConfig(db: Db): Promise<Record<string, string>> {
  const { data, error } = await db.from('member_email_config').select('key, value')
  if (error) throw new Error('config read failed')
  const out: Record<string, string> = {}
  for (const r of (data ?? []) as { key: string; value: string }[]) out[r.key] = r.value
  return out
}

export function cfgInt(cfg: Record<string, string>, key: string, fallback: number): number {
  const v = cfg[key]
  return typeof v === 'string' && /^[0-9]{1,9}$/.test(v) ? Number(v) : fallback
}

export function killSwitchOn(cfg: Record<string, string>): boolean {
  // Anything but an explicit 'off' stops sending (fails closed).
  return cfg.kill_switch !== 'off'
}

let cachedSecret: string | null = null
export async function linkSecret(db: Db): Promise<string> {
  if (cachedSecret) return cachedSecret
  const { data, error } = await db.from('member_email_config').select('value').eq('key', 'link_secret').maybeSingle()
  if (error || !data || typeof data.value !== 'string' || data.value.length < 32) throw new Error('link secret unavailable')
  cachedSecret = data.value
  return data.value
}

export interface Quota {
  daily_cap: number
  provider_daily_limit: number
  used_24h: number
  member_used_24h: number
  remaining: number
  by_kind: Record<string, number>
}

export async function quota(db: Db): Promise<Quota> {
  const { data, error } = await db.rpc('member_email_quota')
  if (error || !data) throw new Error('quota read failed')
  return data as Quota
}

export async function logDelivery(
  db: Db, kind: 'test' | 'seed' | 'alert' | 'login', campaignId: string | null, automationId: string | null,
  providerId: string | null, status: 'sent' | 'failed', error: string | null,
): Promise<void> {
  const { error: e } = await db.rpc('member_email_log_delivery', {
    _kind: kind, _campaign_id: campaignId, _automation_id: automationId,
    _provider_id: providerId, _status: status, _error: error,
  })
  if (e) throw new Error('delivery log failed')
}

/** One append-only audit row: who, what, when (ids and counts only in detail). */
export async function audit(
  db: Db, adminEmail: string, action: string, target: string | null, status: number,
  detail: Record<string, unknown> | null = null,
): Promise<void> {
  await db.from('member_email_audit_log').insert({
    admin_email: adminEmail.slice(0, 320), action: action.slice(0, 60),
    target: target ? target.slice(0, 100) : null, status, detail,
  })
}

export function replyTo(): Record<string, string> {
  const raw = (Deno.env.get('MEMBER_EMAIL_REPLY_TO') ?? '').trim()
  return raw && EMAIL_RE.test(raw) ? { reply_to: raw } : {}
}

export async function adminAddresses(db: Db): Promise<string[]> {
  const { data, error } = await db.from('marketing_admins').select('email').limit(20)
  if (error) throw new Error('admins read failed')
  return ((data ?? []) as { email: string }[]).map((r) => r.email).filter((e) => typeof e === 'string' && EMAIL_RE.test(e))
}

/**
 * A short plain email to every admin, once per key (member_email_claim_alert),
 * recorded in the ledger. Never refused by the cap (it is how the founder
 * hears that the cap was reached), and never carries a member's address.
 */
export async function founderAlert(db: Db, apiKey: string, key: string, subject: string, text: string): Promise<boolean> {
  if (!apiKey) return false
  const { data: claimed, error } = await db.rpc('member_email_claim_alert', { _key: key })
  if (error || claimed !== true) return false
  const to = await adminAddresses(db)
  for (const address of to) {
    // eslint-disable-next-line no-await-in-loop
    const result = await sendOne(apiKey, {
      from: FROM_ADDRESS, to: [address], subject: `Volyume member email: ${subject}`,
      text: `${text}\n\nOpen https://volyume.app/members/ to see more.`,
      html: `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p><p><a href="https://volyume.app/members/">Open the members page</a></p>`,
      tags: [{ name: 'stream', value: 'member_alert' }],
    })
    // eslint-disable-next-line no-await-in-loop
    await logDelivery(db, 'alert', null, null, result.ok ? (result.ids[0] || null) : null, result.ok ? 'sent' : 'failed',
      result.ok ? null : result.code).catch(() => {})
  }
  return true
}

/** The survey link details for a survey block: open surveys only. */
export async function surveyFor(db: Db, surveyId: string | null): Promise<{ id: string; first: SurveyQuestion | null; open: boolean } | null> {
  if (!surveyId) return null
  const { data, error } = await db.from('member_surveys').select('id, status, questions, closes_at').eq('id', surveyId).maybeSingle()
  if (error) throw new Error('survey read failed')
  if (!data) return null
  const closes = typeof data.closes_at === 'string' ? Date.parse(data.closes_at) : NaN
  const open = data.status === 'open' && !(Number.isFinite(closes) && closes <= Date.now())
  const qs = Array.isArray(data.questions) ? data.questions as SurveyQuestion[] : []
  return { id: data.id as string, first: qs[0] ?? null, open }
}

export interface Recipient {
  user_id: string
  email: string
  first_name: string | null
  app_version: string | null
  platform: string | null
  below_latest: boolean
}

/**
 * One member's email: rendered from the blocks with their merge fields, their
 * own unsubscribe, preferences and survey links, the RFC 8058 headers and the
 * member-email tag.
 */
export async function memberEmail(
  content: BlocksContent, m: Recipient, secret: string, supabaseUrl: string,
  survey: { id: string; first: SurveyQuestion | null } | null, kind: 'campaign' | 'automation',
  extra: { years?: number | null } = {},
): Promise<OutgoingEmail> {
  const unsub = await makeUnsubscribeToken(m.user_id, secret)
  const prefs = await makePrefsToken(m.user_id, secret)
  let surveyLink: SurveyLink | null = null
  if (survey) {
    const token = await makeSurveyToken(m.user_id, survey.id, secret)
    surveyLink = { id: survey.id, url: surveyUrl(survey.id, token), first: survey.first }
  }
  const ctx: MemberContext = {
    firstName: m.first_name, appVersion: m.app_version, belowLatest: m.below_latest, platform: m.platform,
    years: extra.years ?? null,
  }
  const rendered = renderBlocksEmail(content, ctx, {
    unsubscribeUrl: unsubscribePageUrl(unsub), preferencesUrl: preferencesPageUrl(prefs), survey: surveyLink,
  })
  return {
    from: FROM_ADDRESS,
    to: [m.email],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers: unsubscribeHeaders(oneClickUnsubscribeUrl(supabaseUrl, unsub)),
    tags: [{ name: 'stream', value: 'member' }, { name: 'kind', value: kind }],
    ...replyTo(),
  }
}

export function contentOf(row: { subject: string; preheader: string | null; blocks: Block[] | null }, subjectOverride?: string | null): BlocksContent {
  return { subject: subjectOverride ?? row.subject, preheader: row.preheader, blocks: row.blocks ?? [] }
}
