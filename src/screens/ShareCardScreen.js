import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

let WebView;
let FileSystem;
let Sharing;
try { WebView = require('react-native-webview').WebView; } catch (_) {}
try { FileSystem = require('expo-file-system'); } catch (_) {}
try { Sharing = require('expo-sharing'); } catch (_) {}

// ---------- Canvas HTML that renders in the hidden WebView ----------
const WEBVIEW_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#000;">
<canvas id="c" style="display:block;"></canvas>
<script>
function lsText(ctx, text, x, y, ls) {
  String(text).split('').reduce(function(cx, ch) {
    ctx.fillText(ch, cx, y);
    return cx + ctx.measureText(ch).width + ls;
  }, x);
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
function wrapText(ctx, text, maxW) {
  var words = String(text).split(' ');
  var lines = []; var line = '';
  words.forEach(function(w) {
    var test = line ? line+' '+w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line=w; }
    else { line=test; }
  });
  if (line) lines.push(line);
  return lines;
}

function drawSession(ctx, W, H, p) {
  var pad = Math.round(W * 0.074);
  var grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#131313'); grad.addColorStop(1,'#1A1A1A');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  ctx.fillStyle='#00E5FF'; ctx.fillRect(0,0,W,6);
  ctx.fillStyle='#00E5FF'; ctx.fillRect(0,H-4,W,4);

  var y = pad + 56;
  ctx.fillStyle='#3A3A3A'; ctx.font='bold 26px Arial,sans-serif';
  lsText(ctx,'VOLYUME',pad,y,3.5);
  y += 28;

  if (p.showDate && p.date) {
    ctx.fillStyle='#545454'; ctx.font='400 22px Arial,sans-serif';
    ctx.fillText(p.date,pad,y+22); y += 52;
  }
  y += 36;

  if (p.showPlanName && p.planName) {
    ctx.fillStyle='#00E5FF'; ctx.font='bold 20px Arial,sans-serif';
    lsText(ctx,p.planName.toUpperCase(),pad,y,2.5); y += 46;
  }

  var heroSize = p.isSquare ? 64 : 72;
  ctx.fillStyle='#FFFFFF'; ctx.font='900 '+heroSize+'px Arial,sans-serif';
  var heroLines = wrapText(ctx, p.sessionName||'Session Complete', W - pad*2);
  heroLines.forEach(function(l) {
    ctx.fillText(l,pad,y+Math.round(heroSize*0.86));
    y += Math.round(heroSize*1.12);
  });
  y += 20;

  if (p.showExercises && p.exercises && p.exercises.length > 0) {
    ctx.fillStyle='#686868'; ctx.font='400 24px Arial,sans-serif';
    ctx.fillText(p.exercises.slice(0,4).join('  ·  '),pad,y); y += 48;
  }

  var stats = [{label:'WORKING SETS',value:String(p.workingSets||0)},{label:'DURATION',value:(p.duration||0)+'m'}];
  if (p.showVolume) stats.push({label:'VOLUME',value:((p.tonnage||0)/1000).toFixed(1)+'t'});
  if (p.isSquare && p.prCount>0) stats.push({label:'NEW PRs',value:String(p.prCount)});

  var boxY = p.isSquare ? H - pad - 140 : y + 44;
  var gap = 16; var boxH = 128;
  var boxW = Math.floor((W - pad*2 - gap*(stats.length-1)) / stats.length);
  var valSize = stats.length > 3 ? 38 : 46;

  stats.forEach(function(s,i) {
    var bx = pad + i*(boxW+gap);
    ctx.fillStyle='#1E1E1E'; rrect(ctx,bx,boxY,boxW,boxH,14); ctx.fill();
    ctx.strokeStyle='#2C2C2C'; ctx.lineWidth=1; rrect(ctx,bx,boxY,boxW,boxH,14); ctx.stroke();
    ctx.fillStyle='#FFFFFF'; ctx.font='900 '+valSize+'px Arial,sans-serif';
    ctx.textAlign='center'; ctx.fillText(s.value,bx+boxW/2,boxY+Math.round(boxH*0.52));
    ctx.fillStyle='#424242'; ctx.font='bold 16px Arial,sans-serif';
    ctx.fillText(s.label,bx+boxW/2,boxY+boxH-16); ctx.textAlign='left';
  });

  if (!p.isSquare && p.prCount>0) {
    var by2 = boxY+boxH+36;
    ctx.fillStyle='rgba(0,229,255,0.12)';
    rrect(ctx,pad,by2,256,54,27); ctx.fill();
    ctx.fillStyle='#00E5FF'; ctx.font='bold 22px Arial,sans-serif'; ctx.textAlign='center';
    ctx.fillText(p.prCount+' NEW PR'+(p.prCount!==1?'s':''),pad+128,by2+34);
    ctx.textAlign='left';
  }
}

