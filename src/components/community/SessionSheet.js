/**
 * SessionSheet (community product audit `docs/community-product-audit-
 * 2026-09-07/40-GAP-CLOSURE.md` §1, "Session planning after connecting"
 * BUILD row).
 *
 * Opened from the "Suggest a session" composer chip in
 * CommunityConversationScreen (adults only -- messaging is refused for a
 * minor server-side anyway, SD-32, but the chip itself never offers it).
 * Day chips Mon to Sun, time band chips Early through Late (SD-31: a
 * band, never a clock time), and gym chips built from the two parties'
 * own gym labels plus "Anywhere". One send, via `sendMessage` with
 * `refKind: 'session'` and the payload the server validates
 * (`community_send_message` Part 14).
 *
 * Props:
 *   visible
 *   onClose
 *   myGym     {id, label} | null  the caller's own gym, if set
 *   otherGym  {id, label} | null  the other person's gym, if visible to the caller
 *   onSend    (payload) => Promise<boolean>  true closes the sheet
 */

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet from '../BottomSheet';
import ModalHeader from '../ModalHeader';
import Button from '../Button';
import Chip from '../Chip';
import SectionLabel from '../SectionLabel';
import { useToast } from '../Toast';
import { spacing, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { SESSION_DAYS, SESSION_TIME_BANDS, buildSessionRefPayload } from '../../lib/community';

export default function SessionSheet({
  visible, onClose, myGym = null, otherGym = null, onSend,
}) {
  const t = useTheme();
  const toast = useToast();
  const [day, setDay] = useState(null);
  const [band, setBand] = useState(null);
  const [gymId, setGymId] = useState('anywhere');
  const [busy, setBusy] = useState(false);

  const gymChips = [
    myGym?.id ? { id: myGym.id, label: myGym.label } : null,
    otherGym?.id && otherGym.id !== myGym?.id ? { id: otherGym.id, label: otherGym.label } : null,
    { id: 'anywhere', label: 'Anywhere' },
  ].filter(Boolean);

  function reset() {
    setDay(null); setBand(null); setGymId('anywhere');
  }

  async function send() {
    if (busy || !day || !band) return;
    setBusy(true);
    try {
      const payload = buildSessionRefPayload(day, band, gymId === 'anywhere' ? null : gymId);
      const ok = await onSend?.(payload);
      if (ok) { reset(); onClose?.(); }
    } catch (_e) {
      toast.show('That did not send. Please try again.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={() => { reset(); onClose?.(); }}
      accessibilityLabel="Suggest a training session"
    >
      <View style={styles.headerBleed}>
        <ModalHeader title="Suggest a session" onClose={() => { reset(); onClose?.(); }} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.line, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          A day and a rough time, nothing more precise. They can accept or say they cannot make it.
        </Text>

        <View style={styles.field}>
          <SectionLabel>Day</SectionLabel>
          <View style={styles.chips}>
            {SESSION_DAYS.map((d) => (
              <Chip key={d.key} label={d.label} selected={day === d.key} onPress={() => setDay(d.key)} />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <SectionLabel>Time</SectionLabel>
          <View style={styles.chips}>
            {SESSION_TIME_BANDS.map((b) => (
              <Chip key={b.key} label={b.label} selected={band === b.key} onPress={() => setBand(b.key)} />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <SectionLabel>Where</SectionLabel>
          <View style={styles.chips}>
            {gymChips.map((g) => (
              <Chip key={g.id} label={g.label} selected={gymId === g.id} onPress={() => setGymId(g.id)} />
            ))}
          </View>
        </View>

        <Button
          title="Send suggestion"
          onPress={send}
          disabled={!day || !band}
          loading={busy}
          accessibilityLabel="Send session suggestion"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerBleed: { marginHorizontal: -spacing.lg },
  body: { gap: spacing.lg, paddingTop: spacing.md },
  line: { ...type.bodySm },
  field: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
});
