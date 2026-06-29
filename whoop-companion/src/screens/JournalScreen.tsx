import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { appStore } from '../state/appStore';
import { Card, Empty, Screen, SectionLabel } from '../ui/components';
import { colors, radius } from '../ui/theme';
import { listJournal, JournalRow } from '../db/database';
import { dayKey, formatClock } from '../util/time';

const BEHAVIOURS = [
  'Caffeine',
  'Alcohol',
  'Late meal',
  'Screen before bed',
  'Stressful day',
  'Hydrated well',
  'Read before bed',
  'Magnesium',
];

export function JournalScreen() {
  const [entries, setEntries] = useState<JournalRow[]>([]);
  const today = dayKey(Date.now());

  const refresh = useCallback(() => {
    void listJournal(today).then(setEntries);
  }, [today]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logged = new Set(entries.map((e) => e.behaviour));

  const toggle = (b: string) => {
    void appStore.addJournal(b, logged.has(b) ? 'no' : 'yes').then(refresh);
  };

  return (
    <Screen title="Journal">
      <SectionLabel>Today's behaviours</SectionLabel>
      <Card>
        <View style={styles.chips}>
          {BEHAVIOURS.map((b) => {
            const on = entries.find((e) => e.behaviour === b)?.value === 'yes';
            return (
              <TouchableOpacity
                key={b}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggle(b)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{b}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <SectionLabel>Logged today</SectionLabel>
      <Card>
        {entries.length === 0 ? (
          <Empty text="Tap a behaviour above to log it. Over time these can be correlated with your recovery." />
        ) : (
          entries.map((e) => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.rowName}>{e.behaviour}</Text>
              <Text style={styles.rowMeta}>
                {e.value} · {formatClock(e.createdAt)}
              </Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.amber, backgroundColor: '#2A2412' },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextOn: { color: colors.amber, fontWeight: '600' },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
