import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';
import { useToast } from '../components/Toast';

let WebView;
let FileSystem;
let Sharing;
let LinearGradient;
let Print;
let Asset;
try { WebView = require('react-native-webview').WebView; } catch (_) {}
try { FileSystem = require('expo-file-system/legacy'); } catch (_) {}
try { Sharing = require('expo-sharing'); } catch (_) {}
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}
try { Print = require('expo-print'); } catch (_) {}
try { Asset = require('expo-asset').Asset; } catch (_) {}

// The real wordmark, embedded into the off-screen canvas and shown in the
// preview, so the card carries the actual Volyume logo rather than a V mark
// drawn with strokes plus "olyume" set in Arial. 1032×277 RGBA.
// eslint-disable-next-line global-require
const WORDMARK = require('../../assets/volyume-wordmark.png');

// ──────────────────────────────────────────────────────────────────────────────
// Canvas HTML, renders off-screen, exports a high-res PNG.
//
// Story format is 1080×1920 (Instagram Stories / TikTok / Snapchat). The
// vertical space gives us room to do the brand justice: big session name at
// top, a hero stat in the middle, support stats + top lift + muscle chips
// below, and a generous branded footer at the bottom where Instagram
// usually overlays its UI, so the V mark stays visible above their chrome.
// Square 1080×1080 is the secondary format for feed posts.
// ──────────────────────────────────────────────────────────────────────────────
export const WEBVIEW_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0D0D0D;">
<canvas id="c" style="display:block;"></canvas>
<script>
// Brand palette, mirrors the locked theme.js tokens (background #0D0D0D
// neutral black, primary amber #F5A623). The old values were blue-tinted
// blacks and a slightly-off amber, so an exported card did not read as
// unmistakably Volyume. Aligned 2026-05-30.
var B = {
  bg0:'#0D0D0D', bg1:'#141413', bg2:'#191917',
  surface:'#222220', surface2:'#2A2A27',
  border:'#343431', borderFaint:'#2E2E2C',
  accent:'#F5A623', accentSoft:'#F7B84B', accentDim:'rgba(245,166,35,0.18)',
  accentGlow:'rgba(245,166,35,0.10)',
  gold:'#FFD700', goldDim:'rgba(255,215,0,0.15)',
  text:'#FFFFFF', textSecondary:'#9E9E9E', textMuted:'#727272',
  divider:'rgba(255,255,255,0.06)'
};

// withAlpha mirrors styles/theme.js. This script runs inside the WebView, which
// has no access to the React Native module scope, so the helper has to be
// defined here. It used to be inlined as a "color + 20" hex-alpha concat; the
// app-wide withAlpha migration (ad5f75b) swapped those for withAlpha() calls but
// the canvas had no such function, so every session card (intensity badge) and
// PR card (badge) threw "withAlpha is not defined" and surfaced to the user as
// "Couldn't generate card, try again". Keep this in sync with the theme helper.
function withAlpha(color, alpha) {
  var a = Math.max(0, Math.min(1, isFinite(alpha) ? alpha : 1));
  if (typeof color !== 'string') return color;
  var c = color.trim();
  if (c.charAt(0) === '#') {
    var hex = c.slice(1);
    if (hex.length === 3) hex = hex.split('').map(function(ch){ return ch + ch; }).join('');
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length !== 6) return color;
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return color;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
  }
  var m = c.match(/^rgba?\(\s*([^)]+)\)$/i);
  if (m) {
    var parts = m[1].split(',');
    if (parts.length < 3) return color;
    return 'rgba(' + parts[0].trim() + ', ' + parts[1].trim() + ', ' + parts[2].trim() + ', ' + a + ')';
  }
  return color;
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

