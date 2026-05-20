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
let LinearGradient;
try { WebView = require('react-native-webview').WebView; } catch (_) {}
try { FileSystem = require('expo-file-system'); } catch (_) {}
try { Sharing = require('expo-sharing'); } catch (_) {}
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

// ---------- Canvas HTML — renders off-screen, exports a high-res PNG ----------
const WEBVIEW_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#090A0F;">
<canvas id="c" style="display:block;"></canvas>
<script>
// Brand palette — mirrors theme.js tokens
var B = {
  bg0:'#090A0F', bg1:'#0E0F18', bg2:'#131620',
  surface:'#181B24', surface2:'#1F2330',
  border:'#252A38', borderFaint:'#1B1F2A',
  accent:'#F59E0B', accentDim:'rgba(245,158,11,0.15)',
  accentGlow:'rgba(245,158,11,0.06)',
  gold:'#FFD700', goldDim:'rgba(255,215,0,0.15)',
  text:'#FFFFFF', textSecondary:'#9E9E9E', textMuted:'#5A6070'
};

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function wrapText(ctx, text, maxW) {
  var words = String(text).split(' '), lines = [], line = '';
  words.forEach(function(w) {
    var test = line ? line+' '+w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else { line = test; }
  });
  if (line) lines.push(line);
  return lines;
}

