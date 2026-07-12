import type { SupabaseClient } from '@supabase/supabase-js';

// App-local data layer for the Marketing HQ dashboard only (not the shared
// @volyume/* packages, per marketing/hq/DASHBOARD-SPEC.md section 2). Every
// query runs under the caller's authenticated (admin) session; RLS on the
// four marketing tables enforces the real boundary. Never uses service_role.

export interface MarketingMetricRow {
  metric: string;
  value: number;
  metric_date: string;
  source: string;
}

export type MarketingMetrics = Record<string, MarketingMetricRow>;

export interface MarketingContentRow {
  id: string;
  channel: string;
  title: string;
  body_ref: string | null;
  status: string;
  lane: string;
  compliance_verdict: string | null;
  compliance_record: Record<string, unknown> | null;
  claims_citations: unknown;
  scheduled_for: string | null;
  published_at: string | null;
  published_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingLedgerRow {
  id: string;
  occurred_at: string;
  action: string;
  channel: string | null;
  cost_pence: number;
  result: string | null;
  kind: string;
  detail: Record<string, unknown> | null;
}

const CONTENT_STATUSES = [
  'draft',
  'pending_review',
  'failed_review',
  'approved',
  'scheduled',
  'published',
  'retired',
] as const;

// Most recent row per metric from marketing_metrics, keyed by metric name.
// Fetches all rows ordered newest-first and keeps only the first occurrence
// of each metric (distinct-per-metric latest).
export async function getLatestMetrics(supabase: SupabaseClient): Promise<MarketingMetrics> {
  const { data, error } = await supabase
    .from('marketing_metrics')
    .select('metric, value, metric_date, source')
    .order('metric_date', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as MarketingMetricRow[];
  const latest: MarketingMetrics = {};
  for (const row of rows) {
    if (!latest[row.metric]) {
      latest[row.metric] = row;
    }
  }
  return latest;
}

// Full history for a metric, oldest first, for trend charts. Only used once
// getLatestMetrics has confirmed a metric exists.
export async function getMetricHistory(
  supabase: SupabaseClient,
  metric: string,
): Promise<{ metric_date: string; value: number }[]> {
  const { data, error } = await supabase
    .from('marketing_metrics')
    .select('metric_date, value')
    .eq('metric', metric)
    .order('metric_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as { metric_date: string; value: number }[];
}

// The waitlist total's source of truth on this dashboard is the
// marketing_metrics table (written by an agent job), never
// marketing_waitlist directly -- that table has no authenticated SELECT
// policy at all (RLS deliberately blocks it to protect GDPR-consented
// personal data). If there is no waitlist_total row yet, callers show
// "awaiting data" like any other missing metric.
export function getWaitlistTotal(metrics: MarketingMetrics): MarketingMetricRow | null {
  return metrics.waitlist_total ?? null;
}

// All marketing_content rows grouped by status, ordered by updated_at desc
// within each group, in the fixed pipeline order (draft through retired).
export async function getContentByStatus(
  supabase: SupabaseClient,
): Promise<Record<string, MarketingContentRow[]>> {
  const { data, error } = await supabase
    .from('marketing_content')
    .select(
      'id, channel, title, body_ref, status, lane, compliance_verdict, compliance_record, claims_citations, scheduled_for, published_at, published_url, created_at, updated_at',
    )
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as MarketingContentRow[];
  const grouped: Record<string, MarketingContentRow[]> = {};
  for (const status of CONTENT_STATUSES) {
    grouped[status] = [];
  }
  for (const row of rows) {
    (grouped[row.status] ??= []).push(row);
  }
  return grouped;
}

export interface MarketingChannelRow {
  id: string;
  channel: string;
  account_ref: string | null;
  status: string;
  capability: string;
  notes: string | null;
  updated_at: string;
}

// All marketing_channels rows, alphabetical by channel. SELECT (and UPDATE,
// unused here) on this table is RLS-gated on marketing_admins membership,
// same as every other internal marketing table; a non-admin session gets
// zero rows.
export async function getChannels(supabase: SupabaseClient): Promise<MarketingChannelRow[]> {
  const { data, error } = await supabase
    .from('marketing_channels')
    .select('id, channel, account_ref, status, capability, notes, updated_at')
    .order('channel', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MarketingChannelRow[];
}

export interface MarketingWeeklyReport {
  // Monday of the week, as a YYYY-MM-DD day key in Europe/London.
  weekStart: string;
  kindCounts: Record<string, number>;
  rows: MarketingLedgerRow[];
  // Latest marketing_metrics value per metric within the week.
  metrics: MarketingMetricRow[];
}

const REPORT_WEEKS = 8;

// Formats an instant as its calendar day in Europe/London; the en-CA locale
// yields YYYY-MM-DD directly.
const LONDON_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Monday of the week containing the given YYYY-MM-DD day key. UK-local weeks
// start Monday, matching the app's dayKey convention.
function mondayOfWeek(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - sinceMonday);
  return d.toISOString().slice(0, 10);
}

// Weekly report rollups derived server-side from marketing_ledger and
// marketing_metrics. There is deliberately NO marketing_reports table (cloud
// schema changes are founder-gated; ruling recorded in DASHBOARD-SPEC.md
// section 1). Weeks are Europe/London, Monday-start. Returns the weeks with
// any activity among the last REPORT_WEEKS, newest first; each carries its
// ledger rows (newest first), counts per ledger kind, and the latest metric
// value per metric within that week. Both reads are RLS-gated on
// marketing_admins membership, as everywhere else in this file.
export async function getWeeklyReports(
  supabase: SupabaseClient,
): Promise<MarketingWeeklyReport[]> {
  const currentWeekStart = mondayOfWeek(LONDON_DAY.format(new Date()));
  const cutoff = new Date(`${currentWeekStart}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7 * (REPORT_WEEKS - 1));
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  // Query the ledger from one day before the cutoff Monday so rows late on
  // the previous UTC day that fall inside the London week (BST offset) are
  // not missed; the week-key filter below trims any genuine overshoot.
  const queryFloor = new Date(cutoff);
  queryFloor.setUTCDate(queryFloor.getUTCDate() - 1);

  const [ledgerRes, metricsRes] = await Promise.all([
    supabase
      .from('marketing_ledger')
      .select('id, occurred_at, action, channel, cost_pence, result, kind, detail')
      .gte('occurred_at', queryFloor.toISOString())
      .order('occurred_at', { ascending: false }),
    supabase
      .from('marketing_metrics')
      .select('metric, value, metric_date, source')
      .gte('metric_date', cutoffKey)
      .order('metric_date', { ascending: false }),
  ]);
  if (ledgerRes.error) throw ledgerRes.error;
  if (metricsRes.error) throw metricsRes.error;

  const weeks = new Map<string, MarketingWeeklyReport>();
  const weekFor = (key: string): MarketingWeeklyReport => {
    let week = weeks.get(key);
    if (!week) {
      week = { weekStart: key, kindCounts: {}, rows: [], metrics: [] };
      weeks.set(key, week);
    }
    return week;
  };

  for (const row of (ledgerRes.data ?? []) as MarketingLedgerRow[]) {
    const key = mondayOfWeek(LONDON_DAY.format(new Date(row.occurred_at)));
    if (key < cutoffKey) continue;
    const week = weekFor(key);
    week.rows.push(row);
    week.kindCounts[row.kind] = (week.kindCounts[row.kind] ?? 0) + 1;
  }

  // Metric rows arrive newest-first, so the first row seen per (week,
  // metric) pair is the latest value for that metric within the week.
  for (const row of (metricsRes.data ?? []) as MarketingMetricRow[]) {
    const key = mondayOfWeek(row.metric_date);
    if (key < cutoffKey) continue;
    const week = weekFor(key);
    if (!week.metrics.some((m) => m.metric === row.metric)) {
      week.metrics.push(row);
    }
  }

  return Array.from(weeks.values())
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
    .slice(0, REPORT_WEEKS);
}

const LEDGER_PAGE_SIZE = 50;

// marketing_ledger, newest first by occurred_at, paged 50 rows at a time.
export async function getLedgerPage(
  supabase: SupabaseClient,
  page: number,
): Promise<{ rows: MarketingLedgerRow[]; hasNextPage: boolean }> {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * LEDGER_PAGE_SIZE;
  // Fetch one extra row past the page boundary purely to detect whether a
  // next page exists; only the first 50 are returned to callers.
  const to = safePage * LEDGER_PAGE_SIZE;
  const { data, error } = await supabase
    .from('marketing_ledger')
    .select('id, occurred_at, action, channel, cost_pence, result, kind, detail')
    .order('occurred_at', { ascending: false })
    .range(from, to);
  if (error) throw error;

  const rows = (data ?? []) as MarketingLedgerRow[];
  return { rows: rows.slice(0, LEDGER_PAGE_SIZE), hasNextPage: rows.length > LEDGER_PAGE_SIZE };
}
