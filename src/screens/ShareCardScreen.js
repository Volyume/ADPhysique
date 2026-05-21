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

// ──────────────────────────────────────────────────────────────────────────────
// Canvas HTML — renders off-screen, exports a high-res PNG.
//
// Story format is 1080×1920 (Instagram Stories / TikTok / Snapchat). The
// vertical space gives us room to do the brand justice: big session name at
// top, a hero stat in the middle, support stats + top lift + muscle chips
// below, and a generous branded footer at the bottom where Instagram
// usually overlays its UI — so the V mark stays visible above their chrome.
// Square 1080×1080 is the secondary format for feed posts.
// ──────────────────────────────────────────────────────────────────────────────
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
  accent:'#F59E0B', accentSoft:'#FBBF24', accentDim:'rgba(245,158,11,0.18)',
  accentGlow:'rgba(245,158,11,0.10)',
  gold:'#FFD700', goldDim:'rgba(255,215,0,0.15)',
  text:'#FFFFFF', textSecondary:'#B8BCC8', textMuted:'#6A7080',
  divider:'rgba(255,255,255,0.06)'
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

function fitFont(ctx, text, maxW, baseSize, weight) {
  // Shrink font size until text fits the width. Used for hero numbers that
  // could otherwise overflow on long PR names or large tonnage values.
  weight = weight || '900';
  var size = baseSize;
  ctx.font = weight + ' ' + size + 'px Arial,sans-serif';
  while (ctx.measureText(text).width > maxW && size > 40) {
    size -= 4;
    ctx.font = weight + ' ' + size + 'px Arial,sans-serif';
  }
  return size;
}

// Volyume V mark — exact SVG paths scaled. Used at top (small, muted) and
// bottom (large, branded gold). The accent stroke on the right arm is what
// distinguishes Volyume's identity.
function drawVMark(ctx, ox, oy, sz, mainColor, accentColor) {
  var scale = sz / 28;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
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
  // Accent stroke on right arm — the V's signature flourish
  ctx.beginPath();
  ctx.moveTo(16.5*scale, 22*scale);
  ctx.lineTo(26*scale, 6*scale);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.8 * scale;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBackground(ctx, W, H) {
  // Vertical gradient — slightly richer in the centre to focus the eye on
  // the hero stat without overpowering it.
  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, B.bg1);
  grad.addColorStop(0.5, B.bg0);
  grad.addColorStop(1, B.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Subtle radial highlight behind the hero zone (centre-ish)
  var glow = ctx.createRadialGradient(W/2, H*0.45, 0, W/2, H*0.45, W*0.7);
  glow.addColorStop(0, B.accentGlow);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

function drawTopAccentBar(ctx, W) {
  var grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, B.accent);
  grad.addColorStop(0.5, B.accentSoft);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 6);
}

function drawTopBrand(ctx, W, pad, y) {
  // Small brand mark at the top — sets the tone without competing with
  // the session content. Bottom footer carries the bigger logo.
  var markSz = 32;
  drawVMark(ctx, pad, y - markSz * 0.86, markSz, B.textSecondary, B.accent);
  ctx.fillStyle = B.textSecondary;
  ctx.font = '700 22px Arial,sans-serif';
  ctx.fillText('olyume', pad + markSz + 4, y - 2);
}

