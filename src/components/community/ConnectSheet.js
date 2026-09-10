/**
 * ConnectSheet (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 1,
 * 6 and 10; SD-20, SD-25)
 *
 * The request itself: up to two reasons from the fixed set, an optional
 * short note, and one button.
 *
 * The reasons are a closed set on purpose. A recipient reads "Same gym ·
 * Want to train together?" at a glance and can trust it, which free text
 * alone could never give them; the note is where anything else goes, and
 * it is short enough (120 characters) that it can never become a message
 * channel that skips the connection gate.
 *
 * Opened from the partners list, "Want to train together?" is
 * pre-selected, because that is the door the person came through (SD-25).
 *
 * Lead visual review 2026-09-06, ruling V16: `BottomSheet` with the shared
 * `ModalHeader` (title, close) in place of a bare title line; the one
 * primary action stays full width, last.
 *
 * Props:
 *   visible    controlled
 *   onClose    close the sheet
 *   card       the profile card the request is for
 *   preselect  reason keys to start selected (the partners list passes
 *              ['train_together'])
 *   onSent     (card) after the request is accepted by the server
 *   onRulesOutdated  () the rules changed and must be accepted first
 */

import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet from '../BottomSheet';
import ModalHeader from '../ModalHeader';
import Button from '../Button';
import Chip from '../Chip';
import TextField from '../TextField';
import SectionLabel from '../SectionLabel';
import { useToast } from '../Toast';
import { spacing, type, colors } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import useCommunityMe from '../../hooks/useCommunityMe';
import {
  CONNECT_REASONS, MAX_CONNECT_REASONS, CONNECT_NOTE_MAX, connect,
} from '../../lib/community';
import { connectRefusalLine } from './ConnectButton';

export const CONNECT_EXPLAINS_LINE = 'Become connected. They need to accept.';

export default function ConnectSheet({
  visible,
  onClose,
  card,
  preselect = [],
  onSent,
  onRulesOutdated,
}) {
  const t = useTheme();
  const toast = useToast();
  const { me } = useCommunityMe();
  const [reasons, setReasons] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Phase 3 (spec section 7): "Same discipline" shows only when both
  // people share a discipline key -- never a reason offered on faith.
  // `same_programme` is retired outright (Community never explains
  // itself as programme sharing), so no regex hiding is needed any more:
  // `CONNECT_REASONS` itself carries only the reasons that may ever show.
  const shareDiscipline = useMemo(() => {
    const mine = new Set(me?.profile?.discipline_keys ?? []);
    return (card?.discipline_keys ?? []).some((k) => mine.has(k));
  }, [me, card]);
  const selectableReasons = useMemo(
    () => Object.entries(CONNECT_REASONS).filter(([key]) => key !== 'same_discipline' || shareDiscipline),
    [shareDiscipline],
  );

  // Each opening starts clean, with whatever the door pre-selected: a
  // note typed for one person must never travel to the next.
  useEffect(() => {
    if (!visible) return;
    setReasons(Array.isArray(preselect) ? preselect.slice(0, MAX_CONNECT_REASONS) : []);
    setNote('');
    // `preselect` is a literal at every call site, so a new array identity
    // per render must not re-clear the sheet while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function toggleReason(key) {
    setReasons((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_CONNECT_REASONS) return prev;
      return [...prev, key];
    });
  }

  async function send() {
    if (busy || !card?.user_id) return;
    setBusy(true);
    try {
      const next = await connect(card.user_id, { reasons, note: note.trim() || null });
      toast.show('Request sent');
      onSent?.(next && next.user_id ? next : { ...card, connection: 'requested_by_me' });
      onClose?.();
    } catch (e) {
      if (e?.code === 'rules_outdated' && onRulesOutdated) { onClose?.(); onRulesOutdated(); }
      else toast.show(connectRefusalLine(e?.code), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      keyboardAvoiding
      accessibilityLabel="Send a connection request"
    >
      <View style={styles.headerBleed}>
        <ModalHeader
          title={card?.handle ? `Connect with @${card.handle}` : 'Connect'}
          onClose={onClose}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.line, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          {CONNECT_EXPLAINS_LINE}
        </Text>

        <View style={styles.field}>
          <SectionLabel>Why</SectionLabel>
          <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
            {`Up to ${MAX_CONNECT_REASONS}. Optional.`}
          </Text>
          <View style={styles.chips}>
            {selectableReasons.map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={reasons.includes(key)}
                onPress={() => toggleReason(key)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <TextField
            label="Note"
            value={note}
            onChangeText={(v) => setNote(v.slice(0, CONNECT_NOTE_MAX))}
            multiline
            placeholder="Optional. A line about why you are getting in touch."
            accessibilityLabel="Note with your connection request"
          />
          <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
            {`${note.length} of ${CONNECT_NOTE_MAX}`}
          </Text>
        </View>

        <Button
          variant="primary"
          title="Send request"
          loading={busy}
          onPress={send}
          accessibilityLabel={`Send a connection request to @${card?.handle ?? ''}`.trim()}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerBleed: { marginHorizontal: -spacing.lg, marginBottom: spacing.xs },
  body: { gap: spacing.md, paddingBottom: spacing.md },
  line: { ...type.bodySm, color: colors.textSecondary },
  field: { gap: spacing.sm },
  hint: { ...type.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
});