// Draw the Volyume V mark (exact SVG paths scaled)
function drawVMark(ctx, ox, oy, sz, mainColor, accentColor) {
  // viewBox 0 0 28 24 → scale = sz/28
  var scale = sz / 28;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.lineCap = 'round';
  // Left arm
  ctx.beginPath();
  ctx.moveTo(2*scale, 2*scale);
  ctx.lineTo(14*scale, 22*scale);
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 3.2 * scale;
  ctx.stroke();
  // Right arm
  ctx.beginPath();
  ctx.moveTo(14*scale, 22*scale);
  ctx.lineTo(26*scale, 2*scale);
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 3.2 * scale;
  ctx.stroke();
  // Accent stroke on right arm
  ctx.beginPath();
  ctx.moveTo(16.5*scale, 22*scale);
  ctx.lineTo(26*scale, 6*scale);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.8 * scale;
  ctx.globalAlpha = 0.85;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBackground(ctx, W, H) {
  var grad = ctx.createLinearGradient(0, 0, W * 0.4, H);
  grad.addColorStop(0, B.bg1);
  grad.addColorStop(0.5, B.bg0);
  grad.addColorStop(1, B.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Subtle diagonal accent stripe (top-right corner)
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = B.accent;
  ctx.beginPath();
  ctx.moveTo(W * 0.55, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, H * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTopAccentBar(ctx, W) {
  var grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, B.accent);
  grad.addColorStop(0.6, B.accent + 'AA');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 5);
}

function drawBrand(ctx, pad, y, textColor) {
  var markSz = 28;
  drawVMark(ctx, pad, y - markSz * 0.86, markSz, textColor, B.accent);
  ctx.fillStyle = textColor;
  ctx.font = '700 20px Arial,sans-serif';
  ctx.fillText('olyume', pad + markSz + 4, y - 2);
}

function drawSession(ctx, W, H, p) {
  var pad = Math.round(W * 0.074);
  drawBackground(ctx, W, H);
  drawTopAccentBar(ctx, W);

  var y = pad + 56;

  // Brand top-left
  drawBrand(ctx, pad, y, B.textMuted);
  // Date top-right
  if (p.showDate && p.date) {
    ctx.fillStyle = B.textMuted;
    ctx.font = '400 20px Arial,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(p.date, W - pad, y - 2);
    ctx.textAlign = 'left';
  }
  y += 60;

  if (p.showPlanName && p.planName) {
    ctx.fillStyle = B.accent;
    ctx.font = '600 20px Arial,sans-serif';
    var planLetterSpaced = p.planName.toUpperCase();
    ctx.fillText(planLetterSpaced, pad, y);
    y += 40;
  }

  // Session name — large hero text
  var heroFont = p.isSquare ? 66 : 74;
  ctx.fillStyle = B.text;
  ctx.font = '900 ' + heroFont + 'px Arial,sans-serif';
  var heroLines = wrapText(ctx, p.sessionName || 'Session Complete', W - pad * 2);
  heroLines.forEach(function(l) {
    ctx.fillText(l, pad, y + Math.round(heroFont * 0.82));
    y += Math.round(heroFont * 1.1);
  });
  y += 24;

  if (p.showExercises && p.exercises && p.exercises.length) {
    ctx.fillStyle = B.textSecondary;
    ctx.font = '400 22px Arial,sans-serif';
    ctx.fillText(p.exercises.slice(0, 3).join('  ·  '), pad, y);
    y += 46;
  }

  // Stats grid
  var stats = [
    { label: 'SETS', value: String(p.workingSets || 0) },
    { label: 'DURATION', value: (p.duration || 0) + 'm' },
  ];
  if (p.showVolume && (p.tonnage || 0) > 0) {
    stats.push({ label: 'TOTAL KG', value: Math.round(p.tonnage || 0).toLocaleString('en-GB') + ' kg' });
  }
  if (p.prCount > 0) stats.push({ label: 'PRs', value: String(p.prCount) });

  var boxY = p.isSquare ? H - pad - 168 : Math.max(y + 60, H - pad - 200);
  var boxGap = 16, boxH = 148;
  var boxW = Math.floor((W - pad * 2 - boxGap * (stats.length - 1)) / stats.length);
  var valSize = stats.length > 3 ? 48 : 56;

  stats.forEach(function(s, i) {
    var bx = pad + i * (boxW + boxGap);
    // Box fill
    ctx.fillStyle = B.surface;
    rrect(ctx, bx, boxY, boxW, boxH, 18);
    ctx.fill();
    // Box border
    ctx.strokeStyle = B.border;
    ctx.lineWidth = 1.5;
    rrect(ctx, bx, boxY, boxW, boxH, 18);
    ctx.stroke();
    // If PRs box, accent border
    if (s.label === 'PRs') {
      ctx.strokeStyle = B.gold + '60';
      ctx.lineWidth = 1.5;
      rrect(ctx, bx, boxY, boxW, boxH, 18);
      ctx.stroke();
    }
    // Value
    ctx.fillStyle = s.label === 'PRs' ? B.gold : B.text;
    ctx.font = '900 ' + valSize + 'px Arial,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.value, bx + boxW / 2, boxY + Math.round(boxH * 0.56));
    // Label
    ctx.fillStyle = B.textMuted;
    ctx.font = '600 16px Arial,sans-serif';
    ctx.fillText(s.label, bx + boxW / 2, boxY + boxH - 20);
    ctx.textAlign = 'left';
  });

  // Bottom accent
  ctx.fillStyle = B.border;
  ctx.fillRect(0, H - 2, W, 2);
}

function drawPR(ctx, W, H, p) {
  var pad = Math.round(W * 0.074);
  drawBackground(ctx, W, H);
  drawTopAccentBar(ctx, W);

  // Radial glow behind the weight number
  var glowY = H * 0.6;
  var glowR = W * 0.48;
  var glowGrad = ctx.createRadialGradient(W / 2, glowY, 0, W / 2, glowY, glowR);
  glowGrad.addColorStop(0, 'rgba(245,158,11,0.07)');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // Brand — top left
  var brandY = pad + 44;
  drawBrand(ctx, pad, brandY, B.textMuted);

  // Trophy icon (drawn as simple star-ish shape)
  var trophyX = W / 2, trophyY = H * 0.28;
  ctx.save();
  ctx.fillStyle = B.goldDim;
  rrect(ctx, trophyX - 70, trophyY - 18, 140, 46, 23);
  ctx.fill();
  ctx.strokeStyle = B.gold + '70';
  ctx.lineWidth = 1;
  rrect(ctx, trophyX - 70, trophyY - 18, 140, 46, 23);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = B.gold;
  ctx.font = '700 22px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★  PERSONAL RECORD  ★', trophyX, trophyY + 14);
  ctx.textAlign = 'left';

  // Exercise name
  var exFont = p.isSquare ? 54 : 62;
  ctx.fillStyle = B.text;
  ctx.font = '800 ' + exFont + 'px Arial,sans-serif';
  ctx.textAlign = 'center';
  var exLines = wrapText(ctx, p.exerciseName || 'Exercise', W - pad * 2.5);
  var ey = trophyY + 76;
  exLines.forEach(function(l) {
    ctx.fillText(l, W / 2, ey);
    ey += Math.round(exFont * 1.1);
  });

  // Weight × reps — the hero number
  var wFont = p.isSquare ? 100 : 116;
  var wStr = p.showPRWeight
    ? (p.weight || '—') + (p.units || 'kg') + ' × ' + (p.reps || '—')
    : (p.reps || '—') + ' reps';
  ctx.fillStyle = B.accent;
  ctx.font = '900 ' + wFont + 'px Arial,sans-serif';
  var wMetrics = ctx.measureText(wStr);
  if (wMetrics.width > W - pad * 2) {
    wFont = Math.floor(wFont * ((W - pad * 2) / wMetrics.width));
    ctx.font = '900 ' + wFont + 'px Arial,sans-serif';
  }
  ctx.fillText(wStr, W / 2, ey + wFont + 12);

  // Meta line
  var metaParts = [];
  if (p.showDate && p.date) metaParts.push(p.date);
  if (p.showPrevBest && p.previousBest) metaParts.push('Prev best: ' + p.previousBest + (p.units || 'kg'));
  if (metaParts.length) {
    ctx.fillStyle = B.textMuted;
    ctx.font = '400 26px Arial,sans-serif';
    ctx.fillText(metaParts.join('  ·  '), W / 2, ey + wFont + 74);
  }
  ctx.textAlign = 'left';

  // Bottom divider
  ctx.fillStyle = B.border;
  ctx.fillRect(0, H - 2, W, 2);
}

window.drawCard = function() {
  var p = window.__cardParams;
  if (!p) return;
  var W = 1080, H = p.isSquare ? 1080 : 1920;
  var c = document.getElementById('c');
  c.width = W; c.height = H;
  var ctx = c.getContext('2d');
  if (p.cardType === 'pr') { drawPR(ctx, W, H, p); } else { drawSession(ctx, W, H, p); }
  window.ReactNativeWebView.postMessage(JSON.stringify({ base64: c.toDataURL('image/png'), isSquare: p.isSquare }));
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
        cardType: 'session', isSquare, showVolume, showDate, showPlanName, showExercises,
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
        cardType: 'pr', isSquare, showDate, showPRWeight, showPrevBest,
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
      Alert.alert('Sharing unavailable', 'The app needs to be rebuilt with the sharing packages installed.');
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
      const filename = `volyume-${isSession ? 'session' : 'pr'}-card-${sq ? 'square' : 'story'}.png`;
      const uri = (FileSystem.cacheDirectory || '') + filename;
      await FileSystem.writeAsStringAsync(uri, pure, { encoding: FileSystem.EncodingType.Base64 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('Sharing not available on this device.'); return; }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png', UTI: 'public.png',
        dialogTitle: isSession ? 'Share Session Card' : 'Share PR Card',
      });
    } catch (_e) {
      Alert.alert('Error', 'Could not generate card. Please try again.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Card type */}
        <View style={styles.segmentRow}>
          <SegmentBtn label="Session" active={isSession} onPress={() => setCardType('session')} />
          {prData && (
            <SegmentBtn label="New PR" active={!isSession} onPress={() => setCardType('pr')} />
          )}
        </View>

        {/* Format */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Format</Text>
          <View style={styles.segmentRow}>
            <SegmentBtn
              label="Square 1:1"
              active={isSquare}
              onPress={() => setFormat('square')}
              icon={<Ionicons name="square-outline" size={15} color={isSquare ? colors.primary : colors.textMuted} />}
            />
            <SegmentBtn
              label="Story 9:16"
              active={!isSquare}
              onPress={() => setFormat('story')}
              icon={<Ionicons name="phone-portrait-outline" size={15} color={!isSquare ? colors.primary : colors.textMuted} />}
            />
          </View>
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={[styles.previewOuter, !isSquare && styles.previewOuterStory]}>
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
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.togglesCard}>
            <ToggleRow label="Show date" value={showDate} onChange={setShowDate} />
            {isSession && (
              <>
                <ToggleRow label="Show plan name" value={showPlanName} onChange={setShowPlanName} />
                <ToggleRow label="Show total weight lifted" value={showVolume} onChange={setShowVolume} />
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
                {isSession ? 'Share Session Card' : 'Share PR Card'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

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

// ─── Preview Components ───────────────────────────────────────────────────────

function GradientBg({ children, style }) {
  if (LinearGradient) {
    return (
      <LinearGradient
        colors={['#0E0F18', '#090A0F', '#131620']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={style}
      >
        {children}
      </LinearGradient>
    );
  }
  return <View style={[style, { backgroundColor: '#090A0F' }]}>{children}</View>;
}

function VMarkPreview({ size = 14, color = colors.textMuted }) {
  // Minimal text-based fallback — the real SVG is in BrandMark.js
  // At small preview sizes this is fine
  return (
    <Text style={{ fontSize: size * 1.1, fontWeight: fontWeight.black, color, lineHeight: size * 1.2, includeFontPadding: false }}>
      V
    </Text>
  );
}

function BrandRowPreview({ size = 11, color = colors.textMuted }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <VMarkPreview size={size} color={color} />
      <Text style={{ fontSize: size, fontWeight: fontWeight.bold, color, letterSpacing: 0.3, includeFontPadding: false }}>
        olyume
      </Text>
    </View>
  );
}

function SessionPreview({ sessionData: s, showVolume, showDate, showPlanName, showExercises, isSquare }) {
  const d = s || {};
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const stats = [
    { label: 'Sets', value: String(d.workingSets || 0) },
    { label: 'Duration', value: `${d.duration || 0}m` },
    ...(showVolume ? [{ label: 'Total kg', value: `${Math.round(d.tonnage || 0).toLocaleString('en-GB')} kg` }] : []),
    ...(d.prCount > 0 ? [{ label: 'PRs', value: String(d.prCount), gold: true }] : []),
  ];

  return (
    <GradientBg style={[pvStyles.card, isSquare ? pvStyles.square : pvStyles.story]}>
      {/* Top accent */}
      <View style={pvStyles.topAccent} />

      {/* Brand row */}
      <View style={pvStyles.brandRow}>
        <BrandRowPreview size={isSquare ? 10 : 9} color={colors.textMuted} />
        {showDate && (
          <Text style={[pvStyles.metaText, { fontSize: isSquare ? 8 : 7 }]}>{d.date || dateStr}</Text>
        )}
      </View>

      {showPlanName && d.planName ? (
        <Text style={pvStyles.planLabel} numberOfLines={1}>{d.planName.toUpperCase()}</Text>
      ) : null}

      {/* Session name hero */}
      <Text style={[pvStyles.heroText, isSquare ? pvStyles.heroTextSq : pvStyles.heroTextSt]} numberOfLines={2}>
        {d.sessionName || 'Session Complete'}
      </Text>

      {showExercises && d.exercises?.length > 0 && (
        <Text style={pvStyles.exercisesText} numberOfLines={1}>
          {d.exercises.slice(0, 3).join(' · ')}
        </Text>
      )}

      {/* Stats */}
      <View style={pvStyles.statsRow}>
        {stats.slice(0, isSquare ? 4 : 3).map((st, i) => (
          <View key={i} style={[pvStyles.statBox, st.gold && pvStyles.statBoxGold]}>
            <Text style={[pvStyles.statValue, st.gold && pvStyles.statValueGold]}>{st.value}</Text>
            <Text style={pvStyles.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      <View style={pvStyles.bottomAccent} />
    </GradientBg>
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
    <GradientBg style={[pvStyles.card, pvStyles.cardPR, isSquare ? pvStyles.square : pvStyles.story]}>
      {/* Top accent */}
      <View style={pvStyles.topAccent} />

      {/* Brand */}
      <View style={pvStyles.brandRowPR}>
        <BrandRowPreview size={isSquare ? 10 : 9} color={colors.textMuted} />
      </View>

      {/* Central content */}
      <View style={pvStyles.prCenter}>
        {/* PR badge */}
        <View style={pvStyles.prBadge}>
          <Text style={pvStyles.prBadgeText}>★  PERSONAL RECORD  ★</Text>
        </View>

        {/* Exercise name */}
        <Text style={[pvStyles.prExercise, isSquare ? pvStyles.prExerciseSq : pvStyles.prExerciseSt]} numberOfLines={2}>
          {d.exerciseName || 'Exercise'}
        </Text>

        {/* Weight — hero */}
        <Text style={[pvStyles.prWeight, isSquare ? pvStyles.prWeightSq : pvStyles.prWeightSt]} numberOfLines={1} adjustsFontSizeToFit>
          {weightStr}
        </Text>

        {/* Meta */}
        {(showDate || (showPrevBest && d.previousBest)) ? (
          <Text style={pvStyles.prMeta} numberOfLines={1}>
            {[showDate ? (d.date || dateStr) : null, showPrevBest && d.previousBest ? `Prev: ${d.previousBest}${d.units || 'kg'}` : null].filter(Boolean).join('  ·  ')}
          </Text>
        ) : null}
      </View>

      <View style={pvStyles.bottomAccent} />
    </GradientBg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        trackColor={{ false: colors.surface2, true: colors.primary + '66' }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pvStyles = StyleSheet.create({
  card: {
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  cardPR: { alignItems: 'stretch' },
  square: { width: 270, height: 270 },
  story: { width: 162, height: 288 },
  topAccent: { height: 3, backgroundColor: colors.primary },
  bottomAccent: { height: 1, backgroundColor: colors.border, marginTop: 'auto' },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: 2,
  },
  brandRowPR: {
    paddingHorizontal: spacing.sm, paddingTop: spacing.sm,
  },
  metaText: { color: colors.textMuted, fontWeight: fontWeight.medium },
  planLabel: {
    fontSize: 8, color: colors.primary, fontWeight: fontWeight.bold,
    letterSpacing: 1, paddingHorizontal: spacing.sm,
  },
  heroText: {
    fontWeight: fontWeight.black, color: colors.textPrimary,
    paddingHorizontal: spacing.sm, flex: 1, marginTop: 4,
  },
  heroTextSq: { fontSize: 18, lineHeight: 22 },
  heroTextSt: { fontSize: 14, lineHeight: 17 },
  exercisesText: {
    fontSize: 8, color: colors.textSecondary,
    paddingHorizontal: spacing.sm, marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row', gap: 4,
    paddingHorizontal: spacing.sm, paddingBottom: spacing.sm,
    marginTop: 'auto',
  },
  statBox: {
    flex: 1, backgroundColor: colors.surface2, borderRadius: 6,
    paddingVertical: 5, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  statBoxGold: { borderColor: colors.gold + '50', backgroundColor: colors.warningBg },
  statValue: { fontSize: 11, fontWeight: fontWeight.black, color: colors.textPrimary, lineHeight: 14 },
  statValueGold: { color: colors.gold },
  statLabel: { fontSize: 6.5, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 0.3, marginTop: 1 },
  prCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.sm, gap: 6,
  },
  prBadge: {
    backgroundColor: colors.warningBg, borderRadius: 30,
    paddingHorizontal: spacing.md, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.gold + '60',
  },
  prBadgeText: { fontSize: 7.5, fontWeight: fontWeight.bold, color: colors.gold, letterSpacing: 0.5 },
  prExercise: { fontWeight: fontWeight.black, color: colors.textPrimary, textAlign: 'center', lineHeight: 20 },
  prExerciseSq: { fontSize: 14 },
  prExerciseSt: { fontSize: 11 },
  prWeight: { fontWeight: fontWeight.black, color: colors.primary, textAlign: 'center' },
  prWeightSq: { fontSize: 26 },
  prWeightSt: { fontSize: 20 },
  prMeta: { fontSize: 8, color: colors.textMuted, textAlign: 'center' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.textMuted, letterSpacing: 1.5,
  },
  segmentRow: {
    flexDirection: 'row', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 4,
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
  previewOuterStory: {},
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
  hiddenWebView: { position: 'absolute', opacity: 0, width: 1, height: 1, bottom: 0, left: 0, zIndex: -1 },
});
