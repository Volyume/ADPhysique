// Edge Function: community-public
//
// The read-only public window onto Community (blueprint section 4; SD-16).
// The static pages at https://volyume.app/p/?id= (programme), /s/?id=
// (story) and /u/?h= (profile) fetch this so a link shared outside the app
// renders for someone who does not have Volyume.
//
// Auth model: anonymous GET, no JWT. It uses the service role internally
// because the community_* tables have RLS on with NO policy for anon, and it
// therefore returns ONLY an explicit field allow-list, built field by field
// below rather than by selecting a row and handing it over. Nothing that is
// not in one of those three literals can leave through this function.
//
// It returns 404, never a partial record, when ANY of these is true:
//   - the creator is a minor (SD-05: minors never appear in any public
//     surface, including this one)
//   - the creator's account is not active (restricted or suspended)
//   - the creator's profile is not public
//   - the content is hidden (a moderator action or the three-report auto-hide)
//   - the content's own visibility is not public (a programme may also be
//     'link', which is unlisted but shareable; a post must be public)
//
// Query:
//   ?kind=programme&id=<uuid>
//   ?kind=post&id=<uuid>
//   ?kind=profile&h=<handle>
//   ?kind=group&id=<uuid>            (Stage 3, 3f; NOT DEPLOYED)
//
// Link previews (Stage 3, spec 3f, D221; NOT DEPLOYED until the founder's
// go): the profile, post and group responses each carry a `preview` of
// `{ title, description }` for the /u, /s and /g pages' meta tags. Built
// ONLY by the three preview* functions below, from an explicit allow-list:
//   u  display name, handle, and the self-declared discipline labels
//   s  the author's display name and the post kind's fixed headline; the
//      description may add a number of sessions or sets, and nothing else.
//      NEVER the note or caption, never a load, bodyweight, food figure,
//      exercise name or any other number
//   g  the group's name and its member count, for an OPEN, ACTIVE group only
// Nothing at all for a private profile, a minor, a restricted or suspended
// account, or a hidden post: those 404 exactly as they did before, and the
// page shows its generic preview.
//
// Response: { ok: true, kind, ... } or { ok: false, error: 'not_found' } 404.
// Headers: Cache-Control: public, max-age=300; CORS * for GET.
//
// Founder deployment: `supabase functions deploy community-public
// --no-verify-jwt` (it is deliberately anonymous). Needs the auto-populated
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HANDLE_RE = /^[a-z0-9_]{3,20}$/

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

function notFound(): Response {
  return jsonResponse({ ok: false, error: 'not_found' }, 404)
}

interface ProfileRow {
  user_id: string
  handle: string
  display_name: string
  avatar_preset: string | null
  bio: string | null
  styles: string[] | null
  goal: string | null
  setting: string | null
  area_label: string | null
  gym_label: string | null
  follower_count: number
  visibility: string
  status: string
  is_minor: boolean
  discipline_keys: string[] | null
}

// The ONLY shape a creator ever takes on a public page.
function creatorCard(p: ProfileRow) {
  return {
    handle: p.handle,
    display_name: p.display_name,
    avatar_preset: p.avatar_preset,
  }
}

function publiclyVisible(p: ProfileRow | null): p is ProfileRow {
  return !!p && p.status === 'active' && p.visibility === 'public' && p.is_minor === false
}

// ─── Link previews (Stage 3, 3f) ───────────────────────────────────────
// Every string below is built from these allow-lists. A function here never
// receives a caption, a note, a payload object or a figure other than the
// two small integers documented on previewPost.

const DISCIPLINE_LABELS: Record<string, string> = {
  bodybuilding: 'Bodybuilding',
  mens_physique: 'Men\'s physique',
  classic_physique: 'Classic physique',
  womens_physique: 'Women\'s physique',
  figure: 'Figure',
  bikini: 'Bikini',
  wellness: 'Wellness',
  powerlifting: 'Powerlifting',
  olympic_weightlifting: 'Olympic weightlifting',
  strongman: 'Strongman and strongwoman',
  crossfit_functional: 'CrossFit and functional fitness',
  calisthenics: 'Calisthenics',
  hybrid: 'Hybrid (lifting and endurance)',
  sport_sc: 'Sport strength and conditioning',
  general_strength: 'General strength and fitness',
}

const POST_HEADLINES: Record<string, string> = {
  pr: 'a personal best',
  session: 'a training session',
  block: 'a finished training block',
  milestone: 'a training milestone',
  note: 'a post',
}

interface Preview { title: string; description: string }

const GENERIC_PREVIEW: Preview = {
  title: 'Volyume',
  description: 'Strength training, planned and tracked. Shared on Volyume.',
}

function smallCount(n: unknown): number | null {
  const v = Number(n)
  return Number.isFinite(v) && v >= 0 && v <= 9999 ? Math.round(v) : null
}

function previewProfile(displayName: string, handle: string, disciplineKeys: string[] | null): Preview {
  const labels = (disciplineKeys ?? [])
    .map((k) => DISCIPLINE_LABELS[k])
    .filter((l): l is string => typeof l === 'string')
    .slice(0, 2)
  return {
    title: `${displayName} (@${handle}) on Volyume`,
    description: labels.length > 0
      ? `${labels.join(' and ')}. Training on Volyume.`
      : 'Training on Volyume.',
  }
}

function previewPost(displayName: string, postKind: string, sessionsOrSets: { sessions?: unknown; sets?: unknown }): Preview {
  const headline = POST_HEADLINES[postKind]
  if (!headline) return GENERIC_PREVIEW
  const sets = smallCount(sessionsOrSets.sets)
  const sessions = smallCount(sessionsOrSets.sessions)
  let description = 'Shared on Volyume.'
  if (postKind === 'session' && sets !== null) description = `${sets} sets. Shared on Volyume.`
  if (postKind === 'block' && sessions !== null) description = `${sessions} sessions. Shared on Volyume.`
  return { title: `${displayName} shared ${headline}`, description }
}

