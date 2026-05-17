import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

// Lazy-import expo-print and expo-sharing so missing packages don't crash on import
let Print;
let Sharing;
try { Print = require('expo-print'); } catch (_) {}
try { Sharing = require('expo-sharing'); } catch (_) {}

export default function ShareCardScreen({ navigation, route }) {
  const {
    sessionData = null,
    prData = null,
  } = route.params || {};

  const [cardType, setCardType] = useState(prData ? 'pr' : 'session');
  const [format, setFormat] = useState('square');
  const [sharing, setSharing] = useState(false);

  // Session card privacy toggles
  const [showVolume, setShowVolume] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showPlanName, setShowPlanName] = useState(true);
  const [showExercises, setShowExercises] = useState(false);
  const [showWeights, setShowWeights] = useState(false);

  // PR card toggles
  const [showPRWeight, setShowPRWeight] = useState(true);
  const [showPrevBest, setShowPrevBest] = useState(false);

  const isSquare = format === 'square';
  const cardW = isSquare ? 612 : 612;
  const cardH = isSquare ? 612 : 1088;

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  function buildSessionHTML() {
    const s = sessionData || {};
    const date = showDate ? (s.date || formatDate(s.timestamp || Date.now())) : '';
    const volumeStr = showVolume
      ? `${((s.tonnage || 0) / 1000).toFixed(1)}t`
      : '';
    const planStr = showPlanName && s.planName ? s.planName : '';
    const exerciseList = showExercises && s.exercises?.length
      ? s.exercises.slice(0, 5).join(' · ')
      : '';

    const statsHtml = `
      <div style="display:flex;gap:12px;margin-top:auto;">
        <div style="flex:1;background:#252525;padding:14px;border-radius:10px;text-align:center;">
          <div style="font-size:30px;font-weight:900;color:#fff;">${s.workingSets || 0}</div>
          <div style="font-size:11px;color:#616161;margin-top:4px;letter-spacing:1px;">WORKING SETS</div>
        </div>
        <div style="flex:1;background:#252525;padding:14px;border-radius:10px;text-align:center;">
          <div style="font-size:30px;font-weight:900;color:#fff;">${s.duration || 0}m</div>
          <div style="font-size:11px;color:#616161;margin-top:4px;letter-spacing:1px;">DURATION</div>
        </div>
        ${volumeStr ? `<div style="flex:1;background:#252525;padding:14px;border-radius:10px;text-align:center;">
          <div style="font-size:30px;font-weight:900;color:#fff;">${volumeStr}</div>
          <div style="font-size:11px;color:#616161;margin-top:4px;letter-spacing:1px;">VOLUME</div>
        </div>` : ''}
      </div>
    `;

    const storyExtra = isSquare ? '' : `
      ${s.exerciseCount ? `<div style="font-size:14px;color:#9E9E9E;margin-top:16px;">${s.exerciseCount} exercises</div>` : ''}
      ${s.prCount ? `<div style="margin-top:12px;font-size:13px;color:#00E5FF;letter-spacing:1px;">${s.prCount} NEW PR${s.prCount !== 1 ? 's' : ''}</div>` : ''}
      ${exerciseList ? `<div style="font-size:12px;color:#616161;margin-top:16px;line-height:1.6;">${exerciseList}</div>` : ''}
    `;

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:${cardW}px; height:${cardH}px; background:#0D0D0D; font-family:-apple-system,Arial,sans-serif; overflow:hidden; }
  .card { width:${cardW}px; height:${cardH}px; background:linear-gradient(145deg,#111111,#1A1A1A); display:flex; flex-direction:column; padding:${isSquare ? 44 : 60}px; position:relative; }
  .accent { position:absolute; bottom:0; left:0; right:0; height:3px; background:#00E5FF; }
  .logo { font-size:13px; letter-spacing:5px; color:#616161; font-weight:700; }
  .date { font-size:12px; color:#616161; margin-top:6px; }
  .plan { font-size:11px; color:#00E5FF; letter-spacing:2px; margin-top:${isSquare ? 32 : 60}px; font-weight:700; }
  .session-name { font-size:${isSquare ? 28 : 36}px; font-weight:900; color:#fff; line-height:1.15; margin-top:10px; }
  .exercises { font-size:13px; color:#9E9E9E; margin-top:8px; line-height:1.5; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">VOLYUME</div>
  ${date ? `<div class="date">${date}</div>` : ''}
  ${planStr ? `<div class="plan">${planStr.toUpperCase()}</div>` : `<div style="margin-top:${isSquare ? 32 : 60}px;"></div>`}
  <div class="session-name">${s.sessionName || 'Session Complete'}</div>
  ${storyExtra}
  ${statsHtml}
  <div class="accent"></div>
</div>
</body>
</html>`;
  }

  function buildPRHTML() {
    const p = prData || {};
    const date = showDate ? (p.date || formatDate(p.timestamp || Date.now())) : '';
    const weightStr = showPRWeight
      ? `${p.weight || ''}${p.units || 'kg'} × ${p.reps || ''}`
      : `${p.reps || ''} reps`;
    const prevStr = showPrevBest && p.previousBest
      ? `Previous: ${p.previousBest}${p.units || 'kg'}`
      : '';

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:${cardW}px; height:${cardH}px; background:#0D0D0D; font-family:-apple-system,Arial,sans-serif; overflow:hidden; }
  .card { width:${cardW}px; height:${cardH}px; background:linear-gradient(145deg,#0D0D0D,#1A1A1A); display:flex; flex-direction:column; padding:${isSquare ? 44 : 60}px; position:relative; justify-content:center; }
  .accent { position:absolute; bottom:0; left:0; right:0; height:3px; background:#00E5FF; }
  .accent-top { position:absolute; top:0; left:0; right:0; height:3px; background:#00E5FF; }
  .logo { position:absolute; top:${isSquare ? 44 : 60}px; left:${isSquare ? 44 : 60}px; font-size:13px; letter-spacing:5px; color:#616161; font-weight:700; }
  .pr-label { font-size:11px; letter-spacing:4px; color:#00E5FF; font-weight:700; }
  .exercise { font-size:${isSquare ? 28 : 36}px; font-weight:900; color:#fff; margin-top:16px; line-height:1.15; }
  .weight { font-size:${isSquare ? 56 : 72}px; font-weight:900; color:#00E5FF; margin-top:12px; line-height:1; }
  .date-prev { font-size:14px; color:#616161; margin-top:20px; }
</style>
</head>
<body>
<div class="card">
  <div class="accent-top"></div>
  <div class="logo">VOLYUME</div>
  <div class="pr-label">NEW PERSONAL RECORD</div>
  <div class="exercise">${p.exerciseName || ''}</div>
  <div class="weight">${weightStr}</div>
  <div class="date-prev">
    ${date ? date : ''}
    ${prevStr ? (date ? ' &nbsp;·&nbsp; ' : '') + prevStr : ''}
  </div>
  <div class="accent"></div>
</div>
</body>
</html>`;
  }

  async function handleShare() {
    if (!Print || !Sharing) {
      Alert.alert(
        'Sharing unavailable',
        'Install expo-print and expo-sharing, then rebuild the app.',
      );
      return;
    }

    setSharing(true);
    try {
      const html = cardType === 'pr' ? buildPRHTML() : buildSessionHTML();
      const { uri } = await Print.printToFileAsync({ html, width: cardW, height: cardH });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: cardType === 'pr' ? 'Share PR Card' : 'Share Session Card',
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not generate card. Please try again.');
    } finally {
      setSharing(false);
    }
  }

  const isSession = cardType === 'session';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Card type selector */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segment, isSession && styles.segmentActive]}
            onPress={() => setCardType('session')}
          >
            <Text style={[styles.segmentText, isSession && styles.segmentTextActive]}>Session</Text>
          </TouchableOpacity>
          {prData && (
            <TouchableOpacity
              style={[styles.segment, !isSession && styles.segmentActive]}
              onPress={() => setCardType('pr')}
            >
              <Text style={[styles.segmentText, !isSession && styles.segmentTextActive]}>New PR</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Format selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FORMAT</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[styles.segment, isSquare && styles.segmentActive]}
              onPress={() => setFormat('square')}
            >
              <Ionicons name="square-outline" size={16} color={isSquare ? colors.primary : colors.textMuted} />
              <Text style={[styles.segmentText, isSquare && styles.segmentTextActive]}>Square 1:1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, !isSquare && styles.segmentActive]}
              onPress={() => setFormat('story')}
            >
              <Ionicons name="phone-portrait-outline" size={16} color={!isSquare ? colors.primary : colors.textMuted} />
              <Text style={[styles.segmentText, !isSquare && styles.segmentTextActive]}>Story 9:16</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREVIEW</Text>
          <View style={[styles.previewCard, isSquare ? styles.previewSquare : styles.previewStory]}>
            {isSession ? (
              <SessionPreview
                sessionData={sessionData}
                showVolume={showVolume}
                showDate={showDate}
                showPlanName={showPlanName}
                showExercises={showExercises}
                isSquare={isSquare}
              />
            ) : (
              <PRPreview
                prData={prData}
                showPRWeight={showPRWeight}
                showPrevBest={showPrevBest}
                showDate={showDate}
                isSquare={isSquare}
              />
            )}
          </View>
        </View>

        {/* Privacy toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIVACY</Text>
          <View style={styles.togglesCard}>
            <ToggleRow label="Show date" value={showDate} onChange={setShowDate} />
            {isSession && (
              <>
                <ToggleRow label="Show plan name" value={showPlanName} onChange={setShowPlanName} />
                <ToggleRow label="Show total volume" value={showVolume} onChange={setShowVolume} />
                <ToggleRow label="Show exercise names" value={showExercises} onChange={setShowExercises} />
                <ToggleRow label="Show exact weights" value={showWeights} onChange={setShowWeights} last />
              </>
            )}
            {!isSession && (
              <>
                <ToggleRow label="Show PR weight" value={showPRWeight} onChange={setShowPRWeight} />
                <ToggleRow label="Show previous best" value={showPrevBest} onChange={setShowPrevBest} last />
              </>
            )}
          </View>
          <Text style={styles.privacyNote}>
            Name, bodyweight, measurements and private notes are never included.
          </Text>
        </View>

        {/* Share button */}
        <TouchableOpacity
          style={[styles.shareBtn, sharing && styles.btnDisabled]}
          onPress={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color={colors.background} />
              <Text style={styles.shareBtnText}>
                {cardType === 'pr' ? 'Share PR Card' : 'Share Session Card'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onChange, last }) {
  return (
    <View style={[styles.toggleRow, last && styles.toggleRowLast]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

function SessionPreview({ sessionData: s, showVolume, showDate, showPlanName, showExercises, isSquare }) {
  const d = s || {};
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  return (
    <View style={[styles.previewInner, !isSquare && styles.previewInnerStory]}>
      <Text style={styles.previewLogo}>VOLYUME</Text>
      {showDate && <Text style={styles.previewDate}>{d.date || dateStr}</Text>}
      {showPlanName && d.planName ? (
        <Text style={styles.previewPlan}>{d.planName.toUpperCase()}</Text>
      ) : <View style={{ height: spacing.lg }} />}
      <Text style={styles.previewSessionName} numberOfLines={2}>{d.sessionName || 'Session Complete'}</Text>
      {showExercises && d.exercises?.length > 0 && (
        <Text style={styles.previewExercises} numberOfLines={2}>
          {d.exercises.slice(0, 3).join(' · ')}
        </Text>
      )}
      <View style={styles.previewStats}>
        <View style={styles.previewStatBox}>
          <Text style={styles.previewStatValue}>{d.workingSets || 0}</Text>
          <Text style={styles.previewStatLabel}>Sets</Text>
        </View>
        <View style={styles.previewStatBox}>
          <Text style={styles.previewStatValue}>{d.duration || 0}m</Text>
          <Text style={styles.previewStatLabel}>Duration</Text>
        </View>
        {showVolume && (
          <View style={styles.previewStatBox}>
            <Text style={styles.previewStatValue}>{((d.tonnage || 0) / 1000).toFixed(1)}t</Text>
            <Text style={styles.previewStatLabel}>Volume</Text>
          </View>
        )}
      </View>
      <View style={styles.previewAccent} />
    </View>
  );
}

function PRPreview({ prData: p, showPRWeight, showPrevBest, showDate, isSquare }) {
  const d = p || {};
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const weightStr = showPRWeight
    ? `${d.weight || '—'}${d.units || 'kg'} × ${d.reps || '—'}`
    : `${d.reps || '—'} reps`;
  return (
    <View style={[styles.previewInner, styles.previewInnerPR, !isSquare && styles.previewInnerStory]}>
      <Text style={styles.previewLogo}>VOLYUME</Text>
      <Text style={styles.previewPRLabel}>NEW PERSONAL RECORD</Text>
      <Text style={styles.previewPRExercise} numberOfLines={2}>{d.exerciseName || 'Exercise'}</Text>
      <Text style={styles.previewPRWeight}>{weightStr}</Text>
      <Text style={styles.previewPRMeta}>
        {showDate ? (d.date || dateStr) : ''}
        {showPrevBest && d.previousBest ? `  ·  Prev: ${d.previousBest}${d.units || 'kg'}` : ''}
      </Text>
      <View style={styles.previewAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.textMuted, letterSpacing: 1.5,
  },
  segmentRow: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  segmentActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  segmentText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted },
  segmentTextActive: { color: colors.primary },

  previewCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  previewSquare: { aspectRatio: 1 },
  previewStory: { aspectRatio: 9 / 16 },
  previewInner: {
    flex: 1, backgroundColor: '#111111', padding: spacing.xl, gap: spacing.sm, justifyContent: 'flex-end',
  },
  previewInnerStory: { justifyContent: 'center' },
  previewInnerPR: { justifyContent: 'center' },
  previewLogo: { fontSize: 10, letterSpacing: 4, color: colors.textMuted, fontWeight: fontWeight.bold, position: 'absolute', top: spacing.lg, left: spacing.xl },
  previewDate: { fontSize: 10, color: colors.textMuted },
  previewPlan: { fontSize: 9, color: colors.primary, letterSpacing: 2, fontWeight: fontWeight.bold },
  previewSessionName: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.textPrimary, lineHeight: 22 },
  previewExercises: { fontSize: 10, color: colors.textSecondary },
  previewStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  previewStatBox: {
    flex: 1, backgroundColor: colors.surface2, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center',
  },
  previewStatValue: { fontSize: fontSize.md, fontWeight: fontWeight.black, color: colors.textPrimary },
  previewStatLabel: { fontSize: 9, color: colors.textMuted, letterSpacing: 0.5 },
  previewAccent: { height: 2, backgroundColor: colors.primary, marginTop: spacing.sm },
  previewPRLabel: { fontSize: 9, letterSpacing: 3, color: colors.primary, fontWeight: fontWeight.bold },
  previewPRExercise: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.textPrimary, lineHeight: 22 },
  previewPRWeight: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.primary },
  previewPRMeta: { fontSize: 10, color: colors.textMuted },

  togglesCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleLabel: { fontSize: fontSize.md, color: colors.textPrimary },
  privacyNote: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg,
  },
  btnDisabled: { opacity: 0.6 },
  shareBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
});
