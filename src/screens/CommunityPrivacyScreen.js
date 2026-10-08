/**
 * CommunityPrivacyScreen (blueprint sections 2, 6; discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 1,
 * 3, 7; SD-20, SD-22, SD-26)
 *
 * Everything about who can see you, in one place, reachable from
 * Community and from Settings: who can follow you, who can send you a
 * connection request, who you have blocked, who you have muted, and
 * leaving Community altogether.
 *
 * Someone who has never joined can open this from Settings, so the
 * screen also answers "what would Community share" with the same
 * receipt the Join screen carries, before there is anything to change.
 *
 * D221 Stage 3 (3e): this is the one panel for every sharing switch, with its
 * live state: sessions and their audience, consistency, gym and place, age
 * group, who can follow, who can message, and show when training. Each goes
 * through the setter the Training profile screen uses (`saveShareSessions`,
 * `saveBandToggle`, `setShowGym`, `setShowPlace`, `saveShowTrainingNow`).
 *
 * It is also the route to the screens that have no other home: the
 * profile editor, the training profile, and (for a moderator only, from
 * `community_get_me`) the moderation queue.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Band, { BandGap, BandBody, BandLine } from '../components/community/Band';
import SectionHeader from '../components/community/SectionHeader';
import EntryRow from '../components/community/EntryRow';
import SwitchRow from '../components/community/SwitchRow';
import SkeletonPersonRow from '../components/community/SkeletonPersonRow';
import EmptyState from '../components/EmptyState';
import ProfileCard from '../components/community/ProfileCard';
import PrivacyReceipt from '../components/community/PrivacyReceipt';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { spacing } from '../styles/theme';
import {
  relationships, unblockUser, unmuteUser, upsertProfile, leaveCommunity,
  hasProfile, setConnectFrom, CONNECT_FROM_VALUES, setShowGym, setShowPlace,
  readShareSettings, sessionsSharingSentence,
  SESSIONS_AUDIENCE_VALUES, SESSIONS_AUDIENCE_LABELS,
  readShowTrainingNow, saveShowTrainingNow, presenceFailureLine,
} from '../lib/community';
import { saveBandToggle } from '../lib/community/bandShare';
import { saveShareSessions, SHARE_OFF_TITLE, SHARE_OFF_BODY } from '../lib/community/shareSessions';

const CONNECT_FROM_OPTIONS = Object.entries(CONNECT_FROM_VALUES)
  .map(([value, label]) => ({ label, value }));

export default function CommunityPrivacyScreen({ navigation }) {
  const t = useTheme();
  const toast = useToast();
  const { me, refresh } = useCommunityMe();
  const joined = hasProfile(me);
  const profile = me?.profile ?? null;

  const [visibility, setVisibility] = useState('public');
  const [connectFrom, setConnectFromLocal] = useState('anyone');
  // Spec D (migrate_164 Part 8), default on: both toggles start true so a
  // profile read before the first `me` refresh never flashes "hidden".
  const [showGym, setShowGymLocal] = useState(true);
  const [showPlace, setShowPlaceLocal] = useState(true);
  // L17 (D221): "Share what I did", mirrored here from the Training
  // profile and saved through the same setter (`saveShareSessions`).
  const [share, setShare] = useState(null);
  const [showTraining, setShowTraining] = useState(false);
  const uid = profile?.user_id ?? null;
  const isMinor = !!me?.is_minor;
  const [lists, setLists] = useState({ blocked: [], muted: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.visibility) setVisibility(profile.visibility);
  }, [profile?.visibility]);

  useEffect(() => {
    if (me?.connect_from) setConnectFromLocal(me.connect_from);
  }, [me?.connect_from]);

  useEffect(() => {
    if (profile?.show_gym != null) setShowGymLocal(!!profile.show_gym);
  }, [profile?.show_gym]);

  useEffect(() => {
    if (profile?.show_place != null) setShowPlaceLocal(!!profile.show_place);
  }, [profile?.show_place]);

  useEffect(() => {
    if (!uid) return undefined;
    let alive = true;
    readShareSettings(uid).then((v) => { if (alive) setShare(v); }).catch(() => {});
    return () => { alive = false; };
  }, [uid]);

  // The switch's state is mirrored on this device (the server's `me` does not
  // carry it); a card that does carry it wins.
  useEffect(() => {
    if (profile?.show_training_now != null) { setShowTraining(!!profile.show_training_now); return undefined; }
    if (!uid) return undefined;
    let alive = true;
    readShowTrainingNow(uid).then((v) => { if (alive) setShowTraining(v); }).catch(() => {});
    return () => { alive = false; };
  }, [uid, profile?.show_training_now]);

  async function changeShowTraining(next) {
    const previous = showTraining;
    setShowTraining(next);
    try {
      setShowTraining(await saveShowTrainingNow(uid, next));
    } catch (e) {
      setShowTraining(previous);
      if (e?.code === 'rules_outdated') navigation.navigate('CommunityRules', { mustAccept: true });
      else toast.show(presenceFailureLine(e?.code), { variant: 'error' });
    }
  }

  async function changeBand(key, next) {
    if (!share) return;
    const prev = share;
    setShare({ ...share, [key]: next });
    try {
      const out = await saveBandToggle(uid, prev, key, next);
      setShare(out.settings);
      if (out.status === 'rules_outdated') navigation.navigate('CommunityRules', { mustAccept: true });
      else if (out.status === 'queued') toast.show('Saved on this device. It will share when you are back online.');
    } catch (_e) {
      setShare(prev);
      toast.show('Could not change that just now.', { variant: 'error' });
    }
  }

  async function saveShareSessionsChange(next, { removeShared = false } = {}) {
    if (!share) return;
    const prev = share;
    setShare(next);
    try {
      const out = await saveShareSessions(uid, prev, next, { removeShared, isMinor });
      setShare(out.settings);
      if (out.status === 'rules_outdated') {
        navigation.navigate('CommunityRules', { mustAccept: true });
      } else if (out.status === 'queued') {
        toast.show(out.settings.share_sessions
          ? 'Saved on this device. It will share when you are back online.'
          : 'Saved on this device. It will apply when you are back online.');
      }
    } catch (_e) {
      setShare(prev);
      toast.show('Could not change that just now.', { variant: 'error' });
    }
  }

  function toggleShareSessions(on) {
    if (!share) return;
    if (!on) {
      appAlert(SHARE_OFF_TITLE, SHARE_OFF_BODY, [
        { text: 'Keep', onPress: () => saveShareSessionsChange({ ...share, share_sessions: false }) },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => saveShareSessionsChange({ ...share, share_sessions: false }, { removeShared: true }),
        },
      ]);
      return;
    }
    saveShareSessionsChange({ ...share, share_sessions: true });
  }

  const load = useCallback(async () => {
    if (!joined) { setLoading(false); return; }
    setLoading(true);
    try {
      const out = await relationships();
      setLists({ blocked: out?.blocked ?? [], muted: out?.muted ?? [] });
    } catch (_e) {
      setLists({ blocked: [], muted: [] });
    } finally {
      setLoading(false);
    }
  }, [joined]);

  useEffect(() => { load(); }, [load]);

  async function changeVisibility(next) {
    const previous = visibility;
    setVisibility(next);
    setBusy(true);
    try {
      const card = await upsertProfile({ visibility: next });
      await refresh(true);
      // The server has the last word (a minor is followers-only whatever
      // was asked, migrate_170), so the confirmation reads the STORED value
      // and never echoes the request (hostile review OJ-REV-SQL-2, F8).
      const stored = card?.visibility === 'public' || card?.visibility === 'followers'
        ? card.visibility
        : next;
      setVisibility(stored);
      if (stored === 'public') {
        toast.show('Anyone can follow you');
      } else if (next === 'public') {
        // Asked for public, kept followers-only by the server: said plainly.
        toast.show('Your profile stays followers only. You approve every follower.');
      } else {
        toast.show('You approve every follower');
      }
    } catch (_e) {
      setVisibility(previous);
      toast.show('Could not change that just now.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function changeConnectFrom(next) {
    const previous = connectFrom;
    setConnectFromLocal(next);
    try {
      await setConnectFrom(next);
      await refresh(true);
    } catch (e) {
      setConnectFromLocal(previous);
      // `rules_outdated` is the rules text moving, not a network problem
      // (product review 2026-09-06 finding 4): sent to the rules screen
      // rather than told, wrongly, to try again.
      if (e?.code === 'rules_outdated') {
        navigation.navigate('CommunityRules', { mustAccept: true });
      } else {
        toast.show('Could not change that just now.', { variant: 'error' });
      }
    }
  }

  async function changeShowGym(next) {
    const previous = showGym;
    setShowGymLocal(next);
    try {
      await setShowGym(next);
      await refresh(true);
    } catch (e) {
      setShowGymLocal(previous);
      if (e?.code === 'rules_outdated') {
        navigation.navigate('CommunityRules', { mustAccept: true });
      } else {
        toast.show('Could not change that just now.', { variant: 'error' });
      }
    }
  }

  async function changeShowPlace(next) {
    const previous = showPlace;
    setShowPlaceLocal(next);
    try {
      await setShowPlace(next);
      await refresh(true);
    } catch (e) {
      setShowPlaceLocal(previous);
      if (e?.code === 'rules_outdated') {
        navigation.navigate('CommunityRules', { mustAccept: true });
      } else {
        toast.show('Could not change that just now.', { variant: 'error' });
      }
    }
  }

  async function undo(kind, card) {
    try {
      if (kind === 'blocked') await unblockUser(card.user_id);
      else await unmuteUser(card.user_id);
      setLists((prev) => ({ ...prev, [kind]: prev[kind].filter((c) => (c.card ?? c).user_id !== card.user_id) }));
      toast.show(kind === 'blocked' ? 'Unblocked' : 'Unmuted');
    } catch (_e) {
      toast.show('Could not do that just now.', { variant: 'error' });
    }
  }

  function confirmLeave() {
    appAlert(
      'Leave Community?',
      'Your profile, posts and follows are deleted. Your training, plans and food diary are not touched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCommunity();
              await refresh(true);
              toast.show('You have left Community');
              navigation.goBack();
            } catch (_e) {
              toast.show('Could not do that just now.', { variant: 'error' });
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Community" />
      <ScrollView contentContainerStyle={styles.content}>
        <PrivacyReceipt inBand />
        <BandGap />

        {!joined ? (
          <EmptyState
            icon="people-outline"
            title="You are not in Community yet"
            text="Nothing about you is shared until you create a profile."
            actionLabel="Open Community"
            onAction={() => navigation.navigate('Community')}
            actionAccessibilityLabel="Open Community"
          />
        ) : (
          <>
            <Band>
              <SectionHeader title="Who can follow you" />
              <BandBody>
                <View style={styles.chipRow} accessibilityLabel="Who can follow you">
                  <Chip
                    label="Anyone"
                    selected={visibility === 'public'}
                    disabled={busy}
                    onPress={() => changeVisibility('public')}
                    accessibilityRole="radio"
                  />
                  <Chip
                    label="People I approve"
                    selected={visibility === 'followers'}
                    disabled={busy}
                    onPress={() => changeVisibility('followers')}
                    accessibilityRole="radio"
                  />
                </View>
                <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>
                  {visibility === 'public'
                    ? 'Anyone signed in can follow you and see what you post.'
                    : 'You approve every follower before they see what you post.'}
                </Text>
              </BandBody>
            </Band>
            <BandGap />

            <Band>
              <SectionHeader title="Who can send you connection requests" />
              <BandBody>
                <View style={styles.chipRow} accessibilityLabel="Who can send you connection requests">
                  {CONNECT_FROM_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      selected={connectFrom === opt.value}
                      onPress={() => changeConnectFrom(opt.value)}
                      accessibilityRole="radio"
                    />
                  ))}
                </View>
                <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>
                  {{
                    anyone: 'Anyone can send you a request to connect.',
                    followers: 'Only people who already follow you can send you a request.',
                    nobody: 'Nobody can send you a request to connect.',
                  }[connectFrom]}
                </Text>
              </BandBody>
            </Band>
            <BandGap />

            <Band>
              <SwitchRow
                icon="business-outline"
                title="Show my gym"
                subtitle="Others can see the gym you train at. You always see it yourself."
                value={showGym}
                onValueChange={changeShowGym}
              />
              <SwitchRow
                icon="location-outline"
                title="Show my place"
                subtitle="Others can see your town or postcode district. You always see it yourself."
                value={showPlace}
                onValueChange={changeShowPlace}
              />
            </Band>
            <BandGap />

            <Band>
              {share ? (
                <SwitchRow
                  icon="share-social-outline"
                  title="Share what I did"
                  subtitle={sessionsSharingSentence(!!share.share_sessions, share.sessions_audience)}
                  value={!!share.share_sessions}
                  onValueChange={toggleShareSessions}
                />
              ) : null}
              {share && share.share_sessions ? (
                isMinor ? (
                  <BandBody>
                    <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>Shared with people who follow you.</Text>
                  </BandBody>
                ) : (
                  <BandBody>
                    <View style={styles.chipRow} accessibilityLabel="Who sees what you did">
                      {SESSIONS_AUDIENCE_VALUES.map((value) => (
                        <Chip
                          key={value}
                          label={SESSIONS_AUDIENCE_LABELS[value]}
                          selected={share.sessions_audience === value}
                          onPress={() => saveShareSessionsChange({ ...share, sessions_audience: value })}
                          accessibilityRole="radio"
                        />
                      ))}
                    </View>
                  </BandBody>
                )
              ) : null}
              {share && !isMinor ? (
                <>
                  <SwitchRow
                    icon="calendar-outline"
                    title="Share my consistency"
                    subtitle="Your sessions this week, this month and your weeks in a row. Never your weight or food."
                    value={!!share.consistency}
                    onValueChange={(v) => changeBand('consistency', v)}
                  />
                  <SwitchRow
                    icon="person-outline"
                    title="Share my age group"
                    subtitle="Worked out from your date of birth when this is on."
                    value={!!share.age_band}
                    onValueChange={(v) => changeBand('age_band', v)}
                  />
                  <SwitchRow
                    icon="pulse-outline"
                    title="Show when I am training"
                    subtitle="People who follow you, and your groups, see that you are training while a session is open. It clears when you finish."
                    value={showTraining}
                    onValueChange={changeShowTraining}
                  />
                </>
              ) : null}
              <EntryRow
                icon="body-outline"
                title="Training profile"
                subtitle="The bands worked out from your training, and what you share of them."
                accessibilityLabel="Training profile"
                onPress={() => navigation.navigate('CommunityTrainingProfile')}
              />
            </Band>
            <BandGap />

            <Band>
              <SectionHeader title="Blocked" />
              {loading ? <SkeletonPersonRow /> : null}
              {!loading && !lists.blocked.length ? (
                <BandLine text="You have not blocked anyone." />
              ) : null}
              {lists.blocked.map((row) => {
                const card = row.card ?? row;
                return (
                  <ProfileCard
                    key={card.user_id}
                    card={card}
                    showFollow={false}
                    compact
                    inBand
                    trailing={(
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth={false}
                        title="Unblock"
                        onPress={() => undo('blocked', card)}
                        accessibilityLabel={`Unblock @${card.handle}`}
                      />
                    )}
                  />
                );
              })}
            </Band>
            <BandGap />

            <Band>
              <SectionHeader title="Muted" />
              {loading ? <SkeletonPersonRow /> : null}
              {!loading && !lists.muted.length ? (
                <BandLine text="You have not muted anyone." />
              ) : null}
              {lists.muted.map((row) => {
                const card = row.card ?? row;
                return (
                  <ProfileCard
                    key={card.user_id}
                    card={card}
                    showFollow={false}
                    compact
                    inBand
                    trailing={(
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth={false}
                        title="Unmute"
                        onPress={() => undo('muted', card)}
                        accessibilityLabel={`Unmute @${card.handle}`}
                      />
                    )}
                  />
                );
              })}
            </Band>
            <BandGap />

            <Band>
              <EntryRow
                icon="create-outline"
                title="Edit profile"
                onPress={() => navigation.navigate('CommunityEditProfile')}
                accessibilityLabel="Edit my Community profile"
              />
              <EntryRow
                icon="people-outline"
                title="Followers"
                onPress={() => navigation.navigate('CommunityFollowers')}
                accessibilityLabel="See and manage your followers"
              />
              <EntryRow
                icon="link-outline"
                title="Connections"
                onPress={() => navigation.navigate('CommunityConnections')}
                accessibilityLabel="See and manage your connections"
              />
              {me?.is_moderator ? (
                <EntryRow
                  icon="shield-outline"
                  title="Moderation queue"
                  onPress={() => navigation.navigate('CommunityModeration')}
                  accessibilityLabel="Open the moderation queue"
                />
              ) : null}
              <EntryRow
                icon="document-text-outline"
                title="Community rules"
                onPress={() => navigation.navigate('CommunityRules')}
                accessibilityLabel="Read the Community rules"
              />
              <EntryRow
                icon="exit-outline"
                title="Leave Community"
                destructive
                onPress={confirmLeave}
                accessibilityLabel="Leave Community"
              />
            </Band>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
