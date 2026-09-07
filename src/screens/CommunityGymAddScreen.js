/**
 * CommunityGymAddScreen (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## App"; GD-11).
 *
 * "Can't find your gym? Add it." Name, address line, town, postcode
 * (checked against the UK postcode pattern before it is ever sent to the
 * server), optional website and operator. A duplicate found at
 * submission (GD-06) is offered back rather than silently creating a
 * second row for the same venue: "Use this gym" selects the existing one
 * instead. A genuine new submission is `pending` until a second
 * independent person confirms it or a moderator verifies it (GD-11);
 * this screen selects it immediately for its own submitter and says so
 * in calm, plain terms.
 *
 * Route params:
 *   typed     whatever text was already typed in the search field, so
 *             the name field starts pre-filled rather than empty.
 *   onSelect  optional (venue) callback the caller pushed this route
 *             with, so the picker that opened this can receive the
 *             result directly rather than re-reading navigation state.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import { colors, spacing, type } from '../styles/theme';
import { submit, isFullPostcode, normalisePostcode } from '../lib/gyms';

const NAME_MAX = 80;
const ADDRESS_MAX = 120;
const TOWN_MAX = 60;
const WEBSITE_MAX = 200;
const OPERATOR_MAX = 60;

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  rate_limited: 'That is a lot of new gyms for one day. Try again tomorrow.',
  invalid_postcode: 'Check the postcode, then try again.',
  invalid: 'Check what you have typed, then try again.',
};

export default function CommunityGymAddScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const typed = route?.params?.typed ?? '';
  const onSelect = route?.params?.onSelect ?? null;

  const [name, setName] = useState(typed);
  const [addressLine, setAddressLine] = useState('');
  const [town, setTown] = useState('');
  const [postcode, setPostcode] = useState('');
  const [website, setWebsite] = useState('');
  const [operator, setOperator] = useState('');
  const [busy, setBusy] = useState(false);
  // { id, displayName } once gyms_submit answers back a duplicate.
  const [duplicate, setDuplicate] = useState(null);

  const postcodeValid = isFullPostcode(postcode);
  const canSubmit = name.trim().length > 0
    && addressLine.trim().length > 0
    && town.trim().length > 0
    && postcodeValid
    && !busy;

  function selectVenue(id) {
    onSelect?.({ id });
    navigation.goBack();
  }

  async function send() {
    if (!canSubmit) return;
    setBusy(true);
    setDuplicate(null);
    try {
      const out = await submit({
        name,
        addressLine,
        town,
        postcode: normalisePostcode(postcode) ?? postcode,
        website: website.trim() || null,
        operator: operator.trim() || null,
      });
      if (out.duplicate) {
        setDuplicate({ id: out.id, displayName: out.displayName });
        return;
      }
      toast.show('Added. It shows for everyone once a second person confirms it.');
      selectVenue(out.id);
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not add that gym just now.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Add your gym" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {duplicate ? (
          <Card style={styles.block}>
            <Text style={[styles.blockTitle, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
              {`Did you mean ${duplicate.displayName}?`}
            </Text>
            <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              This looks like a gym already in the directory.
            </Text>
            <View style={styles.cardActions}>
              <Button
                variant="primary"
                size="sm"
                fullWidth={false}
                title="Use this gym"
                onPress={() => selectVenue(duplicate.id)}
                accessibilityLabel={`Use ${duplicate.displayName}`}
              />
              <Button
                variant="tertiary"
                size="sm"
                fullWidth={false}
                title="Add it anyway"
                onPress={() => setDuplicate(null)}
                accessibilityLabel="Add a new gym anyway"
              />
            </View>
          </Card>
        ) : (
          <>
            <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              Only you can see it as soon as you add it. It shows for everyone once a second person
              confirms it, or a moderator verifies it.
            </Text>

            <TextField
              label="Gym name"
              size="sm"
              value={name}
              onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
              accessibilityLabel="Gym name"
            />
            <TextField
              label="Address line"
              size="sm"
              value={addressLine}
              onChangeText={(v) => setAddressLine(v.slice(0, ADDRESS_MAX))}
              accessibilityLabel="Address line"
            />
            <TextField
              label="Town"
              size="sm"
              value={town}
              onChangeText={(v) => setTown(v.slice(0, TOWN_MAX))}
              accessibilityLabel="Town"
            />
            <View style={styles.field}>
              <TextField
                label="Postcode"
                size="sm"
                value={postcode}
                onChangeText={(v) => setPostcode(v.toUpperCase())}
                autoCapitalize="characters"
                accessibilityLabel="Postcode"
              />
              {postcode.trim().length > 0 && !postcodeValid ? (
                <Text style={[styles.error, { ...t.type.caption, color: t.colors.error }]}>
                  That does not look like a UK postcode.
                </Text>
              ) : null}
            </View>
            <TextField
              label="Website (optional)"
              size="sm"
              value={website}
              onChangeText={(v) => setWebsite(v.slice(0, WEBSITE_MAX))}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Website"
            />
            <TextField
              label="Operator (optional)"
              size="sm"
              value={operator}
              onChangeText={(v) => setOperator(v.slice(0, OPERATOR_MAX))}
              accessibilityLabel="Operator"
            />

            <Button
              variant="primary"
              title="Add gym"
              disabled={!canSubmit}
              loading={busy}
              onPress={send}
              accessibilityLabel="Add this gym"
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  block: { gap: spacing.sm },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  blockTitle: { ...type.bodyStrong, color: colors.textPrimary },
  hint: { ...type.bodySm, color: colors.textSecondary },
  field: { gap: spacing.xs },
  error: { ...type.caption, color: colors.error },
});