function drawPR(ctx, W, H, p) {
  var pad = Math.round(W * 0.074);
  var grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#131313'); grad.addColorStop(1,'#1A1A1A');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#00E5FF'; ctx.fillRect(0,0,W,6);
  ctx.fillStyle='#00E5FF'; ctx.fillRect(0,H-4,W,4);

  ctx.fillStyle='#3A3A3A'; ctx.font='bold 26px Arial,sans-serif';
  lsText(ctx,'VOLYUME',pad,pad+56,3.5);

  var midY = Math.round(H * 0.38);
  ctx.fillStyle='#00E5FF'; ctx.font='bold 22px Arial,sans-serif'; ctx.textAlign='center';
  lsText(ctx,'NEW PERSONAL RECORD',W/2-ctx.measureText('NEW PERSONAL RECORD').width/2-11,midY,2.2);

  var exSize = p.isSquare ? 54 : 62;
  ctx.fillStyle='#FFFFFF'; ctx.font='bold '+exSize+'px Arial,sans-serif'; ctx.textAlign='center';
  var exLines = wrapText(ctx,p.exerciseName||'Exercise',W-pad*2);
  var ey = midY + 52;
  exLines.forEach(function(l){ ctx.fillText(l,W/2,ey); ey+=Math.round(exSize*1.1); });

  var wSize = p.isSquare ? 100 : 120;
  var wStr = p.showPRWeight
    ? (p.weight||'—')+(p.units||'kg')+' × '+(p.reps||'—')
    : (p.reps||'—')+' reps';
  ctx.fillStyle='#00E5FF'; ctx.font='900 '+wSize+'px Arial,sans-serif';
  ctx.fillText(wStr,W/2,ey+wSize+4);

  var metaParts = [];
  if (p.showDate && p.date) metaParts.push(p.date);
  if (p.showPrevBest && p.previousBest) metaParts.push('Prev: '+p.previousBest+(p.units||'kg'));
  if (metaParts.length) {
    ctx.fillStyle='#616161'; ctx.font='400 26px Arial,sans-serif';
    ctx.fillText(metaParts.join('  ·  '),W/2,ey+wSize+68);
  }
  ctx.textAlign='left';
}