// Volyume V mark, exact SVG paths scaled. Used at top (small, muted) and
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
  // Accent stroke on right arm, the V's signature flourish
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
  // Vertical gradient, slightly richer in the centre to focus the eye on
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
  // Subtle card border, matching the in-app preview's 1px frame so the
  // exported image reads as the same bordered card, not a bleed.
  ctx.strokeStyle = B.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
}

function drawTopAccentBar(ctx, W) {
  // Solid full-width amber bar, matching the in-app preview's topAccent
  // (the old left-to-right fade-to-transparent read as "no accent" once
  // exported). 8px on the 1080-wide canvas mirrors the preview's 3px bar.
  ctx.fillStyle = B.accent;
  ctx.fillRect(0, 0, W, 8);
}

function drawTopBrand() {
  // Top-left logo removed (founder direction 2026-06-06): the brand now lives
  // once, big, in the footer, matching the in-app preview. The date still
  // prints top-right from each card's own draw. Kept as a no-op so the call
  // sites stay stable.
}

// Branded footer, the real branding moment. Big V mark, wordmark, tagline,
// and URL. Lives at the bottom where Instagram Stories overlays its own UI
// (reply box / sticker buttons / share row), keeping the brand above the
// fold of that chrome ensures it stays visible in every shared story.
function drawBrandFooter(ctx, W, H, pad, isSquare) {
  var footerH = isSquare ? 130 : 220;
  var fy = H - footerH;

  // Divider line above
  ctx.fillStyle = B.divider;
  ctx.fillRect(pad, fy, W - pad * 2, 1);

  // Big Volyume wordmark, centred: the single branding moment, matching the
  // in-app preview's footer. Uses the real wordmark image; if it did not
  // decode, falls back to the V mark + "olyume" centred so something on-brand
  // always shows.
  var markH = isSquare ? 40 : 56;
  var markY = fy + (isSquare ? 16 : 28);
  var logo = window.__logoImg;
  if (logo && logo.complete && logo.naturalWidth) {
    var mw = markH * (logo.naturalWidth / logo.naturalHeight);
    ctx.drawImage(logo, (W - mw) / 2, markY, mw, markH);
  } else {
    ctx.font = '700 ' + Math.round(markH * 0.72) + 'px Arial,sans-serif';
    ctx.textAlign = 'left';
    var txt = 'olyume';
    var tw = ctx.measureText(txt).width;
    var totalW = markH + 6 + tw;
    var sx = (W - totalW) / 2;
    drawVMark(ctx, sx, markY, markH, B.text, B.accent);
    ctx.fillStyle = B.text;
    ctx.fillText(txt, sx + markH + 6, markY + markH * 0.78);
  }

  // Tagline
  var taglineY = fy + (isSquare ? 84 : 130);
  var tagFont = isSquare ? 18 : 26;
  ctx.fillStyle = B.accent;
  ctx.font = '600 ' + tagFont + 'px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SMARTER  TRAINING', W / 2, taglineY);

  // Short centred amber accent directly under the tagline (matches the
  // preview's footerAccent: 40% width, amber).
  var accW = (W - pad * 2) * 0.4;
  ctx.fillStyle = B.accent;
  ctx.fillRect((W - accW) / 2, taglineY + (isSquare ? 12 : 16), accW, 3);

  // URL, subtle bottom line (story only)
  if (!isSquare) {
    ctx.fillStyle = B.textMuted;
    ctx.font = '500 22px Arial,sans-serif';
    ctx.fillText('volyume.app', W / 2, H - 34);
  }
  ctx.textAlign = 'left';
}

// Intensity badge, auto-derived chip that gives a flavour read on the
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
  ctx.fillStyle = withAlpha(badgeColor, 0.125);
  rrect(ctx, bx, y, bw, bh, 22);
  ctx.fill();
  ctx.strokeStyle = withAlpha(badgeColor, 0.376);
  ctx.lineWidth = 1.5;
  rrect(ctx, bx, y, bw, bh, 22);
  ctx.stroke();
  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'center';
  ctx.fillText(label, W / 2, y + 30);
  ctx.textAlign = 'left';
  return y + bh + 28;
}

