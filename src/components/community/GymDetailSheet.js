/**
 * GymDetailSheet (community product audit 2026-09-07, founder brief
 * "COMMUNITY ONBOARDING — SLICK 'WHERE DO YOU TRAIN?' GYM FINDER").
 *
 * The confirmation sheet a tapped gym row opens before it is ever
 * selected: gym name, full address, town, postcode, and "Visit website"
 * ONLY when `officialWebsite()` (`src/lib/gyms/website.js`) says the
 * site is safe to offer - a venue that fails either of that helper's
 * gates gets no website action at all, never a placeholder or a dead
 * link. "Select this gym" is the one primary action (visual rulings V2,
 * V16: full width, last); the address/website never dominate it.
 *
 * On open, this fetches the full venue with `get(id)` for the fields the
 * row list never carries (address line, postcode, website). Confirming
 * hands the CALLER the row's own venue merged with whatever `get()`
 * returned (the row's `distance_m`/`reasons` win, since `get()` does not
 * return them) - so a venue picked straight from "Add your gym", which
 * only ever carries an id, still lands with a full name, town and
 * outward code once selected, and every downstream "Your main gym" /
 * "Trains at" summary has what it needs without a second fetch.
 *
 * A failed or slow fetch never blocks the choice: whatever the row
 * already carried (name, town, outward) stays on screen, "Select this
 * gym" keeps working throughout, and the address/postcode/website
 * sections simply do not appear until (or unless) the fetch lands.
 *
 * Props:
 *   visible    controlled, like every sheet in the app
 *   venue      the row that was tapped: at least {id}, usually also
 *              {display_name, name, town, outward, distance_m, brand}
 *   onClose    dismiss without selecting
 *   onConfirm  (venue) the enriched venue, once "Select this gym" fires
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import BottomSheet from '../BottomSheet';
import ModalHeader from '../ModalHeader';
import Button from '../Button';
import { spacing, type, colors } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { get as getGym, venueLine } from '../../lib/gyms';
import { officialWebsite } from '../../lib/gyms/website';

export default function GymDetailSheet({ visible, venue, onClose, onConfirm }) {
  const t = useTheme();
  const [full, setFull] = useState(null);
  const [loading, setLoading] = useState(false);

  // A fresh fetch every time a different venue opens; nothing about a
  // previous gym's address/website should linger onto the next one.
  useEffect(() => {
    if (!visible || !venue?.id) { setFull(null); setLoading(false); return undefined; }
    let alive = true;
    setFull(null);
    setLoading(true);
    getGym(venue.id)
      .then((data) => { if (alive) setFull(data); })
      .catch(() => { /* offline or transient: the sheet stays usable on what the row already had */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [visible, venue?.id]);

  if (!venue) return null;

  // The row's own distance/reasons survive the merge; get() carries
  // neither (see header), so a blind spread would silently null them out.
  const shown = full
    ? { ...venue, ...full, distance_m: venue.distance_m ?? full.distance_m, reasons: venue.reasons }
    : venue;
  const name = venueLine(shown).primary || 'This gym';
  const placeLine = [shown.town, shown.outward].filter(Boolean).join(' · ');
  const website = officialWebsite(shown);

  function confirm() {
    onConfirm?.(shown);
  }

  function visitWebsite() {
    Linking.openURL(website).catch(() => {});
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Gym details">
      <View style={styles.headerBleed}>
        <ModalHeader title="This gym" onClose={onClose} />
      </View>
      <View style={styles.body}>
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
            {name}
          </Text>
          {shown.address_line ? (
            <Text style={[styles.line, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              {shown.address_line}
            </Text>
          ) : null}
          {placeLine ? (
            <Text style={[styles.line, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              {placeLine}
            </Text>
          ) : null}
          {shown.postcode ? (
            <Text style={[styles.line, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              {shown.postcode}
            </Text>
          ) : null}
          {loading && !full ? (
            <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
              Loading the address
            </Text>
          ) : null}
        </View>

        {website ? (
          <Button
            variant="secondary"
            size="sm"
            fullWidth={false}
            icon="open-outline"
            title="Visit website"
            onPress={visitWebsite}
            accessibilityLabel="Visit website, opens outside Volyume"
          />
        ) : null}

        <Button
          variant="primary"
          title="Select this gym"
          onPress={confirm}
          accessibilityLabel={`Select ${name}`}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerBleed: { marginHorizontal: -spacing.lg, marginBottom: spacing.xs },
  body: { gap: spacing.md, paddingBottom: spacing.md },
  nameBlock: { gap: spacing.xxs },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  line: { ...type.bodySm, color: colors.textSecondary },
  hint: { ...type.caption, color: colors.textMuted },
});
