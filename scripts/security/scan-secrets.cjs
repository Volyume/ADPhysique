#!/usr/bin/env node
'use strict';

// Reports only pattern name + file/line. A discovered credential value is
// never echoed into CI logs or an assistant transcript.
const fs = require('fs');
const { spawnSync } = require('child_process');

const listed = spawnSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
);
if (listed.status !== 0) {
  process.stderr.write('secret scan: could not enumerate repository files\n');
  process.exit(2);
}

const patterns = [
  [
    'private_key_pem',
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/]{40,}={0,2}\r?\n)+-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  ],
  ['github_token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g],
  ['aws_access_key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['slack_token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['stripe_live_secret', /\bsk_live_[A-Za-z0-9]{20,}\b/g],
  ['google_api_key', /\bAIza[A-Za-z0-9_-]{35}\b/g],
  [
    'literal_sensitive_assignment',
    /\b(?:SUPABASE_SERVICE_ROLE_KEY|APP_STORE_PRIVATE_KEY|ANDROID_KEYSTORE_PASSWORD|SENTRY_AUTH_TOKEN)\s*[:=]\s*["'][^"'\r\n]{8,}["']/g,
  ],
];

const findings = [];
for (const file of listed.stdout.split('\0').filter(Boolean)) {
  let raw;
  try { raw = fs.readFileSync(file); } catch (_) { continue; }
  if (raw.includes(0)) continue;
  const text = raw.toString('utf8');
  for (const [name, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
      const line = text.slice(0, match.index).split('\n').length;
      findings.push({ file, line, pattern: name });
    }
  }

  // Supabase anon JWTs are public configuration; a checked-in service_role
  // JWT is not. Decode JWT payloads locally and report only their location.
  const jwt = /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
  for (let match = jwt.exec(text); match; match = jwt.exec(text)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'));
      if (payload?.role === 'service_role') {
        findings.push({
          file,
          line: text.slice(0, match.index).split('\n').length,
          pattern: 'supabase_service_role_jwt',
        });
      }
    } catch (_) { /* malformed/example JWT: other validators own it */ }
  }
}

if (findings.length) {
  for (const finding of findings) {
    process.stderr.write(`${finding.file}:${finding.line}: ${finding.pattern}\n`);
  }
  process.stderr.write(`secret scan: FAIL (${findings.length} potential credential locations; values suppressed)\n`);
  process.exit(1);
}
process.stdout.write('secret scan: PASS (no credential patterns in tracked or untracked repository files)\n');