// Branded footer — the real branding moment. Big V mark, wordmark, tagline,
// and URL. Lives at the bottom where Instagram Stories overlays its own UI
// (reply box / sticker buttons / share row) — keeping the brand above the
// fold of that chrome ensures it stays visible in every shared story.
function drawBrandFooter(ctx, W, H, pad, isSquare) {
  var footerH = isSquare ? 130 : 220;
  var fy = H - footerH;

  // Divider line above
  ctx.fillStyle = B.divider;
  ctx.fillRect(pad, fy, W - pad * 2, 1);

  // Big V + Volyume mark (centred)
  var markSz = isSquare ? 56 : 84;
  var wordFont = isSquare ? 44 : 68;
  ctx.font = '900 ' + wordFont + 'px Arial,sans-serif';
  var wordW = ctx.measureText('olyume').width;
  var blockW = markSz + 8 + wordW;
  var blockX = (W - blockW) / 2;
  var blockY = fy + (isSquare ? 36 : 56);

  drawVMark(ctx, blockX, blockY - markSz * 0.86, markSz, B.text, B.accent);
  ctx.fillStyle = B.text;
  ctx.fillText('olyume', blockX + markSz + 8, blockY - 4);

  // Tagline
  var tagFont = isSquare ? 18 : 26;
  ctx.fillStyle = B.accent;
  ctx.font = '600 ' + tagFont + 'px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SMARTER  TRAINING', W / 2, blockY + (isSquare ? 26 : 44));

  // URL — subtle bottom line
  if (!isSquare) {
    ctx.fillStyle = B.textMuted;
    ctx.font = '500 22px Arial,sans-serif';
    ctx.fillText('volyume.app', W / 2, H - 42);
  }
  ctx.textAlign = 'left';

  // Bottom accent bar
  var grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.5, B.accent);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - 4, W, 4);
}

// Intensity badge — auto-derived chip that gives a flavour read on the
// session. Computed in WorkoutSummaryScreen (heuristic from tonnage / sets /
// PR count) and passed in via p.intensityTier.
function drawIntensityBadge(ctx, W, y, tier) {
  if (!tier) return y;
  var label, badgeColor;
  if (tier === 'epic') { label = 'EPIC SESSION'; badgeColor = B.gold; }
  else if (tier === 'tough') { label = 'TOUGH SESSION'; badgeColor = B.accent; }
  else { label = 'SOLID SESSION'; badgeColor = B.textSecondary; }

  ctx.font = '700 22px Arial,sans-serif';
  var tw = ctx.measureText(label).width;
  var bw = tw + 60, bh = 44;
  var bx = (W - bw) / 2;
  ctx.fillStyle = badgeColor + '20';
  rrect(ctx, bx, y, bw, bh, 22);
  ctx.fill();
  ctx.strokeStyle = badgeColor + '60';
  ctx.lineWidth = 1.5;
  rrect(ctx, bx, y, bw, bh, 22);
  ctx.stroke();
  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'center';
  ctx.fillText(label, W / 2, y + 30);
  ctx.textAlign = 'left';
  return y + bh + 28;
}

// Top lift card — heaviest non-warmup set of the session. Often more
// motivating to share than aggregate tonnage because it's a single
// concrete number people can react to.
function drawTopLiftCard(ctx, W, pad, y, topSet, units) {
  if (!topSet) return y;
  var cardW = W - pad * 2;
  var cardH = 130;
  ctx.fillStyle = B.surface;
  rrect(ctx, pad, y, cardW, cardH, 18);
  ctx.fill();
  ctx.strokeStyle = B.border;
  ctx.lineWidth = 1.5;
  rrect(ctx, pad, y, cardW, cardH, 18);
  ctx.stroke();

  // Accent stripe on the left
  ctx.fillStyle = B.accent;
  rrect(ctx, pad, y, 6, cardH, 3);
  ctx.fill();

  ctx.fillStyle = B.textMuted;
  ctx.font = '700 18px Arial,sans-serif';
  ctx.fillText('TOP LIFT', pad + 28, y + 36);

  ctx.fillStyle = B.text;
  ctx.font = '900 46px Arial,sans-serif';
  var weightStr = (topSet.weight || 0) + (units || 'kg') + ' \xD7 ' + (topSet.reps || 0);
  ctx.fillText(weightStr, pad + 28, y + 84);

  ctx.fillStyle = B.textSecondary;
  ctx.font = '500 22px Arial,sans-serif';
  var name = topSet.exerciseName || '';
  // Right-align name on a single line, truncate with ellipsis if needed.
  var maxNameW = cardW - 80 - ctx.measureText(weightStr).width - 40;
  while (ctx.measureText(name).width > maxNameW && name.length > 4) {
    name = name.slice(0, -1);
  }
  if (name !== (topSet.exerciseName || '')) name = name.trim() + '…';
  ctx.textAlign = 'right';
  ctx.fillText(name, pad + cardW - 28, y + 84);
  ctx.textAlign = 'left';

  return y + cardH + 24;
}

