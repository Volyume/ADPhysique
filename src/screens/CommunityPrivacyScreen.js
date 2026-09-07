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
 * It is also the route to the screens that have no other home: the
 * profile editor, the training profile, and (for a moderator only, from
 * `community_get_me`) the moderation queue.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Chip from '../components/Chip';
import SectionLabel from '../components/SectionLabel';
import { SettingRow, settingsStyles, useSettingsStyles } from '../components/SettingsPrimitives';
import EmptyState from '../components/EmptyState';
import ProfileCard from '../components/community/ProfileCard';
import PrivacyReceipt from '../components/community/PrivacyReceipt';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing, type } from '../styles/theme';
import {
  relationships, unblockUser, unmuteUser, upsertProfile, leaveCommunity,
  hasProfile, setConnectFrom, CONNECT_FROM_VALUES,
} from '../lib/community';

const CONNECT_FROM_OPTIONS = Object.entries(CONNECT_FROM_VALUES)
  .map(([value, label]) => ({ label, value }));

export default function CommunityPrivacyScreen({ navigation }) {
  const t = useTheme();
  const settings = useSettingsStyles();
  const toast = useToast();
  const { me, refresh } = useCommunityMe();
  const joined = hasProfile(me);
  const profile = me?.profile ?? null;

  const [visibility, setVisibility] = useState('public');
  const [connectFrom, setConnectFromLocal] = useState('anyone');
  const [lists, setLists] = useState({ blocked: [], muted: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.visibility) setVisibility(profile.visibility);
  }, [profile?.visibility]);

  useEffect(() => {
    if (me?.connect_from) setConnectFromLocal(me.connect_from);
  }, [me?.connect_from]);

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
      await upsertProfile({ visibility: next });
      await refresh(true);
      toast.show(next === 'public' ? 'Anyone can follow you' : 'You approve every follower');
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
        <PrivacyReceipt />

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
            <View style={styles.section}>
              <SectionLabel tone="muted">Who can follow you</SectionLabel>
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
              <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
                {visibility === 'public'
                  ? 'Anyone signed in can follow you and see what you post.'
                  : 'You approve every follower before they see what you post.'}
              </Text>
            </View>

            <View style={styles.section}>
              <SectionLabel tone="muted">Who can send you connection requests</SectionLabel>
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
              <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
                {{
                  anyone: 'Anyone can send you a request to connect.',
                  followers: 'Only people who already follow you can send you a request.',
                  nobody: 'Nobody can send you a request to connect.',
                }[connectFrom]}
              </Text>
            </View>

            <View style={[settingsStyles.section, settings.section]}>
              <SettingRow
                icon="body-outline"
                label="Training profile"
                sub="The bands worked out from your training, and what you share of them."
                onPress={() => navigation.navigate('CommunityTrainingProfile')}
              />
            </View>

            <View style={styles.section}>
              <SectionLabel tone="muted">Blocked</SectionLabel>
              {loading ? <ActivityIndicator color={t.colors.primary} /> : null}
              {!loading && !lists.blocked.length ? (
                <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                  You have not blocked anyone.
                </Text>
              ) : null}
              {lists.blocked.map((row) => {
                const card = row.card ?? row;
                return (
                  <View key={card.user_id} style={styles.row}>
                    <ProfileCard card={card} showFollow={false} compact />
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      title="Unblock"
                      onPress={() => undo('blocked', card)}
                      accessibilityLabel={`Unblock @${card.handle}`}
                    />
                  </View>
                );
              })}
            </View>

            <View style={styles.section}>
              <SectionLabel tone="muted">Muted</SectionLabel>
              {!loading && !lists.muted.length ? (
                <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                  You have not muted anyone.
                </Text>
              ) : null}
              {lists.muted.map((row) => {
                const card = row.card ?? row;
                return (
                  <View key={card.user_id} style={styles.row}>
                    <ProfileCard card={card} showFollow={false} compact />
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      title="Unmute"
                      onPress={() => undo('muted', card)}
                      accessibilityLabel={`Unmute @${card.handle}`}
                    />
                  </View>
                );
              })}
            </View>

            <View style={[settingsStyles.section, settings.section]}>
              <SettingRow
                icon="create-outline"
                label="Edit profile"
                onPress={() => navigation.navigate('CommunityEditProfile')}
                accessibilityLabel="Edit my Community profile"
              />
              {me?.is_moderator ? (
                <SettingRow
                  icon="shield-outline"
                  label="Moderation queue"
                  onPress={() => navigation.navigate('CommunityModeration')}
                  accessibilityLabel="Open the moderation queue"
                />
              ) : null}
              <SettingRow
                icon="document-text-outline"
                label="Community rules"
                onPress={() => navigation.navigate('CommunityRules')}
                accessibilityLabel="Read the Community rules"
              />
              <SettingRow
                icon="exit-outline"
                label="Leave Community"
                destructive
                onPress={confirmLeave}
                accessibilityLabel="Leave Community"
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  section: { gap: spacing.sm },
  row: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { ...type.caption, color: colors.textMuted },
});
