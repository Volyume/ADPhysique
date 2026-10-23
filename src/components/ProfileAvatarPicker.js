import { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type, withAlpha, alpha, iconSize } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import useTheme from '../hooks/useTheme';
import BottomSheet from './BottomSheet';
import ProfileAvatarMark from './ProfileAvatarMark';
import { appAlert } from './AppAlert';
import { useToast } from './Toast';
import { settingsStyles, useSettingsStyles } from './SettingsPrimitives';
import { saveAvatarPhoto, deleteAvatarPhoto } from '../lib/profileAvatar';
import { AVATAR_PRESETS, avatarPresetFor } from '../lib/profileAvatarPresets';
import { logError } from '../lib/errorLog';

let ImagePicker;
try { ImagePicker = require('expo-image-picker'); } catch (_) { ImagePicker = null; }

/**
 * The profile picture row and its sheet (photo from the phone, a Volyume
 * avatar, or clear). Moved here from the retired Athlete profile screen under
 * D231; same storage (profileAvatar.js, the user profile's avatarUri and
 * avatarPreset through saveLocalProfile) and the same copy. It only reads and
 * writes the person's own picture; nothing here touches weight, food or any
 * safety read.
 *
 * @param {object} props
 * @param {string} props.userId
 * @param {object} props.userProfile  the stored profile, merged into on every save
 * @param {Function} props.saveLocalProfile  (userId, profile) => Promise
 * @param {string} props.displayName  only for the initial inside the mark
 */