// Exercise chips — show up to 5 exercises trained as compact pills.
function drawExerciseChips(ctx, W, pad, y, exercises) {
  if (!exercises || !exercises.length) return y;
  var visible = exercises.slice(0, 5);
  var x = pad, rowH = 48, gap = 10;
  ctx.font = '600 22px Arial,sans-serif';

  visible.forEach(function(name) {
    var tw = ctx.measureText(name).width;
    var chipW = tw + 36, chipH = rowH - 8;
    if (x + chipW > W - pad) { return; } // ran out of width; skip the rest
    ctx.fillStyle = B.surface2;
    rrect(ctx, x, y, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.strokeStyle = B.border;
    ctx.lineWidth = 1;
    rrect(ctx, x, y, chipW, chipH, chipH / 2);
    ctx.stroke();
    ctx.fillStyle = B.textSecondary;
    ctx.textAlign = 'center';
    ctx.fillText(name, x + chipW / 2, y + chipH * 0.66);
    ctx.textAlign = 'left';
    x += chipW + gap;
  });

  if (exercises.length > visible.length) {
    var more = '+' + (exercises.length - visible.length) + ' more';
    ctx.fillStyle = B.textMuted;
    ctx.font = '500 22px Arial,sans-serif';
    if (x + ctx.measureText(more).width < W - pad) {
      ctx.fillText(more, x, y + (rowH - 8) * 0.66);
    }
  }
  return y + rowH + 16;
}

// Motivational closer — only shown for tough / epic sessions to avoid
// being preachy on lighter days. Short, punchy, drops into the negative
// space between content and footer.
function drawMotivation(ctx, W, y, tier, prCount) {
  if (tier === 'solid' && prCount === 0) return y; // skip — don't be loud about an average day
  var line;
  if (prCount > 0) {
    line = prCount === 1 ? 'New PR. Banked.' : prCount + ' PRs. Levelled up.';
  } else if (tier === 'epic') {
    line = 'Earned. Every rep.';
  } else {
    line = 'Solid work. Recovery starts now.';
  }
  ctx.fillStyle = B.accent;
  ctx.font = '700 italic 32px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(line, W / 2, y);
  ctx.textAlign = 'left';
  return y + 50;
}

function drawSession(ctx, W, H, p) {
  var pad = Math.round(W * 0.074);
  drawBackground(ctx, W, H);
  drawTopAccentBar(ctx, W);

  var y = pad + 60;

  // ── Top brand + date ──
  drawTopBrand(ctx, W, pad, y);
  if (p.showDate && p.date) {
    ctx.fillStyle = B.textMuted;
    ctx.font = '500 22px Arial,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(p.date, W - pad, y - 2);
    ctx.textAlign = 'left';
  }
  y += 70;

  // ── Plan label (small accent) ──
  if (p.showPlanName && p.planName) {
    ctx.fillStyle = B.accent;
    ctx.font = '700 22px Arial,sans-serif';
    ctx.fillText(p.planName.toUpperCase(), pad, y);
    y += 36;
  }

  // ── Session name — hero text ──
  var heroFont = p.isSquare ? 64 : 78;
  ctx.fillStyle = B.text;
  var sessionName = p.sessionName || 'Session Complete';
  var lines = wrapText(
    (function() { ctx.font = '900 ' + heroFont + 'px Arial,sans-serif'; return ctx; })(),
    sessionName, W - pad * 2
  );
  lines.slice(0, 2).forEach(function(l) {
    ctx.fillText(l, pad, y + Math.round(heroFont * 0.82));
    y += Math.round(heroFont * 1.05);
  });
  y += 30;

  // ── HERO stat — big number that captures the session ──
  // If PRs hit: PR count. Else: total volume.
  var heroValue, heroLabel, heroColor;
  if (p.prCount > 0) {
    heroValue = String(p.prCount);
    heroLabel = p.prCount === 1 ? 'NEW PERSONAL RECORD' : 'NEW PERSONAL RECORDS';
    heroColor = B.gold;
  } else if (p.showVolume && (p.tonnage || 0) > 0) {
    heroValue = Math.round(p.tonnage).toLocaleString('en-GB');
    heroLabel = 'TOTAL KG LIFTED';
    heroColor = B.accent;
  } else {
    heroValue = String(p.workingSets || 0);
    heroLabel = 'WORKING SETS COMPLETED';
    heroColor = B.text;
  }

  var heroNumFont = p.isSquare ? 140 : 220;
  heroNumFont = fitFont(ctx, heroValue, W - pad * 2, heroNumFont);
  ctx.fillStyle = heroColor;
  ctx.font = '900 ' + heroNumFont + 'px Arial,sans-serif';
  ctx.textAlign = 'center';
  // Vertical position depends on format — story has more room above the footer
  var heroY = p.isSquare ? y + heroNumFont : H * 0.42;
  ctx.fillText(heroValue, W / 2, heroY);

  ctx.fillStyle = B.textSecondary;
  ctx.font = '700 ' + (p.isSquare ? 18 : 24) + 'px Arial,sans-serif';
  ctx.fillText(heroLabel, W / 2, heroY + (p.isSquare ? 30 : 50));
  ctx.textAlign = 'left';

  // Intensity badge below hero label
  y = heroY + (p.isSquare ? 60 : 90);
  y = drawIntensityBadge(ctx, W, y, p.intensityTier);

  // ── Support stats — 3 pill row ──
  var stats = [
    { label: 'Sets', value: String(p.workingSets || 0) },
    { label: 'Time', value: (p.duration || 0) + 'm' },
  ];
  if (p.showVolume && (p.tonnage || 0) > 0 && p.prCount > 0) {
    // Volume wasn't the hero (PRs were) — show it here.
    stats.push({ label: 'Total kg', value: Math.round(p.tonnage).toLocaleString('en-GB') });
  } else if (p.exerciseCount > 0) {
    stats.push({ label: 'Exercises', value: String(p.exerciseCount) });
  }

  var statBoxH = p.isSquare ? 100 : 130;
  var statGap = 14;
  var statBoxW = Math.floor((W - pad * 2 - statGap * (stats.length - 1)) / stats.length);
  stats.forEach(function(s, i) {
    var bx = pad + i * (statBoxW + statGap);
    ctx.fillStyle = B.surface;
    rrect(ctx, bx, y, statBoxW, statBoxH, 16);
    ctx.fill();
    ctx.strokeStyle = B.border;
    ctx.lineWidth = 1.2;
    rrect(ctx, bx, y, statBoxW, statBoxH, 16);
    ctx.stroke();
    ctx.fillStyle = B.text;
    ctx.font = '900 ' + (p.isSquare ? 42 : 52) + 'px Arial,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.value, bx + statBoxW / 2, y + statBoxH * 0.58);
    ctx.fillStyle = B.textMuted;
    ctx.font = '700 16px Arial,sans-serif';
    ctx.fillText(s.label.toUpperCase(), bx + statBoxW / 2, y + statBoxH - 18);
    ctx.textAlign = 'left';
  });
  y += statBoxH + 24;

  // ── Top lift card ──
  if (p.topSet && p.topSet.weight > 0 && !p.isSquare) {
    y = drawTopLiftCard(ctx, W, pad, y, p.topSet, 'kg');
  }

  // ── Exercise chips ──
  if (p.showExercises && p.exercises && p.exercises.length && !p.isSquare) {
    y = drawExerciseChips(ctx, W, pad, y, p.exercises);
  }

  // ── Motivational line ──
  if (!p.isSquare) {
    var footerStart = H - 220; // matches footerH in drawBrandFooter
    if (y < footerStart - 70) {
      drawMotivation(ctx, W, footerStart - 30, p.intensityTier, p.prCount);
    }
  }

  // ── Branded footer ──
  drawBrandFooter(ctx, W, H, pad, p.isSquare);
}

function drawPR(ctx, W, H, p) {
  var pad = Math.round(W * 0.074);
  drawBackground(ctx, W, H);
  drawTopAccentBar(ctx, W);

  // Stronger radial glow behind the weight number
  var glowY = H * 0.5;
  var glowR = W * 0.7;
  var glowGrad = ctx.createRadialGradient(W / 2, glowY, 0, W / 2, glowY, glowR);
  glowGrad.addColorStop(0, 'rgba(255,215,0,0.10)');
  glowGrad.addColorStop(0.6, 'rgba(245,158,11,0.04)');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // Top brand + date
  var brandY = pad + 60;
  drawTopBrand(ctx, W, pad, brandY);
  if (p.showDate && p.date) {
    ctx.fillStyle = B.textMuted;
    ctx.font = '500 22px Arial,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(p.date, W - pad, brandY - 2);
    ctx.textAlign = 'left';
  }

  // PR badge — premium gold treatment
  var badgeY = p.isSquare ? H * 0.22 : H * 0.22;
  ctx.font = '700 24px Arial,sans-serif';
  var label = '★  PERSONAL RECORD  ★';
  var lw = ctx.measureText(label).width;
  var bw = lw + 60, bh = 56;
  var bx = (W - bw) / 2;
  ctx.fillStyle = B.goldDim;
  rrect(ctx, bx, badgeY, bw, bh, bh / 2);
  ctx.fill();
  ctx.strokeStyle = B.gold + '70';
  ctx.lineWidth = 2;
  rrect(ctx, bx, badgeY, bw, bh, bh / 2);
  ctx.stroke();
  ctx.fillStyle = B.gold;
  ctx.textAlign = 'center';
  ctx.fillText(label, W / 2, badgeY + 38);
  ctx.textAlign = 'left';

  // Exercise name
  var exFont = p.isSquare ? 56 : 72;
  ctx.fillStyle = B.text;
  ctx.font = '800 ' + exFont + 'px Arial,sans-serif';
  ctx.textAlign = 'center';
  var exLines = wrapText(ctx, p.exerciseName || 'Exercise', W - pad * 2);
  var ey = badgeY + bh + 70;
  exLines.slice(0, 2).forEach(function(l) {
    ctx.fillText(l, W / 2, ey);
    ey += Math.round(exFont * 1.08);
  });
  ey += 30;

  // Weight × reps — the hero number
  var wStr = p.showPRWeight
    ? (p.weight || '-') + (p.units || 'kg') + ' \xD7 ' + (p.reps || '-')
    : (p.reps || '-') + ' reps';
  var baseFont = p.isSquare ? 110 : 160;
  var wFont = fitFont(ctx, wStr, W - pad * 1.6, baseFont);
  ctx.fillStyle = B.accent;
  ctx.font = '900 ' + wFont + 'px Arial,sans-serif';
  ctx.fillText(wStr, W / 2, ey + wFont);

  // Previous best — strikethrough style
  if (p.showPrevBest && p.previousBest) {
    var prevStr = 'Previous best: ' + p.previousBest + (p.units || 'kg');
    ctx.fillStyle = B.textMuted;
    ctx.font = '500 28px Arial,sans-serif';
    ctx.fillText(prevStr, W / 2, ey + wFont + 70);
  }
  ctx.textAlign = 'left';

  // Branded footer
  drawBrandFooter(ctx, W, H, pad, p.isSquare);
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
  // Default to story (Instagram-Stories first) — the richer, taller layout
  // is the primary use case. Square is the secondary option for feed posts.
  const [format, setFormat] = useState('story');
  const [sharing, setSharing] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);

  const [showVolume, setShowVolume] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showPlanName, setShowPlanName] = useState(true);
  const [showExercises, setShowExercises] = useState(true);
  const [showPRWeight, setShowPRWeight] = useState(true);
  const [showPrevBest, setShowPrevBest] = useState(true);

  const webViewRef = useRef(null);
  const pendingCapture = useRef(false);

  const isSquare = format === 'square';
  const isSession = cardType === 'session';

  function formatLongDate(ts) {
    // "Wed · 21 May 2026" — premium feel vs raw dd/mm/yyyy
    const d = ts ? new Date(ts) : new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function buildParams() {
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
    } else {
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

        {/* Format — story first (primary use case for Instagram) */}
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

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewOuter}>
            {isSession ? (
              <SessionPreview
                sessionData={sessionData}
                showVolume={showVolume}
                showDate={showDate}
                showPlanName={showPlanName}
                showExercises={showExercises}
                isSquare={isSquare}
                formatLongDate={formatLongDate}
              />
            ) : (
              <PRPreview
                prData={prData}
                showPRWeight={showPRWeight}
                showPrevBest={showPrevBest}
                showDate={showDate}
                isSquare={isSquare}
                formatLongDate={formatLongDate}
              />
            )}
          </View>
        </View>

        {/* Privacy */}
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
            {!isSession && (
              <>
                <ToggleRow label="PR weight" value={showPRWeight} onChange={setShowPRWeight} />
                <ToggleRow label="Previous best" value={showPrevBest} onChange={setShowPrevBest} last />
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
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={style}
      >
        {children}
      </LinearGradient>
    );
  }
  return <View style={[style, { backgroundColor: '#090A0F' }]}>{children}</View>;
}

