// Edge Function: community-notify
//
// The push half of Community activity (blueprint section 4,
// docs/social-discovery-2026-09-06/30-BLUEPRINT.md; SD-15). The client calls
// it with its own JWT right after a Community action it just performed; this
// function decides whether that action becomes a push or stays in-app, and
// never trusts the caller about anything except who they are.
//
//   1. Verifies the caller's JWT and derives the actor from it.
//   2. PROVES the action really happened, by finding the row the caller says
//      they just wrote (a follow edge, a connection row, a message, a
//      reaction, a comment, a programme use) with the caller as its actor and
//      a created_at inside the last ten minutes. Without this, any signed-in
//      user could ask us to push arbitrary text at any other user.
//   3. Stops if the recipient blocks the actor (either direction), and (for
//      the connection and message kinds) if the recipient has MUTED the
//      actor: a mute silences their message pushes (discovery blueprint
//      section 1) while leaving the conversation itself working.
//   4. Reads the recipient's notification_preferences row for the category
//      (community_follow for the follow and connection kinds,
//      community_message for a message, community_activity for the rest) and
//      stops if it is switched off. A FAILED read holds the push, the same
//      way partner-cheer does: we cannot show the user opted in, so we
//      decline to push. The activity row is already written, so the recipient
//      still sees it in-app next time they open Community.
//   4a. For a message, collapses to at most ONE push per conversation per
//      fifteen minutes while the recipient has not read it (discovery
//      blueprint section 2). The clock is `a_last_push_at` / `b_last_push_at`
//      on community_conversations, written here with the service role: the
//      conversation's own last_message_at moves with every message, so it
//      cannot answer "when did we last push at this person".
//   5. Checks the recipient's open ED/wellbeing flag EXACTLY as partner-cheer
//      does and fails closed: any flag, or any read error, downgrades to
//      in-app only. Pushing at a flagged user is the harm pattern.
//   5b. Security review 2026-09-06 (finding 4): for every kind proved by a
//      community_activity row (everything except `message`), refuses to push
//      twice off the same proof. The row's `pushed_at` column (migrate_161) is
//      read here and stamped after a successful send, the same shape as the
//      message collapse in 4a; without this, connect_request and
//      connect_accepted (and every older kind) could be replayed for as long
//      as the ten-minute recency window in step 2 lasted.
//   5c. Communities revamp phase 3 (docs/communities-revamp-2026-09-10/
//      23-PHASE3-SPEC.md section 6): for `reaction` specifically, collapses
//      to at most ONE push per recipient per UK-local day, the same shape as
//      the message collapse in 4a but keyed by day rather than by a rolling
//      window - `community_notify_daily(recipient, day, count)`
//      (migrate_170 part B). The day is CLAIMED with an INSERT before the
//      send and released again if the send throws (reviewer 2026-09-10 (B):
//      a read-then-send-then-insert shape let two Respects landing in the
//      same moment both push); the claiming call sends, every later one
//      this same day increments the row's count and sends nothing. Rows
//      older than seven days are pruned for that recipient as the claim is
//      taken. This runs AFTER 5b, so a retried call against the exact same
//      proof is already stopped there and never reaches this table at all.
//      community_respect_all writes activity rows of the identical
//      `reaction` kind community_react does, so whichever call path
//      notifies for them collapses through this exact same mechanism.
//   6. Otherwise invokes send-push (service role) with the Community payload.
//
// Request body:
//   { "kind": "follow" | "follow_request" | "follow_accepted" | "reaction"
//             | "comment" | "connect_request"
//             | "connect_accepted" | "message",
//     "target_user_id": "<uuid>",
//     "ref_id": "<uuid>" }
//
// `ref_id` is the row the notification is about: the post for a reaction or a
// comment, the programme for a use, and THE CONVERSATION for a message (it
// becomes `data.conversation_id`, which is what the tap route opens). The two
// connection kinds carry no ref of their own - the connection row is proof
// enough - so ref_id is optional for those and ignored if sent.
//
// Response:
//   { ok: true, delivered: 'push' | 'in_app' } on success
//   { ok: false, error } on bad input / auth failure
//
// Founder deployment: `supabase functions deploy community-notify`. Needs the
// auto-populated SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY.
// Note that migrate_160 must be applied first: without it the community_*
// tables do not exist and every call returns not_verified. The three kinds
// added by the discovery campaign additionally need migrate_161 (the
// connections, conversations and messages tables, the `community_message`
// notification category and the two `last_push_at` columns).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { readBoundedJson, RequestBodyError } from '../_shared/boundedJson.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface NotifyBody {
  kind?: string
  target_user_id?: string
  ref_id?: string
}

