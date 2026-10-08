/**
 * ChallengeSheet (D221 Stage 3, 3c): an admin starts a session-count
 * challenge for the group. A name, when it starts (today or tomorrow), how
 * long it runs (1, 2 or 4 weeks, so the end is always inside the server's 31
 * days) and an optional target number of sessions. Sessions are the only
 * figure anywhere. No date picker: the choices are chips.
 *
 * Props: visible, onClose, onCreate({ name, startsOn, endsOn, target }) =>
 * Promise<boolean> (true closes the sheet).
 */

import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet from '../BottomSheet';
import ModalHeader from '../ModalHeader';
import Button from '../Button';
import Chip from '../Chip';
import TextField from '../TextField';
import SectionHeader from './SectionHeader';
import { spacing } from '../../styles/theme';
import {
  CHALLENGE_NAME_MAX, CHALLENGE_TARGET_MAX, CHALLENGE_LENGTH_CHOICES, challengeWindow,
} from '../../lib/community/challenges';

const START_CHOICES = Object.freeze([
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
]);
const lengthLabel = (days) => `${days / 7} ${days === 7 ? 'week' : 'weeks'}`;

export default function ChallengeSheet({ visible, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [start, setStart] = useState('today');
  const [days, setDays] = useState(7);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) { setName(''); setStart('today'); setDays(7); setTarget(''); setBusy(false); }
  }, [visible]);

  const targetNumber = target.trim() === '' ? null : Number(target);
  const targetOk = targetNumber === null
    || (Number.isInteger(targetNumber) && targetNumber >= 1 && targetNumber <= CHALLENGE_TARGET_MAX);
  const canStart = name.trim().length > 0 && targetOk;

  async function submit() {
    if (!canStart || busy) return;
    setBusy(true);
    try {
      const ok = await onCreate({ name: name.trim(), ...challengeWindow({ start, days }), target: targetNumber });
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Start a challenge">
      <View style={styles.headerBleed}>
        <ModalHeader title="Start a challenge" onClose={onClose} />
      </View>
      <View style={styles.body}>
        <TextField
          value={name}
          onChangeText={(v) => setName(v.slice(0, CHALLENGE_NAME_MAX))}
          placeholder="Name, for example October consistency"
          well
          accessibilityLabel="Challenge name"
        />
        <SectionHeader flush title="Starts" />
        <View style={styles.chips} accessibilityRole="radiogroup">
          {START_CHOICES.map((c) => (
            <Chip key={c.key} label={c.label} selected={start === c.key} onPress={() => setStart(c.key)} accessibilityRole="radio" />
          ))}
        </View>
        <SectionHeader flush title="Runs for" />
        <View style={styles.chips} accessibilityRole="radiogroup">
          {CHALLENGE_LENGTH_CHOICES.map((d) => (
            <Chip key={d} label={lengthLabel(d)} selected={days === d} onPress={() => setDays(d)} accessibilityRole="radio" />
          ))}
        </View>
        <SectionHeader flush title="Target sessions, optional" />
        <TextField
          value={target}
          onChangeText={(v) => setTarget(v.replace(/[^0-9]/g, '').slice(0, 3))}
          placeholder="For the whole group, for example 30"
          well
          keyboardType="number-pad"
          accessibilityLabel="Target number of sessions"
        />
        <Button
          variant="primary"
          size="sm"
          fullWidth={false}
          title="Start challenge"
          disabled={!canStart}
          loading={busy}
          onPress={submit}
          accessibilityLabel="Start the challenge"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerBleed: { marginHorizontal: -spacing.lg, marginBottom: spacing.xs },
  body: { gap: spacing.sm, paddingBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
});
