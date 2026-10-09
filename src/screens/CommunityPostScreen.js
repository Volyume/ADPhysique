/**
 * CommunityPostScreen — one training story and its thread (blueprint
 * section 6, `docs/social-discovery-2026-09-06/30-BLUEPRINT.md`).
 *
 * The card, the comments, a field to add one, and the two things a reader
 * may need: report someone else's story, delete their own. The reaction is
 * a single "Respect" tap with a count (lead visual review 2026-09-06,
 * ruling 3); there is no other engagement surface, and no ranking anywhere.
 *
 * The story renders through `PostCard`, which reads only the allow-listed
 * payload keys for the kind, so nothing about a person's body, food or
 * coaching can appear here.
 *
 * Reading it needs no Community profile (SD-04). Reacting and commenting
 * do, so without one the composer and the Respect tap are replaced by one
 * quiet row that goes to Join and comes back.
 */

import { navigateCommunity } from '../navigation/navigateCommunity';
import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import SectionHeader from '../components/community/SectionHeader';
import SkeletonPostRow from '../components/community/SkeletonPostRow';
import SkeletonPersonRow from '../components/community/SkeletonPersonRow';
import Band, { BandGap, BandLine } from '../components/community/Band';
import EntryRow from '../components/community/EntryRow';
import HeaderGlyph from '../components/community/HeaderGlyph';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import PostRow from '../components/community/PostRow';
import CommentRow, { CommentComposer } from '../components/community/CommentRow';
import JoinToInteractRow from '../components/community/JoinToInteractRow';
import ReportSheet from '../components/community/ReportSheet';
import ProfileMenuSheet from '../components/community/ProfileMenuSheet';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import useAppStore from '../store/useAppStore';
import { spacing } from '../styles/theme';
import * as haptics from '../lib/haptics';
import { logError } from '../lib/errorLog';
import {
  getPost, reactToPost, deletePost, listComments, addComment, deleteComment,
  notifyCommunityEvent, hasProfile, connectionState,
} from '../lib/community';
import { restrictionLine } from '../lib/community/restriction';

export const POST_OFFLINE_LINE = 'Volyume could not reach Community just now. Check your connection and try again.';

/** The calm line when a comment or a Respect is refused. A reader with no
 * Community profile is told the actual reason and what fixes it, rather
 * than "try again" for something trying again cannot fix. */
export function postActionErrorLine(code) {
  if (restrictionLine(code)) return restrictionLine(code);
  if (code === 'offline') return POST_OFFLINE_LINE;
  if (code === 'no_profile') return 'Create your Community profile first, then post this.';
  if (code === 'content_not_allowed') return 'Some of that wording is not allowed in Community. Please reword it.';
  if (code === 'rate_limited') return 'That is a lot of comments for one hour. Try again a bit later.';
  return 'That comment did not send. Please try again.';
}

export function postErrorLine(code) {
  if (restrictionLine(code)) return restrictionLine(code);
  if (code === 'offline') return POST_OFFLINE_LINE;
  if (code === 'not_found') return 'This post is no longer here.';
  if (code === 'not_allowed') return "This post is only shared with the author's followers.";
  return 'Volyume could not open this post just now. Try again in a moment.';
}

