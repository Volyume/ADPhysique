// Edge Function: delete-account
//
// Fully deletes the caller's account. The existing `delete_user_data` RPC
// wipes every public.* row but cannot reach auth.users (different schema,
// SECURITY DEFINER in `public` lacks rights). Without removing auth.users,
// a subsequent Google/Apple OAuth sign-in resurrects the same user_id with
// no profile — the app then has to detect "session but no profile" and
// route to fresh enrollment, which is workable but messy.
//
// This function runs in Deno with a service-role key so it can finish the
// job. Flow:
//   1. Verify the caller via their JWT (anon-key client with Authorization
//      header attached). Reject if the token is invalid or missing.
//   2. Call delete_user_data via the user's JWT so RLS continues to enforce
//      "you can only delete your own data" — the function does not need to
//      know which uid is being targeted.
//   3. Use a service-role admin client to delete auth.users for the same
//      uid. Service role bypasses RLS but only sees the verified uid from
//      step 1, so there's no way for a caller to delete someone else's
//      account.
//
// Deploy with:
//   supabase functions deploy delete-account
//
// Requires the following secrets to be set in the project:
//   SUPABASE_URL              (auto-populated)
//   SUPABASE_ANON_KEY         (auto-populated)
//   SUPABASE_SERVICE_ROLE_KEY (auto-populated)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[delete-account] invoke start')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('[delete-account] missing env vars', {
        hasUrl: !!supabaseUrl, hasAnon: !!anonKey, hasService: !!serviceRoleKey,
      })
      return jsonResponse({ error: 'Server misconfigured: missing Supabase env vars' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[delete-account] missing Authorization header')
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
    }

    // 1. Verify the caller via their JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) {
      console.error('[delete-account] auth.getUser failed', userErr)
      return jsonResponse({ error: 'Not authenticated' }, 401)
    }
    console.log('[delete-account] verified user', { uid: user.id })

    // 2. Wipe public.* rows via the existing RPC. Runs with the user's
    //    JWT so RLS enforcement remains in place.
    const { error: rpcErr } = await userClient.rpc('delete_user_data')
    if (rpcErr) {
      console.error('[delete-account] delete_user_data RPC failed', rpcErr)
      return jsonResponse({ error: `Data wipe failed: ${rpcErr.message}` }, 500)
    }
    console.log('[delete-account] public data wiped')

    // 3. Delete the auth.users row with a service-role admin client.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: adminErr } = await adminClient.auth.admin.deleteUser(user.id)
    if (adminErr) {
      console.error('[delete-account] auth.admin.deleteUser failed', adminErr)
      return jsonResponse({ error: `Auth deletion failed: ${adminErr.message}` }, 500)
    }
    console.log('[delete-account] auth user deleted')

    return jsonResponse({ ok: true }, 200)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[delete-account] uncaught', e)
    return jsonResponse({ error: msg }, 500)
  }
})
