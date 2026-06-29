import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { appStore } from '../state/appStore';
import { Card, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { BEHAVIOURS, BEHAVIOUR_CATEGORIES, Behaviour } from '../data/journalBehaviours';
import { dayKey } from '../util/time';

export function JournalScreen({ nav }: { nav: Nav }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    void appStore.journalForDay(dayKey(Date.now())).then((rows) => {
      const map: Record<string, string> = {};
      for (const r of rows) map[r.behaviour] = r.value;
      setAnswers(map);
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
