/**
 * CommunityConversationScreen — one conversation (discovery blueprint
 * sections 2 and 10, `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md`;
 * SD-21, SD-31, SD-32).
 *
 * One-to-one text between two connected people. No groups, no media, no
 * read receipts beyond the unread count that cleared when this screen
 * opened, and nothing pre-written: the composer's placeholder is a
 * prompt, the field is empty, the person writes their own words.
 *
 * It can be reached three ways, so it resolves itself from either half
 * of the pair: a conversation `id` (the `m` deep link on a message push),
 * a `userId` (the Message button on a profile, a programme or a story),
 * and an optional `ref` that attaches ONE context reference to the first
 * message so a conversation starts about something rather than out of
 * nowhere.
 *
 * No realtime anywhere in this campaign: the thread is re-read on focus
 * and every 20 seconds while it is the screen in front of the person.
 *
 * Every refusal belongs to the server and is simply spoken here:
 * `not_connected` (the tie is the consent gate messaging needs),
 * `minor_restricted` (SD-32), `rules_outdated` (the rules text moved with
 * this campaign, so the person reads and accepts it before the message
 * goes). A conversation the server has closed keeps its history and
 * takes no new message.
 */

import { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import BackHeader from '../components/BackHeader';
import BottomSheet from '../components/BottomSheet';
import PressableCard from '../components/PressableCard';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import MessageBubble from '../components/community/MessageBubble';
import MessageComposer from '../components/community/MessageComposer';
import ReportSheet from '../components/community/ReportSheet';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { spacing, radius, type, colors, hitSlop, iconSize } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import * as haptics from '../lib/haptics';
import { postDayLabel } from '../components/community/PostCard';
import {
  listConversations, listMessages, sendMessage, markRead, deleteMessage,
  placeholderFor, getProfile, blockUser, removeConnection,
} from '../lib/community';

const PAGE = 30;

/** The thread is re-read this often while it is in front of the person.
 * A poll, not a socket: 20 seconds reads as live in a text conversation
 * and costs a training app nothing when the screen is not open. */
export const POLL_MS = 20000;

/** How far the conversation list is walked to resolve a thread the
 * screen was handed by id or by person. A push tap opens the most
 * recently active conversation, which is the first row, so this only
 * ever runs long for a thread that is no longer listed at all. */
const SCAN_PAGES = 5;

export const CONVERSATION_OFFLINE_LINE = 'Volyume could not reach Community just now. Check your connection and try again.';
export const CONVERSATION_CLOSED_LINE = 'This conversation has ended.';
export const NOT_CONNECTED_LINE = 'You need to be connected to message';
export const MINOR_RESTRICTED_LINE = 'Messages are available to people aged 18 and over.';

/** The calm line for a send that did not go. */
export function sendErrorLine(code) {
  if (code === 'offline') return CONVERSATION_OFFLINE_LINE;
  if (code === 'not_connected') return `${NOT_CONNECTED_LINE}. Send a connection request first.`;
  if (code === 'minor_restricted') return MINOR_RESTRICTED_LINE;
  if (code === 'blocked') return 'This conversation is no longer available.';
  if (code === 'content_not_allowed') return 'Some of that wording is not allowed in Community. Please reword it.';
  if (code === 'rate_limited') return 'That is a lot of messages for one hour. Try again a bit later.';
  if (code === 'no_profile') return 'Create your Community profile first, then send this.';
  return 'That message did not send. Please try again.';
}

/** The line for a thread that would not open at all. */
export function threadErrorLine(code) {
  if (code === 'offline') return CONVERSATION_OFFLINE_LINE;
  if (code === 'not_found') return 'This conversation is no longer here.';
  if (code === 'no_profile') return 'Create your Community profile first.';
  return 'Volyume could not open this conversation just now. Try again in a moment.';
}

/**
 * Walk the conversation list for the thread this screen was opened
 * with. `exhausted` says the whole list was read, which is what turns
 * "not listed" into "closed" rather than "not found yet".
 */
async function findConversation({ id, userId }) {
  let cursor = null;
  for (let page = 0; page < SCAN_PAGES; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const out = await listConversations({ cursor, limit: PAGE });
    const row = out.conversations.find((c) => (id
      ? c.id === id
      : (c.other?.card ?? c.other)?.user_id === userId));
    if (row) return { row, exhausted: true };
    cursor = out.cursor;
    if (!cursor) return { row: null, exhausted: true };
  }
  return { row: null, exhausted: false };
}

/** The day heading is drawn once per day, above the oldest message of
 * that day. The list is inverted, so that is the item whose OLDER
 * neighbour sits on a different day. */
function dayKeyOf(value) {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toDateString() : '';
}

export default function CommunityConversationScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const { refresh: refreshMe } = useCommunityMe();

  const routeId = route?.params?.id ?? null;
  const routeUserId = route?.params?.userId ?? null;
  const ref = route?.params?.ref ?? null;

  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [errorCode, setErrorCode] = useState(null);
  const [sendCode, setSendCode] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  // The live conversation id for the poll and for the send that creates
  // the thread, held in a ref so neither closes over a stale render.
  const idRef = useRef(routeId);
  const refSent = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { row, exhausted } = await findConversation({ id: routeId, userId: routeUserId });
      const id = row?.id ?? routeId ?? null;
      idRef.current = id;

      let rows = [];
      let next = null;
      if (id) {
        const page = await listMessages(id, { limit: PAGE });
        rows = page.messages;
        next = page.cursor;
      }
      setMessages(rows);
      setCursor(next);
      refSent.current = rows.length > 0;

      // A thread that exists but is no longer listed has been closed:
      // `community_conversations` lists open conversations only, which is
      // what removing a connection and blocking both promised.
      setClosed(!!id && !row && exhausted);

      let card = row?.other?.card ?? row?.other ?? null;
      if (!card) {
        const otherId = routeUserId ?? rows.find((m) => !m.mine)?.sender_id ?? null;
        if (otherId) {
          try {
            const out = await getProfile({ userId: otherId });
            card = out?.card ?? null;
          } catch (_e) { /* the thread still reads without the card */ }
        }
      }
      setOther(card);
      setErrorCode(!id && !card ? 'not_found' : null);

      if (id) {
        markRead(id)
          .then(() => refreshMe(true))
          .catch(() => { /* the count clears on the next read */ });
      }
    } catch (e) {
      setErrorCode(e?.code ?? 'unavailable');
    } finally {
      setLoading(false);
    }
  }, [routeId, routeUserId, refreshMe]);

  /** The quiet re-read: no spinner, no list walk, and the thread on
   * screen stays if it fails. */
  const poll = useCallback(async () => {
    const id = idRef.current;
    if (!id) return;
    try {
      const page = await listMessages(id, { limit: PAGE });
      setMessages(page.messages);
      setCursor(page.cursor);
    } catch (_e) { /* best effort: what is on screen stays */ }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    const timer = setInterval(() => { poll(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [load, poll]));

  const loadOlder = useCallback(async () => {
    const id = idRef.current;
    if (!cursor || !id) return;
    try {
      const page = await listMessages(id, { cursor, limit: PAGE });
      setMessages((prev) => [...prev, ...page.messages]);
      setCursor(page.cursor);
    } catch (_e) { setCursor(null); }
  }, [cursor]);

  const openProfile = other?.user_id
    ? () => navigation.navigate('CommunityProfile', {
      userId: other.user_id, handle: other.handle,
    })
    : undefined;

  async function handleSend(body) {
    const targetId = other?.user_id ?? routeUserId ?? null;
    if (!targetId) {
      toast.show('That message did not send. Please try again.', { variant: 'error' });
      return false;
    }
    const attach = !refSent.current && ref?.kind && ref?.id;
    try {
      const out = await sendMessage(targetId, body, attach
        ? { refKind: ref.kind, refId: ref.id }
        : {});
      refSent.current = true;
      setSendCode(null);
      if (out.conversation_id) {
        idRef.current = out.conversation_id;
      }
      await poll();
      return true;
    } catch (e) {
      const code = e?.code ?? 'unavailable';
      if (code === 'rules_outdated') {
        // Re-consent is a consent act, so it happens on the rules screen
        // and the message is sent again afterwards by the person.
        navigation.navigate('CommunityRules', {
          accept: true,
          next: {
            screen: 'CommunityConversation',
            params: { id: idRef.current, userId: targetId, ref },
          },
        });
        return false;
      }
      if (code === 'not_connected' || code === 'minor_restricted' || code === 'blocked') {
        setSendCode(code);
      } else {
        toast.show(sendErrorLine(code), { variant: 'error' });
      }
      return false;
    }
  }

  function confirmDelete(message) {
    appAlert('Delete this message?', 'It is removed for both of you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessage(message.id);
            setMessages((prev) => prev.filter((m) => m.id !== message.id));
          } catch (_e) {
            toast.show('That did not delete. Please try again.', { variant: 'error' });
          }
        },
      },
    ]);
  }

  async function run(fn, done) {
    if (busy || !other?.user_id) return;
    setBusy(true);
    try {
      await fn(other.user_id);
      setMenuOpen(false);
      toast.show(done);
      navigation.goBack();
    } catch (_e) {
      toast.show('Could not do that just now.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function confirmBlock() {
    appAlert(
      `Block @${other?.handle ?? 'this person'}?`,
      'This conversation ends for both of you, neither of you will see the other in Community, and any follow between you is removed. You can unblock later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => run(blockUser, 'Blocked') },
      ],
    );
  }

  function confirmRemoveConnection() {
    appAlert(
      'Remove this connection?',
      'This conversation ends for both of you. You stay following each other, and either of you can connect again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => run(removeConnection, 'Connection removed'),
        },
      ],
    );
  }

  const name = other?.display_name || other?.handle || 'Messages';
  const handle = other?.handle ? `@${other.handle}` : '';
  const placeholder = !messages.length && ref ? placeholderFor(ref) : 'Write a message';
  const canCompose = !closed && !errorCode && !sendCode;

  const notice = sendCode === 'not_connected' ? (
    <View style={[styles.notice, { borderColor: t.colors.borderSubtle }]}>
      <Text style={[styles.noticeLine, { color: t.colors.textPrimary }]}>
        {NOT_CONNECTED_LINE}
      </Text>
      <Button
        variant="secondary"
        size="sm"
        fullWidth={false}
        title="Connect"
        onPress={() => (openProfile ? openProfile() : navigation.goBack())}
        accessibilityLabel={handle ? `Open ${handle} to connect` : 'Open their profile to connect'}
      />
    </View>
  ) : sendCode ? (
    <View style={[styles.notice, { borderColor: t.colors.borderSubtle }]}>
      <Text style={[styles.noticeLine, { color: t.colors.textPrimary }]}>
        {sendErrorLine(sendCode)}
      </Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader
        title={name}
        right={other ? (
          <TouchableOpacity
            onPress={() => { haptics.selection(); setMenuOpen(true); }}
            hitSlop={hitSlop}
            style={styles.headerAction}
            accessibilityRole="button"
            accessibilityLabel="Conversation options"
          >
            <Ionicons name="ellipsis-horizontal" size={iconSize.md} color={t.colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      />

      {other ? (
        <TouchableOpacity
          style={[styles.identity, { borderBottomColor: t.colors.borderSubtle }]}
          onPress={openProfile}
          disabled={!openProfile}
          accessibilityRole="button"
          accessibilityLabel={`Open ${name}'s profile`}
        >
          <ProfileAvatarMark
            presetKey={other.avatar_preset}
            displayName={name}
            size={28}
          />
          <Text style={[styles.identityHandle, { color: t.colors.textSecondary }]} numberOfLines={1}>
            {handle}
          </Text>
        </TouchableOpacity>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.centre}><ActivityIndicator color={t.colors.primary} /></View>
        ) : errorCode ? (
          <View style={styles.centre}>
            <EmptyState
              icon="cloud-offline-outline"
              title="Not available"
              text={threadErrorLine(errorCode)}
              actionLabel="Try again"
              onAction={load}
              actionAccessibilityLabel="Try opening this conversation again"
            />
          </View>
        ) : (
          <FlashList
            inverted
            data={messages}
            keyExtractor={(item) => String(item.id)}
            estimatedItemSize={72}
            contentContainerStyle={styles.list}
            onEndReachedThreshold={0.4}
            onEndReached={loadOlder}
            ListEmptyComponent={(
              <Text style={[styles.emptyLine, { color: t.colors.textMuted }]}>
                {closed
                  ? CONVERSATION_CLOSED_LINE
                  : 'No messages yet. Say hello, or ask about their training.'}
              </Text>
            )}
            renderItem={({ item, index }) => {
              const older = messages[index + 1] ?? null;
              const boundary = !older || dayKeyOf(older.created_at) !== dayKeyOf(item.created_at);
              return (
                <MessageBubble
                  message={item}
                  dayLabel={boundary ? postDayLabel(item.created_at) : null}
                  onLongPress={() => {
                    haptics.selection();
                    if (item.mine) confirmDelete(item);
                    else setReportTarget({ targetKind: 'message', targetId: item.id });
                  }}
                  onOpenRef={item.ref_kind === 'programme' && item.ref?.id
                    ? () => navigation.navigate('CommunityProgramme', { id: item.ref.id })
                    : item.ref_kind === 'post' && item.ref?.id
                      ? () => navigation.navigate('CommunityPost', { id: item.ref.id })
                      : undefined}
                />
              );
            }}
          />
        )}

        {notice}

        {closed && !errorCode ? (
          <Text style={[styles.closedLine, {
            color: t.colors.textMuted, borderTopColor: t.colors.borderSubtle,
          }]}
          >
            {CONVERSATION_CLOSED_LINE}
          </Text>
        ) : null}

        {canCompose ? (
          <MessageComposer placeholder={placeholder} onSend={handleSend} />
        ) : null}
      </KeyboardAvoidingView>

      <BottomSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        accessibilityLabel="Conversation options"
      >
        <View style={styles.menu}>
          <Text style={[styles.menuTitle, { ...t.type.h3, color: t.colors.textPrimary }]}>
            {handle || 'Options'}
          </Text>
          <PressableCard
            onPress={() => {
              setMenuOpen(false);
              setReportTarget({ targetKind: 'profile', targetId: other?.user_id ?? null });
            }}
            style={styles.menuRow}
            accessibilityLabel="Report this person"
          >
            <Ionicons name="flag-outline" size={iconSize.md} color={t.colors.textSecondary} />
            <Text style={[styles.menuLabel, { ...t.type.body, color: t.colors.textPrimary }]}>
              Report
            </Text>
          </PressableCard>
          <PressableCard
            onPress={confirmRemoveConnection}
            style={styles.menuRow}
            accessibilityLabel="Remove this connection"
          >
            <Ionicons name="person-remove-outline" size={iconSize.md} color={t.colors.textSecondary} />
            <Text style={[styles.menuLabel, { ...t.type.body, color: t.colors.textPrimary }]}>
              Remove connection
            </Text>
          </PressableCard>
          <PressableCard
            onPress={confirmBlock}
            style={styles.menuRow}
            accessibilityLabel="Block this person"
          >
            <Ionicons name="ban-outline" size={iconSize.md} color={t.colors.error} />
            <Text style={[styles.menuLabel, { ...t.type.body, color: t.colors.error }]}>
              Block
            </Text>
          </PressableCard>
        </View>
      </BottomSheet>

      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetKind={reportTarget?.targetKind ?? 'message'}
        targetId={reportTarget?.targetId ?? null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centre: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  list: { padding: spacing.lg },
  headerAction: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  identityHandle: { ...type.caption },
  emptyLine: { ...type.caption, textAlign: 'center', paddingVertical: spacing.xl },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    margin: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  noticeLine: { ...type.bodySm, flex: 1 },
  closedLine: {
    ...type.caption,
    textAlign: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  menu: { gap: spacing.xs, paddingBottom: spacing.md },
  menuTitle: { ...type.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  menuLabel: { ...type.body, color: colors.textPrimary },
});