export default function CommunityPostScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const id = route?.params?.id ?? null;
  const user = useAppStore((s) => s.user);
  const { me } = useCommunityMe();
  const joined = hasProfile(me);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [myReaction, setMyReaction] = useState(false);
  const [comments, setComments] = useState([]);
  const [cursor, setCursor] = useState(null);
  // What the report sheet is aimed at: the story from the header menu, or
  // one comment from its own flag. A report filed against the wrong row
  // leaves the reported thing untouched and never counts toward the
  // three-reporter auto-hide, so the target travels with the sheet.
  const [reportTarget, setReportTarget] = useState(null);
  // L18 (D221): the ellipsis opens the one profile menu (Report, Block,
  // Mute, Share link) for the post's author, not Report alone.
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); setErrorCode('not_found'); return; }
    setLoading(true);
    try {
      const payload = await getPost(id);
      setData(payload ?? null);
      setMyReaction(!!payload?.my_reaction);
      setErrorCode(null);
    } catch (e) {
      setErrorCode(e?.code ?? 'unavailable');
    } finally {
      setLoading(false);
    }
    try {
      const page = await listComments('post', id);
      setComments(Array.isArray(page?.comments) ? page.comments : []);
      setCursor(page?.cursor ?? null);
    } catch (_e) {
      setComments([]);
      setCursor(null);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loadMoreComments = useCallback(async () => {
    if (!cursor || !id) return;
    try {
      const page = await listComments('post', id, { cursor });
      setComments((prev) => [...prev, ...(Array.isArray(page?.comments) ? page.comments : [])]);
      setCursor(page?.cursor ?? null);
    } catch (_e) { /* best effort: the page the reader already has stays */ }
  }, [cursor, id]);

  const post = data?.post ?? null;
  const author = data?.author ?? null;
  const mine = !!post && post.author_id === user?.id;
  // "Message @handle" is offered only between connected people (discovery
  // blueprint section 2: messaging is a consequence of connection, and the
  // server refuses `not_connected` otherwise). The card carries the
  // connection state, so the action is never shown to someone it would be
  // refused for, and never on your own story.
  const canMessage = !mine && !!author?.user_id && connectionState(author) === 'connected';

  // The heart itself is `PostRow`'s (optimistic, reverts with a calm toast on
  // a failure); this is the call it makes and the page's own copy of the
  // answer, so the count here and the row's never disagree.
  async function respond(next) {
    if (!post) return;
    haptics.selection();
    // The notify call for a Respect tap lives inside reactToPost itself
    // (feed.js), the one place every Respect surface shares (founder order
    // 2026-09-22, item 1).
    await reactToPost(post.id, next, post.author_id);
  }

  function respected(next) {
    setMyReaction(next);
    setData((prev) => (prev ? {
      ...prev,
      post: {
        ...prev.post,
        reaction_count: Math.max(0, Number(prev.post.reaction_count ?? 0) + (next ? 1 : -1)),
      },
    } : prev));
  }

  async function handleAddComment(body) {
    if (!post) return false;
    try {
      const commentId = await addComment('post', post.id, body);
      // The push names the COMMENT it is about (Stage 1 review should-fix 1);
      // without an id there is nothing to name, so nothing is sent.
      if (commentId) notifyCommunityEvent('comment', post.author_id, commentId);
      const page = await listComments('post', post.id);
      setComments(Array.isArray(page?.comments) ? page.comments : []);
      setCursor(page?.cursor ?? null);
      return true;
    } catch (e) {
      toast.show(postActionErrorLine(e?.code), { variant: 'error' });
      return false;
    }
  }

  function handleDeleteComment(comment) {
    appAlert('Delete this comment?', 'It is removed for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(comment.id);
            setComments((prev) => prev.filter((c) => c.id !== comment.id));
          } catch (_e) {
            toast.show('That did not delete. Please try again.', { variant: 'error' });
          }
        },
      },
    ]);
  }

  function handleDeletePost() {
    if (!post) return;
    appAlert('Delete this post?', 'It is removed for everyone. Your training is untouched.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post.id);
            toast.show('Post deleted', { variant: 'success' });
            navigation.goBack();
          } catch (e) {
            logError('CommunityPostScreen.handleDeletePost', e, { postId: post.id });
            toast.show('That did not delete. Please try again.', { variant: 'error' });
          }
        },
      },
    ]);
  }

  const openAuthor = author?.user_id
    ? () => navigateCommunity(navigation, 'CommunityProfile', { userId: author.user_id, handle: author.handle })
    : undefined;

  // D221 V1/V4: the post is the top band, rendered by `PostRow`; the comments
  // are a second band; the composer is docked under the list as a well.
  // No profile, no Respect: `community_react` raises `no_profile`, so the tap
  // is not offered and the row below says what to do about it.
  const header = (
    <View>
      <Band>
        <PostRow
          key={post?.id}
          detail
          item={post ? { post, author, myReaction } : null}
          onRespect={joined ? respond : undefined}
          onRespected={respected}
          onOpenPerson={openAuthor ? () => openAuthor() : undefined}
        />
        {canMessage ? (
          <EntryRow
            icon="chatbubble-outline"
            title={`Message @${author.handle}`}
            onPress={() => navigateCommunity(navigation, 'CommunityConversation', {
              userId: author.user_id,
              ref: { kind: 'post', id },
            })}
          />
        ) : null}
      </Band>
      <BandGap />
      <Band>
        <SectionHeader title="Comments" />
        {comments.length === 0 ? (
          <BandLine text="No comments yet. Anything useful about the training is welcome here." />
        ) : null}
      </Band>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader
        title="Post"
        right={post ? (
          <HeaderGlyph
            icon={mine ? 'trash-outline' : 'ellipsis-horizontal'}
            label={mine ? 'Delete this post' : 'More options for this post'}
            onPress={() => { haptics.selection(); if (mine) handleDeletePost(); else if (author?.user_id) setMenuOpen(true); else setReportTarget({ targetKind: 'post', targetId: post.id }); }}
          />
        ) : null}
      />
      {loading ? (
        <View>
          <SkeletonPostRow />
          <BandGap />
          <Band style={styles.skeletonRows}>
            <SkeletonPersonRow />
            <SkeletonPersonRow />
          </Band>
        </View>
      ) : !post ? (
        <View style={[styles.centre, { paddingHorizontal: t.screenPadding }]}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Not available"
            text={postErrorLine(errorCode)}
            actionLabel="Try again"
            onAction={load}
          />
        </View>
      ) : (
        <>
          <FlashList
            data={comments}
            keyExtractor={(item) => String(item.id)}
            estimatedItemSize={88}
            ListHeaderComponent={header}
            contentContainerStyle={styles.content}
            onEndReachedThreshold={0.4}
            onEndReached={loadMoreComments}
            renderItem={({ item }) => (
              <Band>
                <CommentRow
                  comment={item}
                  author={item.author}
                  canDelete={!!item.mine || mine}
                  onDelete={() => handleDeleteComment(item)}
                  onOpenAuthor={item.author?.user_id
                    ? () => navigateCommunity(navigation, 'CommunityProfile', {
                      userId: item.author.user_id, handle: item.author.handle,
                    })
                    : undefined}
                  onReport={item.mine ? undefined : () => setReportTarget({ targetKind: 'comment', targetId: item.id })}
                />
              </Band>
            )}
          />
          {joined ? (
            <CommentComposer onSubmit={handleAddComment} />
          ) : (
            <Band>
              <JoinToInteractRow
                inBand
                onPress={() => navigateCommunity(navigation, 'CommunityJoin', {
                  next: { screen: 'CommunityPost', params: { id } },
                })}
              />
            </Band>
          )}
        </>
      )}
      <ProfileMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        card={author}
        onChanged={(relationship) => setData((prev) => (prev?.author ? { ...prev, author: { ...prev.author, relationship } } : prev))}
        onReport={() => setReportTarget({ targetKind: 'post', targetId: post?.id })}
      />
      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetKind={reportTarget?.targetKind ?? 'post'}
        targetId={reportTarget?.targetId ?? null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  content: { paddingBottom: spacing.xl },
  skeletonRows: { paddingHorizontal: spacing.lg },
});