function VMarkPreview({ size = 14, color, accentColor = '#F59E0B' }) {
  const finalColor = color || colors.textSecondary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ fontSize: size * 1.15, fontWeight: fontWeight.black, color: finalColor, lineHeight: size * 1.25, includeFontPadding: false }}>
        V
      </Text>
    </View>
  );
}

function BrandRowPreview({ size = 11, color }) {
  const finalColor = color || colors.textSecondary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
      <VMarkPreview size={size} color={finalColor} />
      <Text style={{ fontSize: size, fontWeight: fontWeight.bold, color: finalColor, letterSpacing: 0.3, includeFontPadding: false }}>
        olyume
      </Text>
    </View>
  );
}

function BrandFooterPreview({ isSquare }) {
  return (
    <View style={[pvStyles.footer, isSquare ? pvStyles.footerSq : pvStyles.footerSt]}>
      <View style={pvStyles.footerDivider} />
      <View style={pvStyles.footerBrand}>
        <BrandRowPreview size={isSquare ? 16 : 20} color="#FFFFFF" />
      </View>
      <Text style={[pvStyles.footerTagline, { fontSize: isSquare ? 7 : 9 }]}>SMARTER  TRAINING</Text>
      {!isSquare && <Text style={pvStyles.footerUrl}>volyume.app</Text>}
      <View style={pvStyles.footerAccent} />
    </View>
  );
}