// migrate_164 (40-GAP-CLOSURE.md section 2): 'programme_used' retired with
// the shared-programme layer's community_record_programme_use RPC, which no
// longer writes an activity row for this kind to prove.
// migrate_165 (design 60 §3): the three group notification kinds, proved by
// the community_group_members/community_group_invites row `community_group_
// join`/`_approve`/`_invite` just wrote, and riding the SAME community_follow
// category budget the connection kinds already use -- no new category, no
// push for an ordinary open-group join (community_group_join never calls
// this function for that branch).
type Kind =
  | 'follow' | 'follow_request' | 'follow_accepted'
  | 'reaction' | 'comment'
  | 'connect_request' | 'connect_accepted' | 'message'
  | 'group_request' | 'group_accepted' | 'group_invited'

// A connection request and its acceptance are relationship events, so they
// share the follow category and its budget; a message has its own category
// and its own toggle (discovery blueprint section 2). The three group kinds
// share it too (design 60 §3: "ride the existing community_follow category
// budget").
const FOLLOW_KINDS: Kind[] = [
  'follow', 'follow_request', 'follow_accepted', 'connect_request', 'connect_accepted',
  'group_request', 'group_accepted', 'group_invited',
]
const CONNECT_KINDS: Kind[] = ['connect_request', 'connect_accepted']
const GROUP_KINDS: Kind[] = ['group_request', 'group_accepted', 'group_invited']
const ALL_KINDS: Kind[] = [
  ...FOLLOW_KINDS, 'reaction', 'comment', 'message',
]

// The kinds a mute silences. A mute hides someone's stories and silences
// their message pushes; it is not a block, so the conversation still works
// and nothing else changes (discovery blueprint section 1).
const MUTE_SILENCED_KINDS: Kind[] = [...CONNECT_KINDS, 'message']

// Every kind that proves itself with a community_activity row rather than a
// conversation (security review 2026-09-06, finding 4). `message` is excluded:
// it already has its own per-conversation 15-minute collapse below, and never
// writes a community_activity row. The group kinds are added by migrate_165:
// community_group_join/_approve/_invite each write both the membership/invite
// row (the actual proof, checked below) AND a community_activity row (via
// _community_add_activity), so they get the identical replay-guard shape
// connect_request/connect_accepted already have.
const ACTIVITY_BACKED_KINDS: Kind[] = [
  'follow', 'follow_request', 'follow_accepted',
  'reaction', 'comment',
  'connect_request', 'connect_accepted',
  ...GROUP_KINDS,
]

// Fifteen minutes: at most one push per conversation while the recipient has
// not read it (blueprint section 2).
const MESSAGE_PUSH_COLLAPSE_MS = 15 * 60 * 1000

// reviewer 2026-09-10 (B): community_notify_daily keeps one row per
// recipient per day they were pushed at, and nothing anywhere pruned it.
// Seven days, pruned opportunistically for THIS recipient at the moment
// their day is claimed below - the same no-cron-job shape
// _community_rate_check already uses for community_rate_events. Nothing
// ever reads a row older than today, so seven days is pure slack.
const NOTIFY_DAILY_RETENTION_DAYS = 7

// Communities revamp phase 3 section 6: the UK-local day key, byte-for-byte
// the same zero-padded YYYY-MM-DD format src/lib/dayKey.js's localDayKey()
// and this file's own SQL siblings (`to_char(timezone('Europe/London',
// now()), 'YYYY-MM-DD')`) produce, so a push collapses against the exact
// same day a client or an RPC would compute. Intl.DateTimeFormat with an
// explicit IANA zone, the same technique the quiet-hours projection below
// already uses in this file, rather than a manual UTC-offset calculation.
function ukLocalDayKey(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at)
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000'
  const mo = parts.find((p) => p.type === 'month')?.value ?? '00'
  const d = parts.find((p) => p.type === 'day')?.value ?? '00'
  return `${y}-${mo}-${d}`
}

