/**
 * CommunityGroupChatScreen (D221 Stage 3, 3b; spec `15-STAGE3-SPEC.md`
 * "Client": "`CommunityGroupChatScreen.js` (bubbles as `MessageBubble`, a well
 * composer, report via long-press as DMs)").
 *
 * The group's chat: text only, members only, 1 to 500 characters. Bubbles are
 * the DM `MessageBubble` (a first name above a message that is not yours), the
 * composer is the DM `MessageComposer` well at the group ceiling. Newest at the
 * bottom (an inverted list), older messages page in as the person scrolls up,
 * and the thread is re-read every 20 seconds while this screen is in front, as
 * the DM thread is. `markGroupRead` runs on open and whenever a newer message
 * arrives, so the unread count on the Groups row clears.
 *
 * Long-press (and the visible "..."): the author gets the house delete confirm;
 * anyone else reports the message (kind `group_message`); an admin on another
 * member's message chooses Delete or Report.
 *
 * Round 3R: the poll and the post-send refresh MERGE the newest page into the
 * list by id and keep the cursor (older pages the person scrolled to stay);
 * older pages load behind an in-flight guard and are de-duplicated by id;
 * the poll and `markGroupRead` run only while the app is in the foreground.
 *
 * Route params: { id: groupId, name? }.
 */

import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, AppState } from 'react-native';
import Text from '../components/Text';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import MessageBubble from '../components/community/MessageBubble';
import MessageComposer from '../components/community/MessageComposer';
import ReportSheet from '../components/community/ReportSheet';
import useTheme from '../hooks/useTheme';
import { spacing, radius, type, colors } from '../styles/theme';
import * as haptics from '../lib/haptics';
import { postDayLabel } from '../components/community/PostCard';
import {
  getGroup, loadGroupMessages, sendGroupMessage, deleteGroupMessage, markGroupRead,
  GROUP_MESSAGE_MAX, GROUP_CHAT_PAGE_SIZE,
} from '../lib/community';
import { restrictionLine } from '../lib/community/restriction';
import { mergeNewestPage, appendOlderPage } from '../lib/community/groupChatState';

/** Re-read cadence while the chat is in front (the DM thread's own). */
export const GROUP_CHAT_POLL_MS = 20000;

export const GROUP_CHAT_OFFLINE_LINE = 'Volyume could not reach Community just now. Check your connection and try again.';

/** The calm line for a send that did not go. */
export function groupSendErrorLine(code) {
  if (restrictionLine(code)) return restrictionLine(code);
  if (code === 'offline') return GROUP_CHAT_OFFLINE_LINE;
  if (code === 'content_not_allowed') return 'Some of that wording is not allowed in Community. Please reword it.';
  if (code === 'rate_limited') return 'That is a lot of messages for one day. Try again later.';
  if (code === 'not_allowed') return 'You can no longer message in this group.';
  if (code === 'invalid_input') return `A message can be 1 to ${GROUP_MESSAGE_MAX} characters.`;
  return 'That message did not send. Please try again.';
}

/** The line for a chat that would not open. */
export function groupChatErrorLine(code) {
  if (restrictionLine(code)) return restrictionLine(code);
  if (code === 'offline') return GROUP_CHAT_OFFLINE_LINE;
  if (code === 'not_allowed' || code === 'not_found') return 'This chat is only for members of the group.';
  return 'Volyume could not open this chat just now. Try again in a moment.';
}

function dayKeyOf(value) {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toDateString() : '';
}

function senderFirst(author) {
  const name = author?.display_name || author?.handle || '';
  return String(name).trim().split(/\s+/)[0] || null;
}

/** Codes that mean this person can no longer read the chat. */
const REMOVED_CODES = ['not_allowed', 'not_found'];
export const OLDER_FAILED_LINE = 'Older messages could not be loaded. Try again in a moment.';
const OLDER_RETRY_MS = 5000;

