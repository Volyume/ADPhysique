/**
 * PeopleFiltersSheet (community-product-audit-2026-09-07
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.3; migration 163, spec 1.1 C).
 *
 * The combinable filters over `community_find_people`: Where (my gym,
 * near me at a mile band, anywhere), When (days, time bands), Training
 * (styles, goal, experience band), "Open to training together", and an
 * Age band row that only exists at all when the caller shares their own
 * band (a caller with none has nothing of their own to filter by
 * either).
 *
 * Every row here is a HARD filter (spec 1.1 C): applying one narrows the
 * scored query, it never re-weights it. The sheet edits a local DRAFT
 * and only calls `onApply` on the explicit "Show results" tap, so
 * backing out with the close button changes nothing.
 *
 * Where and Age band are pick-one-OR-NONE: tapping the already-selected
 * chip clears it back to "let the door decide" / "no age filter", which
 * is why they read as `radio` chips but still support a second tap to
 * deselect -- a filter sheet's "no choice made" is a real, useful state
 * a plain single-select control does not otherwise have.
 *
 * V16 (visual rulings): `BottomSheet` with the shared `ModalHeader`; V6:
 * every pick-one control here is a `Chip` row.
 *
 * Props:
 *   visible   controlled, like every sheet in the app
 *   onClose   close without applying
 *   value     the currently APPLIED filters (normalised, or null) --
 *             seeds the draft each time the sheet opens
 *   onApply   (filters) after "Show results"; filters is whatever
 *             `normaliseFilters` answers for the draft (null when empty)
 *   me        the `community_get_me` payload: gates My gym / Near me on
 *             whether the caller has one, and Age band on whether the
 *             caller shares their own
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import BottomSheet from '../BottomSheet';
import ModalHeader from '../ModalHeader';
import Button from '../Button';
import Chip from '../Chip';
import SectionLabel from '../SectionLabel';
import useTheme from '../../hooks/useTheme';
import { spacing, type, colors, withAlpha, alpha } from '../../styles/theme';
import {
  FILTER_SCOPES, PLACE_BAND_MILES, PLACE_BAND_LABELS, normaliseFilters,
  TP_DAYS, TP_TIME_BANDS, TP_EXPERIENCE_BANDS, TP_AGE_BANDS,
  COMMUNITY_STYLE_KEYS, COMMUNITY_GOALS,
  COMMUNITY_DISCIPLINE_KEYS, COMMUNITY_DISCIPLINE_LABELS,
} from '../../lib/community';

/** Capitalised for a chip label; `TP_TIME_BANDS` reads as sentence
 * fragments ("evenings") for the training-profile preview line, which is
 * the wrong case for a standalone pick. */
const TIME_BAND_CHIP_LABELS = Object.freeze({
  morning: 'Mornings', midday: 'Midday', afternoon: 'Afternoons', evening: 'Evenings', late: 'Late',
});

function toggleSingle(current, key) {
  return current === key ? null : key;
}

function toggleMulti(list, key) {
  const arr = Array.isArray(list) ? list : [];
  return arr.includes(key) ? arr.filter((v) => v !== key) : [...arr, key];
}

/** A fresh draft from whatever is currently applied, so reopening the
 * sheet shows the choices it was closed with. */
function draftFrom(value) {
  return {
    scope: value?.scope ?? null,
    place_band_miles: value?.place_band_miles ?? '0',
    partner_only: !!value?.partner_only,
    days: Array.isArray(value?.days) ? [...value.days] : [],
    time_bands: Array.isArray(value?.time_bands) ? [...value.time_bands] : [],
    styles: Array.isArray(value?.styles) ? [...value.styles] : [],
    goal: value?.goal ?? null,
    experience_band: value?.experience_band ?? null,
    age_band: value?.age_band ?? null,
    discipline: value?.discipline ?? null,
  };
}

