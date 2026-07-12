-- migrate_119_lock_direct_client_writes.sql
--
-- Purpose:          Close four trust-boundary holes found by the Codex
--                   adversarial audit (2026-07-12). Each is a server-owned
--                   table whose writes are meant to flow ONLY through a
--                   SECURITY DEFINER RPC, but which a permissive RLS write
--                   policy also let the `authenticated` role write directly
--                   over PostgREST, bypassing every server-side check.
--
--                   BSEC-01 (partnerships): the write policies let a member
--                   self-INSERT an `invited` row and then UPDATE it to name
--                   an arbitrary user as member_b with status='active' -- a
--                   forced, non-consented pairing that skips invite
--                   redemption, the block list, the 3-pair ceiling and the
--                   partner_sharing consent record (all of which live only
--                   in create_partner_invite / redeem_partner_invite). The
--                   client never writes this table directly (it reads it and
--                   mutates only through the RPCs), so revoking direct writes
--                   breaks nothing.
--
--                   BSEC-06 (engine_telemetry): a direct-INSERT policy let
--                   any user write arbitrary event names, timestamps and
--                   unbounded payloads straight past record_engine_telemetry's
--                   allow-list. The client pushes telemetry only through that
--                   RPC (src/lib/telemetry/transport.js), so the allow-list
--                   becomes the sole ingress once the direct policy is gone.
--
--                   BSEC-11 (consent_log): a direct-INSERT policy let a client
--                   forge/backdate consent-audit rows. The client writes
--                   consent only through record_health_consent /
--                   record_partner_consent, so the append-only audit trail is
--                   restored by making those RPCs the only writer. (The
--                   companion users_profile consent-column protection is a
--                   separate migration -- it needs the profile-sync path
--                   checked first.)
--
--                   BSEC-10 (partner_weekly_intentions): the UPDATE policy
--                   checked only auth.uid() = user_id, so a member could
--                   re-key their row's pair_id onto a partnership they do not
--                   belong to, corrupting another pair's shared state. The
--                   replacement requires active membership of BOTH the old
--                   row's pair (USING) and the new pair (WITH CHECK), which
--                   the INSERT policy already demanded, so a legitimate
--                   self-upsert is unaffected and cross-pair reassignment is
--                   blocked.
--
--                   SECURITY DEFINER RPCs execute with the function owner's
--                   privileges, so these REVOKEs do not affect them.
--
-- Applied locally:  N/A -- cloud only; these tables/policies have no local-DB
--                   analogue (SQLite has no RLS).
-- Applied remotely: NO -- pending. CLAUDE-run, gated on the founder's exact
--                   phrase "run against production".
-- Safe to re-run:   YES. DROP POLICY IF EXISTS, a REVOKE on an absent
--                   privilege, and CREATE POLICY after a DROP are all no-ops
--                   or idempotent.
-- Rollback:         Recreate the dropped policies from migrate_081 (:104-110),
--                   migrate_017 (:129-131), migrate_019 (:55-57) and
--                   migrate_105 (:107-110), and GRANT INSERT, UPDATE ON the
--                   respective tables back TO authenticated. This restores the
--                   audited (vulnerable) posture.

-- ─── BSEC-01: partnerships are RPC-only for writes ──────────────────────────
DROP POLICY IF EXISTS "Members update own partnerships" ON partnerships;
DROP POLICY IF EXISTS "Inviter creates invited partnership" ON partnerships;
REVOKE INSERT, UPDATE, DELETE ON partnerships FROM authenticated;
-- SELECT stays: the client reads its own partnership rows to render the pair.

-- ─── BSEC-06: engine_telemetry is RPC-only for writes ───────────────────────
DROP POLICY IF EXISTS "Users can write own engine_telemetry" ON engine_telemetry;
REVOKE INSERT ON engine_telemetry FROM authenticated;
-- record_engine_telemetry (SECURITY DEFINER) remains the only writer.

-- ─── BSEC-11: consent_log is RPC-only for writes (append-only audit trail) ──
DROP POLICY IF EXISTS "Users can write own consent_log" ON consent_log;
REVOKE INSERT ON consent_log FROM authenticated;
-- record_health_consent / record_partner_consent (SECURITY DEFINER) remain
-- the only writers; they stamp server time and a known notice version.

-- ─── BSEC-10: weekly-intention UPDATE requires active pair membership ───────
DROP POLICY IF EXISTS "Member updates own intention" ON partner_weekly_intentions;
CREATE POLICY "Member updates own intention" ON partner_weekly_intentions
  FOR UPDATE
  USING (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_weekly_intentions.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_weekly_intentions.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );
