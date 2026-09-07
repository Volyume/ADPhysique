// Deterministic UUIDv5-style ids (RFC 4122 §4.3), stdlib only (node:crypto
// SHA-1). Pure given its inputs. Used so re-running the pipeline against
// unchanged source data always produces the same gym_venues.id for the
// same "best source key" — additive/idempotent per CLAUDE.md's migration
// rules.

const crypto = require('node:crypto');

// A fixed, arbitrary namespace UUID for this pipeline (generated once,
// never to change — changing it would reassign every venue's id).
const GYM_VENUE_NAMESPACE = 'a3f1c9de-2b7e-4e2a-9c1a-6f7d8b0e5c4d';

function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  const bytes = Buffer.alloc(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToUuid(bytes) {
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * @param {string} name - the "best source key", e.g. "active_places:1000021"
 * @param {string} [namespace] - a UUID string; defaults to this pipeline's namespace
 * @returns {string} a UUIDv5-format string, deterministic for the same (namespace, name)
 */
function uuidv5(name, namespace = GYM_VENUE_NAMESPACE) {
  const namespaceBytes = uuidToBytes(namespace);
  const nameBytes = Buffer.from(String(name), 'utf8');
  const hash = crypto.createHash('sha1').update(Buffer.concat([namespaceBytes, nameBytes])).digest();

  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC4122
  return bytesToUuid(bytes);
}

module.exports = { uuidv5, GYM_VENUE_NAMESPACE };