function previewGroup(name: string, memberCount: number): Preview {
  return {
    title: `${name} on Volyume`,
    description: memberCount === 1 ? '1 member training together.' : `${memberCount} members training together.`,
  }
}

const PROFILE_COLUMNS =
  'user_id, handle, display_name, avatar_preset, bio, styles, goal, setting, '
  + 'area_label, gym_label, follower_count, visibility, status, is_minor, discipline_keys'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[community-public] missing env vars')
    return jsonResponse({ ok: false, error: 'Server misconfigured' }, 500)
  }

  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') ?? ''
  const id = url.searchParams.get('id') ?? ''
  const handle = (url.searchParams.get('h') ?? '').toLowerCase()

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // migrate_164 (40-GAP-CLOSURE.md section 2): the shared-programme layer
    // is retired, so the 'p' deep link / public programme page 404s rather
    // than reading the now-empty community_programmes table. Not folded
    // into the shared `notFound()` fall-through below so this stays an
    // explicit, documented refusal rather than an accident of an unhandled
    // kind.
    if (kind === 'programme') return notFound()

    if (kind === 'post') {
      if (!UUID_RE.test(id)) return notFound()
      const { data: post } = await admin
        .from('community_posts')
        .select('id, author_id, kind, payload, caption, visibility, status, created_at')
        .eq('id', id)
        .maybeSingle()
      if (!post) return notFound()
      const row = post as Record<string, unknown>
      if (row.status !== 'visible' || row.visibility !== 'public') return notFound()

      const { data: author } = await admin
        .from('community_profiles').select(PROFILE_COLUMNS)
        .eq('user_id', row.author_id as string).maybeSingle()
      if (!publiclyVisible(author as ProfileRow | null)) return notFound()

      return jsonResponse({
        ok: true,
        kind: 'post',
        post: {
          kind: row.kind,
          payload: row.payload,
          caption: row.caption,
          created_at: row.created_at,
          author: creatorCard(author as ProfileRow),
        },
        preview: previewPost(
          (author as ProfileRow).display_name,
          String(row.kind ?? ''),
          // Only the two counts the spec allows. The payload object itself
          // is never handed on.
          {
            sets: (row.payload as Record<string, unknown> | null)?.workingSets,
            sessions: (row.payload as Record<string, unknown> | null)?.sessions,
          },
        ),
      }, 200)
    }

    if (kind === 'profile') {
      if (!HANDLE_RE.test(handle)) return notFound()
      const { data: profile } = await admin
        .from('community_profiles').select(PROFILE_COLUMNS)
        .eq('handle', handle).maybeSingle()
      if (!publiclyVisible(profile as ProfileRow | null)) return notFound()
      const p = profile as ProfileRow

      const { data: progs } = await admin
        .from('community_programmes')
        .select('id, title, style_key, days_per_week, exercise_count, has_circuits, use_count')
        .eq('owner_id', p.user_id)
        .eq('status', 'visible')
        .eq('visibility', 'public')
        .order('updated_at', { ascending: false })
        .limit(20)

      const { data: posts } = await admin
        .from('community_posts')
        .select('id, kind, payload, caption, created_at')
        .eq('author_id', p.user_id)
        .eq('status', 'visible')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(10)

      return jsonResponse({
        ok: true,
        kind: 'profile',
        preview: previewProfile(p.display_name, p.handle, p.discipline_keys),
        profile: {
          handle: p.handle,
          display_name: p.display_name,
          avatar_preset: p.avatar_preset,
          bio: p.bio,
          styles: p.styles ?? [],
          goal: p.goal,
          setting: p.setting,
          area_label: p.area_label,
          gym_label: p.gym_label,
          follower_count: p.follower_count,
          programmes: (progs ?? []).map((g) => {
            const r = g as Record<string, unknown>
            return {
              id: r.id,
              title: r.title,
              style_key: r.style_key,
              days_per_week: r.days_per_week,
              exercise_count: r.exercise_count,
              has_circuits: r.has_circuits,
              use_count: r.use_count,
            }
          }),
          posts: (posts ?? []).map((s) => {
            const r = s as Record<string, unknown>
            return {
              id: r.id,
              kind: r.kind,
              payload: r.payload,
              caption: r.caption,
              created_at: r.created_at,
            }
          }),
        },
      }, 200)
    }

    if (kind === 'group') {
      if (!UUID_RE.test(id)) return notFound()
      const { data: grp } = await admin
        .from('community_groups')
        .select('id, name, access, status')
        .eq('id', id)
        .maybeSingle()
      const g = grp as { id: string; name: string; access: string; status: string } | null
      // Open and active only: an invite-only or closed group is the generic page.
      if (!g || g.access !== 'open' || g.status !== 'active') return notFound()

      // Members counted on the in-app predicate: joined, active, not a minor.
      const { data: roster } = await admin
        .from('community_group_members')
        .select('user_id, community_profiles!inner(status, is_minor)')
        .eq('group_id', g.id)
        .eq('state', 'member')
        .limit(1000)
      const memberCount = (roster ?? []).filter((r) => {
        const prof = (r as { community_profiles?: { status?: string; is_minor?: boolean } }).community_profiles
        return prof?.status === 'active' && prof?.is_minor === false
      }).length

      return jsonResponse({
        ok: true,
        kind: 'group',
        group: { name: g.name, member_count: memberCount },
        preview: previewGroup(g.name, memberCount),
      }, 200)
    }
  } catch (e) {
    console.error('[community-public] read failed', e)
    return notFound()
  }

  return notFound()
})
