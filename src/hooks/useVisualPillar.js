/**
 * useVisualPillar — the Progress landing's Visual pillar data (Campaign 23,
 * PROGRESS-UX-SPEC.md §16/§22 R2; founder ruling R1, FOUNDER-RULINGS-PHASE2.md:
 * "derived signal only... a core evidence pillar, not a navigation tile").
 *
 * Reuses the EXACT producer chain the coach card and weekly check-in already
 * use (getProgressScanCoachSummary -> resolveProgressScanCoachNote ->
 * buildProgressScanCoachEvidence -> buildScanEvidencePacket) -- no new scan
 * derivation. `windowDays` is generous (not the 10-day check-in-period
 * default) because this is a standing evidence pillar, not a per-check-in
 * read: it should describe the latest scan whenever it was taken, not only
 * inside a narrow recency window.
 *
 * Fail-closed suppression (R1): `suppressed` is TRUE under calm mode, an
 * open ED-pattern flag, or a failed read of either -- the SAME
 * usePhotoSuppression hook every other high-risk photo surface uses, which
 * itself starts suppressed and only lifts once both reads confirm a safe
 * state. `suppressed` is reported independently of tier so the caller can
 * hide the pillar ENTIRELY (not even a locked-Pro affordance) for every
 * tier under suppression -- a photo-adjacent surface follows the same rule
 * as any other weight/food-adjacent one: suppression is never weakened by
 * "but this user cannot see photo data anyway". Scan data itself is only
 * ever fetched for a Pro user once suppression is confirmed lifted.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import usePhotoSuppression from './usePhotoSuppression';
import { getProgressScanCoachSummary } from '../lib/progressScanStore';
import { resolveProgressScanCoachNote } from '../lib/progressScanCoachResolver';
import { buildProgressScanCoachEvidence } from '../lib/progressScanCoachEvidence';
import { buildScanEvidencePacket } from '../lib/progressScanCheckInEvidence';

// Not a check-in recency window -- see module header. Large enough that no
// realistic scan history falls outside it, so `buildScanEvidencePacket`'s
// window gate never fires 'no_recent_scan' for a standing evidence pillar.
const PILLAR_WINDOW_DAYS = 3650;

const EMPTY_DATA = { hasScan: false, hasNote: false, packet: null, capturedAt: null };

export default function useVisualPillar(userId, tier) {
  // Fail CLOSED (usePhotoSuppression's own contract): starts suppressed and
  // only lifts once both the wellbeing mode and open-ED-flag reads confirm a
  // safe state.
  const suppressed = usePhotoSuppression(userId);
  const [data, setData] = useState({ ...EMPTY_DATA, loading: true });

  const load = useCallback(async () => {
    if (!userId || tier !== 'pro' || suppressed) {
      setData({ ...EMPTY_DATA, loading: false });
      return;
    }
    try {
      const scan = await getProgressScanCoachSummary(userId, { suppressed: false });
      if (!scan) {
        setData({ ...EMPTY_DATA, loading: false });
        return;
      }
      const note = resolveProgressScanCoachNote({ scan, output: null, suppressed: false });
      const evidence = buildProgressScanCoachEvidence({ scan, note });
      const packet = evidence
        ? buildScanEvidencePacket({
          evidence, weightTrend: null, goalPhase: 'maint', nowMs: Date.now(), windowDays: PILLAR_WINDOW_DAYS,
        })
        : null;
      setData({
        loading: false,
        hasScan: true,
        hasNote: !!note,
        packet,
        capturedAt: evidence?.capturedAt ?? scan.capturedAt ?? null,
      });
    } catch (_e) {
      setData({ ...EMPTY_DATA, loading: false });
    }
  }, [userId, tier, suppressed]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { ...data, suppressed };
}
