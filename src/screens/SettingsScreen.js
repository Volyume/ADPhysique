import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { supabase, signOut, getUserProfile } from '../lib/supabase';
import useAppStore from '../store/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

function SettingRow({ icon, label, value, onPress, destructive, rightElement, showArrow = true }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress && !rightElement}>
      <View style={[styles.settingIcon, destructive && styles.settingIconDestructive]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.error : colors.primary} />
      </View>
      <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>{label}</Text>
      <View style={styles.settingRight}>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
        {rightElement}
        {showArrow && onPress && !rightElement ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen({ navigation }) {
  const { user, userProfile, setUser, setSession, units, setUnits, barWeight, setBarWeight } =
    useAppStore();
  const [notifications, setNotifications] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (user?.id) {
      getUserProfile(user.id).then(({ data }) => {
        if (data) setProfile(data);
      });
    }
  }, [user?.id]);

  async function handleSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (!user?.isLocal) {
            await signOut().catch(() => {});
          }
          await AsyncStorage.removeItem('@volyume_local_user_id');
          setUser(null);
          setSession(null);
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This will permanently delete all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            if (!user?.isLocal) {
              await supabase.rpc('delete_user_data').catch(() => {});
              await signOut().catch(() => {});
            }
            await AsyncStorage.removeItem('@volyume_local_user_id');
            setUser(null);
            setSession(null);
          },
        },
      ],
    );
  }

  async function exportData() {
    Alert.alert('Export coming soon', 'CSV export will be available in the next update.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.email?.[0] || 'V').toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileMeta}>
              {profile?.training_focus
                ? profile.training_focus.charAt(0).toUpperCase() + profile.training_focus.slice(1).replace('_', ' ')
                : 'Bodybuilder'}
              {profile?.training_age ? ` · ${profile.training_age}+ yrs` : ''}
            </Text>
          </View>
        </View>

        {/* Training */}
        <SectionHeader title="TRAINING" />
        <View style={styles.section}>
          <SettingRow
            icon="barbell-outline"
            label="Routines"
            onPress={() => navigation.navigate('RoutineBuilder')}
          />
          <SettingRow
            icon="calendar-outline"
            label="Mesocycles"
            onPress={() => navigation.navigate('MesocycleBuilder')}
          />
          <SettingRow
            icon="fitness-outline"
            label="Volume Landmarks"
            onPress={() => navigation.navigate('AnalyticsTab', { screen: 'VolumeHeatmap' })}
          />
        </View>

        {/* Preferences */}
        <SectionHeader title="PREFERENCES" />
        <View style={styles.section}>
          <SettingRow
            icon="scale-outline"
            label="Weight units"
            value={units}
            onPress={() =>
              Alert.alert('Weight units', 'Choose your preferred unit', [
                { text: 'kg', onPress: () => setUnits('kg') },
                { text: 'lbs', onPress: () => setUnits('lbs') },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          />
          <SettingRow
            icon="barbell"
            label="Bar weight"
            value={`${barWeight}kg`}
            onPress={() =>
              Alert.alert('Bar weight', 'Standard (20kg) or other?', [
                { text: '15 kg', onPress: () => setBarWeight(15) },
                { text: '20 kg', onPress: () => setBarWeight(20) },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          />
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            showArrow={false}
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
                thumbColor={notifications ? colors.primary : colors.textMuted}
              />
            }
          />
        </View>

        {/* Data */}
        <SectionHeader title="DATA & PRIVACY" />
        <View style={styles.section}>
          <SettingRow
            icon="download-outline"
            label="Export my data (CSV)"
            onPress={exportData}
          />
          <SettingRow
            icon="refresh-outline"
            label="Reset volume landmarks"
            onPress={() => navigation.navigate('AnalyticsTab', { screen: 'VolumeHeatmap' })}
          />
        </View>

        {/* Account */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.section}>
          <SettingRow
            icon="log-out-outline"
            label="Sign out"
            destructive
            onPress={handleSignOut}
          />
          <SettingRow
            icon="trash-outline"
            label="Delete account"
            destructive
            onPress={handleDeleteAccount}
          />
        </View>

        {/* About */}
        <View style={styles.about}>
          <Text style={styles.appName}>Volyume</Text>
          <Text style={styles.appVersion}>v1.0.0 · Free during beta</Text>
          <Text style={styles.tagline}>Intelligent Hypertrophy Logbook</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryBg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  profileInfo: { flex: 1 },
  profileEmail: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  profileMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDestructive: { backgroundColor: colors.errorBg },
  settingLabel: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },
  settingLabelDestructive: { color: colors.error },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: { fontSize: fontSize.sm, color: colors.textSecondary },
  about: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  appName: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary, letterSpacing: 2 },
  appVersion: { fontSize: fontSize.sm, color: colors.textMuted },
  tagline: { fontSize: fontSize.xs, color: colors.textMuted },
});
