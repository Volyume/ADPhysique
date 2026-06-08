---
paths:
  - supabase/**
  - src/lib/supabase*
  - src/services/supabase*
  - src/api/**
---

# VOLYUME — SUPABASE RULES

These rules apply whenever working in Supabase migrations, edge functions,
or the Supabase client layer. The most common AI mistakes with Supabase
silently destroy security. These rules prevent that.

---

## ROW LEVEL SECURITY — MANDATORY ON EVERY TABLE

Every table you create must have all of the following.
No exceptions. No "we will add it later".

Enable RLS:
  ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

SELECT policy:
  CREATE POLICY "Users can read own data"
    ON table_name FOR SELECT
    USING (auth.uid() = user_id);

INSERT policy:
  CREATE POLICY "Users can insert own data"
    ON table_name FOR INSERT
    WITH CHECK (auth.uid() = user_id);

UPDATE policy:
  CREATE POLICY "Users can update own data"
    ON table_name FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DELETE policy (only if delete is permitted for this table):
  CREATE POLICY "Users can delete own data"
    ON table_name FOR DELETE
    USING (auth.uid() = user_id);

If you create a table without RLS, you have created a data breach.
Stop and fix it before doing anything else.

---

## VIEWS — SECURITY INVOKER IS MANDATORY

Every view must include WITH (security_invoker = true).
A view without it silently bypasses RLS and exposes all user data.

Correct:
  CREATE VIEW my_view
    WITH (security_invoker = true)
  AS SELECT ...;

Wrong — never do this:
  CREATE VIEW my_view AS SELECT ...;

---

## AUTH PATTERNS

Use auth.uid() in all RLS policies. Never hardcode user IDs.

Correct:
  USING (auth.uid() = user_id)

Wrong:
  USING (user_id = '123e4567-e89b-12d3-a456-426614174000')

For authorisation claims in application code:
- Use app_metadata for roles and entitlements
- Use user_metadata only for display preferences
- user_metadata is user-editable and must never be trusted for access control

Correct:
  const { data: { user } } = await supabase.auth.getUser()
  const role = user.app_metadata.role

Wrong:
  const role = user.user_metadata.role

---

## MIGRATIONS

Every schema change requires two things:
1. A migration file in supabase/migrations/
2. A bump to the schema version in schema.js (WatermelonDB)

Never run a migration against production without:
- Explicit instruction containing the exact words "run against production"
- A backup confirmed
- The migration tested on staging first

Migration file naming:
  [timestamp]_[description].sql
  Example: 20260610_add_partnerships_table.sql

Never use Supabase CLI commands that do not exist.
Known non-existent command hallucinated frequently:
  supabase db execute — this does not exist.
Use supabase db push or the SQL editor instead.

---

## EDGE FUNCTIONS

Edge functions live in supabase/functions/.
Every edge function must:
- Validate the JWT from the Authorization header before processing
- Return proper CORS headers for mobile clients
- Return structured JSON errors, never plain text
- Log errors via Supabase built-in logging

Auth validation pattern:
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorised' }),
      { status: 401, headers: corsHeaders }
    )
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid token' }),
      { status: 401, headers: corsHeaders }
    )
  }

---

## DATA RESIDENCY

The Supabase project is in EU Dublin.
All user data is subject to UK GDPR.
Never introduce a service that stores PII outside EU without raising it.
Never log user data (body weight, nutrition, health data) to external
services, analytics, or crash reporters.

---

## SUPABASE CLIENT USAGE IN THE APP

Never import the Supabase client directly in a component.
Components read from WatermelonDB via observers.
The sync layer (src/sync/) is the only place that calls Supabase directly.

Wrong — never do this in a component:
  import { supabase } from '@/lib/supabase'
  const { data } = await supabase.from('workouts').select('*')

Correct:
  const workouts = useWorkouts() // hook reading from WatermelonDB

---

## BEFORE WRITING ANY MIGRATION

State all of the following and wait for confirmation:
1. Tables being created or modified
2. RLS policies being added
3. Whether the migration is additive or destructive
4. Which environment it will run against

Never write a destructive migration (DROP, TRUNCATE, column removal)
without explicit confirmation and a confirmed backup.
