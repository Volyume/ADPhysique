import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View, Linking } from 'react-native';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, spacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import Card from '../components/Card';
import ConsentCheckboxRow from '../components/ConsentCheckboxRow';
import { useToast } from '../components/Toast';
import useAppStore from '../store/useAppStore';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import { logError } from '../lib/errorLog';
import { lookupChallenge, joinChallenge } from '../lib/challenges/api';
import {
  CHALLENGE_CONSENT_TEXT, CHALLENGE_CONSENT_VERSION, CHALLENGE_FINISHED_LINE, FREE_FOR_LIFE_JOIN_LINE,
} from '../lib/challenges/copy';
import { isChallengeFinished, joinScoring, termsLink } from '../lib/challenges/display';
import {
  normaliseChallengeCode, peekPendingChallenge, clearPendingChallenge, setChallengeActiveFlag,
} from '../lib/challenges/pending';
import { readPlannedPerWeek } from '../lib/challenges/plannedPerWeek';
import { loadMe, hasProfile } from '../lib/community/profile';
import { setGyms } from '../lib/gyms';

// Gym challenge SPEC sections 2 (step 6) and 5. Opens from a challenge link or
// a pending code, strictly AFTER the Article 9 consent gate. Nothing here
// reads what anyone ate or weighs. On the device's own wellbeing gate (calm
// mode or an open ED flag, fail closed) the scoring table leaves out the food
// and weigh-in rows and says nothing that invites either.