// Top lift card, heaviest non-warmup set of the session. Often more
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

// Exercise chips, show up to 5 exercises trained as compact pills.
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

// Motivational closer, only shown for tough / epic sessions to avoid
// being preachy on lighter days. Short, punchy, drops into the negative
// space between content and footer.
function drawMotivation(ctx, W, y, tier, prCount) {
  if (tier === 'solid' && prCount === 0) return y; // skip, don't be loud about an average day
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

  // ── Session name, hero text ──
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

  // ── HERO stat, big number that captures the session ──
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
  // Vertical position depends on format, story has more room above the footer
  var heroY = p.isSquare ? y + heroNumFont : H * 0.42;
  ctx.fillText(heroValue, W / 2, heroY);

  ctx.fillStyle = B.textSecondary;
  ctx.font = '700 ' + (p.isSquare ? 18 : 24) + 'px Arial,sans-serif';
  ctx.fillText(heroLabel, W / 2, heroY + (p.isSquare ? 30 : 50));
  ctx.textAlign = 'left';

  // Intensity badge below hero label
  y = heroY + (p.isSquare ? 60 : 90);
  y = drawIntensityBadge(ctx, W, y, p.intensityTier);

  // ── Support stats, 3 pill row ──
  var stats = [
    { label: 'Sets', value: String(p.workingSets || 0) },
    { label: 'Time', value: (p.duration || 0) + 'm' },
  ];
  if (p.showVolume && (p.tonnage || 0) > 0 && p.prCount > 0) {
    // Volume wasn't the hero (PRs were), show it here.
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
  glowGrad.addColorStop(0.6, 'rgba(245,166,35,0.04)');
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

  // PR badge, premium gold treatment
  var badgeY = p.isSquare ? H * 0.22 : H * 0.22;
  ctx.font = '700 24px Arial,sans-serif';
  var label = '★  PERSONAL RECORD  ★';
  var lw = ctx.measureText(label).width;
  var bw = lw + 60, bh = 56;
  var bx = (W - bw) / 2;
  ctx.fillStyle = B.goldDim;
  rrect(ctx, bx, badgeY, bw, bh, bh / 2);
  ctx.fill();
  ctx.strokeStyle = withAlpha(B.gold, 0.439);
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

  // Weight × reps, the hero number
  var wStr = p.showPRWeight
    ? (p.weight || '-') + (p.units || 'kg') + ' \xD7 ' + (p.reps || '-')
    : (p.reps || '-') + ' reps';
  var baseFont = p.isSquare ? 110 : 160;
  var wFont = fitFont(ctx, wStr, W - pad * 1.6, baseFont);
  ctx.fillStyle = B.accent;
  ctx.font = '900 ' + wFont + 'px Arial,sans-serif';
  ctx.fillText(wStr, W / 2, ey + wFont);

  // Previous best, strikethrough style
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

// Milestone card. One generic hero-stat layout reused for a year-in-review
// (Year of Lifts) and a weekly coach summary. Reports facts only, no
// cheerleading, per the voice rules. Reuses the same primitives as the
// session card so it reads as the same family.
function drawMilestone(ctx, W, H, p) {
  var pad = Math.round(W * 0.074);
  drawBackground(ctx, W, H);
  drawTopAccentBar(ctx, W);

  var y = pad + 60;

  // Top brand + optional date
  drawTopBrand(ctx, W, pad, y);
  if (p.showDate && p.date) {
    ctx.fillStyle = B.textMuted;
    ctx.font = '500 22px Arial,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(p.date, W - pad, y - 2);
    ctx.textAlign = 'left';
  }
  y += 70;

  // Eyebrow (small accent label)
  if (p.eyebrow) {
    ctx.fillStyle = B.accent;
    ctx.font = '700 22px Arial,sans-serif';
    ctx.fillText(String(p.eyebrow).toUpperCase(), pad, y);
    y += 36;
  }

  // Title, hero text (up to two lines)
  var titleFont = p.isSquare ? 60 : 74;
  ctx.fillStyle = B.text;
  var title = p.title || '';
  var titleLines = wrapText(
    (function() { ctx.font = '900 ' + titleFont + 'px Arial,sans-serif'; return ctx; })(),
    title, W - pad * 2
  );
  titleLines.slice(0, 2).forEach(function(l) {
    ctx.fillText(l, pad, y + Math.round(titleFont * 0.82));
    y += Math.round(titleFont * 1.05);
  });
  y += 24;

  // Hero value
  var heroValue = String(p.heroValue != null ? p.heroValue : '');
  var heroNumFont = p.isSquare ? 140 : 220;
  heroNumFont = fitFont(ctx, heroValue, W - pad * 2, heroNumFont);
  ctx.fillStyle = B.accent;
  ctx.font = '900 ' + heroNumFont + 'px Arial,sans-serif';
  ctx.textAlign = 'center';
  var heroY = p.isSquare ? y + heroNumFont : H * 0.42;
  ctx.fillText(heroValue, W / 2, heroY);

  if (p.heroUnit) {
    ctx.fillStyle = B.textSecondary;
    ctx.font = '700 ' + (p.isSquare ? 18 : 24) + 'px Arial,sans-serif';
    ctx.fillText(String(p.heroUnit).toUpperCase(), W / 2, heroY + (p.isSquare ? 30 : 50));
  }
  ctx.textAlign = 'left';

  y = heroY + (p.isSquare ? 64 : 100);

  // Caption (factual one-liner, up to two lines)
  if (p.caption) {
    ctx.fillStyle = B.textMuted;
    ctx.font = '500 ' + (p.isSquare ? 22 : 28) + 'px Arial,sans-serif';
    ctx.textAlign = 'center';
    var capLines = wrapText(ctx, String(p.caption), W - pad * 2);
    capLines.slice(0, 2).forEach(function(l) {
      ctx.fillText(l, W / 2, y);
      y += (p.isSquare ? 30 : 38);
    });
    ctx.textAlign = 'left';
    y += 16;
  }

  // Support stats (up to three pills)
  var stats = (p.stats || []).slice(0, 3);
  if (stats.length) {
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
      var sv = fitFont(ctx, String(s.value), statBoxW - 24, (p.isSquare ? 40 : 50));
      ctx.font = '900 ' + sv + 'px Arial,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(s.value), bx + statBoxW / 2, y + statBoxH * 0.56);
      ctx.fillStyle = B.textMuted;
      ctx.font = '700 16px Arial,sans-serif';
      ctx.fillText(String(s.label).toUpperCase(), bx + statBoxW / 2, y + statBoxH - 18);
      ctx.textAlign = 'left';
    });
    y += statBoxH + 24;
  }

  drawBrandFooter(ctx, W, H, pad, p.isSquare);
}

