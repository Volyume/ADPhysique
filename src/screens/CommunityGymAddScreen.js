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
import { View, StyleSheet, ScrollView } from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../components/BackHeader';
import Band, { BandGap, BandBody } from '../components/community/Band';
import SectionHeader from '../components/community/SectionHeader';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import { spacing } from '../styles/theme';
import { submit, isFullPostcode, normalisePostcode } from '../lib/gyms';
import { RESTRICTION_REFUSALS } from '../lib/community/restriction';

const NAME_MAX = 80;
const ADDRESS_MAX = 120;
const TOWN_MAX = 60;
const WEBSITE_MAX = 200;
const OPERATOR_MAX = 60;

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  ...RESTRICTION_REFUSALS,
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
          <Band>
            <SectionHeader title="Already in the directory" />
            <BandBody>
              <Text style={[t.type.bodyStrong, { color: t.colors.textPrimary }]}>
                {`Did you mean ${duplicate.displayName}?`}
              </Text>
              <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
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
            </BandBody>
          </Band>
        ) : (
          <>
            <Band>
              <BandBody style={styles.introBody}>
                <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
                  Only you can see it as soon as you add it. It shows for everyone once a second person
                  confirms it, or a moderator verifies it.
                </Text>
              </BandBody>
            </Band>
            <BandGap />

            <Band>
              <SectionHeader title="The gym" />
              <BandBody>
                <TextField
                  label="Gym name"
                  size="sm"
                  well
                  value={name}
                  onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
                  accessibilityLabel="Gym name"
                />
                <TextField
                  label="Address line"
                  size="sm"
                  well
                  value={addressLine}
                  onChangeText={(v) => setAddressLine(v.slice(0, ADDRESS_MAX))}
                  accessibilityLabel="Address line"
                />
                <TextField
                  label="Town"
                  size="sm"
                  well
                  value={town}
                  onChangeText={(v) => setTown(v.slice(0, TOWN_MAX))}
                  accessibilityLabel="Town"
                />
                <TextField
                  label="Postcode"
                  size="sm"
                  well
                  value={postcode}
                  onChangeText={(v) => setPostcode(v.toUpperCase())}
                  autoCapitalize="characters"
                  accessibilityLabel="Postcode"
                />
                {postcode.trim().length > 0 && !postcodeValid ? (
                  <Text style={[t.type.caption, { color: t.colors.error }]}>
                    That does not look like a UK postcode.
                  </Text>
                ) : null}
              </BandBody>
            </Band>
            <BandGap />

            <Band>
              <SectionHeader title="Optional" />
              <BandBody>
                <TextField
                  label="Website (optional)"
                  size="sm"
                  well
                  value={website}
                  onChangeText={(v) => setWebsite(v.slice(0, WEBSITE_MAX))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Website"
                />
                <TextField
                  label="Gym company (optional)"
                  size="sm"
                  well
                  value={operator}
                  onChangeText={(v) => setOperator(v.slice(0, OPERATOR_MAX))}
                  accessibilityLabel="Gym company"
                />
              </BandBody>
            </Band>
            <BandGap />

            <Band>
              <BandBody style={styles.submitBody}>
                <Button
                  variant="primary"
                  title="Add gym"
                  disabled={!canSubmit}
                  loading={busy}
                  onPress={send}
                  accessibilityLabel="Add this gym"
                />
              </BandBody>
            </Band>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  introBody: { paddingTop: spacing.md },
  submitBody: { paddingTop: spacing.md },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
});
