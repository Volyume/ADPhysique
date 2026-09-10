/**
 * CommunityComposeScreen — post one training story (blueprint section 6,
 * `docs/social-discovery-2026-09-06/30-BLUEPRINT.md`; SD-06).
 *
 * Nothing here is automatic. A story is composed from something the athlete
 * really logged, shown to them exactly as everyone else will see it, and
 * posted only when they tap Post. The payload comes from the builders in
 * `src/lib/community/posts.js`, which carry ONLY the allow-listed keys for
 * the kind; this screen never assembles a payload of its own.
 *
 * Without a Community profile there is nothing to post as, so the screen
 * hands over to Join and asks it to come back here afterwards.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import SectionLabel from '../components/SectionLabel';
import ComposerInput from '../components/community/ComposerInput';
import { useToast } from '../components/Toast';
import PostCard from '../components/community/PostCard';
import useTheme from '../hooks/useTheme';
import useAppStore from '../store/useAppStore';
import { spacing, type } from '../styles/theme';
import * as haptics from '../lib/haptics';
import { logError } from '../lib/errorLog';
import {
  loadMe, hasProfile, createPost, setPostNote, listMyGroups,
  buildPrPayload, buildSessionPayload, buildBlockPayload, buildMilestonePayload,
  CAPTION_MAX,
} from '../lib/community';

// Phase 3 (spec section 3): "Followers / Everyone / one or more of my
// groups" -- the first two behave as a radio pair, the group chips
// (appended below, only when the person is in any) behave as checkboxes
// among themselves; picking either radio clears any chosen groups, and
// picking a group clears the radio (see `pickVisibility`/`toggleGroup`).
const VISIBILITY_OPTIONS = [
  { label: 'Followers', value: 'followers' },
  { label: 'Everyone', value: 'public' },
];

export function composeErrorLine(code) {
  if (code === 'offline') return 'Volyume could not reach Community just now. Check your connection and try again.';
  if (code === 'rate_limited') return 'That is a lot of posting for one day. Try again tomorrow.';
  if (code === 'content_not_allowed') return 'Some of that wording is not allowed in Community. Please reword it.';
  if (code === 'no_profile') return 'Create your Community profile first, then post this.';
  return 'That did not post. Please try again.';
}

/** Build the payload for one kind from what the entry point handed over.
 * Each branch calls exactly one builder and nothing else. */
export async function payloadFor({ kind, workoutId, mesocycleId, pr, milestone }, { userId, units }) {
  if (kind === 'pr') return pr ? buildPrPayload({ ...pr, units: pr.units ?? units }) : null;
  if (kind === 'milestone') return milestone ? buildMilestonePayload(milestone) : null;
  if (kind === 'session') return workoutId ? buildSessionPayload(workoutId, { userId, units }) : null;
  if (kind === 'block') return mesocycleId ? buildBlockPayload(mesocycleId, { userId, units }) : null;
  return null;
}