function paintCard() {
  var p = window.__cardParams;
  if (!p) return;
  var W = 1080, H = p.isSquare ? 1080 : 1920;
  var c = document.getElementById('c');
  c.width = W; c.height = H;
  var ctx = c.getContext('2d');
  if (p.cardType === 'pr') { drawPR(ctx, W, H, p); }
  else if (p.cardType === 'milestone') { drawMilestone(ctx, W, H, p); }
  else { drawSession(ctx, W, H, p); }
  window.ReactNativeWebView.postMessage(JSON.stringify({ base64: c.toDataURL('image/png'), isSquare: p.isSquare }));
}

window.drawCard = function() {
  var p = window.__cardParams;
  if (!p) return;
  // Guard the paint so a failure in the async image path still reports back,
  // instead of leaving the native side waiting on a frame that never comes.
  function safePaint() {
    try { paintCard(); }
    catch (e) { window.ReactNativeWebView.postMessage(JSON.stringify({ error: String((e && e.message) || e) })); }
  }
  // Preload the wordmark, then paint. toDataURL is synchronous, so the image
  // must be decoded before we draw or the logo would be missing from the
  // export. If it is already cached or no URI was passed, paint immediately.
  if (p.logoDataUri && (!window.__logoImg || window.__logoImg.src !== p.logoDataUri)) {
    var img = new Image();
    // Paint at most once. The brand draw already falls back to a vector
    // wordmark when the image is absent, so a logo that never decodes must
    // never block the export: on some Android WebViews a malformed or large
    // data-URI fires neither onload NOR onerror and just hangs, which left the
    // capture waiting forever (surfaced to the user as "Couldn't generate").
    // A 2s watchdog paints with the vector fallback so a frame always comes.
    var painted = false;
    function paintOnce(loaded) {
      if (painted) return;
      painted = true;
      window.__logoImg = loaded || null;
      safePaint();
    }
    img.onload = function() { paintOnce(img); };
    img.onerror = function() { paintOnce(null); };
    setTimeout(function () { paintOnce(window.__logoImg || null); }, 2000);
    img.src = p.logoDataUri;
    return;
  }
  safePaint();
};
<\/script>
</body>
</html>`;

export default function ShareCardScreen({ route }) {
  const toast = useToast();
  const {
    sessionData = null,
    prData = null,
    milestoneData = null,
  } = route.params || {};

  // Session is the default whenever session data is present (founder
  // direction) so a workout share leads with the session card even when it
  // also carries a PR. The standalone "Share this PR" path passes prData only,
  // so it still opens as a PR card.
  const [cardType, setCardType] = useState(
    sessionData ? 'session' : prData ? 'pr' : milestoneData ? 'milestone' : 'session',
  );
  // Default to square 1:1 (founder direction): it posts cleanly to a feed and
  // crops predictably everywhere. Story stays available as the taller option.
  const [format, setFormat] = useState('square');
  const [sharing, setSharing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);

  const [showVolume, setShowVolume] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showPlanName, setShowPlanName] = useState(true);
  const [showExercises, setShowExercises] = useState(true);
  const [showPRWeight, setShowPRWeight] = useState(true);
  const [showPrevBest, setShowPrevBest] = useState(true);

  const webViewRef = useRef(null);
  const pendingCapture = useRef(false);
  // Failsafe timer: if the off-screen WebView never posts a frame back (a
  // silent draw/encode failure), this clears the spinner instead of leaving
  // it hanging forever.
  const captureTimeout = useRef(null);

  // Read the bundled wordmark once and hold it as a base64 data URI so the
  // off-screen canvas can draw the real logo. Best-effort: if it fails the
  // canvas falls back to the drawn mark.
  const [logoDataUri, setLogoDataUri] = useState('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!Asset || !FileSystem) return;
        const asset = Asset.fromModule(WORDMARK);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        if (!uri) return;
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        if (!cancelled) setLogoDataUri(`data:image/png;base64,${b64}`);
      } catch (_e) { /* fall back to the drawn mark */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Clear the capture failsafe timer if the screen unmounts mid-share.
  useEffect(() => () => {
    if (captureTimeout.current) clearTimeout(captureTimeout.current);
  }, []);

  const isSquare = format === 'square';
  const isSession = cardType === 'session';
  const isMilestone = cardType === 'milestone';

  function formatLongDate(ts) {
    // "Wed · 21 May 2026", premium feel vs raw dd/mm/yyyy
    const d = ts ? new Date(ts) : new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function buildParams() {
    if (isMilestone) {
      const m = milestoneData || {};
      return {
        cardType: 'milestone', isSquare, showDate,
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
      toast.show('Sharing needs a rebuild with the sharing packages installed', { variant: 'error', duration: 5000 });
      return;
    }
    if (!webViewRef.current || !webViewReady) {
      toast.show('Not ready yet, wait a moment and try again', { variant: 'info' });
      return;
    }
    setSharing(true);
    pendingCapture.current = true;
    const params = { ...buildParams(), logoDataUri };
    // If the draw or encode throws inside the WebView, surface it as a message
    // so the capture handler can stop the spinner and show an error.
    if (captureTimeout.current) clearTimeout(captureTimeout.current);
    captureTimeout.current = setTimeout(() => {
      if (!pendingCapture.current) return;
      pendingCapture.current = false;
      setSharing(false);
      toast.show("Couldn't generate card, try again", { variant: 'error' });
    }, 10000);
    webViewRef.current.injectJavaScript(
      `try { window.__cardParams = ${JSON.stringify(params)}; window.drawCard(); }`
      + ` catch (e) { window.ReactNativeWebView.postMessage(JSON.stringify({ error: String((e && e.message) || e) })); } true;`
    );
  }

  async function handleWebViewMessage(event) {
    if (!pendingCapture.current) return;
    pendingCapture.current = false;
    if (captureTimeout.current) { clearTimeout(captureTimeout.current); captureTimeout.current = null; }
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.error) { toast.show("Couldn't generate card, try again", { variant: 'error' }); return; }
      const { base64, isSquare: sq } = data;
      const pure = base64.replace(/^data:image\/png;base64,/, '');
      const filename = `volyume-${cardType}-card-${sq ? 'square' : 'story'}.png`;
      const uri = (FileSystem.cacheDirectory || '') + filename;
      await FileSystem.writeAsStringAsync(uri, pure, { encoding: FileSystem.EncodingType.Base64 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { toast.show('Sharing not available on this device', { variant: 'warning' }); return; }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png', UTI: 'public.png',
        dialogTitle: cardType === 'session' ? 'Share Session Card' : cardType === 'pr' ? 'Share PR Card' : 'Share Card',
      });
    } catch (_e) {
      toast.show("Couldn't generate card, try again", { variant: 'error' });
    } finally {
      setSharing(false);
    }
  }

  // Build a one-page PDF summary from the same data the card uses. Plain
  // branded HTML (locked #0D0D0D background, amber accent, no gradients)
  // rather than a screenshot, so the text stays crisp at print size.
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Card type. Shown per the data the screen was opened with. */}
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
        </View>

        {/* Format, story first (primary use case for Instagram) */}
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
            {isMilestone ? (
              <MilestonePreview
                milestoneData={milestoneData}
                showDate={showDate}
                isSquare={isSquare}
                formatLongDate={formatLongDate}
              />
            ) : isSession ? (
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
            {cardType === 'pr' && (
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
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color={colors.onPrimary} />
              <Text style={styles.shareBtnText}>
                {cardType === 'session' ? 'Share Session Card' : cardType === 'pr' ? 'Share PR Card' : 'Share Card'}
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
        colors={['#141413', '#0D0D0D', '#191917']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={style}
      >
        {children}
      </LinearGradient>
    );
  }
  return <View style={[style, { backgroundColor: '#0D0D0D' }]}>{children}</View>;
}

// Wordmark aspect ratio (1032×277). Drawn as the real logo image so the
// preview matches the exported card.
const WORDMARK_RATIO = 1032 / 277;

function BrandRowPreview({ size = 11, opacity = 1 }) {
  // `size` is the cap height; render the wordmark a little taller than the
  // old text so it reads as the logo, not a label.
  const h = size * 1.5;
  return (
    <Image
      source={WORDMARK}
      style={{ height: h, width: h * WORDMARK_RATIO, opacity }}
      resizeMode="contain"
    />
  );
}

function BrandFooterPreview({ isSquare }) {
  return (
    <View style={[pvStyles.footer, isSquare ? pvStyles.footerSq : pvStyles.footerSt]}>
      <View style={pvStyles.footerDivider} />
      <View style={pvStyles.footerBrand}>
        <BrandRowPreview size={isSquare ? 16 : 20} />
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
    <View style={[pvStyles.intensityBadge, { borderColor: withAlpha(color, 0.376), backgroundColor: withAlpha(color, 0.125) }]}>
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
        <BrandRowPreview size={isSquare ? 11 : 10} opacity={0.6} />
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

      {/* Top lift (story only, needs the space) */}
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
    ? `${d.weight || '-'}${d.units || 'kg'} × ${d.reps || '-'}`
    : `${d.reps || '-'} reps`;

  return (
    <GradientBg style={[pvStyles.card, isSquare ? pvStyles.square : pvStyles.story]}>
      <View style={pvStyles.topAccent} />

      <View style={pvStyles.headerRow}>
        <BrandRowPreview size={isSquare ? 11 : 10} opacity={0.6} />
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

function MilestonePreview({ milestoneData: m, showDate, isSquare, formatLongDate }) {
  const d = m || {};
  const dateStr = d.date ? formatLongDate(d.date) : '';
  const stats = Array.isArray(d.stats) ? d.stats.slice(0, 3) : [];
  return (
    <GradientBg style={[pvStyles.card, isSquare ? pvStyles.square : pvStyles.story]}>
      <View style={pvStyles.topAccent} />

      <View style={pvStyles.headerRow}>
        <BrandRowPreview size={isSquare ? 11 : 10} opacity={0.6} />
        {showDate && !!dateStr && (
          <Text style={[pvStyles.dateText, { fontSize: isSquare ? 8 : 7 }]}>{dateStr}</Text>
        )}
      </View>

      <View style={pvStyles.msCenter}>
        {!!d.eyebrow && (
          <Text style={pvStyles.msEyebrow} numberOfLines={1}>{String(d.eyebrow).toUpperCase()}</Text>
        )}
        {!!d.title && (
          <Text style={[pvStyles.msTitle, isSquare ? pvStyles.msTitleSq : pvStyles.msTitleSt]} numberOfLines={2}>
            {d.title}
          </Text>
        )}
        <Text style={[pvStyles.msHero, isSquare ? pvStyles.msHeroSq : pvStyles.msHeroSt]} numberOfLines={1} adjustsFontSizeToFit>
          {d.heroValue != null ? String(d.heroValue) : ''}
        </Text>
        {!!d.heroUnit && <Text style={pvStyles.msUnit}>{String(d.heroUnit).toUpperCase()}</Text>}
        {!!d.caption && <Text style={pvStyles.msCaption} numberOfLines={2}>{d.caption}</Text>}
        {stats.length > 0 && (
          <View style={pvStyles.msStatRow}>
            {stats.map((s, i) => (
              <View key={i} style={pvStyles.msStat}>
                <Text style={pvStyles.msStatValue} numberOfLines={1} adjustsFontSizeToFit>{String(s.value)}</Text>
                <Text style={pvStyles.msStatLabel} numberOfLines={1}>{String(s.label).toUpperCase()}</Text>
              </View>
            ))}
          </View>
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
        trackColor={{ false: colors.surface2, true: withAlpha(colors.primary, 0.4) }}
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
    paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xxs,
  },
  dateText: { color: colors.textMuted, fontWeight: fontWeight.medium },
  planLabel: {
    fontSize: 8, color: colors.primary, fontWeight: fontWeight.bold,
    letterSpacing: 1, paddingHorizontal: spacing.sm,
  },
  heroText: {
    fontWeight: fontWeight.black, color: colors.textPrimary,
    paddingHorizontal: spacing.sm, marginTop: spacing.xxs,
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
    letterSpacing: 0.5, marginTop: spacing.xxs,
  },
  intensityBadge: {
    alignSelf: 'center', borderRadius: 12, borderWidth: 1,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, marginVertical: spacing.xs,
  },
  intensityText: { fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  statsRow: {
    flexDirection: 'row', gap: 5,
    paddingHorizontal: spacing.sm, marginTop: spacing.xs,
  },
  statBox: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm,
    paddingVertical: 5, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontWeight: fontWeight.black, color: colors.textPrimary, lineHeight: 16 },
  statLabel: { fontSize: 6, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 0.3, marginTop: 1 },
  topLiftCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.sm, marginTop: 5,
    backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  topLiftStripe: { width: 3, backgroundColor: colors.primary, alignSelf: 'stretch' },
  topLiftBody: { flex: 1, paddingVertical: spacing.xs, paddingHorizontal: 6 },
  topLiftLabel: { fontSize: 5.5, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  topLiftValue: { fontSize: 11, color: colors.textPrimary, fontWeight: fontWeight.black },
  topLiftName: { fontSize: 7, color: colors.textSecondary, paddingRight: 6, maxWidth: 60 },
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 3,
    paddingHorizontal: spacing.sm, marginTop: 5,
  },
  chip: {
    backgroundColor: colors.surface2, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: spacing.xxs,
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
  footerBrand: { marginBottom: spacing.xxs },
  footerTagline: {
    color: colors.primary, fontWeight: fontWeight.bold,
    letterSpacing: 1, marginTop: 1,
  },
  footerUrl: {
    fontSize: 6.5, color: colors.textMuted,
    fontWeight: fontWeight.medium, marginTop: spacing.xxs,
  },
  footerAccent: { height: 2, backgroundColor: colors.primary, width: '40%', marginTop: 6, borderRadius: 1 },
  prCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.sm, gap: 6,
  },
  prBadge: {
    backgroundColor: colors.warningBg, borderRadius: 30,
    paddingHorizontal: spacing.md, paddingVertical: 3,
    borderWidth: 1, borderColor: withAlpha(colors.gold, 0.376),
  },
  prBadgeText: { fontSize: 7.5, fontWeight: fontWeight.bold, color: colors.gold, letterSpacing: 0.5 },
  prExercise: { fontWeight: fontWeight.black, color: colors.textPrimary, textAlign: 'center', lineHeight: 20 },
  prExerciseSq: { fontSize: 15 },
  prExerciseSt: { fontSize: 12 },
  prWeight: { fontWeight: fontWeight.black, color: colors.primary, textAlign: 'center' },
  prWeightSq: { fontSize: 28 },
  prWeightSt: { fontSize: 24 },
  prPrevBest: { fontSize: 8, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },

  msCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.sm },
  msEyebrow: { fontSize: 8, color: colors.primary, fontWeight: fontWeight.bold, letterSpacing: 1.2, marginBottom: spacing.xxs },
  msTitle: { fontWeight: fontWeight.black, color: colors.textPrimary, textAlign: 'center' },
  msTitleSq: { fontSize: 15, lineHeight: 18 },
  msTitleSt: { fontSize: 13, lineHeight: 16 },
  msHero: { fontWeight: fontWeight.black, color: colors.primary, textAlign: 'center', marginTop: spacing.xs },
  msHeroSq: { fontSize: 52 },
  msHeroSt: { fontSize: 44 },
  msUnit: { fontSize: 8, color: colors.textSecondary, fontWeight: fontWeight.bold, letterSpacing: 1, marginTop: 2 },
  msCaption: { fontSize: 8, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.xs },
  msStatRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  msStat: {
    backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.xs, minWidth: 44, alignItems: 'center',
  },
  msStatValue: { fontSize: 13, color: colors.textPrimary, fontWeight: fontWeight.black },
  msStatLabel: { fontSize: 6, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 0.5, marginTop: 1 },
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
  hiddenWebView: { position: 'absolute', opacity: 0, width: 1, height: 1, bottom: 0, left: 0, zIndex: -1 },
});
