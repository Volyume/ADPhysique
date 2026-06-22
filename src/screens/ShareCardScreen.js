/**
 * ShareCardScreen — build and share a workout / PR / milestone card.
 *
 * The card is drawn by ONE renderer (src/lib/shareCard/drawShareCard, Skia) for
 * BOTH the on-screen preview and the exported PNG, so what you see is exactly
 * what you share. This replaced the old split where the preview (RN views) and
 * the export (a hand-coded WebView canvas) were two renderers that drifted —
 * which is why the export didn't match the preview and the toggles did little.
 *
 * The "Save as PDF" path is a separate, clean one-page HTML→PDF summary and is
 * unrelated to the image card.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';
import { useToast } from '../components/Toast';
import { drawShareCard, cardHeight } from '../lib/shareCard/drawShareCard';
import { buildWeeklyRecapParams } from '../lib/shareCard/greatWeek';

// Optional native modules — guarded so the screen still mounts (e.g. in tests
// or before a rebuild) without them; the card just can't render/share until the
// real build provides Skia + the sharing packages.
let FileSystem; let Sharing; let Print; let Asset; let Skia; let matchFont;
try { FileSystem = require('expo-file-system/legacy'); } catch (_) { /* optional */ }
try { Sharing = require('expo-sharing'); } catch (_) { /* optional */ }
try { Print = require('expo-print'); } catch (_) { /* optional */ }
try { Asset = require('expo-asset').Asset; } catch (_) { /* optional */ }
try { const S = require('@shopify/react-native-skia'); Skia = S.Skia; matchFont = S.matchFont; } catch (_) { /* optional */ }

const WORDMARK = require('../../assets/volyume-wordmark.png');
// System typeface family per platform; the card measures text with the active
// font so layout is correct whatever this resolves to.
const FONT_FAMILY = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'sans-serif' });
const PREVIEW_RENDER_W = 640; // render crisp, display scaled down
const PREVIEW_DISPLAY_W = 300;

