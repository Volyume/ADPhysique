import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { VOLUME_LANDMARKS, MUSCLE_DISPLAY_NAMES, getVolumeStatus } from '../lib/algorithms';

export default function VolumeBars({ weeklyVolume = {}, customLandmarks = null }) {
  const muscles = Object.keys(VOLUME_LANDMARKS);

  return (
    <View style={styles.container}>
      {muscles.map(muscle => {
        const data = weeklyVolume[muscle] || { workingSets: 0 };
        const sets = data.workingSets || 0;
        const { status, label, landmarks } = getVolumeStatus(sets, muscle, customLandmarks);
        const color = volumeStatusColor(status);
        const mrv = landmarks?.mrv || VOLUME_LANDMARKS[muscle]?.mrv || 20;
        const fillPct = Math.min(sets / mrv, 1);

        return (
          <View
            key={muscle}
            style={styles.row}
            accessibilityRole="text"
            accessibilityLabel={`${MUSCLE_DISPLAY_NAMES[muscle]}: ${sets} sets, ${String(label).toLowerCase()}`}
          >
            <Text style={styles.muscleName}>{MUSCLE_DISPLAY_NAMES[muscle]}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${fillPct * 100}%`, backgroundColor: color }]} />
              {landmarks && (
                <>
                  <View style={[styles.landmark, { left: `${(landmarks.mev / mrv) * 100}%` }]} />
                  <View style={[styles.landmark, { left: `${(landmarks.mav / mrv) * 100}%` }]} />
                </>
              )}
            </View>
            <Text style={[styles.setsCount, { color }]}>{sets}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muscleName: {
    width: 90,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surface3,
    borderRadius: radius.full,
    overflow: 'visible',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
    minWidth: 2,
  },
  landmark: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  setsCount: {
    width: 28,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'right',
  },
});