const NAME_MAX = 30;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayLabel(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key ?? ''));
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''}`;
}

export function datesLine(startsOn, endsOn) {
  const a = dayLabel(startsOn);
  const b = dayLabel(endsOn);
  return a && b ? `${a} to ${b}` : '';
}

export default function ChallengeJoinScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const userId = useAppStore((s) => s.user?.id);
  const firstName = useAppStore((s) => s.userProfile?.firstName);
  const busy = useRef(false);
  // The device's own gate: true (withheld) until it has confirmed calm mode is
  // off and no ED flag is open.
  const deviceWithheld = usePhotoSuppression(userId);

  const paramCode = normaliseChallengeCode(route?.params?.code);
  const [code, setCode] = useState(paramCode);
  // loading | ready | notfound | error
  const [phase, setPhase] = useState('loading');
  const [challenge, setChallenge] = useState(null);
  const [me, setMe] = useState(null);
  const [mode, setMode] = useState('name');
  const [name, setName] = useState(typeof firstName === 'string' ? firstName.slice(0, NAME_MAX) : '');
  const [adult, setAdult] = useState(false);
  const [joining, setJoining] = useState(false);
  const [typed, setTyped] = useState('');

  const inOnboarding = !!navigation?.getState?.()?.routeNames?.includes('StartChoice');

  // The code: the route param, else whatever is pending on the device.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (paramCode) return;
      const pending = await peekPendingChallenge();
      if (cancelled) return;
      if (pending) setCode(pending); else setPhase('ready');
    })();
    return () => { cancelled = true; };
  }, [paramCode]);

  const load = useCallback(async (c) => {
    setPhase('loading');
    try {
      const [row, mine] = await Promise.all([
        lookupChallenge(c),
        loadMe().then((r) => r.me).catch(() => null),
      ]);
      setMe(mine);
      if (!row) { setChallenge(null); setPhase('notfound'); return; }
      setChallenge(row);
      setPhase('ready');
    } catch (e) {
      if (e?.code === 'not_found') { setChallenge(null); setPhase('notfound'); return; }
      logError('ChallengeJoinScreen.load', e);
      setPhase('error');
    }
  }, []);

  useEffect(() => { if (code) load(code); }, [code, load]);

  // True when this stack has a screen beneath this one. `navigation.canGoBack()`
  // alone is not enough: it also counts the parent tab navigator, so after a
  // link opens the Community tab for the first time it still says yes and
  // going back lands on the first tab, not where the person was heading.
  const canPop = useCallback(() => {
    const routes = navigation?.getState?.()?.routes;
    if (Array.isArray(routes)) return routes.length > 1;
    return !!navigation?.canGoBack?.();
  }, [navigation]);

  // Onboarding goes on to StartChoice. Elsewhere the person goes back, or, with
  // nothing beneath (a link opened this screen first), on to the challenge they
  // joined, or the Community hub when there is none.
  const continueOn = useCallback((challengeId) => {
    if (inOnboarding) { navigation.replace('StartChoice'); return; }
    if (canPop()) { navigation.goBack(); return; }
    if (challengeId) { navigation.replace('Challenge', { id: challengeId }); return; }
    if (navigation?.getState?.()?.routeNames?.includes('Community')) navigation.replace('Community');
  }, [inOnboarding, navigation, canPop]);

  async function notNow() {
    await clearPendingChallenge();
    continueOn();
  }

  const profileExists = hasProfile(me);
  const handle = me?.profile?.handle ?? null;
  const nameOk = mode === 'handle' || name.trim().length >= 1;
  const canJoin = !!challenge && adult && nameOk && !joining;

  async function join() {
    if (!canJoin || busy.current) return;
    busy.current = true;
    setJoining(true);
    let joined = false;
    try {
      const planned = await readPlannedPerWeek(userId);
      await joinChallenge({
        code: challenge.code,
        displayMode: mode,
        displayName: name,
        plannedPerWeek: planned,
        consentVersion: CHALLENGE_CONSENT_VERSION,
        adult: true,
      });
      joined = true;
      await setChallengeActiveFlag(userId);
      await clearPendingChallenge();
      // A person with a Community profile and no gym yet gets this gym. Best
      // effort: the join itself has already worked.
      await setPrimaryGymIfNone();
      // If the screen stays up, it must not offer Join a second time.
      setChallenge((cur) => (cur ? { ...cur, joined: true, withdrawn: false } : cur));
      toast.show("You're in.", { variant: 'success' });
    } catch (e) {
      if (!joined) {
        logError('ChallengeJoinScreen.join', e);
        toast.show(
          e?.code === 'network'
            ? 'No connection just now. Try again in a moment.'
            : 'That did not go through. Try again in a moment.',
          { variant: 'error' },
        );
      } else {
        logError('ChallengeJoinScreen.afterJoin', e);
      }
    } finally {
      busy.current = false;
      setJoining(false);
    }
    if (joined) {
      try {
        continueOn(challenge.id);
      } catch (e) {
        // The join worked; the screen now says so and offers the challenge.
        logError('ChallengeJoinScreen.continue', e);
      }
    }
  }

  // Sets the challenge's gym as the primary gym only for a person with a
  // Community profile and no gym yet, and passes their other gyms through
  // (`setGyms` replaces the whole list). Reads the profile fresh so a stale
  // cache can never overwrite a gym set elsewhere; any doubt writes nothing.
  async function setPrimaryGymIfNone() {
    try {
      if (!challenge.gym_id) return;
      const { me: fresh } = await loadMe({ force: true, userId });
      if (!hasProfile(fresh) || fresh?.profile?.gym_id) return;
      const current = fresh.profile.other_gym_ids;
      const others = (Array.isArray(current) ? current : [])
        .filter((id) => typeof id === 'string' && id !== challenge.gym_id);
      await setGyms(challenge.gym_id, others);
    } catch (e) {
      logError('ChallengeJoinScreen.setGym', e);
    }
  }

  function openChallenge() {
    if (inOnboarding) { continueOn(); return; }
    if (canPop()) navigation.navigate('Challenge', { id: challenge.id });
    else navigation.replace('Challenge', { id: challenge.id });
  }

  // The terms open exactly as the server gave them; with none, no button shows.
  function openTerms() {
    const url = termsLink(challenge);
    if (!url) return;
    Linking.openURL(url).catch(() => {
      toast.show('Could not open the terms just now.', { variant: 'error' });
    });
  }

  const secondary = { color: t.colors.textSecondary };
  const primary = { color: t.colors.textPrimary };

  function body() {
    if (phase === 'loading') {
      return <Text style={[t.type.body, secondary]}>Loading the challenge.</Text>;
    }
    if (phase === 'error') {
      return (
        <View>
          <Text style={[t.type.body, secondary]}>
            Could not load the challenge. Check your connection and try again.
          </Text>
          <Button title="Try again" onPress={() => load(code)} style={styles.gap} />
          <Button title="Not now" variant="secondary" onPress={notNow} style={styles.gap} />
        </View>
      );
    }
    if (!code || phase === 'notfound') {
      return (
        <View>
          <Text style={[t.type.body, secondary]}>
            {code
              ? 'We could not find that challenge. Check the code and try again.'
              : 'Have a challenge code? Type it here.'}
          </Text>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Challenge code"
            placeholderTextColor={t.colors.textSecondary}
            accessibilityLabel="Challenge code"
            style={[styles.input, { color: t.colors.textPrimary, borderColor: t.colors.border }]}
          />
          <Button
            title="Find challenge"
            onPress={() => { const c = normaliseChallengeCode(typed); if (c) setCode(c); }}
            disabled={!normaliseChallengeCode(typed)}
            style={styles.gap}
          />
          <Button title="Not now" variant="secondary" onPress={notNow} style={styles.gap} />
        </View>
      );
    }

    const c = challenge;
    const inIt = c.joined && !c.withdrawn;
    // Over: no Join, no scoring table and no free-for-life offer, only a calm
    // word. Someone who took part can still open the challenge to see where
    // they finished.
    if (isChallengeFinished(c)) {
      return (
        <View>
          <Text style={[t.type.h2, primary]} accessibilityRole="header">{c.title}</Text>
          <Text style={[t.type.body, styles.gapText, secondary]}>{CHALLENGE_FINISHED_LINE}</Text>
          {inIt ? (
            <Button title={inOnboarding ? 'Continue' : 'Go to the challenge'} onPress={openChallenge} style={styles.gap} />
          ) : (
            <Button title={inOnboarding ? 'Continue' : 'Go back'} onPress={notNow} style={styles.gap} />
          )}
        </View>
      );
    }
    if (inIt) {
      return (
        <View>
          <Text style={[t.type.h2, primary]} accessibilityRole="header">{c.title}</Text>
          <Text style={[t.type.body, styles.gapText, secondary]}>You're already in this challenge</Text>
          <Button title={inOnboarding ? 'Continue' : 'Go to the challenge'} onPress={openChallenge} style={styles.gap} />
        </View>
      );
    }

    const scoring = joinScoring(deviceWithheld);
    const terms = termsLink(c);

    return (
      <View>
        <Text style={[t.type.h1, primary]} accessibilityRole="header">{c.title}</Text>
        <Text style={[t.type.body, styles.gapText, secondary]}>
          {[c.gym_name, datesLine(c.starts_on, c.ends_on)].filter(Boolean).join(' · ')}
        </Text>

        {c.prize_main || c.prize_second ? (
        <Card style={styles.card}>
          <Text style={[t.type.h3, primary]}>Prizes</Text>
          {c.prize_main ? (
            <Text style={[t.type.body, styles.gapText, secondary]}>
              {`Main prize draw, ${c.main_threshold} points and above: ${c.prize_main}`}
            </Text>
          ) : null}
          {c.prize_second ? (
            <Text style={[t.type.body, styles.gapText, secondary]}>
              {`Second prize draw, ${c.second_threshold} points and above: ${c.prize_second}`}
            </Text>
          ) : null}
        </Card>
        ) : null}

        <Card style={styles.card}>
          <Text style={[t.type.h3, primary]}>How you score</Text>
          {scoring.core.map((r) => (
            <View key={r.label} style={styles.scoreRow}>
              <Text style={[t.type.body, primary]}>{r.label}</Text>
              <Text style={[t.type.body, secondary]}>{r.points}</Text>
            </View>
          ))}
          {scoring.coaching.map((r) => (
            <View key={r.label} style={styles.scoreRow}>
              <Text style={[t.type.body, primary]}>{`${r.label} (with coaching)`}</Text>
              <Text style={[t.type.body, secondary]}>{r.points}</Text>
            </View>
          ))}
          <Text style={[t.type.caption, styles.gapText, secondary]}>{scoring.note}</Text>
          {terms ? (
            <Button title="Read the full terms" variant="tertiary" onPress={openTerms} style={styles.gap} />
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={[t.type.h3, primary]}>How you appear on the board</Text>
          <View style={styles.modeRow}>
            <Button
              title="My name"
              variant={mode === 'name' ? 'primary' : 'secondary'}
              onPress={() => setMode('name')}
              accessibilityLabel="Show my first name and initial"
              style={styles.modeBtn}
            />
            {profileExists && handle ? (
              <Button
                title="My handle"
                variant={mode === 'handle' ? 'primary' : 'secondary'}
                onPress={() => setMode('handle')}
                accessibilityLabel="Show my Community handle"
                style={styles.modeBtn}
              />
            ) : null}
          </View>
          {mode === 'name' ? (
            <View>
              <TextInput
                value={name}
                onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
                maxLength={NAME_MAX}
                placeholder="First name and initial, for example Sam K"
                placeholderTextColor={t.colors.textSecondary}
                accessibilityLabel="Your first name and initial"
                style={[styles.input, { color: t.colors.textPrimary, borderColor: t.colors.border }]}
              />
              {!nameOk ? (
                <Text style={[t.type.caption, styles.gapText, secondary]}>Enter a name to join.</Text>
              ) : null}
            </View>
          ) : (
            <Text style={[t.type.body, styles.gapText, secondary]}>{`@${handle}`}</Text>
          )}
        </Card>

        <ConsentCheckboxRow
          checked={adult}
          onPress={() => setAdult((v) => !v)}
          label="I am 18 or over"
          size="md"
          variant="card"
        />

        <Text style={[t.type.caption, styles.consent, secondary]}>{CHALLENGE_CONSENT_TEXT}</Text>
        <Text style={[t.type.caption, styles.gapText, secondary]}>{FREE_FOR_LIFE_JOIN_LINE}</Text>

        <Button
          title="Join the challenge"
          variant="emphatic"
          onPress={join}
          disabled={!canJoin}
          loading={joining}
          accessibilityLabel="Join the challenge"
          style={styles.gap}
        />
        <Button title="Not now" variant="secondary" onPress={notNow} style={styles.gap} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {body()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginTop: spacing.md },
  gap: { marginTop: spacing.md },
  gapText: { marginTop: spacing.sm },
  consent: { marginTop: spacing.md },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, gap: spacing.md },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modeBtn: { flex: 1 },
  input: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