export default function ProfileAvatarPicker({ userId, userProfile, saveLocalProfile, displayName }) {
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const t = useTheme();
  const settingsLive = useSettingsStyles();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  const avatarUri = userProfile?.avatarUri || null;
  const avatarPreset = userProfile?.avatarPreset || null;
  const avatarPresetConfig = avatarPreset ? avatarPresetFor(avatarPreset) : null;

  async function pickAvatar() {
    if (!ImagePicker || !userId) {
      // P-16: a missing native module reads as "this device can't do this",
      // never as "you're on an incomplete build".
      toast.show("Profile pictures aren't available on your device.", { variant: 'warning' });
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = await saveAvatarPhoto(userId, result.assets[0].uri, avatarUri);
      await saveLocalProfile(userId, { ...(userProfile || {}), avatarUri: uri, avatarPreset: null });
      setSheetOpen(false);
      toast.show('Profile picture updated', { variant: 'success' });
    } catch (e) {
      logError('ProfileAvatarPicker.pickAvatar', e, { userId });
      toast.show("Couldn't update profile picture", { variant: 'error' });
    }
  }

  async function applyAvatarPreset(presetKey) {
    if (!userId) return;
    try {
      if (avatarUri) await deleteAvatarPhoto(userId, avatarUri);
      await saveLocalProfile(userId, { ...(userProfile || {}), avatarUri: null, avatarPreset: avatarPresetFor(presetKey).key });
      setSheetOpen(false);
      toast.show('Avatar updated', { variant: 'success' });
    } catch (e) {
      logError('ProfileAvatarPicker.applyAvatarPreset', e, { userId });
      toast.show("Couldn't update avatar", { variant: 'error' });
    }
  }

  function removeAvatar() {
    if ((!avatarUri && !avatarPreset) || !userId) return;
    appAlert('Remove profile picture?', 'This clears the photo or Volyume avatar from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            if (avatarUri) await deleteAvatarPhoto(userId, avatarUri);
            await saveLocalProfile(userId, { ...(userProfile || {}), avatarUri: null, avatarPreset: null });
            setSheetOpen(false);
          } catch (e) {
            logError('ProfileAvatarPicker.removeAvatar', e, { userId });
            toast.show("Couldn't remove profile picture", { variant: 'error' });
          }
        },
      },
    ]);
  }

  const rowSub = avatarUri
    ? 'Your photo'
    : avatarPresetConfig
      ? `${avatarPresetConfig.label} avatar`
      : 'Add a photo or a Volyume avatar';

  return (
    <>
      <TouchableOpacity
        style={[settingsStyles.settingRow, settingsLive.settingRow, styles.row]}
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={avatarUri
          ? 'Profile picture. Tap to update.'
          : avatarPresetConfig
            ? `${avatarPresetConfig.label} avatar. Tap to update.`
            : 'Add profile picture or Volyume avatar'}
        accessibilityHint="Opens photo and avatar choices"
      >
        <ProfileAvatarMark
          avatarUri={avatarUri}
          presetKey={avatarPreset}
          displayName={displayName}
          size={56}
          editable
        />
        <View style={styles.rowCopy}>
          <Text style={[settingsStyles.settingLabel, settingsLive.settingLabel]}>Profile picture</Text>
          <Text style={[settingsStyles.settingSub, settingsLive.settingSub]}>{rowSub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
      </TouchableOpacity>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        accessibilityLabel="Select avatar"
      >
        <View style={styles.sheetHeader}>
          <View style={styles.sheetCopy}>
            <Text style={[styles.sheetTitle, live.sheetTitle]}>Profile picture</Text>
            <Text style={[styles.sheetIntro, live.sheetIntro]}>Choose a photo from your phone or pick a Volyume avatar.</Text>
          </View>
          {avatarUri || avatarPreset ? (
            <TouchableOpacity
              style={[styles.clearButton, live.clearButton]}
              onPress={removeAvatar}
              accessibilityRole="button"
              accessibilityLabel="Clear current avatar"
            >
              <Text style={[styles.clearText, live.clearText]}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.photoOption, live.photoOption]}
          onPress={pickAvatar}
          accessibilityRole="button"
          accessibilityLabel={avatarUri ? 'Change profile photo' : 'Choose profile photo'}
        >
          <View style={[styles.photoOptionIcon, live.photoOptionIcon]}>
            <Ionicons name="image-outline" size={20} color={t.colors.primary} />
          </View>
          <View style={styles.photoOptionCopy}>
            <Text style={[styles.photoOptionTitle, live.photoOptionTitle]}>Photo from phone</Text>
            <Text style={[styles.photoOptionSub, live.photoOptionSub]}>{avatarUri ? 'Replace your current photo.' : 'Use your own profile picture.'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.galleryLabel, live.galleryLabel]}>Choose an avatar</Text>
        <View style={styles.presetGrid}>
          {AVATAR_PRESETS.map((preset) => {
            const selected = avatarPreset === preset.key && !avatarUri;
            return (
              <TouchableOpacity
                key={preset.key}
                style={[styles.presetOption, live.presetOption, selected && [styles.presetOptionSelected, live.presetOptionSelected]]}
                onPress={() => applyAvatarPreset(preset.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${preset.label} avatar`}
              >
                <ProfileAvatarMark
                  presetKey={preset.key}
                  displayName={displayName}
                  size={62}
                  selected={selected}
                />
                <Text style={[styles.presetOptionText, live.presetOptionText, selected && [styles.presetOptionTextSelected, live.presetOptionTextSelected]]} numberOfLines={2}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touchTarget.minimum },
  rowCopy: { flex: 1, minWidth: 0 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sheetCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  sheetTitle: { ...type.h3, color: colors.textPrimary },
  sheetIntro: { ...type.bodySm, color: colors.textSecondary },
  clearButton: {
    minHeight: touchTarget.minimum,
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.error, alpha.edge),
    backgroundColor: colors.errorBg,
  },
  clearText: { ...type.label, color: colors.error },
  galleryLabel: { ...type.label, color: colors.textSecondary },
  photoOption: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  photoOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
  },
  photoOptionCopy: { flex: 1, minWidth: 0 },
  photoOptionTitle: { ...type.bodyStrong, color: colors.textPrimary },
  photoOptionSub: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  presetOption: {
    flexBasis: '30.5%',
    minWidth: 86,
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  presetOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  presetOptionText: { ...type.captionTight, color: colors.textSecondary, textAlign: 'center' },
  presetOptionTextSelected: { color: colors.textPrimary },
});

// Live theme: mirrors only the colour and type bearing keys of `styles`, at
// identical rest values (the pattern the Athlete profile screen used).
function buildLiveStyles(t) {
  return {
    sheetTitle: { ...t.type.h3, color: t.colors.textPrimary },
    sheetIntro: { ...t.type.bodySm, color: t.colors.textSecondary },
    clearButton: { borderColor: withAlpha(t.colors.error, alpha.edge), backgroundColor: t.colors.errorBg },
    clearText: { ...t.type.label, color: t.colors.error },
    galleryLabel: { ...t.type.label, color: t.colors.textSecondary },
    photoOption: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    photoOptionIcon: { backgroundColor: t.colors.primaryBg },
    photoOptionTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    photoOptionSub: { ...t.type.caption, color: t.colors.textSecondary },
    presetOption: { borderColor: t.colors.borderSubtle, backgroundColor: t.colors.surface },
    presetOptionSelected: { borderColor: t.colors.primary, backgroundColor: t.colors.surfaceElevated },
    presetOptionText: { ...t.type.captionTight, color: t.colors.textSecondary },
    presetOptionTextSelected: { color: t.colors.textPrimary },
  };
}
