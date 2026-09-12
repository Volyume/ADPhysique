/**
 * CommunityRulesScreen (blueprint sections 6, 11; SD-11; discovery
 * blueprint `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md`
 * sections 2, 3, 12)
 *
 * The rules, what stays private, how reporting and blocking work, what
 * a moderator can do, the published contact address, and the version.
 *
 * The text below is the versioned rules text from
 * `docs/community-safety/COMMUNITY-RULES.md`, pasted here verbatim (the
 * version 2 block: messages, meeting a training partner in person, and
 * the training profile note under "what stays private"). It is the
 * notice recorded against `COMMUNITY_RULES_VERSION` when someone joins,
 * so it changes only with a version bump, and this screen and that
 * document move together.
 *
 * `route.params.mustAccept`: a connect, message or training profile call
 * refused `rules_outdated` because the profile last accepted version 1.
 * The screen answers with the one emphatic action on it, "Accept the
 * updated rules", which calls `acceptRules()` (sending
 * `accept_rules_version` alone, so nothing else on the profile is
 * touched) and returns the person to what they were doing to retry it.
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import SectionLabel from '../components/SectionLabel';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import { colors, spacing, type } from '../styles/theme';
import { COMMUNITY_RULES_VERSION, acceptRules, loadMe, rulesTextBehindServer } from '../lib/community';

// Community Rules v3, from docs/community-safety/COMMUNITY-RULES.md.
// Keep this block in step with that document.
export const COMMUNITY_RULES_TEXT = {
  title: 'Community rules',
  intro:
    'Community is where you connect with people at your gym and your '
    + 'friends, see each other\'s training weeks and progress, and give '
    + 'respect. It works best when it stays about training. Here is what '
    + 'that means in practice.',
  rules: [
    {
      heading: 'Training talk only.',
      body: 'Posts and comments are about training: what you did, how it went, what you built. Keep it there.',
    },
    {
      heading: 'Be decent to people.',
      body: 'Disagree if you like, but no harassment, threats, hate or targeting anyone.',
    },
    {
      heading: 'No body-shaming, no diet or calorie talk.',
      body:
        'Nothing about anyone’s body, weight or appearance, and nothing '
        + 'about calories, restriction or dieting. This applies to your own '
        + 'body too, not just other people’s.',
    },
    {
      heading: 'Report what breaks this.',
      body: 'If you see something that shouldn’t be here, report it. That is how we keep Community working for everyone.',
    },
    {
      heading: 'Messages.',
      body: 'Messages are between people who both said yes. Keep them about training. Report anything that is not.',
    },
    {
      heading: 'Meeting people.',
      body: 'If you arrange to train with someone you met here, meet at the gym, tell someone, and keep the first sessions public.',
    },
  ],
  privacy: {
    heading: 'What stays private',
    intro:
      'Community only ever shows what you choose to put there: a handle, '
      + 'a display name, a bio, up to three training styles, a goal, a '
      + 'training setting, and (if you want) an area or gym label. '
      + 'Training-story posts show what you post and nothing more.',
    neverShown: [
      'Your bodyweight and body composition',
      'Your Progress Scan',
      'Your nutrition and food diary',
      'Your injuries and limitations',
      'Anything your coach or plan adjustments have said',
      'Your check-ins',
      'Your progress photos',
      'Your first name, date of birth, email, height or age',
    ],
    note:
      'If you share a personal best, the weight and reps on that specific '
      + 'lift are shown because you chose to share that result. Your '
      + 'training weeks show days and session counts, never a weight on '
      + 'the scale, food or photos.',
    trainingProfileNote:
      'Your training profile works the same way. If you choose to share '
      + 'it, only the bands you have switched on are ever shown, and never '
      + 'anything more detailed: never a time of day more precise than '
      + 'morning, midday, afternoon, evening or late, and never where you '
      + 'are right now.',
  },
  reporting: {
    heading: 'Reporting and blocking',
    body:
      'Every profile, post, comment and group has a Report option '
      + 'with a short list of reasons to choose from, including a '
      + 'dedicated reason for harmful body or eating content. Reports go '
      + 'straight to a moderator queue.\n\n'
      + 'You can also block anyone. Blocking is two-way: once you block '
      + 'someone, neither of you can see the other’s profile, posts, '
      + 'groups or comments, and any follow between you is removed. '
      + 'You can unblock at any time. Muting is quieter: you stop seeing '
      + 'someone’s posts, and they are never told.\n\n'
      + 'If a post or comment gets reported by three different '
      + 'people, it is hidden automatically while a moderator looks at it.',
  },
  moderatorActions: {
    heading: 'What moderators can do',
    body:
      'A moderator can dismiss a report, hide or delete content, or '
      + 'restrict or suspend an account. Every action a moderator takes is '
      + 'recorded, including who did it and why, so it can always be '
      + 'checked.',
  },
  contact: {
    heading: 'Contact',
    body:
      'Questions about these rules, or anything Community-related you '
      + 'would rather raise directly:',
    // `address`, not `email`: the privacy source guard forbids the word in
    // every Community file's code (the handle is derived server-side from
    // the sign-in email, migrate_173); the address itself is copy.
    address: 'support@volyume.app',
  },
  version: {
    number: COMMUNITY_RULES_VERSION,
    publishedDate: '2026-09-10',
    label: 'Community rules version 3, published 10 September 2026.',
    changeNote:
      'Any future change to these rules is a new version, and you will '
      + 'be asked to accept it before you can keep using Community.',
  },
};

// Visual rulings 2026-09-07 (V1): the one emphatic action on this screen.
// It renders only on the re-consent path (`mustAccept` after a rules
// version bump; first acceptance happens on Join), so the label says so.
export const ACCEPT_UPDATED_RULES_LABEL = 'Accept the updated rules';
export const RULES_OUTDATED_LINE = 'The Community rules have changed. Accept them below to carry on.';
// D160 (migrate_175): the server's rules version is ahead of the text this
// build carries. Accepting the text shown here cannot satisfy it (the server
// records the version actually accepted), so the one honest action is an
// update; the rules below are still readable.
export const RULES_UPDATE_APP_HEADING = 'Update Volyume to continue';
export const RULES_UPDATE_APP_LINE = 'The Community rules have changed and this version of Volyume does not carry the new text yet. Update Volyume from the store, then accept the rules here.';

export default function CommunityRulesScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const text = COMMUNITY_RULES_TEXT;
  // `mustAccept` from five surfaces; `accept` from the messaging screen
  // (D160, hostile review OJ-REV-SQL-3 F4): one re-consent path for both.
  const mustAccept = !!(route?.params?.mustAccept || route?.params?.accept);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  // A consent moment is answered by the SERVER, never by the cache: the
  // empty payload seeds this build's own version, so a card painted before
  // the server has answered cannot be trusted (F2). `serverMe` is the
  // server's answer; unreachable falls back to the accept card, whose own
  // failure path is honest ("Could not do that just now").
  const [serverMe, setServerMe] = useState(null);
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const [behindAfterAccept, setBehindAfterAccept] = useState(false);
  useEffect(() => {
    if (!mustAccept) return undefined;
    let alive = true;
    loadMe({ force: true }).then((out) => {
      if (!alive) return;
      setServerUnreachable(!!out?.error);
      setServerMe(out?.error ? null : (out?.me ?? null));
    }).catch(() => { if (alive) setServerUnreachable(true); });
    return () => { alive = false; };
  }, [mustAccept]);
  const behindServer = behindAfterAccept || rulesTextBehindServer(serverMe);
  const serverAnswered = serverMe !== null || serverUnreachable;

  async function accept() {
    if (busy) return;
    setBusy(true);
    try {
      await acceptRules();
      // The server records the version this build carries; if that is
      // still behind what it requires, nothing was resolved and saying
      // "accepted" would be false (F2). Read it back before claiming.
      const { me: fresh, error } = await loadMe({ force: true });
      if (!error && rulesTextBehindServer(fresh)) {
        setBehindAfterAccept(true);
        return;
      }
      setAccepted(true);
      toast.show('Rules accepted');
      navigation?.goBack?.();
    } catch (_e) {
      toast.show('Could not do that just now. Try again.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={text.title} />
      <ScrollView contentContainerStyle={styles.content}>
        {mustAccept && !accepted && behindServer ? (
          <Card style={styles.block}>
            <Text style={[styles.ruleHeading, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
              {RULES_UPDATE_APP_HEADING}
            </Text>
            <Text style={[styles.body, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              {RULES_UPDATE_APP_LINE}
            </Text>
          </Card>
        ) : null}
        {mustAccept && !accepted && serverAnswered && !behindServer ? (
          <Card style={styles.block}>
            <Text style={[styles.ruleHeading, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
              The rules have changed
            </Text>
            <Text style={[styles.body, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              {RULES_OUTDATED_LINE}
            </Text>
            <View style={styles.cardActions}>
              <Button
                variant="emphatic"
                size="sm"
                fullWidth={false}
                title={ACCEPT_UPDATED_RULES_LABEL}
                loading={busy}
                onPress={accept}
                accessibilityLabel={ACCEPT_UPDATED_RULES_LABEL}
              />
            </View>
          </Card>
        ) : null}

        <Text style={[styles.body, { ...t.type.body, color: t.colors.textSecondary }]}>
          {text.intro}
        </Text>

        <Card style={styles.block}>
          {text.rules.map((rule) => (
            <View key={rule.heading} style={styles.rule}>
              <Text style={[styles.ruleHeading, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
                {rule.heading}
              </Text>
              <Text style={[styles.body, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                {rule.body}
              </Text>
            </View>
          ))}
        </Card>

        <View style={styles.section}>
          <SectionLabel tone="muted">{text.privacy.heading}</SectionLabel>
          <Text style={[styles.body, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            {text.privacy.intro}
          </Text>
          {text.privacy.neverShown.map((line) => (
            <Text key={line} style={[styles.bullet, { ...t.type.bodySm, color: t.colors.textPrimary }]}>
              {line}
            </Text>
          ))}
          <Text style={[styles.body, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            {text.privacy.note}
          </Text>
          <Text style={[styles.body, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            {text.privacy.trainingProfileNote}
          </Text>
        </View>

        <View style={styles.section}>
          <SectionLabel tone="muted">{text.reporting.heading}</SectionLabel>
          <Text style={[styles.body, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            {text.reporting.body}
          </Text>
        </View>

        <View style={styles.section}>
          <SectionLabel tone="muted">{text.moderatorActions.heading}</SectionLabel>
          <Text style={[styles.body, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            {text.moderatorActions.body}
          </Text>
        </View>

        <View style={styles.section}>
          <SectionLabel tone="muted">{text.contact.heading}</SectionLabel>
          <Text style={[styles.body, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            {text.contact.body}
          </Text>
          <Button
            variant="secondary"
            size="sm"
            fullWidth={false}
            title={text.contact.address}
            onPress={() => Linking.openURL(`mailto:${text.contact.address}`).catch(() => {})}
            accessibilityLabel={`Email ${text.contact.address}`}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.version, { ...t.type.caption, color: t.colors.textMuted }]}>
            {text.version.label}
          </Text>
          <Text style={[styles.version, { ...t.type.caption, color: t.colors.textMuted }]}>
            {text.version.changeNote}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  block: { gap: spacing.md },
  cardActions: { flexDirection: 'row' },
  rule: { gap: spacing.xxs },
  ruleHeading: { ...type.bodyStrong, color: colors.textPrimary },
  section: { gap: spacing.sm },
  body: { ...type.bodySm, color: colors.textSecondary },
  bullet: { ...type.bodySm, color: colors.textPrimary },
  version: { ...type.caption, color: colors.textMuted },
});