window.drawCard = function() {
  var p = window.__cardParams;
  if (!p) return;
  var W = 1080; var H = p.isSquare ? 1080 : 1920;
  var c = document.getElementById('c');
  c.width=W; c.height=H;
  var ctx = c.getContext('2d');
  if (p.cardType==='pr') { drawPR(ctx,W,H,p); } else { drawSession(ctx,W,H,p); }
  var base64 = c.toDataURL('image/png');
  window.ReactNativeWebView.postMessage(JSON.stringify({base64:base64,isSquare:p.isSquare}));
};
<\/script>
</body>
</html>`;

export default function ShareCardScreen({ navigation, route }) {
  const {
    sessionData = null,
    prData = null,
  } = route.params || {};

  const [cardType, setCardType] = useState(prData ? 'pr' : 'session');
  const [format, setFormat] = useState('square');
  const [sharing, setSharing] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);

  const [showVolume, setShowVolume] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showPlanName, setShowPlanName] = useState(true);
  const [showExercises, setShowExercises] = useState(false);
  const [showPRWeight, setShowPRWeight] = useState(true);
  const [showPrevBest, setShowPrevBest] = useState(false);

  const webViewRef = useRef(null);
  const pendingCapture = useRef(false);

  const isSquare = format === 'square';
  const isSession = cardType === 'session';

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  function buildParams() {
    const now = new Date();
    const fallbackDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    if (isSession) {
      const s = sessionData || {};
      return {
        cardType: 'session',
        isSquare,
        showVolume,
        showDate,
        showPlanName,
        showExercises,
        date: showDate ? (s.date || fallbackDate) : '',
        planName: showPlanName ? (s.planName || '') : '',
        sessionName: s.sessionName || 'Session Complete',
        workingSets: s.workingSets || 0,
        duration: s.duration || 0,
        tonnage: s.tonnage || 0,
        exercises: s.exercises || [],
        prCount: s.prCount || 0,
      };
    } else {
      const p = prData || {};
      return {
        cardType: 'pr',
        isSquare,
        showDate,
        showPRWeight,
        showPrevBest,
        date: showDate ? (p.date || fallbackDate) : '',
        exerciseName: p.exerciseName || 'Exercise',
        weight: p.weight || '',
        reps: p.reps || '',
        units: p.units || 'kg',
        previousBest: p.previousBest || '',
      };
    }
  }

  async function handleShare() {
    if (!WebView || !FileSystem || !Sharing) {
      Alert.alert(
        'Sharing unavailable',
        'The app needs to be rebuilt with the sharing packages installed.',
      );
      return;
    }
    if (!webViewRef.current || !webViewReady) {
      Alert.alert('Not ready', 'Please wait a moment and try again.');
      return;
    }
    setSharing(true);
    pendingCapture.current = true;
    const params = buildParams();
    webViewRef.current.injectJavaScript(
      `window.__cardParams = ${JSON.stringify(params)}; window.drawCard(); true;`
    );
  }

  async function handleWebViewMessage(event) {
    if (!pendingCapture.current) return;
    pendingCapture.current = false;
    try {
      const { base64, isSquare: sq } = JSON.parse(event.nativeEvent.data);
      const pure = base64.replace(/^data:image\/png;base64,/, '');
      const filename = `volyume-session-card-${sq ? 'square' : 'story'}.png`;
      const uri = (FileSystem.cacheDirectory || '') + filename;
      await FileSystem.writeAsStringAsync(uri, pure, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: isSession ? 'Share Session Card' : 'Share PR Card',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not generate card. Please try again.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Card type tabs */}
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

        {/* Format */}
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

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIVACY</Text>
          <View style={styles.togglesCard}>
            <ToggleRow label="Show date" value={showDate} onChange={setShowDate} />
            {isSession && (
              <>
                <ToggleRow label="Show plan name" value={showPlanName} onChange={setShowPlanName} />
                <ToggleRow label="Show total volume" value={showVolume} onChange={setShowVolume} />
                <ToggleRow label="Show exercise names" value={showExercises} onChange={setShowExercises} last />
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

        {/* Share */}
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
                {isSession ? 'Share Session Card' : 'Share PR Card'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Hidden WebView — renders off-screen, executes canvas JS on demand */}
      {WebView ? (
        <WebView
          ref={webViewRef}
          style={styles.hiddenWebView}
          source={{ html: WEBVIEW_HTML }}
          onLoad={() => setWebViewReady(true)}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          originWhitelist={['*']}
        />
      ) : null}
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
        trackColor={{ false: colors.surface2, true: colors.primary + '66' }}
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
      <View style={styles.previewTopBar} />
      <Text style={styles.previewLogo}>VOLYUME</Text>
      {showDate && <Text style={styles.previewDate}>{d.date || dateStr}</Text>}
      {showPlanName && d.planName ? (
        <Text style={styles.previewPlan}>{d.planName.toUpperCase()}</Text>
      ) : <View style={{ height: spacing.md }} />}
      <Text style={styles.previewSessionName} numberOfLines={2}>{d.sessionName || 'Session Complete'}</Text>
      {showExercises && d.exercises?.length > 0 && (
        <Text style={styles.previewExercises} numberOfLines={1}>
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
      <View style={styles.previewBottomBar} />
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
      <View style={styles.previewTopBar} />
      <Text style={styles.previewLogo}>VOLYUME</Text>
      <Text style={styles.previewPRLabel}>NEW PERSONAL RECORD</Text>
      <Text style={styles.previewPRExercise} numberOfLines={2}>{d.exerciseName || 'Exercise'}</Text>
      <Text style={styles.previewPRWeight}>{weightStr}</Text>
      <Text style={styles.previewPRMeta}>
        {showDate ? (d.date || dateStr) : ''}
        {showPrevBest && d.previousBest ? `  ·  Prev: ${d.previousBest}${d.units || 'kg'}` : ''}
      </Text>
      <View style={styles.previewBottomBar} />
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
  segmentRow: {
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surface2 },
  segmentText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.semibold },
  segmentTextActive: { color: colors.textPrimary },

  previewCard: {
    alignSelf: 'center', borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: '#131313', borderWidth: 1, borderColor: colors.border,
  },
  previewSquare: { width: 260, height: 260 },
  previewStory: { width: 160, height: 284 },
  previewInner: {
    flex: 1, padding: spacing.md, gap: spacing.xs, backgroundColor: '#131313',
  },
  previewInnerStory: { padding: spacing.sm },
  previewInnerPR: { justifyContent: 'center' },
  previewTopBar: { height: 2, backgroundColor: colors.primary, marginBottom: spacing.xs },
  previewBottomBar: { height: 2, backgroundColor: colors.primary, marginTop: 'auto' },
  previewLogo: {
    fontSize: fontSize.xs - 1, fontWeight: fontWeight.black, color: '#3A3A3A', letterSpacing: 2,
  },
  previewDate: { fontSize: fontSize.xs - 1, color: '#545454' },
  previewPlan: { fontSize: fontSize.xs - 1, color: colors.primary, fontWeight: fontWeight.bold, letterSpacing: 1 },
  previewSessionName: { fontSize: fontSize.md, fontWeight: fontWeight.black, color: colors.textPrimary, lineHeight: 22 },
  previewExercises: { fontSize: fontSize.xs - 1, color: '#686868' },
  previewStats: { flexDirection: 'row', gap: spacing.xs, marginTop: 'auto' },
  previewStatBox: {
    flex: 1, backgroundColor: '#1E1E1E', borderRadius: radius.sm,
    padding: spacing.xs, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A',
  },
  previewStatValue: { fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.textPrimary },
  previewStatLabel: { fontSize: fontSize.xs - 2, color: '#424242', fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  previewPRLabel: { fontSize: fontSize.xs - 1, color: colors.primary, fontWeight: fontWeight.bold, letterSpacing: 2, marginTop: spacing.xs },
  previewPRExercise: { fontSize: fontSize.md, fontWeight: fontWeight.black, color: colors.textPrimary, lineHeight: 22 },
  previewPRWeight: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.primary },
  previewPRMeta: { fontSize: fontSize.xs - 1, color: '#616161' },

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
  shareBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },

  hiddenWebView: {
    position: 'absolute', opacity: 0, width: 1, height: 1, bottom: 0, left: 0, zIndex: -1,
  },
});