function IntensityBadgePreview({ tier, isSquare }) {
  if (!tier) return null;
  let label, color;
  if (tier === 'epic') { label = 'EPIC SESSION'; color = colors.gold; }
  else if (tier === 'tough') { label = 'TOUGH SESSION'; color = colors.primary; }
  else { label = 'SOLID SESSION'; color = colors.textSecondary; }
  return (
    <View style={[pvStyles.intensityBadge, { borderColor: color + '60', backgroundColor: color + '20' }]}>
      <Text style={[pvStyles.intensityText, { color, fontSize: isSquare ? 7 : 8 }]}>{label}</Text>
    </View>
  );
}

function SessionPreview({ sessionData: s, showVolume, showDate, showPlanName, showExercises, isSquare, formatLongDate }) {
  const d = s || {};
  const dateStr = formatLongDate(d.date);

  // Hero stat (mirrors canvas logic)
  let heroValue, heroLabel, heroColor;
  if ((d.prCount || 0) > 0) {
    heroValue = String(d.prCount);
    heroLabel = d.prCount === 1 ? 'NEW PR' : 'NEW PRS';
    heroColor = colors.gold;
  } else if (showVolume && (d.tonnage || 0) > 0) {
    heroValue = Math.round(d.tonnage).toLocaleString('en-GB');
    heroLabel = 'TOTAL KG LIFTED';
    heroColor = colors.primary;
  } else {
    heroValue = String(d.workingSets || 0);
    heroLabel = 'WORKING SETS';
    heroColor = colors.textPrimary;
  }

  const stats = [
    { label: 'Sets', value: String(d.workingSets || 0) },
    { label: 'Time', value: `${d.duration || 0}m` },
    ...((showVolume && (d.tonnage || 0) > 0 && (d.prCount || 0) > 0)
      ? [{ label: 'Total kg', value: Math.round(d.tonnage).toLocaleString('en-GB') }]
      : (d.exerciseCount || 0) > 0
        ? [{ label: 'Exercises', value: String(d.exerciseCount) }]
        : []),
  ];

  return (
    <GradientBg style={[pvStyles.card, isSquare ? pvStyles.square : pvStyles.story]}>
      <View style={pvStyles.topAccent} />

      <View style={pvStyles.headerRow}>
        <BrandRowPreview size={isSquare ? 11 : 10} color={colors.textSecondary} />
        {showDate && (
          <Text style={[pvStyles.dateText, { fontSize: isSquare ? 8 : 7 }]}>{dateStr}</Text>
        )}
      </View>

      {showPlanName && d.planName ? (
        <Text style={pvStyles.planLabel} numberOfLines={1}>{d.planName.toUpperCase()}</Text>
      ) : null}

      <Text style={[pvStyles.heroText, isSquare ? pvStyles.heroTextSq : pvStyles.heroTextSt]} numberOfLines={2}>
        {d.sessionName || 'Session Complete'}
      </Text>

      {/* Hero stat */}
      <View style={pvStyles.heroStatBlock}>
        <Text style={[pvStyles.heroNumber, { color: heroColor, fontSize: isSquare ? 48 : 72 }]} numberOfLines={1} adjustsFontSizeToFit>
          {heroValue}
        </Text>
        <Text style={[pvStyles.heroLabel, { fontSize: isSquare ? 8 : 10 }]}>{heroLabel}</Text>
      </View>

      <IntensityBadgePreview tier={d.intensityTier} isSquare={isSquare} />

      {/* Stats */}
      <View style={pvStyles.statsRow}>
        {stats.map((st, i) => (
          <View key={i} style={pvStyles.statBox}>
            <Text style={[pvStyles.statValue, { fontSize: isSquare ? 14 : 16 }]}>{st.value}</Text>
            <Text style={pvStyles.statLabel}>{st.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {/* Top lift (story only — needs the space) */}
      {!isSquare && d.topSet && d.topSet.weight > 0 && (
        <View style={pvStyles.topLiftCard}>
          <View style={pvStyles.topLiftStripe} />
          <View style={pvStyles.topLiftBody}>
            <Text style={pvStyles.topLiftLabel}>TOP LIFT</Text>
            <Text style={pvStyles.topLiftValue}>{d.topSet.weight}kg × {d.topSet.reps}</Text>
          </View>
          <Text style={pvStyles.topLiftName} numberOfLines={1}>{d.topSet.exerciseName}</Text>
        </View>
      )}

      {/* Exercise chips (story only) */}
      {!isSquare && showExercises && d.exercises?.length > 0 && (
        <View style={pvStyles.chipsRow}>
          {d.exercises.slice(0, 4).map((name, i) => (
            <View key={i} style={pvStyles.chip}>
              <Text style={pvStyles.chipText} numberOfLines={1}>{name}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flex: 1 }} />
      <BrandFooterPreview isSquare={isSquare} />
    </GradientBg>
  );
}

function PRPreview({ prData: p, showPRWeight, showPrevBest, showDate, isSquare, formatLongDate }) {
  const d = p || {};
  const dateStr = formatLongDate(d.date);
  const weightStr = showPRWeight
    ? `${d.weight || '—'}${d.units || 'kg'} × ${d.reps || '—'}`
    : `${d.reps || '—'} reps`;

  return (
    <GradientBg style={[pvStyles.card, isSquare ? pvStyles.square : pvStyles.story]}>
      <View style={pvStyles.topAccent} />

      <View style={pvStyles.headerRow}>
        <BrandRowPreview size={isSquare ? 11 : 10} color={colors.textSecondary} />
        {showDate && (
          <Text style={[pvStyles.dateText, { fontSize: isSquare ? 8 : 7 }]}>{dateStr}</Text>
        )}
      </View>

      <View style={pvStyles.prCenter}>
        <View style={pvStyles.prBadge}>
          <Text style={pvStyles.prBadgeText}>★  PERSONAL RECORD  ★</Text>
        </View>

        <Text style={[pvStyles.prExercise, isSquare ? pvStyles.prExerciseSq : pvStyles.prExerciseSt]} numberOfLines={2}>
          {d.exerciseName || 'Exercise'}
        </Text>

        <Text style={[pvStyles.prWeight, isSquare ? pvStyles.prWeightSq : pvStyles.prWeightSt]} numberOfLines={1} adjustsFontSizeToFit>
          {weightStr}
        </Text>

        {showPrevBest && d.previousBest && (
          <Text style={pvStyles.prPrevBest}>
            Previous best: {d.previousBest}{d.units || 'kg'}
          </Text>
        )}
      </View>

      <BrandFooterPreview isSquare={isSquare} />
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
  square: { width: 280, height: 280 },
  story: { width: 175, height: 311 }, // 9:16 ratio
  topAccent: { height: 3, backgroundColor: colors.primary },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: 2,
  },
  dateText: { color: colors.textMuted, fontWeight: fontWeight.medium },
  planLabel: {
    fontSize: 8, color: colors.primary, fontWeight: fontWeight.bold,
    letterSpacing: 1, paddingHorizontal: spacing.sm,
  },
  heroText: {
    fontWeight: fontWeight.black, color: colors.textPrimary,
    paddingHorizontal: spacing.sm, marginTop: 2,
  },
  heroTextSq: { fontSize: 16, lineHeight: 19 },
  heroTextSt: { fontSize: 12, lineHeight: 14 },
  heroStatBlock: {
    alignItems: 'center', marginVertical: 6,
  },
  heroNumber: {
    fontWeight: fontWeight.black, lineHeight: undefined, includeFontPadding: false,
  },
  heroLabel: {
    color: colors.textSecondary, fontWeight: fontWeight.bold,
    letterSpacing: 0.5, marginTop: 2,
  },
  intensityBadge: {
    alignSelf: 'center', borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 2, marginVertical: 4,
  },
  intensityText: { fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  statsRow: {
    flexDirection: 'row', gap: 5,
    paddingHorizontal: spacing.sm, marginTop: 4,
  },
  statBox: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 6,
    paddingVertical: 5, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontWeight: fontWeight.black, color: colors.textPrimary, lineHeight: 16 },
  statLabel: { fontSize: 6, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 0.3, marginTop: 1 },
  topLiftCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.sm, marginTop: 5,
    backgroundColor: colors.surface, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  topLiftStripe: { width: 3, backgroundColor: colors.primary, alignSelf: 'stretch' },
  topLiftBody: { flex: 1, paddingVertical: 4, paddingHorizontal: 6 },
  topLiftLabel: { fontSize: 5.5, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  topLiftValue: { fontSize: 11, color: colors.textPrimary, fontWeight: fontWeight.black },
  topLiftName: { fontSize: 7, color: colors.textSecondary, paddingRight: 6, maxWidth: 60 },
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 3,
    paddingHorizontal: spacing.sm, marginTop: 5,
  },
  chip: {
    backgroundColor: colors.surface2, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 0.5, borderColor: colors.border,
  },
  chipText: { fontSize: 6.5, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  footer: {
    alignItems: 'center', paddingHorizontal: spacing.sm,
    borderTopWidth: 0,
  },
  footerSq: { paddingTop: 6, paddingBottom: 6 },
  footerSt: { paddingTop: 10, paddingBottom: 6 },
  footerDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)',
    width: '90%', marginBottom: 6,
  },
  footerBrand: { marginBottom: 2 },
  footerTagline: {
    color: colors.primary, fontWeight: fontWeight.bold,
    letterSpacing: 1, marginTop: 1,
  },
  footerUrl: {
    fontSize: 6.5, color: colors.textMuted,
    fontWeight: fontWeight.medium, marginTop: 2,
  },
  footerAccent: { height: 2, backgroundColor: colors.primary, width: '40%', marginTop: 6, borderRadius: 1 },
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
  prExerciseSq: { fontSize: 15 },
  prExerciseSt: { fontSize: 12 },
  prWeight: { fontWeight: fontWeight.black, color: colors.primary, textAlign: 'center' },
  prWeightSq: { fontSize: 28 },
  prWeightSt: { fontSize: 24 },
  prPrevBest: { fontSize: 8, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
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