// British English, calm voice, no clipped commands, no em dash (CLAUDE.md
// section 3). The handle is the only identity in a Community push: never a
// first name, never a display name pulled from anywhere else.
function pushCopy(kind: Kind, handle: string): { title: string; body: string } {
  switch (kind) {
    case 'follow':
      return { title: 'Community', body: `@${handle} followed you` }
    case 'follow_request':
      return { title: 'Community', body: `@${handle} asked to follow you` }
    case 'follow_accepted':
      return { title: 'Community', body: `@${handle} accepted your follow` }
    case 'reaction':
      // Communities revamp phase 3 section 6: collapsed to one push per
      // recipient per UK-local day (5c below), so a reaction push always
      // now represents "at least one Respect today", possibly several from
      // different people - it never names a single handle.
      return { title: 'Community', body: 'Someone gave your training respect' }
    case 'comment':
      return { title: 'Community', body: `@${handle} commented on your post` }
    case 'connect_request':
      return { title: 'Community', body: `@${handle} wants to connect` }
    case 'connect_accepted':
      return { title: 'Community', body: `@${handle} accepted your connection` }
    case 'message':
      // NEVER the content. A locked screen must not leak a conversation
      // (blueprint section 2, SD-31).
      return { title: 'Community', body: `New message from @${handle}` }
    case 'group_request':
      return { title: 'Community', body: `@${handle} asked to join your group` }
    case 'group_accepted':
      return { title: 'Community', body: `@${handle} approved your group request` }
    case 'group_invited':
      return { title: 'Community', body: `@${handle} invited you to a group` }
    default:
      // Unreachable: ALL_KINDS is checked before this is ever called. Kept
      // as a safe fallback rather than a non-null assertion.
      return { title: 'Community', body: `@${handle} did something in Community` }
  }
}

