/**
 * CommunityGroupCreateScreen (community product audit `docs/community-
 * product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md` section 3-4;
 * server contract `community_group_create(_name, _blurb, _access)`;
 * gap-closure `40-GAP-CLOSURE.md` §1 "Group edit" adds edit mode via
 * `community_group_update(_group_id, _name, _blurb, _access)`).
 *
 * Name (<= 40), blurb (<= 140), access chips (Open / Invite only), Create.
 * Minors are refused server-side and this screen never opens for one
 * (fails closed on `me.is_minor` before it is reachable -- see the Hub's
 * "Your groups" chip row and CommunitySearchScreen's group search, the
 * two entry points).
 *
 * Edit mode: `route.params.mode === 'edit'` with `route.params.group`
 * (`{id, name, blurb, access}`, reached from the admin-only "Edit" row on
 * `CommunityGroupScreen`'s MenuSheet). Prefills the same three fields;
 * Save calls `updateGroup` and replaces back to the group instead of
 * creating a new one.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import TextField from '../components/TextField';
import Band, { BandGap, BandBody } from '../components/community/Band';
import SectionHeader from '../components/community/SectionHeader';
import Chip from '../components/Chip';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import { spacing } from '../styles/theme';
import {
  createGroup, updateGroup, GROUP_NAME_MAX, GROUP_BLURB_MAX, GROUP_ACCESS, GROUP_ACCESS_ORDER,
  GROUP_PURPOSE_LINE,
} from '../lib/community';
import { RESTRICTION_REFUSALS } from '../lib/community/restriction';

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  ...RESTRICTION_REFUSALS,
  minor_restricted: 'Groups are not available under 18.',
  invalid_input: 'Check the name and the About line, then try again.',
  rate_limited: 'That is a lot of new groups for one hour. Try again later.',
  not_found: 'This group is no longer available.',
  not_admin: 'Only an admin can edit this group.',
};

export default function CommunityGroupCreateScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const editing = route?.params?.mode === 'edit';
  const editGroup = editing ? route?.params?.group ?? null : null;
  const [name, setName] = useState(editGroup?.name ?? '');
  const [blurb, setBlurb] = useState(editGroup?.blurb ?? '');
  const [access, setAccess] = useState(editGroup?.access ?? 'open');
  const [busy, setBusy] = useState(false);

  const canSubmit = name.trim().length > 0 && name.trim().length <= GROUP_NAME_MAX && !busy
    && (!editing || !!editGroup?.id);

  async function send() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      if (editing) {
        const group = await updateGroup(editGroup.id, {
          name: name.trim(), blurb: blurb.trim() || null, access,
        });
        toast.show('Group updated.');
        navigation.replace('CommunityGroup', { id: group?.id ?? editGroup.id });
      } else {
        const group = await createGroup({ name: name.trim(), blurb: blurb.trim() || null, access });
        toast.show(`${group.name} created.`);
        navigation.replace('CommunityGroup', { id: group.id });
      }
    } catch (e) {
      const fallback = editing ? 'Could not update that group just now.' : 'Could not create that group just now.';
      toast.show(REFUSALS[e?.code] ?? fallback, { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={editing ? 'Edit group' : 'New group'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Founder order 2026-09-22 item 8 (audit A-13): what a group is
            FOR, in CREATE mode only -- an editor already knows. One
            register with the Hub's own empty-groups line
            (CommunityHubScreen.js). */}
        {!editing ? (
          <>
            <Band>
              <BandBody style={styles.purposeBody}>
                <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>{GROUP_PURPOSE_LINE}</Text>
              </BandBody>
            </Band>
            <BandGap />
          </>
        ) : null}

        <Band>
          <SectionHeader title="The group" />
          <BandBody>
            <TextField
              label="Group name"
              value={name}
              onChangeText={(v) => setName(v.slice(0, GROUP_NAME_MAX))}
              placeholder="e.g. Monday leg day crew"
              well
              accessibilityLabel="Group name"
            />
            <Text style={[t.type.caption, styles.counter, { color: t.colors.textMuted }]}>
              {`${name.length}/${GROUP_NAME_MAX}`}
            </Text>

            <TextField
              label="About this group (optional)"
              value={blurb}
              onChangeText={(v) => setBlurb(v.slice(0, GROUP_BLURB_MAX))}
              placeholder="What is this group about?"
              multiline
              well
              accessibilityLabel="About this group"
            />
            <Text style={[t.type.caption, styles.counter, { color: t.colors.textMuted }]}>
              {`${blurb.length}/${GROUP_BLURB_MAX}`}
            </Text>
          </BandBody>
        </Band>
        <BandGap />

        <Band>
          <SectionHeader title="Who can join" />
          <BandBody>
            <View style={styles.chipRow} accessibilityLabel="Access">
              {GROUP_ACCESS_ORDER.map((key) => (
                <Chip
                  key={key}
                  label={GROUP_ACCESS[key]}
                  selected={access === key}
                  accessibilityRole="radio"
                  onPress={() => setAccess(key)}
                />
              ))}
            </View>
            <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
              {access === 'open'
                ? 'Anyone can join straight away.'
                : 'People request to join and an admin approves them.'}
            </Text>
          </BandBody>
        </Band>
        <BandGap />

        <Band>
          <BandBody style={styles.submitBody}>
            <Button
              variant="primary"
              title={editing ? 'Save' : 'Create'}
              disabled={!canSubmit}
              loading={busy}
              onPress={send}
              accessibilityLabel={editing ? 'Save group' : 'Create group'}
            />
          </BandBody>
        </Band>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
  purposeBody: { paddingTop: spacing.md },
  submitBody: { paddingTop: spacing.md },
  counter: { textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
});