export default function PeopleFiltersSheet({
  visible, onClose, value = null, onApply, me = null,
}) {
  const t = useTheme();
  const [draft, setDraft] = useState(() => draftFrom(value));

  // Re-seed from what is actually applied each time the sheet opens, so
  // a cancelled edit never lingers into the next open.
  useEffect(() => {
    if (visible) setDraft(draftFrom(value));
  }, [visible, value]);

  const hasGym = !!me?.profile?.gym_label;
  const hasPlace = !!(me?.profile?.place_label || me?.profile?.area_label);
  const ownAgeBand = me?.tp_age_band ?? null;

  function set(patch) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function setScope(key) {
    const next = toggleSingle(draft.scope, key);
    set({ scope: next, place_band_miles: next === 'place' ? (draft.place_band_miles ?? '0') : '0' });
  }

  function apply() {
    onApply?.(normaliseFilters(draft));
    onClose?.();
  }

  function clearAll() {
    setDraft(draftFrom(null));
  }

  const switchColours = {
    trackColor: { false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) },
    thumbColor: t.colors.primary,
    ios_backgroundColor: t.colors.surface2,
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scroll accessibilityLabel="Filters">
      <View style={styles.headerBleed}>
        <ModalHeader title="Filters" onClose={onClose} />
      </View>

      <View style={styles.section}>
        <SectionLabel tone="muted">Where</SectionLabel>
        <View style={styles.chips} accessibilityLabel="Where">
          <Chip
            label={FILTER_SCOPES.gym}
            selected={draft.scope === 'gym'}
            disabled={!hasGym}
            accessibilityRole="radio"
            accessibilityLabel={hasGym ? FILTER_SCOPES.gym : `${FILTER_SCOPES.gym}. Add a gym on Edit profile to use this.`}
            onPress={() => setScope('gym')}
          />
          <Chip
            label={FILTER_SCOPES.place}
            selected={draft.scope === 'place'}
            disabled={!hasPlace}
            accessibilityRole="radio"
            accessibilityLabel={hasPlace ? FILTER_SCOPES.place : `${FILTER_SCOPES.place}. Add a place on Edit profile to use this.`}
            onPress={() => setScope('place')}
          />
          <Chip
            label={FILTER_SCOPES.any}
            selected={draft.scope === 'any'}
            accessibilityRole="radio"
            onPress={() => setScope('any')}
          />
        </View>
        {draft.scope === 'place' ? (
          <View style={styles.chips} accessibilityLabel="Distance">
            {PLACE_BAND_MILES.map((band) => (
              <Chip
                key={band}
                label={PLACE_BAND_LABELS[band]}
                selected={(draft.place_band_miles ?? '0') === band}
                accessibilityRole="radio"
                onPress={() => set({ place_band_miles: band })}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionLabel tone="muted">When</SectionLabel>
        <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>Days</Text>
        <View style={styles.chips} accessibilityLabel="Days">
          {Object.entries(TP_DAYS).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              selected={draft.days.includes(key)}
              onPress={() => set({ days: toggleMulti(draft.days, key) })}
            />
          ))}
        </View>
        <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>Times</Text>
        <View style={styles.chips} accessibilityLabel="Times">
          {Object.keys(TP_TIME_BANDS).map((key) => (
            <Chip
              key={key}
              label={TIME_BAND_CHIP_LABELS[key]}
              selected={draft.time_bands.includes(key)}
              onPress={() => set({ time_bands: toggleMulti(draft.time_bands, key) })}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel tone="muted">Training</SectionLabel>
        <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>Styles</Text>
        <View style={styles.chips} accessibilityLabel="Training styles">
          {Object.entries(COMMUNITY_STYLE_KEYS).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              selected={draft.styles.includes(key)}
              onPress={() => set({ styles: toggleMulti(draft.styles, key) })}
            />
          ))}
        </View>
        <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>Goal</Text>
        <View style={styles.chips} accessibilityLabel="Goal">
          {Object.entries(COMMUNITY_GOALS).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              selected={draft.goal === key}
              accessibilityRole="radio"
              onPress={() => set({ goal: toggleSingle(draft.goal, key) })}
            />
          ))}
        </View>
        <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>Experience</Text>
        <View style={styles.chips} accessibilityLabel="Experience">
          {Object.entries(TP_EXPERIENCE_BANDS).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              selected={draft.experience_band === key}
              accessibilityRole="radio"
              onPress={() => set({ experience_band: toggleSingle(draft.experience_band, key) })}
            />
          ))}
        </View>
        {/* Task 8 (communities revamp 2026-09-10): single-select, with an
            explicit "Any" chip rather than the tap-again-to-clear pattern
            Goal/Experience use above -- the brief's own spec for this row. */}
        <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>Discipline</Text>
        <View style={styles.chips} accessibilityLabel="Discipline">
          <Chip
            label="Any"
            selected={!draft.discipline}
            accessibilityRole="radio"
            onPress={() => set({ discipline: null })}
          />
          {COMMUNITY_DISCIPLINE_KEYS.map((key) => (
            <Chip
              key={key}
              label={COMMUNITY_DISCIPLINE_LABELS[key]}
              selected={draft.discipline === key}
              accessibilityRole="radio"
              onPress={() => set({ discipline: key })}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { ...t.type.body, color: t.colors.textPrimary }]}>
            Open to training together
          </Text>
          <Switch
            value={draft.partner_only}
            onValueChange={(next) => set({ partner_only: next })}
            accessibilityLabel="Only people open to training together"
            {...switchColours}
          />
        </View>
      </View>

      {/* Spec 1.3: Age band chips exist only when the caller shares their
          own -- a person who has not chosen to reveal their own band has
          nothing here to filter candidates by either. */}
      {ownAgeBand ? (
        <View style={styles.section}>
          <SectionLabel tone="muted">Age band</SectionLabel>
          <View style={styles.chips} accessibilityLabel="Age band">
            {Object.entries(TP_AGE_BANDS).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={draft.age_band === key}
                accessibilityRole="radio"
                onPress={() => set({ age_band: toggleSingle(draft.age_band, key) })}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Button
          variant="tertiary"
          size="sm"
          fullWidth={false}
          title="Clear all"
          onPress={clearAll}
          accessibilityLabel="Clear all filters"
        />
        <Button
          variant="primary"
          title="Show results"
          onPress={apply}
          accessibilityLabel="Show results"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerBleed: { marginHorizontal: -spacing.lg, marginBottom: spacing.xs },
  section: { gap: spacing.xs2, marginBottom: spacing.lg },
  hint: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchLabel: { ...type.body, color: colors.textPrimary },
  footer: { gap: spacing.sm, paddingBottom: spacing.md },
});