function categoryFor(kind: Kind): 'community_follow' | 'community_activity' | 'community_message' {
  if (kind === 'message') return 'community_message'
  return (FOLLOW_KINDS as string[]).includes(kind) ? 'community_follow' : 'community_activity'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('[community-notify] missing env vars')
    return jsonResponse({ ok: false, error: 'Server misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return jsonResponse({ ok: false, error: 'Unauthorised' }, 401)

  let body: NotifyBody
  try {
    body = await readBoundedJson<NotifyBody>(req, 4096)
  } catch (error) {
    if (error instanceof RequestBodyError && error.status === 413) {
      return jsonResponse({ ok: false, error: 'Payload too large' }, 413)
    }
    return jsonResponse({ ok: false, error: 'Bad JSON' }, 400)
  }

  const kind = body.kind as Kind
  const targetUserId = body.target_user_id ?? ''
  const refId = body.ref_id ?? ''
  if (!ALL_KINDS.includes(kind)) {
    return jsonResponse({ ok: false, error: 'valid kind is required' }, 400)
  }
  if (!UUID_RE.test(targetUserId)) {
    return jsonResponse({ ok: false, error: 'valid target_user_id is required' }, 400)
  }
  // The connection kinds are proved by the connection row itself, so they
  // carry no ref of their own. Every other kind names the row it is about.
  const refOptional = (CONNECT_KINDS as string[]).includes(kind)
  if (!refOptional && !UUID_RE.test(refId)) {
    return jsonResponse({ ok: false, error: 'valid ref_id is required' }, 400)
  }
  if (refOptional && refId && !UUID_RE.test(refId)) {
    return jsonResponse({ ok: false, error: 'valid ref_id is required' }, 400)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return jsonResponse({ ok: false, error: 'Unauthorised' }, 401)
  const actorId = user.id
  if (actorId === targetUserId) {
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }

  // Service-role admin: the community_* tables have RLS on with no policy for
  // authenticated, so the caller themselves can read none of this.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const sinceMs = Date.now() - 10 * 60 * 1000
  const sinceIso = new Date(sinceMs).toISOString()

  // Step 2: prove the action. Each branch asserts BOTH that the caller is the
  // actor and that the recipient really is the other party. For every
  // ACTIVITY_BACKED_KINDS member, the branch also names the community_activity
  // row that same action wrote (`_community_add_activity` in migrate_160 /
  // migrate_161), so the replay guard below can find and stamp it.
  let verified = false
  let activityTargetKind: string | null = null
  let activityTargetId: string | null = null
  try {
    if (kind === 'follow' || kind === 'follow_request') {
      activityTargetKind = 'profile'
      activityTargetId = actorId
      const { data } = await admin
        .from('community_follows')
        .select('follower_id')
        .eq('follower_id', actorId)
        .eq('followee_id', targetUserId)
        .gte('created_at', sinceIso)
        .limit(1)
        .maybeSingle()
      verified = !!data
    } else if (kind === 'follow_accepted') {
      activityTargetKind = 'profile'
      activityTargetId = actorId
      // The actor accepted; the recipient is the person who had asked.
      const { data } = await admin
        .from('community_follows')
        .select('follower_id')
        .eq('follower_id', targetUserId)
        .eq('followee_id', actorId)
        .eq('state', 'accepted')
        .limit(1)
        .maybeSingle()
      // Recency, as every other branch has (security review 2026-09-06,
      // finding 7): the follow edge itself carries only the created_at of
      // the REQUEST, so an acceptance is proved by the activity row
      // `community_respond_follow` writes at the moment it accepts. Without
      // this the edge stands for as long as the follow does and the push
      // can be replayed at every follower, at any hour.
      let accepted = false
      if (data) {
        const { data: act } = await admin
          .from('community_activity')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('actor_id', actorId)
          .eq('kind', 'follow_accepted')
          .gte('created_at', sinceIso)
          .limit(1)
          .maybeSingle()
        accepted = !!act
      }
      verified = accepted
    } else if (kind === 'connect_request' || kind === 'connect_accepted') {
      activityTargetKind = 'profile'
      activityTargetId = actorId
      // The connection row is the proof, and it is ONE row for the pair
      // (user_a < user_b), so the pair is checked whichever way round the two
      // ids sort. For a request the caller must be the requester; for an
      // acceptance the caller is the RESPONDER, so the recipient is the one
      // who asked and `responded_at` is the recency clock (the created_at on
      // that row belongs to the request, which may be days old).
      const [pairA, pairB] = actorId < targetUserId
        ? [actorId, targetUserId]
        : [targetUserId, actorId]
      const { data } = await admin
        .from('community_connections')
        .select('user_a, user_b, requester_id, state, created_at, responded_at')
        .eq('user_a', pairA)
        .eq('user_b', pairB)
        .limit(1)
        .maybeSingle()
      const row = data as {
        requester_id?: string; state?: string
        created_at?: string; responded_at?: string | null
      } | null
      if (row) {
        // Recency is compared as INSTANTS, not as strings: PostgREST returns
        // "+00:00" where toISOString() writes "Z", and comparing those two
        // spellings as text is a bug waiting for a boundary.
        const createdMs = row.created_at ? Date.parse(row.created_at) : NaN
        const respondedMs = row.responded_at ? Date.parse(row.responded_at) : NaN
        if (kind === 'connect_request') {
          verified = row.requester_id === actorId
            && row.state === 'requested'
            && Number.isFinite(createdMs) && createdMs >= sinceMs
        } else {
          verified = row.requester_id === targetUserId
            && row.state === 'connected'
            && Number.isFinite(respondedMs) && respondedMs >= sinceMs
        }
      }
    } else if (kind === 'group_request' || kind === 'group_accepted' || kind === 'group_invited') {
      // migrate_165 (design 60 §3): "proof = the membership/invite row".
      // ref_id is the group id. `group_request` is proved by the caller's
      // OWN 'requested' row (recipients are every admin, so the recipient
      // itself is not on the membership row); `group_accepted` is proved by
      // the TARGET's row having just become 'member' (the actor is the
      // admin who approved it, checked via the activity row's actor below,
      // since the membership row alone cannot say who approved it);
      // `group_invited` is proved by the target's own 'invited' row.
      activityTargetKind = 'group'
      activityTargetId = refId
      if (kind === 'group_request') {
        const { data } = await admin
          .from('community_group_members')
          .select('user_id, state, joined_at')
          .eq('group_id', refId)
          .eq('user_id', actorId)
          .eq('state', 'requested')
          .gte('joined_at', sinceIso)
          .limit(1)
          .maybeSingle()
        verified = !!data
      } else if (kind === 'group_invited') {
        const { data } = await admin
          .from('community_group_members')
          .select('user_id, state, joined_at')
          .eq('group_id', refId)
          .eq('user_id', targetUserId)
          .eq('state', 'invited')
          .gte('joined_at', sinceIso)
          .limit(1)
          .maybeSingle()
        verified = !!data
      } else {
        const { data } = await admin
          .from('community_group_members')
          .select('user_id, state')
          .eq('group_id', refId)
          .eq('user_id', targetUserId)
          .eq('state', 'member')
          .limit(1)
          .maybeSingle()
        verified = !!data
      }
    } else if (kind === 'message') {
      // A message the CALLER sent in the last ten minutes, in the
      // conversation named by ref_id, and that conversation must be this pair
      // and still open.
      const { data } = await admin
        .from('community_messages')
        .select('id, conversation_id, community_conversations!inner(user_a, user_b, closed_at)')
        .eq('conversation_id', refId)
        .eq('sender_id', actorId)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const conv = (data as {
        community_conversations?: { user_a?: string; user_b?: string; closed_at?: string | null }
      } | null)?.community_conversations
      verified = !!data && !!conv && !conv.closed_at
        && ((conv.user_a === actorId && conv.user_b === targetUserId)
          || (conv.user_a === targetUserId && conv.user_b === actorId))
    } else if (kind === 'reaction') {
      activityTargetKind = 'post'
      activityTargetId = refId
      const { data } = await admin
        .from('community_reactions')
        .select('post_id, community_posts!inner(author_id)')
        .eq('post_id', refId)
        .eq('user_id', actorId)
        .gte('created_at', sinceIso)
        .limit(1)
        .maybeSingle()
      const author = (data as { community_posts?: { author_id?: string } } | null)?.community_posts
      verified = !!data && author?.author_id === targetUserId
    } else if (kind === 'comment') {
      const { data } = await admin
        .from('community_comments')
        .select('id, target_kind, target_id')
        .eq('id', refId)
        .eq('author_id', actorId)
        .gte('created_at', sinceIso)
        .limit(1)
        .maybeSingle()
      if (data) {
        const row = data as { target_kind: string; target_id: string }
        // The activity row _community_add_activity wrote carries the
        // comment's OWN target (the post or programme it is on), not the
        // comment's id, which is what `refId` names here.
        activityTargetKind = row.target_kind
        activityTargetId = row.target_id
        if (row.target_kind === 'post') {
          const { data: post } = await admin
            .from('community_posts').select('author_id').eq('id', row.target_id).maybeSingle()
          verified = (post as { author_id?: string } | null)?.author_id === targetUserId
        }
        // migrate_164: community_comment no longer accepts target_kind =
        // 'programme' (the shared-programme layer is retired), so any
        // OTHER target_kind here is a row this function does not know how
        // to prove and `verified` stays false rather than trusting it.
      }
    }
  } catch (e) {
    console.error('[community-notify] verification failed', e)
    return jsonResponse({ ok: false, error: 'not_verified' }, 403)
  }
  if (!verified) return jsonResponse({ ok: false, error: 'not_verified' }, 403)

  // Step 3: a block in either direction ends it here.
  const { data: blocks, error: blockErr } = await admin
    .from('community_blocks')
    .select('blocker_id')
    .or(`and(blocker_id.eq.${targetUserId},blocked_id.eq.${actorId}),`
      + `and(blocker_id.eq.${actorId},blocked_id.eq.${targetUserId})`)
    .limit(1)
  if (blockErr) {
    console.error('[community-notify] block read failed, holding push', blockErr)
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }
  if (blocks && blocks.length > 0) {
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }

  // Step 3a: a mute silences the connection and message pushes. It is
  // deliberately NOT applied to the older kinds, whose behaviour migrate_160
  // and blueprint 30 already fixed; changing those is not this campaign's to
  // make.
  if ((MUTE_SILENCED_KINDS as string[]).includes(kind)) {
    const { data: mutes, error: muteErr } = await admin
      .from('community_mutes')
      .select('muter_id')
      .eq('muter_id', targetUserId)
      .eq('muted_id', actorId)
      .limit(1)
    if (muteErr) {
      console.error('[community-notify] mute read failed, holding push', muteErr)
      return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
    }
    if (mutes && mutes.length > 0) {
      return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
    }
  }

  // Step 4: the recipient's category toggle. Absent row means never touched,
  // which is consent by default for an opt-out control. A failed read holds.
  const { data: pref, error: prefErr } = await admin
    .from('notification_preferences')
    .select('enabled')
    .eq('user_id', targetUserId)
    .eq('category', categoryFor(kind))
    .maybeSingle()
  if (prefErr) {
    console.error('[community-notify] preference read failed, holding push', prefErr)
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }
  if (pref && (pref as { enabled?: boolean }).enabled === false) {
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }

  // Step 4a: quiet hours (migrate_164 spec G). Held rather than blocked: a
  // failed read or an unset window is absence, not a refusal, so it never
  // stops a push that would otherwise go -- unlike the category toggle and
  // the ED flag below, which fail CLOSED on a read error.
  const { data: quiet } = await admin
    .from('notification_preferences')
    .select('quiet_start, quiet_end, tz')
    .eq('user_id', targetUserId)
    .eq('category', 'quiet_hours')
    .maybeSingle()
  const quietRow = quiet as { quiet_start?: number | null; quiet_end?: number | null; tz?: string | null } | null
  if (quietRow?.quiet_start != null && quietRow?.quiet_end != null && quietRow?.tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: quietRow.tz, hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(new Date())
      const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 'NaN')
      const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 'NaN')
      if (Number.isFinite(hour) && Number.isFinite(minute)) {
        const nowMin = hour * 60 + minute
        const start = quietRow.quiet_start
        const end = quietRow.quiet_end
        // An overnight window (start > end, e.g. 23:00-07:00) wraps past
        // midnight; a same-day window (start <= end) does not.
        const inWindow = start <= end
          ? nowMin >= start && nowMin < end
          : nowMin >= start || nowMin < end
        if (inWindow) {
          return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
        }
      }
    } catch (e) {
      // An invalid/unknown tz string should not have made it past
      // community_set_quiet_hours, but if it did, that is absence of a
      // usable window, not a reason to hold every push at this person.
      console.error('[community-notify] quiet-hours projection failed', e)
    }
  }

  // Step 5: the recipient's open ED/wellbeing flag. Copied from partner-cheer
  // in shape and in posture: fail CLOSED, so any doubt means in-app only.
  const { data: openFlag, error: flagErr } = await admin
    .from('ed_pattern_flags')
    .select('id')
    .eq('user_id', targetUserId)
    .is('cleared_at', null)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (flagErr) {
    console.error('[community-notify] ED flag read failed, holding push', flagErr)
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }
  if (openFlag) {
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }

  // Step 5b: the activity replay guard (security review 2026-09-06,
  // finding 4). Every kind proved above by a community_activity row is
  // guarded by the same row's `pushed_at` column: a caller re-POSTing this
  // function against the same proof, inside the same ten-minute recency
  // window, gets exactly one push out of it rather than one per call.
  // connect_request and connect_accepted had no rail of any kind before this.
  let activityRowId: string | null = null
  if ((ACTIVITY_BACKED_KINDS as string[]).includes(kind)) {
    if (!activityTargetKind || !activityTargetId) {
      // The action was proved above, but nothing here can name the proof row
      // to guard: fail closed rather than push with no replay protection.
      return jsonResponse({ ok: false, error: 'not_verified' }, 403)
    }
    const { data: act, error: actErr } = await admin
      .from('community_activity')
      .select('id, pushed_at')
      .eq('user_id', targetUserId)
      .eq('actor_id', actorId)
      .eq('kind', kind)
      .eq('target_kind', activityTargetKind)
      .eq('target_id', activityTargetId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (actErr) {
      console.error('[community-notify] activity read failed, holding push', actErr)
      return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
    }
    const activityRow = act as { id?: string; pushed_at?: string | null } | null
    if (!activityRow) {
      // The action is proved, but the activity row _community_add_activity
      // should have written for it is missing: fail closed rather than push
      // with nothing to stamp.
      return jsonResponse({ ok: false, error: 'not_verified' }, 403)
    }
    if (activityRow.pushed_at) {
      return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
    }
    activityRowId = activityRow.id ?? null
  }

  // Step 5a: the fifteen-minute collapse, for a message only. One push per
  // conversation while the recipient has not read it: a second message inside
  // the window is a buzz they do not need, and the unread count is already
  // waiting for them in the app.
  let pushColumn: 'a_last_push_at' | 'b_last_push_at' | null = null
  if (kind === 'message') {
    const { data: conv, error: convErr } = await admin
      .from('community_conversations')
      .select('id, user_a, user_b, a_last_read_at, b_last_read_at, a_last_push_at, b_last_push_at')
      .eq('id', refId)
      .maybeSingle()
    if (convErr || !conv) {
      console.error('[community-notify] conversation read failed, holding push', convErr)
      return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
    }
    const row = conv as {
      user_a: string
      a_last_read_at: string | null; b_last_read_at: string | null
      a_last_push_at: string | null; b_last_push_at: string | null
    }
    const recipientIsA = row.user_a === targetUserId
    pushColumn = recipientIsA ? 'a_last_push_at' : 'b_last_push_at'
    const lastPush = recipientIsA ? row.a_last_push_at : row.b_last_push_at
    const lastRead = recipientIsA ? row.a_last_read_at : row.b_last_read_at
    if (lastPush) {
      const pushedMs = Date.parse(lastPush)
      const readMs = lastRead ? Date.parse(lastRead) : 0
      const withinWindow = Number.isFinite(pushedMs)
        && Date.now() - pushedMs < MESSAGE_PUSH_COLLAPSE_MS
      // Still the same unread window: they have not opened the conversation
      // since we last pushed at them.
      const stillUnread = !Number.isFinite(readMs) || readMs < pushedMs
      if (withinWindow && stillUnread) {
        return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
      }
    }
  }

  // The actor's handle. No Community push ever carries a real name.
  const { data: actorProfile } = await admin
    .from('community_profiles')
    .select('handle')
    .eq('user_id', actorId)
    .maybeSingle()
  const handle = (actorProfile as { handle?: string } | null)?.handle
  if (!handle) {
    // No profile means nothing to name, and naming nobody is worse than
    // staying quiet.
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }

  // Step 5c: the daily Respect collapse, for a reaction only (Communities
  // revamp phase 3, docs/communities-revamp-2026-09-10/23-PHASE3-SPEC.md
  // section 6). Runs after 5b above, so a retried call against the exact
  // same proof is already stopped there and never reaches this table, and
  // immediately before the send so that nothing between the two can return
  // early holding an unused claim.
  //
  // reviewer 2026-09-10 (B): this was a SELECT, then a send, then an
  // INSERT. Two Respects for the same person landing in the same moment -
  // exactly what community_respect_all's fan-out produces when several
  // people tap "Respect everyone" at once - both read "no row", both sent,
  // and the second INSERT failed with a duplicate key that was only
  // logged. The collapse was bypassable by a burst, which is the one thing
  // it exists to stop. The row's own PRIMARY KEY (recipient, day) is the
  // only lock available here, so CLAIM the day with an INSERT first and
  // read the outcome: 23505 means somebody else already claimed it and
  // this call stays silent. A failed send then RELEASES the claim (the
  // catch below), which keeps the original "a failed send never silences
  // the day" property that writing after the send was reaching for.
  let notifyDailyClaimed = false
  let notifyDailyDay: string | null = null
  if (kind === 'reaction') {
    notifyDailyDay = ukLocalDayKey()
    const { error: claimErr } = await admin
      .from('community_notify_daily')
      .insert({ recipient: targetUserId, day: notifyDailyDay, count: 1 })
    if (claimErr) {
      if ((claimErr as { code?: string }).code !== '23505') {
        console.error('[community-notify] daily-collapse claim failed, holding push', claimErr)
        return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
      }
      // Already claimed today: tally it and stay silent. The in-app
      // Activity inbox already shows every Respect immediately (the
      // community_activity row this call is proving was written before
      // this function was ever invoked) - only the PUSH collapses.
      const { data: daily } = await admin
        .from('community_notify_daily')
        .select('count')
        .eq('recipient', targetUserId)
        .eq('day', notifyDailyDay)
        .maybeSingle()
      const { error: incErr } = await admin
        .from('community_notify_daily')
        .update({ count: ((daily as { count?: number } | null)?.count ?? 0) + 1 })
        .eq('recipient', targetUserId)
        .eq('day', notifyDailyDay)
      if (incErr) {
        console.error('[community-notify] daily-collapse increment failed', incErr)
      }
      return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
    }
    notifyDailyClaimed = true
    // Opportunistic retention prune for this recipient only (best effort:
    // a failure here must never cost them their push).
    const cutoff = ukLocalDayKey(
      new Date(Date.now() - NOTIFY_DAILY_RETENTION_DAYS * 24 * 60 * 60 * 1000),
    )
    const { error: pruneErr } = await admin
      .from('community_notify_daily')
      .delete()
      .eq('recipient', targetUserId)
      .lt('day', cutoff)
    if (pruneErr) {
      console.error('[community-notify] daily-collapse prune failed', pruneErr)
    }
  }

  const copy = pushCopy(kind, handle)
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        user_id: targetUserId,
        title: copy.title,
        body: copy.body,
        data: {
          type: categoryFor(kind),
          ref_id: refId,
          // reviewer 2026-09-10 (B): no actor_handle on a reaction. That
          // push is a collapsed daily digest whose body deliberately names
          // nobody ("Someone gave your training respect"), and it stands
          // for at least one Respect and possibly several - putting one
          // actor's handle in the payload puts a name back on it. Nothing
          // in src/ reads actor_handle, so nothing loses anything.
          ...(kind === 'reaction' ? {} : { actor_handle: handle }),
          // The tap route for a message opens the conversation itself
          // (deep link `m`), so the id travels with the push. No content
          // ever does.
          ...(kind === 'message' ? { conversation_id: refId } : {}),
        },
      }),
    })
    if (kind === 'message' && pushColumn) {
      // Stamp the collapse clock only after the push has actually gone, so a
      // failed send does not silence the next one.
      const { error: stampErr } = await admin
        .from('community_conversations')
        .update({ [pushColumn]: new Date().toISOString() })
        .eq('id', refId)
      if (stampErr) {
        console.error('[community-notify] push stamp failed', stampErr)
      }
    } else if (activityRowId) {
      // Same principle, for every activity-backed kind (finding 4): stamp
      // only after the push has actually gone, so a failed send does not
      // silence the next attempt.
      const { error: stampErr } = await admin
        .from('community_activity')
        .update({ pushed_at: new Date().toISOString() })
        .eq('id', activityRowId)
      if (stampErr) {
        console.error('[community-notify] activity push stamp failed', stampErr)
      }
    }
    // Step 5c's claim is already written (above, before the send): it is
    // what makes this the only reaction push of the day, and the activity
    // row's pushed_at stamped just above is what guards a retry of THIS
    // same proof. Nothing more to write here.
  } catch (e) {
    // The activity row is already written; a failed push is not a failed
    // action.
    console.error('[community-notify] push fan-out failed', e)
    // reviewer 2026-09-10 (B): release the day back. The claim was taken
    // before the send precisely so a burst could not slip past it; if the
    // send then failed, holding it would silence this person's Respect
    // push for the rest of the day on the strength of a push that never
    // arrived.
    if (notifyDailyClaimed && notifyDailyDay) {
      const { error: releaseErr } = await admin
        .from('community_notify_daily')
        .delete()
        .eq('recipient', targetUserId)
        .eq('day', notifyDailyDay)
      if (releaseErr) {
        console.error('[community-notify] daily-collapse release failed', releaseErr)
      }
    }
    return jsonResponse({ ok: true, delivered: 'in_app' }, 200)
  }

  return jsonResponse({ ok: true, delivered: 'push' }, 200)
})