export default function CommunityGroupChatScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const groupId = route?.params?.id ?? null;

  const [title, setTitle] = useState(route?.params?.name ?? 'Group chat');
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const newestRef = useRef(null);
  const cursorRef = useRef(null);
  const olderBusyRef = useRef(false);
  const olderFailedAtRef = useRef(0);
  const activeRef = useRef(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');

  const clearUnread = useCallback((rows) => {
    if (!activeRef.current) return; // F9: never mark unseen messages as read
    const newest = rows[0]?.id ?? null;
    if (newest === newestRef.current) return;
    newestRef.current = newest;
    markGroupRead(groupId).catch(() => { /* the count clears on the next read */ });
  }, [groupId]);

  // `quiet` is a refocus after the first load: no skeleton, the thread on
  // screen is merged with the newest page (as the Hub does on return), and a
  // passing failure leaves what is there. Only a removal ends the chat view.
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!groupId) return;
    if (!quiet) setLoading(true);
    try {
      const [page, group] = await Promise.all([
        loadGroupMessages(groupId, { limit: GROUP_CHAT_PAGE_SIZE }),
        getGroup(groupId).catch(() => null),
      ]);
      if (group?.name) setTitle(group.name);
      setIsAdmin(group?.myRole === 'admin');
      if (quiet) {
        setMessages((prev) => {
          const merged = mergeNewestPage(prev, cursorRef.current, page);
          cursorRef.current = merged.cursor;
          setCursor(merged.cursor);
          return merged.messages;
        });
      } else {
        setMessages(page.messages);
        setCursor(page.cursor);
        cursorRef.current = page.cursor;
      }
      setErrorCode(null);
      clearUnread(page.messages);
    } catch (e) {
      const code = e?.code ?? 'unavailable';
      if (!quiet || REMOVED_CODES.includes(code)) setErrorCode(code);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [groupId, clearUnread]);

  /** The quiet re-read: no spinner, and what is on screen stays if it fails. */
  const poll = useCallback(async () => {
    if (!groupId) return;
    if (!activeRef.current) return;
    try {
      const page = await loadGroupMessages(groupId, { limit: GROUP_CHAT_PAGE_SIZE });
      setMessages((prev) => {
        const merged = mergeNewestPage(prev, cursorRef.current, page);
        cursorRef.current = merged.cursor;
        setCursor(merged.cursor);
        return merged.messages;
      });
      clearUnread(page.messages);
    } catch (e) {
      // A removed member must see the removed state, not stale messages
      // and a composer (audit 2026-10-17, item 7). Any other failure is
      // transient: what is on screen stays.
      if (REMOVED_CODES.includes(e?.code)) setErrorCode(e.code);
    }
  }, [groupId, clearUnread]);

  const focusedOnceRef = useRef(false);
  useFocusEffect(useCallback(() => {
    // First focus shows the skeleton; every later focus reloads quietly.
    load({ quiet: focusedOnceRef.current });
    focusedOnceRef.current = true;
    const timer = setInterval(() => { poll(); }, GROUP_CHAT_POLL_MS);
    const sub = AppState.addEventListener('change', (next) => {
      activeRef.current = next === 'active';
      if (next === 'active') poll(); // catches up, and marks read now it is seen
    });
    return () => { clearInterval(timer); sub?.remove?.(); };
  }, [load, poll]));

  const loadOlder = useCallback(async () => {
    if (!cursor || !groupId || olderBusyRef.current) return;
    if (Date.now() - olderFailedAtRef.current < OLDER_RETRY_MS) return;
    olderBusyRef.current = true; // F2: one page request in flight at a time
    try {
      const page = await loadGroupMessages(groupId, { cursor, limit: GROUP_CHAT_PAGE_SIZE });
      setMessages((prev) => appendOlderPage(prev, page.messages));
      cursorRef.current = page.cursor;
      setCursor(page.cursor);
    } catch (_e) {
      // Keep the cursor so the next scroll can try again; say so once
      // (audit 2026-10-17, item 6).
      olderFailedAtRef.current = Date.now();
      toast.show(OLDER_FAILED_LINE, { variant: 'error' });
    } finally {
      olderBusyRef.current = false;
    }
  }, [cursor, groupId, toast]);

  async function handleSend(body) {
    try {
      await sendGroupMessage(groupId, body);
      await poll();
      return true;
    } catch (e) {
      const code = e?.code ?? 'unavailable';
      if (code === 'rules_outdated') {
        navigation.navigate('CommunityRules', { mustAccept: true });
        return false;
      }
      toast.show(groupSendErrorLine(code), { variant: 'error' });
      return false;
    }
  }

  function confirmDelete(message) {
    appAlert('Delete this message?', 'It is removed for everyone in the group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroupMessage(message.id);
            setMessages((prev) => prev.filter((m) => m.id !== message.id));
          } catch (_e) {
            toast.show('That did not delete. Please try again.', { variant: 'error' });
          }
        },
      },
    ]);
  }

  function onMessageOptions(message) {
    haptics.selection();
    const report = () => setReportTarget({ targetKind: 'group_message', targetId: message.id });
    if (message.mine) {
      confirmDelete(message);
    } else if (isAdmin) {
      appAlert('This message', 'You can remove it for everyone, or report it to the moderators.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', onPress: report },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(message) },
      ]);
    } else {
      report();
    }
  }

  if (!groupId) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={title} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading && !messages.length ? (
          <View style={[styles.skeletonThread, { paddingHorizontal: t.screenPadding }]}>
            <Skeleton width="52%" height={40} radius={radius.lg} style={styles.bubbleLeft} />
            <Skeleton width={96} height={28} radius={radius.lg} style={styles.bubbleRight} />
            <Skeleton width="60%" height={52} radius={radius.lg} style={styles.bubbleLeft} />
            <Skeleton width="38%" height={28} radius={radius.lg} style={styles.bubbleRight} />
          </View>
        ) : errorCode ? (
          <View style={[styles.centre, { paddingHorizontal: t.screenPadding }]}>
            <EmptyState
              icon="cloud-offline-outline"
              title="Not available"
              text={groupChatErrorLine(errorCode)}
              actionLabel="Try again"
              onAction={load}
              actionAccessibilityLabel="Try opening this chat again"
            />
          </View>
        ) : (
          <FlashList
            inverted
            data={messages}
            keyExtractor={(item) => String(item.id)}
            estimatedItemSize={72}
            contentContainerStyle={[styles.list, { paddingHorizontal: t.screenPadding }]}
            onEndReachedThreshold={0.4}
            onEndReached={loadOlder}
            ListEmptyComponent={(
              <Text style={[styles.emptyLine, { color: t.colors.textMuted }]}>
                No messages yet. Say hello to the group.
              </Text>
            )}
            renderItem={({ item, index }) => {
              const older = messages[index + 1] ?? null;
              const boundary = !older || dayKeyOf(older.created_at) !== dayKeyOf(item.created_at);
              return (
                <MessageBubble
                  message={item}
                  dayLabel={boundary ? postDayLabel(item.created_at) : null}
                  senderName={senderFirst(item.author)}
                  onLongPress={() => onMessageOptions(item)}
                />
              );
            }}
          />
        )}
        {!errorCode ? (
          <MessageComposer
            placeholder="Write to the group"
            onSend={handleSend}
            maxLength={GROUP_MESSAGE_MAX}
          />
        ) : null}
      </KeyboardAvoidingView>
      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetKind={reportTarget?.targetKind ?? 'profile'}
        targetId={reportTarget?.targetId ?? null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centre: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  skeletonThread: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg, gap: spacing.sm },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  list: { padding: spacing.lg },
  emptyLine: { ...type.caption, textAlign: 'center', paddingVertical: spacing.xl },
});
