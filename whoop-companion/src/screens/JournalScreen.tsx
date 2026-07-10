import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { appStore } from '../state/appStore';
import { Card, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { BEHAVIOURS, BEHAVIOUR_CATEGORIES, Behaviour } from '../data/journalBehaviours';
import { dayKey } from '../util/time';
import { computeJournalImpacts, JournalImpact } from '../metrics/journalImpact';

export function JournalScreen({ nav }: { nav: Nav }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [impacts, setImpacts] = useState<JournalImpact[]>([]);
  const [journalDays, setJournalDays] = useState(0);

  useEffect(() => {
    void appStore.journalForDay(dayKey(Date.now())).then((rows) => {
      const map: Record<string, string> = {};
      for (const r of rows) map[r.behaviour] = r.value;
      setAnswers(map);
    });
    void Promise.all([appStore.journalHistory(60), appStore.loadHistory(61)]).then(([entries, days]) => {
      setJournalDays(new Set(entries.map((entry) => entry.day)).size);
      setImpacts(computeJournalImpacts(entries, days, BEHAVIOURS));
    });
  }, []);

  const set = (id: string, value: string) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    void appStore.addJournal(id, value);
  };

  const answered = Object.keys(answers).length;

  return (
    <Screen title="Journal" onBack={nav.canBack ? nav.back : undefined} tint={colors.recoveryYellow}>
      <Card>
        <Text style={styles.intro}>What happened today?</Text>
        <Text style={styles.introSub}>
          Track behaviours to understand their physiological impact. {answered}/{BEHAVIOURS.length}{' '}
          logged today. Your responses are private.
        </Text>
      </Card>

      <SectionLabel>Patterns</SectionLabel>
      <Card style={{ paddingVertical: impacts.length ? 4 : 14 }}>
        {impacts.length ? (
          <>
            {impacts.map((impact, index) => (
              <ImpactRow key={impact.behaviour} impact={impact} last={index === impacts.length - 1} />
            ))}
            <Text style={styles.patternNote}>Next-day associations from trusted sleep and recovery, not proof of cause.</Text>
          </>
        ) : (
          <Text style={styles.patternEmpty}>
            Building patterns from {journalDays} logged {journalDays === 1 ? 'day' : 'days'}. Each yes/no behaviour needs at least five trusted yes and five trusted no outcomes before an association appears.
          </Text>
        )}
      </Card>

      {BEHAVIOUR_CATEGORIES.map((cat) => (
        <View key={cat}>
          <SectionLabel>{cat}</SectionLabel>
          <Card style={{ paddingVertical: 4 }}>
            {BEHAVIOURS.filter((b) => b.category === cat).map((b, i, arr) => (
              <BehaviourRow
                key={b.id}
                behaviour={b}
                value={answers[b.id]}
                onChange={(v) => set(b.id, v)}
                last={i === arr.length - 1}
              />
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

function ImpactRow({ impact, last }: { impact: JournalImpact; last: boolean }) {
  const formatDelta = (value: number | null, suffix: string) =>
    value == null ? null : `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`;
  const recovery = formatDelta(impact.recoveryDelta, ' recovery');
  const sleep = formatDelta(impact.sleepDelta, '% sleep');
  return (
    <View style={[styles.impactRow, last && styles.last]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.impactQuestion}>{impact.question}</Text>
        <Text style={styles.impactMeta}>{impact.yesCount} yes / {impact.noCount} no · {impact.confidence}</Text>
      </View>
      <View style={styles.impactValues}>
        {recovery ? <Text style={[styles.impactValue, { color: (impact.recoveryDelta ?? 0) >= 0 ? colors.recoveryGreen : colors.recoveryRed }]}>{recovery}</Text> : null}
        {sleep ? <Text style={[styles.impactValue, { color: (impact.sleepDelta ?? 0) >= 0 ? colors.sleepTeal : colors.recoveryRed }]}>{sleep}</Text> : null}
      </View>
    </View>
  );
}

function BehaviourRow({
  behaviour,
  value,
  onChange,
  last,
}: {
  behaviour: Behaviour;
  value: string | undefined;
  onChange: (v: string) => void;
  last: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.last]}>
      <Text style={styles.q}>{behaviour.question}</Text>
      <View style={styles.control}>
        {behaviour.type === 'yesno' ? (
          <YesNo value={value} onChange={onChange} />
        ) : behaviour.type === 'count' ? (
          <Stepper value={value} onChange={onChange} />
        ) : behaviour.type === 'scale' ? (
          <Scale value={value} onChange={onChange} />
        ) : (
          <TimeInput value={value} onChange={onChange} />
        )}
      </View>
    </View>
  );
}

function YesNo({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.toggle}>
      {['Yes', 'No'].map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt.toLowerCase())}
          style={[styles.toggleOpt, value === opt.toLowerCase() && (opt === 'Yes' ? styles.yes : styles.no)]}
        >
          <Text style={[styles.toggleText, value === opt.toLowerCase() && styles.toggleTextOn]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Stepper({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const n = Number(value) || 0;
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(String(Math.max(0, n - 1)))} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepVal}>{n}</Text>
      <Pressable onPress={() => onChange(String(n + 1))} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

function Scale({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.scale}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(String(n))} style={[styles.scaleDot, Number(value) === n && styles.scaleDotOn]}>
          <Text style={[styles.scaleText, Number(value) === n && styles.scaleTextOn]}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function TimeInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="--:--"
      placeholderTextColor={colors.textTertiary}
      style={styles.timeInput}
    />
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.text, fontSize: 18, fontFamily: fonts.textBold },
  introSub: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6, fontFamily: fonts.text },
  patternEmpty: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: fonts.text },
  patternNote: { color: colors.textTertiary, fontSize: 11, lineHeight: 16, marginTop: 10, fontFamily: fonts.text },
  impactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  impactQuestion: { color: colors.text, fontSize: 13, lineHeight: 18, fontFamily: fonts.textSemibold },
  impactMeta: { color: colors.textTertiary, fontSize: 11, marginTop: 2, fontFamily: fonts.text },
  impactValues: { alignItems: 'flex-end', gap: 3 },
  impactValue: { fontSize: 12, fontFamily: fonts.textBold },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  last: { borderBottomWidth: 0 },
  q: { color: colors.text, fontSize: 14, flex: 1, marginRight: 12, fontFamily: fonts.text },
  control: { alignItems: 'flex-end' },
  toggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, overflow: 'hidden' },
  toggleOpt: { paddingHorizontal: 14, paddingVertical: 7 },
  yes: { backgroundColor: colors.recoveryGreen },
  no: { backgroundColor: colors.surface },
  toggleText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.textSemibold },
  toggleTextOn: { color: '#000' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: colors.text, fontSize: 18, fontFamily: fonts.bold },
  stepVal: { color: colors.text, fontSize: 16, fontFamily: fonts.bold, minWidth: 20, textAlign: 'center' },
  scale: { flexDirection: 'row', gap: 6 },
  scaleDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scaleDotOn: { backgroundColor: colors.recoveryYellow },
  scaleText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.textSemibold },
  scaleTextOn: { color: '#000' },
  timeInput: { color: colors.text, fontSize: 15, fontFamily: fonts.bold, minWidth: 60, textAlign: 'right', backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