export default function CommunityComposeScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const params = route?.params ?? {};
  const kind = params.kind ?? null;
  // Phase 3 (spec section 2): "Add a note" on an EXISTING auto item
  // (WorkoutSummaryScreen hands over `postId` + the payload it already
  // has) reuses this screen's preview and caption field, but SAVES
  // through `community_post_set_note` on that row instead of creating a
  // new post. No audience chooser here: the item's audience was set at
  // creation and a note never changes it.
  const noteMode = !!params.postId;
  const user = useAppStore((s) => s.user);
  const units = useAppStore((s) => s.units);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [payload, setPayload] = useState(noteMode ? (params.payload ?? null) : null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('followers');
  const [myGroups, setMyGroups] = useState([]);
  const [groupIds, setGroupIds] = useState([]);
  const [posting, setPosting] = useState(false);
  const postingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { me } = await loadMe({});
    if (!hasProfile(me)) {
      setLoading(false);
      // REPLACE, not push: Join comes back with its own `replace`, so a
      // push here would leave this half-loaded Compose underneath the one
      // the reader ends up on, and backing out of the posting flow would
      // land on "Nothing to post yet" (product review 2026-09-06, item 12).
      navigation.replace('CommunityJoin', {
        next: { screen: 'CommunityCompose', params },
      });
      return;
    }
    setProfile(me.profile);
    if (noteMode) {
      // The payload came from the caller (the row already exists); a
      // manual compose is the only path that needs to build one.
      setLoading(false);
      return;
    }
    try {
      const [builtPayload, groupsResult] = await Promise.all([
        payloadFor(params, { userId: user?.id ?? null, units }),
        listMyGroups().catch(() => []),
      ]);
      setPayload(builtPayload);
      const groups = groupsResult.map((row) => row.group).filter(Boolean);
      setMyGroups(groups);
      // Communities revamp phase 3 (blueprint section 9's group page; lead
      // ruling): "Share a workout with the group" hands over a group id to
      // preselect here. Only honoured when the caller is genuinely still a
      // member of it (the same membership check `_group_ids` gets
      // server-side) -- never a stale/foreign id taken on faith.
      if (params.presetGroupId && groups.some((g) => g.id === params.presetGroupId)) {
        setVisibility('groups');
        setGroupIds([params.presetGroupId]);
      }
    } catch (e) {
      logError('CommunityComposeScreen.load', e, { kind });
      setPayload(null);
    } finally {
      setLoading(false);
    }
    // `params` is a route object, stable for the life of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, user?.id, units, kind, noteMode]);

  useEffect(() => { load(); }, [load]);

  /** Followers/Everyone are mutually exclusive with each other AND with
   * any chosen group (spec section 3: a post's audience is one thing). */
  function pickVisibility(value) {
    setVisibility(value);
    setGroupIds([]);
  }

  function toggleGroup(id) {
    setGroupIds((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      setVisibility(next.length ? 'groups' : 'followers');
      return next;
    });
  }

  async function handlePost() {
    if (!payload || postingRef.current) return;
    haptics.selection();
    postingRef.current = true;
    setPosting(true);
    try {
      if (noteMode) {
        const updated = await setPostNote(params.postId, caption.trim() || null);
        toast.show('Note saved', { variant: 'success' });
        navigation.replace('CommunityPost', { id: updated?.id ?? params.postId });
        return;
      }
      const created = await createPost({
        kind,
        payload,
        caption: caption.trim() || null,
        visibility,
        groupIds: visibility === 'groups' ? groupIds : null,
      });
      if (!created?.id) throw new Error('Post failed.');
      toast.show('Posted to Community', { variant: 'success' });
      navigation.replace('CommunityPost', { id: created.id });
    } catch (e) {
      if (!e?.code) logError('CommunityComposeScreen.handlePost', e, { kind });
      toast.show(composeErrorLine(e?.code), { variant: 'error' });
    } finally {
      postingRef.current = false;
      setPosting(false);
    }
  }

  const previewPost = payload
    ? { id: 'preview', kind, payload, caption: caption.trim() || null, reaction_count: 0, comment_count: 0, created_at: Date.now() }
    : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={noteMode ? 'Add a note' : 'Post to Community'} />
      {loading ? (
        <View style={styles.centre}><ActivityIndicator color={t.colors.primary} /></View>
      ) : !previewPost ? (
        <View style={styles.centre}>
          <EmptyState
            icon="document-outline"
            title={noteMode ? 'Nothing to add a note to' : 'Nothing to post yet'}
            text={noteMode
              ? 'Volyume could not find that item. Go back and try again from the summary.'
              : 'Volyume could not read this session. Open it again from where you finished it, then post.'}
            actionLabel="Go back"
            onAction={() => navigation.goBack()}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SectionLabel tone="muted">Preview</SectionLabel>
          <PostCard post={previewPost} author={profile} myReaction={false} />

          <View style={styles.field}>
            <SectionLabel tone="muted">Caption</SectionLabel>
            <ComposerInput
              value={caption}
              onChangeText={setCaption}
              maxLength={CAPTION_MAX}
              minHeight={96}
              placeholder="Say something about the training, if you want to."
              accessibilityLabel="Caption"
            />
            <Text style={[styles.counter, { color: t.colors.textMuted }]}>
              {`${caption.length} of ${CAPTION_MAX}`}
            </Text>
          </View>

          {/* Phase 3 (spec section 3): the audience chooser, manual posts
              only -- a note edits an existing item whose audience was
              already set at creation. */}
          {!noteMode ? (
            <View style={styles.field}>
              <SectionLabel tone="muted">Who can see it</SectionLabel>
              <View style={styles.chipRow} accessibilityLabel="Who can see it">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={visibility === opt.value}
                    onPress={() => pickVisibility(opt.value)}
                    accessibilityRole="radio"
                  />
                ))}
                {myGroups.map((group) => (
                  <Chip
                    key={group.id}
                    label={group.name}
                    selected={groupIds.includes(group.id)}
                    onPress={() => toggleGroup(group.id)}
                    accessibilityRole="checkbox"
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Button
            variant="emphatic"
            title={noteMode ? 'Save' : 'Post'}
            size="lg"
            onPress={handlePost}
            loading={posting}
            disabled={posting}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  field: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  counter: { ...type.caption, textAlign: 'right' },
});
