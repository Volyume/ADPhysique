// LS-03b (Codex adversarial audit, 2026-07-12): PostgREST caps every response
// at 1000 rows. Several per-user table pulls issued a single
// `.select('*').eq('user_id', userId)` with no pagination, so an account with
// more than 1000 rows in that table (daily_steps after ~3 years, body_metrics
// or cardio_log sooner with multiple entries a day) silently restored only the
// first 1000 rows on a new device, and every later pull re-fetched the same
// first page - the tail never synced.
//
// fetchAllUserRows pages through with .range() until a short page comes back,
// and returns the SAME { data, error } shape the single-select returned, so a
// call site swaps one line and keeps its existing error/empty branches. On any
// page error it returns { data: null, error } with NO partial rows, so the
// caller treats it as a failed pull (holding its state) rather than applying a
// truncated set as if it were complete - the same rule fetchAllRows follows in
// the legacy sync path (LS-03).

const PAGE = 1000;

export async function fetchAllUserRows(builderFactory) {
  let from = 0;
  const out = [];
  for (;;) {
    const { data, error } = await builderFactory().range(from, from + PAGE - 1);
    if (error) return { data: null, error };
    if (!data?.length) return { data: out, error: null };
    out.push(...data);
    if (data.length < PAGE) return { data: out, error: null };
    from += PAGE;
  }
}
