#!/usr/bin/env node
'use strict';

/**
 * Direct PostgREST/RPC hostile matrix for an ISOLATED Supabase project.
 *
 * Required environment:
 *   DAYBREAK_ISOLATED_PROJECT_CONFIRM=YES
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   DAYBREAK_USER_A_EMAIL, DAYBREAK_USER_A_PASSWORD
 *   DAYBREAK_USER_B_EMAIL, DAYBREAK_USER_B_PASSWORD
 *
 * Usage:
 *   node scripts/security/run-effective-supabase-matrix.cjs fixtures.json
 *
 * The fixture is deliberately explicit. Schema-valid hostile INSERT/upsert
 * bodies cannot be inferred safely from migration text, and a constraint error
 * is not evidence that RLS denied the request. Every mutation uses .select()
 * and an optional service-role cleanup filter so an unexpected staging success
 * is captured and removed. No credential value is printed.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const required = [
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'DAYBREAK_USER_A_EMAIL', 'DAYBREAK_USER_A_PASSWORD',
  'DAYBREAK_USER_B_EMAIL', 'DAYBREAK_USER_B_PASSWORD',
];

function stop(message, code = 2) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

if (process.env.DAYBREAK_ISOLATED_PROJECT_CONFIRM !== 'YES') {
  stop('Refusing to run: set DAYBREAK_ISOLATED_PROJECT_CONFIRM=YES only for a disposable isolated project.');
}
const missing = required.filter((name) => !process.env[name]);
if (missing.length) stop(`Missing required environment names: ${missing.join(', ')}`);

const fixturePath = process.argv[2];
if (!fixturePath) stop('Pass the reviewed matrix fixture JSON path as the first argument.');
const fixture = JSON.parse(fs.readFileSync(path.resolve(fixturePath), 'utf8'));
if (!Array.isArray(fixture.tables) || !Array.isArray(fixture.rpcs)) {
  stop('Fixture must contain tables[] and rpcs[].');
}
const inventory = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'supabase-matrix.targets.json'),
  'utf8',
));
const tableKeys = new Set(fixture.tables.map((item) => `${item.schema || 'public'}.${item.table}`));
const rpcKeys = new Set(fixture.rpcs.map((item) => item.name));
const missingTables = inventory.directPostgrestTables
  .map((item) => `${item.schema || 'public'}.${item.table}`)
  .filter((key) => !tableKeys.has(key));
const missingRpcs = inventory.clientRpcNames.filter((name) => !rpcKeys.has(name));
if (missingTables.length || missingRpcs.length) {
  stop([
    'Fixture coverage is incomplete; refusing to produce a partial security verdict.',
    missingTables.length ? `Missing table targets: ${missingTables.join(', ')}` : null,
    missingRpcs.length ? `Missing RPC targets: ${missingRpcs.join(', ')}` : null,
  ].filter(Boolean).join('\n'));
}

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, options);
const userA = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, options);
const userB = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, options);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, options);

function substitute(value, ids) {
  if (typeof value === 'string') {
    return value.replaceAll('${A_UID}', ids.a).replaceAll('${B_UID}', ids.b);
  }
  if (Array.isArray(value)) return value.map((item) => substitute(item, ids));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item, ids)]));
  }
  return value;
}

function isExplicitPolicyDenial(error, acceptedCodes = ['42501']) {
  if (!error) return false;
  if (acceptedCodes.includes(error.code)) return true;
  return /row.level security|policy|permission denied|not authorized|unauthori[sz]ed/i
    .test(`${error.message ?? ''} ${error.details ?? ''}`);
}

function summarise(result, { emptyMeansDenied = false, acceptedCodes } = {}) {
  const returnedRows = Array.isArray(result.data) ? result.data.length : (result.data == null ? 0 : 1);
  const explicitDenial = isExplicitPolicyDenial(result.error, acceptedCodes);
  const emptyDenial = !result.error && emptyMeansDenied && Array.isArray(result.data) && result.data.length === 0;
  const inconclusive = !!result.error && !explicitDenial;
  return {
    denied: explicitDenial || emptyDenial,
    inconclusive,
    evidence: explicitDenial ? 'explicit_policy_or_acl_denial'
      : (emptyDenial ? 'known_foreign_row_not_visible_or_mutable'
        : (inconclusive ? 'non_policy_error' : 'request_succeeded')),
    errorCode: result.error?.code ?? null,
    returnedRows,
  };
}

function assess(summary, expected = 'deny') {
  if (expected === 'deny') return summary.denied && !summary.inconclusive;
  if (expected === 'allow') {
    return !summary.denied && !summary.inconclusive && summary.errorCode == null;
  }
  if (expected === 'allow_nonempty') {
    return !summary.denied && !summary.inconclusive
      && summary.errorCode == null && summary.returnedRows > 0;
  }
  stop(`Unknown matrix expectation: ${expected}`);
  return false;
}

async function applyFilter(query, filter) {
  return query.match(filter || {});
}

async function cleanupUnexpected(item, filter) {
  if (!filter || Object.keys(filter).length === 0) return { attempted: false };
  const result = await tableClient(admin, item).delete().match(filter).select();
  return { attempted: true, ok: !result.error, errorCode: result.error?.code ?? null };
}

function tableClient(client, item) {
  return (item.schema && item.schema !== 'public' ? client.schema(item.schema) : client).from(item.table);
}

async function signIn(client, email, password, label) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data?.user?.id) stop(`Synthetic user ${label} could not sign in: ${error?.message ?? 'no user'}`);
  return data.user.id;
}

async function run() {
  const ids = {
    a: await signIn(userA, process.env.DAYBREAK_USER_A_EMAIL, process.env.DAYBREAK_USER_A_PASSWORD, 'A'),
    b: await signIn(userB, process.env.DAYBREAK_USER_B_EMAIL, process.env.DAYBREAK_USER_B_PASSWORD, 'B'),
  };
  if (ids.a === ids.b) stop('Synthetic A and B resolved to the same uid.');

  const results = { generatedAt: new Date().toISOString(), tables: [], rpcs: [], summary: {} };
  for (const raw of fixture.tables) {
    const item = substitute(raw, ids);
    const checks = [];
    const selectExpected = item.expectations?.select_foreign || 'deny';
    const selectResult = await applyFilter(tableClient(userA, item).select(item.select || '*'), item.foreignFilter);
    const selectSummary = summarise(selectResult, { emptyMeansDenied: selectExpected === 'deny' });
    checks.push({
      attack: 'select_foreign', expected: selectExpected,
      ...selectSummary, passed: assess(selectSummary, selectExpected),
    });

    if (item.nestedSelect) {
      const nestedExpected = item.expectations?.nested_select_foreign || 'deny';
      const nested = await applyFilter(tableClient(userA, item).select(item.nestedSelect), item.foreignFilter);
      const nestedSummary = summarise(nested, { emptyMeansDenied: nestedExpected === 'deny' });
      checks.push({
        attack: 'nested_select_foreign', expected: nestedExpected,
        ...nestedSummary, passed: assess(nestedSummary, nestedExpected),
      });
    }

    const mutations = [
      ['insert_as_foreign', item.insertAsForeign,
        (body) => tableClient(userA, item).insert(body).select()],
      ['update_foreign', item.updateForeign,
        (body) => applyFilter(tableClient(userA, item).update(body).select(), item.foreignFilter)],
      ['delete_foreign', item.deleteForeign === false ? null : {},
        () => applyFilter(tableClient(userA, item).delete().select(), item.foreignFilter)],
      ['upsert_foreign', item.upsertAsForeign,
        (body) => tableClient(userA, item).upsert(body, item.onConflict ? { onConflict: item.onConflict } : {}).select()],
      ['bulk_insert_foreign', item.bulkInsertAsForeign,
        (body) => tableClient(userA, item).insert(body).select()],
      ['foreign_parent_attachment', item.foreignParentAttachment,
        (body) => tableClient(userA, item).insert(body).select()],
    ];
    for (const [attack, body, invoke] of mutations) {
      if (body == null) continue;
      // eslint-disable-next-line no-await-in-loop
      const outcome = await invoke(body);
      const emptyMeansDenied = attack === 'update_foreign' || attack === 'delete_foreign';
      const summary = summarise(outcome, { emptyMeansDenied });
      let cleanup = null;
      if (!summary.denied) {
        // eslint-disable-next-line no-await-in-loop
        cleanup = await cleanupUnexpected(
          item,
          item.cleanupFilterByAttack?.[attack] || item.cleanupFilter,
        );
      }
      const expected = item.expectations?.[attack] || 'deny';
      checks.push({ attack, expected, ...summary, passed: assess(summary, expected), cleanup });
    }
    results.tables.push({ table: item.table, checks });
  }

  for (const raw of fixture.rpcs) {
    const item = substitute(raw, ids);
    for (const [role, client] of [['anon', anon], ['user_a', userA]]) {
      // eslint-disable-next-line no-await-in-loop
      const outcome = await client.rpc(item.name, item.args || {});
      const summary = summarise(outcome, { acceptedCodes: item.acceptedDenialCodes || ['42501'] });
      const expected = item.expectations?.[role] || 'deny';
      results.rpcs.push({
        rpc: item.name, role, expected, ...summary, passed: assess(summary, expected),
      });
    }
  }

  const all = [
    ...results.tables.flatMap((entry) => entry.checks.map((check) => ({ ...check, target: entry.table }))),
    ...results.rpcs.map((check) => ({ ...check, target: check.rpc })),
  ];
  results.summary = {
    checks: all.length,
    passed: all.filter((check) => check.passed).length,
    denied: all.filter((check) => check.denied).length,
    inconclusive: all.filter((check) => check.inconclusive).map((check) => `${check.target}:${check.attack ?? check.role}`),
    failedExpectations: all.filter((check) => !check.passed).map((check) => `${check.target}:${check.attack ?? check.role}`),
    verdict: all.every((check) => check.passed) ? 'PASS' : 'FAIL',
  };
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  process.exitCode = results.summary.verdict === 'PASS' ? 0 : 1;
}

run().catch((error) => stop(`Matrix execution failed: ${error?.message ?? error}`, 1));