export default function ShareCardScreen({ route }) {
  const toast = useToast();
  const {
    sessionData = null,
    prData = null,
    milestoneData = null,
    weeklyRecapData = null,
    // The week's standout lift (src/lib/bestLift.js), or null. Featured on the
    // recap card.
    bestLift = null,
    // Gym/body weight unit label ('kg'|'lbs') for the weekly progress hero.
    units = 'kg',
    // Set by CoachOutputScreen when an ED-pattern flag is open OR calm mode is
    // active: all weight/progress language is stripped from the recap card.
    suppress = false,
  } = route.params || {};

  // Session leads whenever session data is present (a workout share opens as the
  // session card even when it also carries a PR). A standalone "Share this PR"
  // passes prData only and opens as a PR card. The weekly recap is its own
  // entry point (the "great week" CTA on the coach screen).
  const [cardType, setCardType] = useState(
    sessionData ? 'session' : prData ? 'pr' : milestoneData ? 'milestone' : weeklyRecapData ? 'weekly' : 'session',
  );
  // Square 1:1 by default (founder direction): posts cleanly to a feed and crops
  // predictably. Story 9:16 stays available as the taller option.
  const [format, setFormat] = useState('square');
  const [sharing, setSharing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [showVolume, setShowVolume] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showPlanName, setShowPlanName] = useState(true);
  const [showExercises, setShowExercises] = useState(true);
  const [showPRWeight, setShowPRWeight] = useState(true);
  const [showPrevBest, setShowPrevBest] = useState(true);
  // Weekly recap: the real weight-progress hero is opt-in. It is force-stripped
  // (and the toggle hidden) under `suppress` so no progress number can leak.
  const [showProgress, setShowProgress] = useState(true);
  // The best-lift feature is opt-in too (also force-stripped under suppress).
  const [showBestLift, setShowBestLift] = useState(true);

  const isSession = cardType === 'session';
  const isMilestone = cardType === 'milestone';
  const isWeekly = cardType === 'weekly';
  // The weekly recap is square-only: the 9:16 story leaves the tall canvas mostly
  // empty, so it ships as a clean 1:1 card.
  const isSquare = isWeekly ? true : format === 'square';

  // System typefaces (regular + bold) for the Skia renderer. getTypeface() gives
  // a typeface we can resize at any point in the draw.
  const typefaces = useMemo(() => {
    if (!Skia || !matchFont) return null;
    try {
      const bold = matchFont({ fontFamily: FONT_FAMILY, fontWeight: 'bold' }).getTypeface();
      const regular = matchFont({ fontFamily: FONT_FAMILY, fontWeight: 'normal' }).getTypeface();
      return (bold && regular) ? { bold, regular } : null;
    } catch (_) { return null; }
  }, []);

  // Load the wordmark once as an SkImage for the card footer.
  const [wordmark, setWordmark] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Skia || !Asset || !FileSystem) return;
      try {
        const asset = Asset.fromModule(WORDMARK);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        if (!uri) return;
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const data = Skia.Data.fromBase64(b64);
        const img = Skia.Image.MakeImageFromEncoded(data);
        if (!cancelled && img) setWordmark(img);
      } catch (_) { /* footer falls back to drawn text */ }
    })();
    return () => { cancelled = true; };
  }, []);

  function formatLongDate(ts) {
    const d = ts ? new Date(ts) : new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  const buildParams = useCallback(() => {
    if (isWeekly) {
      const o = weeklyRecapData || {};
      // The hero is the real weight progress (greatWeek.js); it + all progress
      // language are dropped when suppressed (ED flag / calm mode) OR toggled off.
      // The recap is shared straight after the check-in, so the date stamp is
      // simply today's share date. (The coach output carries no own timestamp.)
      const recap = buildWeeklyRecapParams(o, {
        suppress,
        includeProgress: showProgress,
        units,
        isSquare,
        weekLabel: o.weekLabel || '',
        dateFormatted: showDate ? formatLongDate() : '',
        // The lift hero is independently toggleable; suppress strips it regardless.
        bestLift: showBestLift ? bestLift : null,
      });
      // `date` mirrors dateFormatted so the PDF summary (which reads p.date) works.
      return { ...recap, showDate, date: recap.dateFormatted };
    }
    if (isMilestone) {
      const m = milestoneData || {};
      return {
        cardType: 'milestone', isSquare, showDate,
        premium: !!m.premium,
        date: (showDate && m.date) ? formatLongDate(m.date) : '',
        eyebrow: m.eyebrow || '',
        title: m.title || '',
        heroValue: m.heroValue != null ? m.heroValue : '',
        heroUnit: m.heroUnit || '',
        caption: m.caption || '',
        stats: Array.isArray(m.stats) ? m.stats.slice(0, 3) : [],
      };
    }
    if (isSession) {
      const s = sessionData || {};
      return {
        cardType: 'session', isSquare, showVolume, showDate, showPlanName, showExercises,
        date: showDate ? formatLongDate(s.date) : '',
        planName: showPlanName ? (s.planName || '') : '',
        sessionName: s.sessionName || 'Session Complete',
        workingSets: s.workingSets || 0,
        duration: s.duration || 0,
        tonnage: s.tonnage || 0,
        exerciseCount: s.exerciseCount || 0,
        exercises: s.exercises || [],
        prCount: s.prCount || 0,
        topSet: s.topSet || null,
        intensityTier: s.intensityTier || 'solid',
      };
    }
    const p = prData || {};
    return {
      cardType: 'pr', isSquare, showDate, showPRWeight, showPrevBest,
      date: showDate ? formatLongDate(p.date) : '',
      exerciseName: p.exerciseName || 'Exercise',
      weight: p.weight || '',
      reps: p.reps || '',
      units: p.units || 'kg',
      previousBest: p.previousBest || '',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMilestone, isSession, isWeekly, isSquare, showDate, showVolume, showPlanName, showExercises, showPRWeight, showPrevBest, showProgress, showBestLift, suppress, units, sessionData, prData, milestoneData, weeklyRecapData, bestLift]);

  // ── ONE renderer for preview + export ──────────────────────────────────────
  const renderCardBase64 = useCallback((width) => {
    if (!Skia || !typefaces) return null;
    const params = buildParams();
    const H = cardHeight(width, params.isSquare);
    const surface = Skia.Surface.MakeOffscreen(width, H);
    if (!surface) return null;
    drawShareCard(surface.getCanvas(), { Skia, width, params, typefaces, wordmark });
    surface.flush();
    const image = surface.makeImageSnapshot();
    return image ? image.encodeToBase64() : null;
  }, [typefaces, wordmark, buildParams]);

  // Live preview: re-render whenever anything that changes the card changes.
  const [previewB64, setPreviewB64] = useState(null);
  useEffect(() => {
    setPreviewB64(renderCardBase64(PREVIEW_RENDER_W));
  }, [renderCardBase64]);

  async function handleShare() {
    if (!Skia || !FileSystem || !Sharing) {
      toast.show('Sharing needs a rebuild with the Skia + sharing packages installed', { variant: 'error', duration: 5000 });
      return;
    }
    if (!typefaces) {
      toast.show('Not ready yet, wait a moment and try again', { variant: 'info' });
      return;
    }
    setSharing(true);
    try {
      const b64 = renderCardBase64(1080);
      if (!b64) { toast.show("Couldn't generate card, try again", { variant: 'error' }); return; }
      const filename = `volyume-${cardType}-card-${isSquare ? 'square' : 'story'}.png`;
      const uri = (FileSystem.cacheDirectory || '') + filename;
      await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { toast.show('Sharing not available on this device', { variant: 'warning' }); return; }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png', UTI: 'public.png',
        dialogTitle: cardType === 'session' ? 'Share Session Card'
          : cardType === 'pr' ? 'Share PR Card'
            : cardType === 'weekly' ? 'Share Your Week' : 'Share Card',
      });
    } catch (_e) {
      toast.show("Couldn't generate card, try again", { variant: 'error' });
    } finally {
      setSharing(false);
    }
  }

  function buildPdfHtml(p) {
    const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const stat = (label, value) => `
      <div class="stat"><div class="statValue">${esc(value)}</div><div class="statLabel">${esc(label)}</div></div>`;
    let body;
    if (p.cardType === 'session') {
      const rows = (p.exercises || [])
        .map((e) => `<tr><td>${esc(e.name ?? e)}</td><td>${esc(e.sets ?? '')}</td></tr>`)
        .join('');
      body = `
        <div class="statRow">
          ${stat('Working sets', p.workingSets)}
          ${stat('Minutes', p.duration)}
          ${stat('Volume', `${p.tonnage} ${p.units || 'kg'}`)}
          ${stat('Exercises', p.exerciseCount)}
        </div>
        ${p.prCount ? `<p class="prs">${p.prCount} new ${p.prCount === 1 ? 'PR' : 'PRs'} this session</p>` : ''}
        ${rows ? `<table><thead><tr><th>Exercise</th><th>Sets</th></tr></thead><tbody>${rows}</tbody></table>` : ''}`;
    } else if (p.cardType === 'milestone') {
      const rows = (p.stats || []).map((s) => stat(s.label, s.value)).join('');
      body = `
        <div class="statRow">
          ${(p.heroValue !== '' && p.heroValue != null) ? stat(p.heroUnit || '', p.heroValue) : ''}
          ${rows}
        </div>
        ${p.caption ? `<p class="prs">${esc(p.caption)}</p>` : ''}`;
    } else if (p.cardType === 'weekly') {
      const rows = (p.stats || []).map((s) => stat(s.label, s.value)).join('');
      const prog = p.hero && p.hero.value
        ? stat(p.hero.heading || 'this week', p.hero.value)
        : '';
      const bl = p.bestLift;
      const liftLine = (bl && bl.weight)
        ? `<p class="prs">Best lift: ${esc(bl.exerciseName)} ${esc(bl.weight)} ${esc(bl.units || 'kg')} × ${esc(bl.reps)}${bl.isNewBest ? ' (new personal best)' : ''}</p>`
        : '';
      body = `
        <div class="statRow">${prog}${rows}</div>
        ${liftLine}
        ${p.coachLine ? `<p class="prs">${esc(p.coachLine)}</p>` : ''}`;
    } else {
      body = `
        <div class="statRow">
          ${stat('Lift', p.exerciseName)}
          ${stat('Weight', `${p.weight} ${p.units || 'kg'}`)}
          ${stat('Reps', p.reps)}
          ${p.previousBest ? stat('Previous best', `${p.previousBest} ${p.units || 'kg'}`) : ''}
        </div>`;
    }
    const title = p.cardType === 'session' ? esc(p.sessionName)
      : p.cardType === 'milestone' ? esc(p.title || 'Milestone')
        : p.cardType === 'weekly' ? esc(p.tierLabel || 'Your week')
          : `${esc(p.exerciseName)} PR`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #0D0D0D; color: #FFFFFF; font-family: -apple-system, Roboto, Helvetica, sans-serif; padding: 40px; }
        .brand { color: #F5A623; font-size: 14px; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; }
        h1 { font-size: 34px; margin: 8px 0 2px; }
        .date { color: #9B9B9B; font-size: 14px; margin-bottom: 28px; }
        .statRow { display: flex; flex-wrap: wrap; gap: 16px; }
        .stat { background: #1A1A1A; border-radius: 14px; padding: 18px 22px; min-width: 130px; }
        .statValue { font-size: 26px; font-weight: 700; color: #F5A623; }
        .statLabel { font-size: 12px; color: #9B9B9B; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
        .prs { color: #F5A623; font-weight: 700; margin: 24px 0 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 28px; }
        th { text-align: left; color: #9B9B9B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #2A2A2A; padding: 8px 0; }
        td { padding: 10px 0; border-bottom: 1px solid #1A1A1A; font-size: 15px; }
        .foot { color: #6E6E6E; font-size: 11px; margin-top: 40px; }
      </style></head>
      <body>
        <div class="brand">Volyume</div>
        <h1>${title}</h1>
        ${p.date ? `<div class="date">${esc(p.date)}</div>` : '<div class="date"></div>'}
        ${body}
        <div class="foot">Generated by Volyume</div>
      </body></html>`;
  }

  async function handleExportPdf() {
    if (!Print || !Sharing) {
      toast.show('PDF export needs a rebuild with the print package installed', { variant: 'error', duration: 5000 });
      return;
    }
    setExportingPdf(true);
    try {
      const html = buildPdfHtml(buildParams());
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { toast.show('Sharing not available on this device', { variant: 'warning' }); return; }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf', UTI: 'com.adobe.pdf',
        dialogTitle: cardType === 'session' ? 'Share session summary' : cardType === 'pr' ? 'Share PR summary' : 'Share summary',
      });
    } catch (_e) {
      toast.show("Couldn't make the PDF, try again", { variant: 'error' });
    } finally {
      setExportingPdf(false);
    }
  }

  const previewH = cardHeight(PREVIEW_DISPLAY_W, isSquare);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Card type — shown per the data the screen was opened with. */}
        <View style={styles.segmentRow}>
          {sessionData && (
            <SegmentBtn label="Session" active={cardType === 'session'} onPress={() => setCardType('session')} />
          )}
          {prData && (
            <SegmentBtn label="New PR" active={cardType === 'pr'} onPress={() => setCardType('pr')} />
          )}
          {milestoneData && (
            <SegmentBtn label="Milestone" active={cardType === 'milestone'} onPress={() => setCardType('milestone')} />
          )}
          {weeklyRecapData && (
            <SegmentBtn label="Weekly" active={cardType === 'weekly'} onPress={() => setCardType('weekly')} />
          )}
        </View>

        {/* Format — the weekly recap is square-only, so the toggle is hidden. */}
        {!isWeekly && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Format</Text>
          <View style={styles.segmentRow}>
            <SegmentBtn
              label="Story 9:16"
              active={!isSquare}
              onPress={() => setFormat('story')}
              icon={<Ionicons name="phone-portrait-outline" size={15} color={!isSquare ? colors.primary : colors.textMuted} />}
            />
            <SegmentBtn
              label="Square 1:1"
              active={isSquare}
              onPress={() => setFormat('square')}
              icon={<Ionicons name="square-outline" size={15} color={isSquare ? colors.primary : colors.textMuted} />}
            />
          </View>
        </View>
        )}

        {/* Preview — the exact image that gets shared, scaled down */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewOuter}>
            {previewB64 ? (
              <Image
                source={{ uri: `data:image/png;base64,${previewB64}` }}
                style={{ width: PREVIEW_DISPLAY_W, height: previewH, borderRadius: radius.lg }}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.previewPlaceholder, { width: PREVIEW_DISPLAY_W, height: previewH }]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
          </View>
        </View>

        {/* What to include */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What to include</Text>
          <View style={styles.togglesCard}>
            <ToggleRow label="Date" value={showDate} onChange={setShowDate} />
            {isSession && (
              <>
                <ToggleRow label="Plan name" value={showPlanName} onChange={setShowPlanName} />
                <ToggleRow label="Total weight lifted" value={showVolume} onChange={setShowVolume} />
                <ToggleRow label="Exercise names" value={showExercises} onChange={setShowExercises} last />
              </>
            )}
            {cardType === 'pr' && (
              <>
                <ToggleRow label="PR weight" value={showPRWeight} onChange={setShowPRWeight} />
                <ToggleRow label="Previous best" value={showPrevBest} onChange={setShowPrevBest} last />
              </>
            )}
            {isWeekly && !suppress && (
              <>
                <ToggleRow label="Weight progress" value={showProgress} onChange={setShowProgress} />
                {bestLift ? (
                  <ToggleRow label="Best lift of the week" value={showBestLift} onChange={setShowBestLift} last />
                ) : null}
              </>
            )}
          </View>
          <Text style={styles.privacyNote}>
            {isWeekly
              ? 'Only this week’s progress, lifts and sessions are shown. Your measurements and private notes are never included.'
              : 'Name, bodyweight, measurements and private notes are never included.'}
          </Text>
        </View>

        {/* Share */}
        <TouchableOpacity
          style={[styles.shareBtn, sharing && styles.btnDisabled]}
          onPress={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color={colors.onPrimary} />
              <Text style={styles.shareBtnText}>
                {cardType === 'session' ? 'Share Session Card'
                  : cardType === 'pr' ? 'Share PR Card'
                    : cardType === 'weekly' ? 'Share Your Week' : 'Share Card'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Save as PDF: a clean one-page summary for a print/share pack. */}
        <TouchableOpacity
          style={[styles.pdfBtn, (sharing || exportingPdf) && styles.btnDisabled]}
          onPress={handleExportPdf}
          disabled={sharing || exportingPdf}
          accessibilityRole="button"
          accessibilityLabel="Save as PDF"
        >
          {exportingPdf ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={styles.pdfBtnText}>Save as PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentBtn({ label, active, onPress, icon }) {
  return (
    <TouchableOpacity
      style={[styles.segment, active && styles.segmentActive]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onChange, last }) {
  return (
    <View style={[styles.toggleRow, last && styles.toggleRowLast]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surface2, true: withAlpha(colors.primary, 0.4) }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.textMuted, letterSpacing: 1.5,
  },
  segmentRow: {
    flexDirection: 'row', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm + 1, borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surface3 },
  segmentText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.semibold },
  segmentTextActive: { color: colors.textPrimary },
  previewOuter: { alignSelf: 'center' },
  previewPlaceholder: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  togglesCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleLabel: { fontSize: fontSize.sm, color: colors.textPrimary },
  privacyNote: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  btnDisabled: { opacity: 0.5 },
  shareBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onPrimary },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: radius.lg, paddingVertical: spacing.lg,
    borderWidth: 1.5, borderColor: colors.primary, marginTop: spacing.md,
  },
  pdfBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
});
