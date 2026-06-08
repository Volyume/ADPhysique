# VOLYUME — SUPABASE RULES

Read this when working on anything touching Supabase, migrations, or the sync layer.

---

## RLS — MANDATORY ON EVERY NEW TABLE

Every table you create needs all of this. No exceptions.

ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

If you create a table without RLS you have created a data breach. Fix it immediately.

---

## VIEWS — ALWAYS SECURITY INVOKER

Every view must have WITH (security_invoker = true).
Without it the view silently bypasses RLS and exposes all user data.

Correct:
  CREATE VIEW my_view WITH (security_invoker = true) AS SELECT ...;

Never:
  CREATE VIEW my_view AS SELECT ...;

---

## AUTH

Use auth.uid() in all RLS policies. Never hardcode a user ID.
Use app_metadata for roles and access control.
Never use user_metadata for access control — it is user-editable.

---

## MIGRATIONS

Before writing any migration, state:
- What tables or columns are changing
- Whether it is additive or destructive
- Which environment it runs against

Never run destructive migrations (DROP, TRUNCATE, column removal) without
explicit confirmation and a confirmed backup.

Never invent Supabase CLI commands. A commonly hallucinated command that does
not exist: supabase db execute. Use supabase db push or the SQL editor.

---

## SYNC LAYER

Components never call Supabase directly.
The sync layer is the only place Supabase is called from.
When adding a new feature that needs cloud sync, add it to the sync layer.
Do not bypass it.

---

## EDGE FUNCTIONS

Every edge function must:
- Validate the JWT before doing anything else
- Return JSON errors, never plain text
- Return correct CORS headers for mobile clients

Auth check pattern:
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401 })
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
