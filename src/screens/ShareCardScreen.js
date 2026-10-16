/**
 * ShareCardScreen: build and share a workout / PR / milestone card.
 *
 * The card is drawn by ONE renderer (src/lib/shareCard/drawShareCard, Skia) for
 * BOTH the on-screen preview and the exported PNG, so what you see is exactly
 * what you share. This replaced the old split where the preview (RN views) and
 * the export (a hand-coded WebView canvas) were two renderers that drifted,
 * which is why the export didn't match the preview and the toggles did little.
 *
 * The "Save as PDF" path is a separate, clean one-page HTML→PDF summary and is
 * unrelated to the image card.
 *
 * D229 addendum 6 (founder: "the share is actually not full screen on most
 * mobiles ... Can we, like, extend it ... not wider, taller"): the formats
 * are Story, Full screen (the phone's own shape, with its own safe areas),
 * Feed (the 4:5 the code still calls 'portrait') and Square, then the
 * Sticker; under Full screen the image can be set as the lock screen
 * wallpaper on Android, and iOS says how to do it from Photos. Share is the
 * one amber action, with Save to gallery and Post to Community beneath it
 * (addendum 5 items 4 and 7: the Background row reads Gallery, Photo, None
 * and "Photo look" reads "Look").
 *
 * D229 addendum 17 (2026-10-16, the founder): a VIDEO is one more background
 * beside the photo, on the same screen with every option kept. The frame at
 * the chosen start is decoded offscreen (src/lib/shareVideo/videoFrame.js)
 * and becomes `bgPhoto`, so the looks, the framing and the card over it all
 * work on it unchanged; Share and Save then hand the video, the window, the
 * look's matrix, the framing rectangle and the card drawn without its photo
 * to the native engine (src/lib/shareVideo/engine.js). No live Skia view is
 * mounted anywhere on this screen.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Image, Platform,
  useWindowDimensions, Share,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type, fontFamily, fontScaleCaps } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import SectionLabel from '../components/SectionLabel';
import BottomSheet from '../components/BottomSheet';
import SharePhotoFramer from '../components/SharePhotoFramer';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';
import { logError } from '../lib/errorLog';
import {
  drawShareCard, cardHeight, drawSticker, stickerHeight, sessionLiftsThatFit,
} from '../lib/shareCard/drawShareCard';
import { buildWeeklyRecapParams } from '../lib/shareCard/greatWeek';
import { loadWordmarkImage } from '../lib/shareCard/wordmarkImage';
import { loadCardTypefaces } from '../lib/shareCard/cardTypefaces';
import { isCentreCrop } from '../lib/shareCard/photoFraming';
import {
  PHOTO_LOOKS, DEFAULT_LOOK_STRENGTH, startStrengthFor, lookPaint, clampStrength,
} from '../lib/shareCard/photoLooks';
import {
  SHARE_LINES, SHARE_QUOTES, MAX_CAPTION_LENGTH, cleanCaption,
} from '../lib/shareCard/shareQuotes';
import { defaultLiftIndex } from '../lib/sessionShareData';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import LookStrengthSlider from '../components/share/LookStrengthSlider';
import VideoTrimBar from '../components/share/VideoTrimBar';
import { lookMatrix } from '../lib/shareCard/photoLooks';
import { photoCoverRect } from '../lib/shareCard/drawShareCard';
import * as shareVideoEngine from '../lib/shareVideo/engine';
import { grabVideoFrame, videoThumbnailBase64 } from '../lib/shareVideo/videoFrame';
import { getClip, listClipsForWorkout, subscribeClips } from '../lib/clips/store';
import { clipDisplayName, clipMatchesPR, CLIP_STRINGS } from '../lib/clips/rules';
import useClipRecorder from '../components/clips/useClipRecorder';
import useAppStore from '../store/useAppStore';

// A share's video is this long at the longest (D229 addendum 4); a longer
// recording offers its start.
// A share is 15 seconds at the longest (the engine's own ceiling; the
// number is held here too so the screen never shows a blank length).
const MAX_VIDEO_MS = Number(shareVideoEngine.MAX_CLIP_MS) > 0 ? Number(shareVideoEngine.MAX_CLIP_MS) : 15000;

// Optional native modules, guarded so the screen still mounts (e.g. in tests
// or before a rebuild) without them; the card just can't render/share until the
// real build provides Skia + the sharing packages.
let FileSystem; let Sharing; let Skia; let matchFont; let ImageFormat; let ImagePicker; let MediaLibrary;
try { FileSystem = require('expo-file-system/legacy'); } catch (_) { /* optional */ }
try { Sharing = require('expo-sharing'); } catch (_) { /* optional */ }
try { ImagePicker = require('expo-image-picker'); } catch (_) { /* optional */ }
try { MediaLibrary = require('expo-media-library'); } catch (_) { /* optional */ }
// The preview's player (addendum 17 follow-up): expo-av's native video view,
// already in the build for the rest timer's sounds. No Skia view.
let AvVideo = null;
let AvResizeMode = null;
try { const av = require('expo-av'); AvVideo = av.Video; AvResizeMode = av.ResizeMode; } catch (_) { /* optional */ }
// The preview video is made at half the share's width, at a low bitrate, so
// it is quick to make; it is only ever watched here, never shared.
const PREVIEW_VIDEO_W = 540;
const PREVIEW_VIDEO_BITRATE = 2000000;
try { const S = require('@shopify/react-native-skia'); Skia = S.Skia; matchFont = S.matchFont; ImageFormat = S.ImageFormat; } catch (_) { /* optional */ }

// Set as wallpaper (Full screen, Android): the video module's wrapper,
// loaded only when asked for and treated as absent if it cannot load, so the
// screen never depends on it.
function loadWallpaperEngine() {
  try {
    // eslint-disable-next-line global-require
    const engine = require('../lib/shareVideo/engine');
    return engine && typeof engine.setLockScreenWallpaper === 'function' && typeof engine.isAvailable === 'function'
      ? engine : null;
  } catch (_) {
    return null;
  }
}

// The Background row's sources (D229 addendum 5 item 4, its words made
// plain by the founder's rule of 2026-10-15: a person reads "Video", never
// "clip"). VIDEO is named here for the lead's video source, which joins the
// row between Photo and None with the "From this workout" strip beneath it;
// nothing on this row offers it yet.
const BACKGROUND_SOURCES = Object.freeze({
  GALLERY: 'gallery',
  PHOTO: 'photo',
  VIDEO: 'video',
  NONE: 'none',
});

// "Share to Stories" goes straight to the OS share sheet. The Instagram
// Stories deep link (instagram-stories://share) cannot carry the rendered
// image via a bare Linking.openURL, the full background+sticker handoff needs
// the pasteboard (iOS) / intent extras (Android) per Instagram's Stories API,
// so a deep link would open an EMPTY composer. The share sheet reliably hands
// the PNG to Instagram (or any target the user picks), which is what we want.

const WORDMARK = require('../../assets/volyume-wordmark.png');
// The dark-lettered mark for the light share theme (founder, 2026-09-27:
// "different share themes (light and dark)"), loaded the same way as WORDMARK
// below -- an ornament, never a gate (VOLYUME-2V).
const WORDMARK_DARK = require('../../assets/volyume-wordmark-dark.png');
// System typeface family per platform: the fallback the card draws with until
// the app's own Inter faces have loaded (lib/shareCard/cardTypefaces.js). The
// card measures text with the active font, so layout is correct either way.
const FONT_FAMILY = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'sans-serif' });
const PREVIEW_RENDER_W = 640; // render crisp, display scaled down
const PREVIEW_DISPLAY_W = 300;
// The photo the positioning view shows: the same pixels the card draws,
// scaled to at most this edge (enough for a 300dp frame at 4x zoom on a
// dense screen) and encoded once, so the view and the card cannot disagree
// on orientation or crop.
const FRAMER_PHOTO_EDGE = 1280;

// The lifts this session can show as its top lift (founder order 2026-09-26:
// "I want the user to be able to select their Top Lift rather than it just
// doing one"): one per exercise from the workout summary, or, from an older
// caller that only sends the single heaviest set, that set alone.
function sessionLiftOptions(sessionData) {
  const list = Array.isArray(sessionData?.liftOptions)
    ? sessionData.liftOptions.filter((o) => o && Number(o.weight) > 0)
    : [];
  if (list.length) return list;
  const top = sessionData?.topSet;
  return top && Number(top.weight) > 0 ? [top] : [];
}

// "90 kg × 8", or the weight alone when no reps were logged.
function setLabel(o, unit) {
  if (!o) return '';
  const u = o.units || unit || 'kg';
  return o.reps ? `${o.weight} ${u} × ${o.reps}` : `${o.weight} ${u}`;
}

export default function ShareCardScreen({ navigation, route }) {
  const toast = useToast();
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js). Chrome
  // only (segmented controls, toggles, preview placeholder) -- the card
  // CONTENT (drawShareCard/buildParams) is GDPR-locked and untouched.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const {
    sessionData = null,
    // Community entry point 7 (social-discovery blueprint section 1): the id
    // of the session this card was built from, passed through by
    // WorkoutSummaryScreen so "Post to Community" can hand the story builder
    // the same workout. Nothing on the CARD reads it.
    workoutId = null,
    prData = null,
    // Optional list of PRs from the same session so the user can pick WHICH one
    // to feature on the card (a session can set several). Falls back to the
    // single prData when a caller only has one.
    prList = null,
    milestoneData = null,
    weeklyRecapData = null,
    // The week's standout lift (src/lib/bestLift.js), or null. Featured on the
    // recap card.
    bestLift = null,
    // Gym unit label ('kg') for the best lift, and the person's own body
    // weight unit ('st'|'kg'|'lbs') for the weekly progress hero (D228 item 3).
    units = 'kg',
    bodyWeightUnits = 'st',
    // Set by CoachOutputScreen when an ED-pattern flag is open OR calm mode is
    // active: all weight/progress language is stripped from the recap card.
    // Read `suppressParam` rather than `suppress` -- the effective value is
    // computed below and must never be taken from the route alone.
    suppress: suppressParam = false,
  } = route.params || {};

  // ED-safety gate, fail closed. A route param defaulting to false meant any
  // caller that forgot to pass it -- or a lost param on a remount -- exported
  // the weekly card's progress hero with no gate at all. An ED-safety gate must
  // not depend on a caller remembering something. This hook reads the open
  // ED-pattern flag and calm mode at source, starts SUPPRESSED before the async
  // read resolves, and suppresses on a read failure of either input, matching
  // the sibling Pro surface (BeforeAfterShareSheet). OR-ed with the param so a
  // caller can still force suppression, never clear it.
  const suppressedLive = usePhotoSuppression();
  const suppress = suppressParam || suppressedLive;

  // Session leads whenever session data is present (a workout share opens as the
  // session card even when it also carries a PR). A standalone "Share this PR"
  // passes prData only and opens as a PR card. The weekly recap is its own
  // entry point (the "great week" CTA on the coach screen).
  const [cardType, setCardType] = useState(
    sessionData ? 'session' : prData ? 'pr' : milestoneData ? 'milestone' : weeklyRecapData ? 'weekly' : 'session',
  );
  // Story-first default (D109-1, Campaign 30): the story composition is now a
  // first-class layout on every card type (safe zones, balanced content), and
  // stories are where these cards actually get posted. Full screen ('full',
  // the phone's own shape, D229 addendum 6), Feed ('portrait', 4:5) and
  // Square 1:1 stay one tap away; 'sticker' is the transparent stat-panel
  // export (ELITE-SHARE-SPEC pillar 3) for pasting onto the user's own story.
  const [format, setFormat] = useState('story');
  const [savingToGallery, setSavingToGallery] = useState(false);
  const [sharingToStories, setSharingToStories] = useState(false);
  const [settingWallpaper, setSettingWallpaper] = useState(false);
  // Full screen takes the phone's own shape: the window's height over its
  // width, and its status bar and home indicator as fractions of that
  // height, so the card's outline clears them (the renderer holds the shape
  // between 16:9 and 2.3).
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fullAspect = windowWidth > 0 && windowHeight > 0 ? windowHeight / windowWidth : null;
  const safeTopRatio = windowHeight > 0 ? (insets?.top || 0) / windowHeight : 0;
  const safeBottomRatio = windowHeight > 0 ? (insets?.bottom || 0) / windowHeight : 0;

  const [showVolume, setShowVolume] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showPlanName, setShowPlanName] = useState(true);
  // No exercise-names toggle: founder order 2026-09-26, "I don't want
  // exercise names list to be an option or show at all as it does not fit
  // in the share and looks stupid." The list is gone from the card too.
  const [showPRWeight, setShowPRWeight] = useState(true);
  const [showPrevBest, setShowPrevBest] = useState(true);
  // Weekly recap: the weight-progress hero is opt-in (D228 item 3, founder
  // 2026-10-15): it starts OFF and the person switches it on. It is
  // force-stripped (and the toggle hidden) under `suppress` so no progress
  // number can leak.
  const [showProgress, setShowProgress] = useState(false);
  // The best-lift feature is opt-in too (also force-stripped under suppress).
  const [showBestLift, setShowBestLift] = useState(true);
  // Optional gym photo background (SkImage), available on every card type,
  // and which Background source it came from (BACKGROUND_SOURCES).
  const [bgPhoto, setBgPhoto] = useState(null);
  // Addendum 17: the chosen video, when the background is a video. A row of
  // the clip store ({ id, uri, durationMs, ... }) or a gallery pick
  // ({ uri, durationMs, source: 'gallery' }). `clipStartMs` is where the
  // share's window begins; the preview shows that frame.
  const [clip, setClip] = useState(null);
  const [clipStartMs, setClipStartMs] = useState(0);
  // The end of the share's window (the trim bar's right handle).
  const [clipEndMs, setClipEndMs] = useState(0);
  // The preview video (founder follow-up 2026-10-16): the look, the framing
  // and the trim played back through the engine at 540 wide. `previewVideo`
  // is { uri, signature } once made and playing; it shows only while the
  // signature still matches what is on screen.
  const [previewVideo, setPreviewVideo] = useState(null);
  const [makingPreview, setMakingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const makingPreviewRef = useRef(false);
  const previewCacheRef = useRef({});
  const mountedRef = useRef(true);
  const [clipSize, setClipSize] = useState({ width: 0, height: 0 });
  // Thumbnails of this workout's videos, by id, for the strip on the screen.
  const [clipThumbs, setClipThumbs] = useState({});
  const [workoutClips, setWorkoutClips] = useState([]);
  const [clipsVersion, setClipsVersion] = useState(0);
  const [videoSheetOpen, setVideoSheetOpen] = useState(false);
  const [makingVideo, setMakingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const makingVideoRef = useRef(false);
  const videoCacheRef = useRef({});
  const handledClipIdRef = useRef(null);
  const userId = useAppStore((st) => st.user?.id ?? null);
  const [backgroundSource, setBackgroundSource] = useState(BACKGROUND_SOURCES.NONE);
  // Where the athlete placed and sized it ({ zoom, cx, cy }, null = centred)
  // and the same pixels as a data URI for the live preview (founder orders
  // 2026-09-26: the photo should show "best in the background", and camera
  // and gallery photos alike are "adjustable in position and size on the
  // render and final share in the most elegant way").
  const [photoCrop, setPhotoCrop] = useState(null);
  const [framerPhoto, setFramerPhoto] = useState(null);
  // Photo look (founder, 2026-09-27: "a tint or filter to the images ...
  // Almost like Instagram filters but a select group ... label them gym like
  // ones"). `photoLookStrength` is the COMMITTED value the photo is actually
  // redrawn at; `strengthDisplayPct` is the live 0-100 number the "Strength"
  // row shows while the slider is being dragged, updated every frame with no
  // photo re-render behind it. A new photo starts with no look (acceptPhoto).
  const [photoLook, setPhotoLook] = useState('none');
  const [photoLookStrength, setPhotoLookStrength] = useState(DEFAULT_LOOK_STRENGTH);
  const [strengthDisplayPct, setStrengthDisplayPct] = useState(Math.round(DEFAULT_LOOK_STRENGTH * 100));
  // Share theme (founder, 2026-09-27: "different share themes (light and
  // dark)"). Dark is the card's long-standing look, so it stays the default.
  const [shareTheme, setShareTheme] = useState('dark');

  // The PRs available to feature on a PR card. A caller can pass a whole
  // session's PRs (prList) so the user picks which one; otherwise it is just the
  // single prData. selectedPrIndex drives which PR the card renders.
  const prs = useMemo(() => {
    const list = Array.isArray(prList) ? prList.filter(Boolean) : [];
    if (list.length) return list;
    return prData ? [prData] : [];
  }, [prList, prData]);
  const [selectedPrIndex, setSelectedPrIndex] = useState(0);
  const [prSheetOpen, setPrSheetOpen] = useState(false);

  // The session card's top lifts are the athlete's choice (founder,
  // 2026-09-26: "Could we do Top Lifts? And they can select more than one if
  // they'd fit ... They don't have to select any number it's the end users
  // choice"). It opens on one: the heaviest lift that set a new best today,
  // else the heaviest lift of the session (sessionShareData.defaultLiftIndex).
  // Any number can be chosen while they fit on the image, or none.
  const liftOptions = useMemo(() => sessionLiftOptions(sessionData), [sessionData]);
  const newBestNames = useMemo(
    () => new Set((Array.isArray(prList) ? prList : prData ? [prData] : [])
      .map((pr) => pr && pr.exerciseName).filter(Boolean)),
    [prList, prData],
  );
  const [liftPicks, setLiftPicks] = useState(() => {
    const i = defaultLiftIndex(sessionLiftOptions(sessionData), Array.isArray(prList) ? prList : prData ? [prData] : []);
    return i >= 0 ? [i] : [];
  });
  const [liftSheetOpen, setLiftSheetOpen] = useState(false);
  // In the list's own order, which is the order the image shows them in.
  const chosenLifts = useMemo(
    () => liftPicks.filter((i) => i >= 0 && i < liftOptions.length).sort((a, b) => a - b).map((i) => liftOptions[i]),
    [liftPicks, liftOptions],
  );
  const toggleLift = useCallback((i) => {
    setLiftPicks((prev) => (prev.includes(i) ? prev.filter((k) => k !== i) : [...prev, i]));
  }, []);

  // Optional highlights (founder, 2026-09-26: "Are there any stats that
  // could be included ... We don't want to force them on but optional?").
  // Only lines the workout summary itself worked out and showed are
  // offered, each exactly as it will read on the image; none is on until the
  // athlete switches it on, and two at most fit.
  const highlightOptions = useMemo(() => (Array.isArray(sessionData?.highlightOptions)
    ? sessionData.highlightOptions.filter((o) => o && o.key && o.text)
    : []), [sessionData]);
  const [highlightKeys, setHighlightKeys] = useState([]);
  const chosenHighlights = useMemo(
    () => highlightOptions.filter((o) => highlightKeys.includes(o.key)).map((o) => o.text).slice(0, 2),
    [highlightOptions, highlightKeys],
  );
  const toggleHighlight = useCallback((key, on) => {
    setHighlightKeys((prev) => {
      if (!on) return prev.filter((k) => k !== key);
      if (prev.includes(key) || prev.length >= 2) return prev;
      return [...prev, key];
    });
  }, []);

  // Optional quote or caption under the title (founder, 2026-09-26: "Is
  // there an elegant way to do bodybuilding short quotes that people can
  // insert"): a line in Volyume's voice, a quote with its source, or the
  // athlete's own words. Off until chosen.
  const [quote, setQuote] = useState(null);
  const [quoteSheetOpen, setQuoteSheetOpen] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const prName = (pr) => (pr && (pr.exerciseName || pr.exercise)) || 'Exercise';
  const prDetail = (pr) => (pr && pr.weight
    ? `${pr.weight} ${pr.units || 'kg'}${pr.reps ? ` × ${pr.reps}` : ''}`
    : '');
  const selectedPr = prs[Math.min(selectedPrIndex, Math.max(0, prs.length - 1))] || null;
  const selectedPrName = prName(selectedPr);
  const selectedPrDetail = prDetail(selectedPr);

  const isSession = cardType === 'session';
  const isWeekly = cardType === 'weekly';

  // Community entry point 7: which story kind (if any) this card can also be
  // posted as, and the params to hand over. A session needs the workout id
  // the payload builder reads on the other side, so a caller that did not
  // pass one simply does not offer the action rather than offering a dead
  // one. `weekly` and `beforeAfter` are never offered (SD-04).
  const communityKind = (cardType === 'pr' && prs.length) ? 'pr'
    : (cardType === 'milestone' && milestoneData) ? 'milestone'
      : (isSession && workoutId) ? 'session' : null;
  const communityComposeParams = communityKind === 'pr'
    ? { kind: 'pr', pr: prs[Math.min(selectedPrIndex, Math.max(0, prs.length - 1))] ?? prData }
    : communityKind === 'milestone'
      ? { kind: 'milestone', milestone: milestoneData }
      : communityKind === 'session'
        ? { kind: 'session', workoutId }
        : null;
  const isSticker = format === 'sticker';
  // Campaign 30: the weekly recap's old square-only restriction is lifted -
  // the rebuilt renderer composes every type against the tall canvas (story
  // safe zones, content balance) instead of leaving it mostly empty. The
  // card aspect ('square'|'portrait'|'story'|'full') now drives the renderer
  // via params.aspect; isSquare stays derived for the legacy readers (PDF
  // path, filenames, preview sizing fallbacks). Full screen is a tall card.
  const cardAspect = isSticker ? 'square' : format;
  const isFullScreen = cardAspect === 'full';
  const isSquare = cardAspect !== 'story' && !isFullScreen;

  // System typefaces (regular + bold) for the Skia renderer: the floor the
  // card can always draw with. getTypeface() gives a typeface we can resize
  // at any point in the draw.
  const systemTypefaces = useMemo(() => {
    if (!Skia || !matchFont) return null;
    try {
      const bold = matchFont({ fontFamily: FONT_FAMILY, fontWeight: 'bold' }).getTypeface();
      const regular = matchFont({ fontFamily: FONT_FAMILY, fontWeight: 'normal' }).getTypeface();
      return (bold && regular) ? { bold, regular } : null;
    } catch (_) { return null; }
  }, []);
  // The app's own Inter faces (founder order 2026-09-26: "Use styles from the
  // rest of the app"). They load in the background and replace the system
  // faces role by role; the card never waits for them (VOLYUME-2V law).
  const [appTypefaces, setAppTypefaces] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadCardTypefaces(Skia)
      .then((faces) => { if (!cancelled && faces) setAppTypefaces(faces); })
      .catch(() => { /* the system faces stand; the loader logs its own failures */ });
    return () => { cancelled = true; };
  }, []);
  const typefaces = useMemo(() => {
    if (!systemTypefaces && !appTypefaces) return null;
    const merged = { ...(systemTypefaces || {}), ...(appTypefaces || {}) };
    return (merged.bold && merged.regular) ? merged : null;
  }, [systemTypefaces, appTypefaces]);

  // Load the wordmark once as an SkImage for the card footer.
  const [wordmark, setWordmark] = useState(null);
  // VOLYUME-2V (founder device, 2026-08-18 - the "can't build the preview
  // AND the share buttons don't work" report): the Sentry event named the
  // cause as `renderer inputs missing`, and the ONLY asynchronously-loaded
  // input is this wordmark image. Its loader swallowed every failure
  // silently, so one unavailable decorative asset took the ENTIRE feature
  // down - render refused, and cardReady disabled both buttons.
  //
  // Two corrections. First, readiness no longer waits on the mark IMAGE:
  // the footer already lays out without it and still carries "volyume.app",
  // so the card is branded either way - the R1 rule this replaces existed
  // to stop an off-brand card looking deliberate, never to make the brand
  // asset a single point of failure for sharing at all. Second, the loader
  // below now reports why it failed instead of swallowing it.
  const cardReady = !!(Skia && typefaces);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // VOLYUME-2X: the hand-rolled resolve-then-file-read loader that used
      // to live here could not work in a release build (the bundled asset
      // resolves to an Android resource name, which expo-file-system
      // rejects). loadWordmarkImage uses Skia's own loader first and keeps
      // the old paths as fallbacks; it never throws, and a null mark is a
      // cosmetic loss only - readiness above does not depend on it.
      const img = await loadWordmarkImage(Skia, WORDMARK);
      if (!cancelled && img) setWordmark(img);
    })();
    return () => { cancelled = true; };
  }, []);
  // The dark-lettered mark for the light share theme (founder, 2026-09-27),
  // loaded the same way and just as much an ornament: a card with no dark
  // mark still draws and still says volyume.app.
  const [wordmarkDark, setWordmarkDark] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const img = await loadWordmarkImage(Skia, WORDMARK_DARK);
      if (!cancelled && img) setWordmarkDark(img);
    })();
    return () => { cancelled = true; };
  }, []);

  function formatLongDate(ts) {
    const d = ts ? new Date(ts) : new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Campaign 30 (pillar 5): parameterised by TYPE so the template strip can
  // render a live thumbnail of every card available for this moment, not
  // just the selected one. `buildParams()` (below) stays the single source
  // for the preview/export path, now via buildParamsFor(cardType).
  const buildParamsFor = useCallback((forType) => {
    const isWeekly = forType === 'weekly';
    const isMilestone = forType === 'milestone';
    const isSession = forType === 'session';
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
        bodyWeightUnits,
        isSquare,
        // D228 item 3: the phase label ("Mild cut") is progress language too,
        // so it goes with everything else under suppress.
        weekLabel: suppress ? '' : (o.weekLabel || ''),
        dateFormatted: showDate ? formatLongDate() : '',
        // The lift hero is independently toggleable; suppress strips it regardless.
        bestLift: showBestLift ? bestLift : null,
      });
      // `date` mirrors dateFormatted so the PDF summary (which reads p.date) works.
      // Photo look/strength and the share theme (founder, 2026-09-27) travel
      // on every card type alike, so the preview, the export, the overlay and
      // the template thumbnails can never disagree on them.
      return {
        ...recap, showDate, date: recap.dateFormatted, photoLook, photoLookStrength, theme: shareTheme,
      };
    }
    if (isMilestone) {
      const m = milestoneData || {};
      return {
        cardType: 'milestone', isSquare, showDate, photoLook, photoLookStrength, theme: shareTheme,
        // R11/M4 (share-card audit 2026-07-27): the extra `&& m.date` check
        // made the Date toggle dead on any milestone whose caller doesn't
        // carry its own timestamp (the streak/perfect-month/tonnage/training-
        // load milestones, and every Recaps card from buildRecapMilestoneData).
        // formatLongDate() already defaults to today when its argument is
        // falsy -- matching the session/PR branches below, which never guard
        // on the source field being present, only on the toggle.
        date: showDate ? formatLongDate(m.date) : '',
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
        cardType: 'session', isSquare, showVolume, showDate, showPlanName, photoLook, photoLookStrength, theme: shareTheme,
        date: showDate ? formatLongDate(s.date) : '',
        planName: showPlanName ? (s.planName || '') : '',
        sessionName: s.sessionName || 'Workout complete',
        workingSets: s.workingSets || 0,
        duration: s.duration || 0,
        tonnage: s.tonnage || 0,
        exerciseCount: s.exerciseCount || 0,
        prCount: s.prCount || 0,
        // The lifts the athlete chose, none included. No exercise-name
        // list reaches the card (founder order 2026-09-26).
        topLifts: chosenLifts,
        // Only the highlights the athlete switched on.
        highlights: chosenHighlights,
        intensityTier: s.intensityTier || 'solid',
        // R8/M5 (share-card audit 2026-07-27): the session card hard-coded
        // 'kg' for the tonnage hero/stat/top-lift line. `sessionData.units`
        // (set at the WorkoutSummaryScreen call site) wins; the route-level
        // `units` (already used by the weekly recap) is the fallback for any
        // other caller.
        units: s.units || units || 'kg',
      };
    }
    const p = prs[Math.min(selectedPrIndex, Math.max(0, prs.length - 1))] || prData || {};
    return {
      cardType: 'pr', isSquare, showDate, showPRWeight, showPrevBest, photoLook, photoLookStrength, theme: shareTheme,
      date: showDate ? formatLongDate(p.date) : '',
      exerciseName: p.exerciseName || 'Exercise',
      weight: p.weight || '',
      reps: p.reps || '',
      units: p.units || 'kg',
      previousBest: p.previousBest || '',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSquare, showDate, showVolume, showPlanName, showPRWeight, showPrevBest, showProgress, showBestLift, suppress, units, bodyWeightUnits, sessionData, prData, prs, selectedPrIndex, milestoneData, weeklyRecapData, bestLift, chosenLifts, chosenHighlights, photoLook, photoLookStrength, shareTheme]);

  // The selected card's params: the per-type build plus the chosen aspect
  // preset (the renderer's cardHeight/draw both key off params.aspect), and
  // for Full screen the phone's own shape and safe areas.
  const buildParams = useCallback(
    () => ({
      ...buildParamsFor(cardType),
      aspect: cardAspect,
      quote,
      ...(isFullScreen ? { fullAspect, safeTopRatio, safeBottomRatio } : {}),
    }),
    [buildParamsFor, cardType, cardAspect, quote, isFullScreen, fullAspect, safeTopRatio, safeBottomRatio],
  );

  // How many of a list of lifts the image has room for, laid out exactly as
  // the card will be (size, photo, quote, highlights), or null while that
  // cannot be worked out. It only guides the list: the card itself draws
  // only the lifts that fit.
  const liftsFitting = useCallback((lifts) => {
    if (!isSession || isSticker || !cardReady || typeof sessionLiftsThatFit !== 'function') return null;
    try {
      return sessionLiftsThatFit({
        Skia, params: buildParams(), typefaces, wordmark, bgPhoto, lifts,
      });
    } catch (e) {
      logError('ShareCardScreen.liftsFitting', e, { format });
      return null;
    }
  }, [isSession, isSticker, cardReady, buildParams, typefaces, wordmark, bgPhoto, format]);
  const shownLiftCount = useMemo(() => {
    const n = liftsFitting(chosenLifts);
    return n == null ? chosenLifts.length : Math.min(n, chosenLifts.length);
  }, [liftsFitting, chosenLifts]);
  // For the open list: whether a lift not yet chosen would still fit.
  const liftHasRoom = useMemo(() => {
    const known = {};
    return (i) => {
      if (!liftSheetOpen) return true;
      if (known[i] === undefined) {
        const next = [...liftPicks, i].sort((a, b) => a - b).map((k) => liftOptions[k]).filter(Boolean);
        const n = liftsFitting(next);
        known[i] = n == null || n >= next.length;
      }
      return known[i];
    };
  }, [liftSheetOpen, liftPicks, liftOptions, liftsFitting]);
  const liftUnit = sessionData?.units || units;
  const liftRowValue = chosenLifts.length === 0 ? 'Not shown'
    : chosenLifts.length === 1 ? chosenLifts[0].exerciseName : `${chosenLifts.length} lifts`;
  const liftRowSub = chosenLifts.length === 0 ? 'Your image has no top lift.'
    : chosenLifts.length === 1 ? setLabel(chosenLifts[0], liftUnit)
      : chosenLifts.map((o) => o.exerciseName).join(', ');
  const liftRowLabel = chosenLifts.length === 0 ? 'Top lift: not shown. Choose a lift'
    : chosenLifts.length === 1 ? `Top lift: ${chosenLifts[0].exerciseName}, ${setLabel(chosenLifts[0], liftUnit)}. Change`
      : `Top lifts: ${chosenLifts.map((o) => `${o.exerciseName}, ${setLabel(o, liftUnit)}`).join('; ')}. Change`;

  // ── ONE renderer for preview + export ──────────────────────────────────────
  const renderCardBase64 = useCallback((width) => {
    // R1 (share-card audit 2026-07-27): `wordmark` is loaded asynchronously,
    // so the first render always ran with it null and drawShareCard silently
    // fell back to plain system-font text instead of the brand mark. That is
    // the reported "some don't have the logo". A card that cannot be branded
    // must not render at all, let alone export.
    // Founder device report 2026-08-18 ("can't build preview and the share
    // buttons don't work"): every failure exit here now says WHY through
    // logError, because a silent null gives a device walk nothing to act
    // on - the calm error UI is right for the user but useless for the
    // diagnosis. A renderer THROW is caught to the same calm null instead
    // of taking the screen down.
    // VOLYUME-2V: the wordmark IMAGE is no longer required to draw - the
    // renderer lays the footer out without it and still prints volyume.app.
    // Skia and the typefaces genuinely are required (there is no text
    // without them).
    if (!Skia || !typefaces) {
      logError('ShareCardScreen.renderCard', new Error('renderer inputs missing'), {
        hasSkia: !!Skia, hasTypefaces: !!typefaces, hasWordmark: !!wordmark,
      });
      return null;
    }
    try {
      const params = buildParams();
      // Sticker: the transparent stat panel (ELITE-SHARE-SPEC pillar 3). Same
      // params object the full card would draw from, so every upstream gate
      // (suppress, toggles) applies identically - suppressed content has NO
      // export path here either.
      const H = isSticker ? stickerHeight(width) : cardHeight(width, params.isSquare, params.aspect, params.fullAspect);
      const surface = Skia.Surface.MakeOffscreen(width, H);
      if (!surface) {
        logError('ShareCardScreen.renderCard', new Error('MakeOffscreen returned null'), { width, H });
        return null;
      }
      if (isSticker) {
        drawSticker(surface.getCanvas(), { Skia, width, params, typefaces, wordmark });
      } else {
        drawShareCard(surface.getCanvas(), {
          Skia, width, params, typefaces, wordmark, wordmarkDark, bgPhoto, photoCrop,
        });
      }
      surface.flush();
      const image = surface.makeImageSnapshot();
      if (!image) {
        logError('ShareCardScreen.renderCard', new Error('makeImageSnapshot returned null'), { width, H });
        return null;
      }
      const b64 = image.encodeToBase64();
      if (!b64) logError('ShareCardScreen.renderCard', new Error('encodeToBase64 returned null'), { width, H });
      return b64 || null;
    } catch (e) {
      logError('ShareCardScreen.renderCard', e, { cardType, format, hasPhoto: !!bgPhoto });
      return null;
    }
  }, [typefaces, wordmark, wordmarkDark, buildParams, bgPhoto, photoCrop, isSticker, cardType, format]);

  // Template-strip thumbnails (pillar 5, the Hevy pattern): one LIVE render
  // per card type this moment offers, drawn by the same renderer at a small
  // width so the picker shows the actual designs, not blind labels. Square
  // preset for a uniform strip; the chosen format still drives the preview
  // and export above. Re-renders when the underlying data/toggles change.
  const availableTypes = useMemo(() => [
    sessionData && { type: 'session', label: 'Session' },
    (prData || prs.length) && { type: 'pr', label: 'New PR' },
    milestoneData && { type: 'milestone', label: 'Milestone' },
    weeklyRecapData && { type: 'weekly', label: 'Weekly' },
  ].filter(Boolean), [sessionData, prData, prs.length, milestoneData, weeklyRecapData]);
  const thumbs = useMemo(() => {
    if (!Skia || !typefaces || availableTypes.length < 2) return {};
    const out = {};
    for (const { type: thumbType } of availableTypes) {
      try {
        const w = 220; // small but crisp at ~96dp display width
        const params = { ...buildParamsFor(thumbType), aspect: 'square' };
        const surface = Skia.Surface.MakeOffscreen(w, cardHeight(w, true, 'square'));
        if (!surface) continue;
        drawShareCard(surface.getCanvas(), {
          Skia, width: w, params, typefaces, wordmark, wordmarkDark, bgPhoto, photoCrop,
        });
        surface.flush();
        const image = surface.makeImageSnapshot();
        if (image) out[thumbType] = image.encodeToBase64();
      } catch (_) { /* a failed thumb falls back to the labelled tile */ }
    }
    return out;
  }, [typefaces, wordmark, wordmarkDark, buildParamsFor, bgPhoto, photoCrop, availableTypes]);

  // VOLYUME-2T (founder device SIGSEGV, 2026-08-18): a modern phone's
  // gallery photo can be 50MP - decoded that is a ~200MB native bitmap,
  // and feeding it to Skia raw first exhausted native memory (offscreen
  // surfaces started returning null: the "Couldn't build the preview"
  // dead-end) and then segfaulted outright on a retry. Every photo is now
  // bounded to what the canvas can ever need (2048px longest edge, above
  // the 1080px export with cover-crop headroom) by one Skia-side resample
  // BEFORE it becomes the background; the full-size image is released
  // immediately. Pure Skia, no new dependency; a resample failure falls
  // back to the original image rather than losing the feature.
  const MAX_BG_EDGE = 2048;
  const boundPhotoForCanvas = useCallback((img) => {
    try {
      const w = img.width();
      const h = img.height();
      const scale = Math.min(1, MAX_BG_EDGE / Math.max(w, h));
      if (scale >= 1) return img;
      const dw = Math.max(1, Math.round(w * scale));
      const dh = Math.max(1, Math.round(h * scale));
      const surf = Skia.Surface.MakeOffscreen(dw, dh);
      if (!surf) return img;
      surf.getCanvas().drawImageRect(
        img,
        Skia.XYWHRect(0, 0, w, h),
        Skia.XYWHRect(0, 0, dw, dh),
        Skia.Paint(),
      );
      surf.flush();
      const snap = surf.makeImageSnapshot();
      if (snap) {
        try { img.dispose?.(); } catch (_) { /* release best-effort */ }
        return snap;
      }
      return img;
    } catch (e) {
      logError('ShareCardScreen.boundPhoto', e);
      return img;
    }
  }, []);

  // The positioning view's copy of the photo: the SAME SkImage the card
  // draws, scaled down once and encoded, so the view can never show a
  // different orientation or crop from the card. Null on failure, which
  // simply leaves the photo centred with no Move option.
  //
  // Draws through the chosen photo look (founder, 2026-09-27): whenever a
  // look applies, the offscreen redraw happens EVEN IF the photo needs no
  // downscaling, because that redraw is the only place the look's colour
  // matrix gets painted in. The returned width/height stay the ORIGINAL
  // image's either way, so the crop maths (photoFraming.js) never changes.
  const makeFramerPhoto = useCallback((img) => {
    try {
      const w = img.width();
      const h = img.height();
      const scale = Math.min(1, FRAMER_PHOTO_EDGE / Math.max(w, h));
      const paint = lookPaint(Skia, photoLook, photoLookStrength);
      let src = img;
      if (scale < 1 || paint) {
        const dw = scale < 1 ? Math.max(1, Math.round(w * scale)) : w;
        const dh = scale < 1 ? Math.max(1, Math.round(h * scale)) : h;
        const surf = Skia.Surface.MakeOffscreen(dw, dh);
        if (surf) {
          surf.getCanvas().drawImageRect(img, Skia.XYWHRect(0, 0, w, h), Skia.XYWHRect(0, 0, dw, dh), paint || Skia.Paint());
          surf.flush();
          src = surf.makeImageSnapshot() || img;
        }
      }
      const jpeg = ImageFormat && ImageFormat.JPEG != null ? src.encodeToBase64(ImageFormat.JPEG, 85) : null;
      const b64 = jpeg || src.encodeToBase64();
      if (!b64) return null;
      return { uri: `data:image/${jpeg ? 'jpeg' : 'png'};base64,${b64}`, width: w, height: h };
    } catch (e) {
      logError('ShareCardScreen.framerPhoto', e);
      return null;
    }
  }, [photoLook, photoLookStrength]);

  // Choosing a look (founder, 2026-09-27) resets the strength to that look's
  // own starting point: 100% for the two black-and-white looks (Iron, Chalk
  // -- a mono look at the usual 80% still showed a fifth of the photo's
  // colour), 80% for the rest (photoLooks.js startStrengthFor).
  const chooseLook = useCallback((key) => {
    const start = startStrengthFor(key);
    setPhotoLook(key);
    setPhotoLookStrength(start);
    setStrengthDisplayPct(Math.round(start * 100));
  }, []);
  // The slider's live callback while dragging: cheap, display only, no photo
  // re-render behind it.
  const previewStrength = useCallback((pct) => {
    setStrengthDisplayPct(Math.min(100, Math.max(0, Math.round(pct))));
  }, []);
  // The slider's commit callback (release, a tap, or a discrete a11y
  // action): the one point the committed strength -- and so the photo -- is
  // re-processed.
  const commitStrength = useCallback((pct) => {
    const clampedPct = Math.min(100, Math.max(0, Math.round(pct)));
    setStrengthDisplayPct(clampedPct);
    setPhotoLookStrength(clampStrength(clampedPct / 100));
  }, []);

  // A new photo, from the camera or the gallery alike, starts centred, and
  // the preview itself becomes the place to move and resize it: there is no
  // separate editing step to open or close.
  const acceptPhoto = useCallback((img) => {
    const bounded = boundPhotoForCanvas(img);
    setBgPhoto(bounded);
    setPhotoCrop(null);
    setFramerPhoto(makeFramerPhoto(bounded));
    chooseLook('none');
  }, [boundPhotoForCanvas, makeFramerPhoto, chooseLook]);

  const clearPhoto = useCallback(() => {
    setBgPhoto(null);
    setPhotoCrop(null);
    setFramerPhoto(null);
    setClip(null);
    setClipStartMs(0);
    setClipEndMs(0);
    setPreviewVideo(null);
    setBackgroundSource(BACKGROUND_SOURCES.NONE);
  }, []);

  // ── Video as a background (addendum 17) ─────────────────────────────────
  // The frame at `ms` becomes the background through the photo path, so the
  // looks and the framing apply to it; a failed decode says so and leaves the
  // background as it was.
  const showVideoFrame = useCallback((row, ms, { fresh = false } = {}) => {
    if (!Skia || !row?.uri) return false;
    const frame = grabVideoFrame(Skia, row.uri, ms);
    if (!frame) {
      toast.show(CLIP_STRINGS.shareVideoCannotOpen, { variant: 'error' });
      return false;
    }
    setClipSize({ width: frame.width, height: frame.height });
    if (fresh) acceptPhoto(frame.image);
    else setBgPhoto(boundPhotoForCanvas(frame.image));
    return true;
  }, [acceptPhoto, boundPhotoForCanvas, toast]);

  const acceptClip = useCallback((row) => {
    if (!row?.uri) return;
    const shown = showVideoFrame(row, 0, { fresh: true });
    if (!shown) return;
    const d = Number(row.durationMs) || 0;
    setClip(row);
    setClipStartMs(0);
    setClipEndMs(d > 0 ? Math.min(d, MAX_VIDEO_MS) : MAX_VIDEO_MS);
    setPreviewVideo(null);
    setVideoSheetOpen(false);
  }, [showVideoFrame]);

  // The share's window, both ends, from the trim bar (it clamps the window
  // itself; this only keeps it inside the video). The still follows the start.
  const clipDurationMs = Number(clip?.durationMs) || 0;
  const changeClipWindow = useCallback(({ startMs, endMs } = {}) => {
    if (!clip) return;
    const top = clipDurationMs > 0 ? clipDurationMs : MAX_VIDEO_MS;
    const start = Math.max(0, Math.min(Math.round(Number(startMs) || 0), top));
    const end = Math.max(start + 1, Math.min(Math.round(Number(endMs) || 0), top, start + MAX_VIDEO_MS));
    if (start !== clipStartMs) showVideoFrame(clip, start);
    setClipStartMs(start);
    setClipEndMs(end);
  }, [clip, clipDurationMs, clipStartMs, showVideoFrame]);

  // This workout's videos, for "From this workout": re-read on every save or
  // delete anywhere; a chosen video that no longer exists goes.
  useEffect(() => subscribeClips(() => setClipsVersion((n) => n + 1)), []);
  const clipIdRef = useRef(null);
  clipIdRef.current = clip?.id ?? null;
  useEffect(() => {
    let cancelled = false;
    if (!workoutId || !userId || suppress) { setWorkoutClips([]); return undefined; }
    listClipsForWorkout(userId, workoutId)
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setWorkoutClips(list);
        const heldId = clipIdRef.current;
        if (heldId && !list.some((row) => row.id === heldId)) {
          clearPhoto();
          toast.show(CLIP_STRINGS.shareVideoGone, { variant: 'info' });
        }
      })
      .catch(() => { if (!cancelled) setWorkoutClips([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId, userId, suppress, clipsVersion]);

  // The strip's thumbnails: one still per video, decoded offscreen once
  // (best effort; a video that will not decode shows a glyph).
  useEffect(() => {
    if (!Skia || !workoutClips.length) return;
    setClipThumbs((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const row of workoutClips) {
        if (next[row.id] !== undefined) continue;
        next[row.id] = videoThumbnailBase64(Skia, row.uri);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [workoutClips]);

  // Arriving with a video (the summary's row, or the camera opened from here
  // coming back with `clipId` merged into the route): it becomes the
  // background once, and a PR it was filmed for leads the card.
  const routeClipId = route?.params?.clipId ?? null;
  useEffect(() => {
    if (!routeClipId || !userId || suppress) return undefined;
    if (handledClipIdRef.current === routeClipId) return undefined;
    handledClipIdRef.current = routeClipId;
    let cancelled = false;
    getClip(userId, routeClipId)
      .then((row) => {
        if (cancelled || !row) return;
        acceptClip(row);
        const prIndex = prs.findIndex((pr) => clipMatchesPR(row, pr));
        if (prIndex >= 0) { setSelectedPrIndex(prIndex); setCardType('pr'); }
      })
      .catch((e) => { logError('ShareCardScreen.routeClip', e, { clipId: routeClipId }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeClipId, userId, suppress]);

  // Film now: the one recording flow (the primer first, the camera, the
  // videos sheet at three), coming back here with the video chosen.
  const clipFlow = useClipRecorder({ navigation, userId, workoutId });
  const filmNow = useCallback(() => {
    setVideoSheetOpen(false);
    clipFlow.openRecorder({ source: 'share' });
  }, [clipFlow]);

  // A video from the gallery: the system picker (no broad permission on
  // Android 13+ and iOS 14+), its length from the engine's probe.
  const pickGalleryVideo = useCallback(async () => {
    if (!ImagePicker || !Skia || !FileSystem) {
      toast.show("Video backgrounds aren't available on your device.", { variant: 'error', duration: 5000 });
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { toast.show('Photo access is needed to choose a video.', { variant: 'warning' }); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const asset = res.assets[0];
      let durationMs = Number(asset.duration) || 0;
      try {
        const probe = await shareVideoEngine.probeVideo(asset.uri);
        if (probe?.durationMs) durationMs = probe.durationMs;
      } catch (_e) { /* the decoder's own length is used below */ }
      acceptClip({ id: null, uri: asset.uri, durationMs, source: 'gallery' });
    } catch (e) {
      logError('ShareCardScreen.pickVideo', e);
      toast.show('That video could not be opened. Try another.', { variant: 'error' });
    }
  }, [toast, acceptClip]);


  // Recompute the live framer photo when the look or its committed strength
  // changes on an EXISTING photo (a fresh photo is handled by acceptPhoto
  // itself, above, which already has the bounded image to hand).
  useEffect(() => {
    if (!bgPhoto) return;
    setFramerPhoto(makeFramerPhoto(bgPhoto));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoLook, photoLookStrength]);

  // The look strip's thumbnails: one small offscreen render per look, at
  // that look's own starting strength (None = the plain photo), made once
  // per photo and reused while it stays selected. Best effort throughout --
  // a failed thumbnail simply falls back to the look's name (below), never a
  // crash.
  const LOOK_THUMB_SIZE = 144;
  const lookThumbs = useMemo(() => {
    if (!Skia || !bgPhoto) return {};
    const out = {};
    try {
      const w = bgPhoto.width();
      const h = bgPhoto.height();
      const side = Math.min(w, h);
      const sx = (w - side) / 2;
      const sy = (h - side) / 2;
      for (const look of PHOTO_LOOKS) {
        try {
          const surface = Skia.Surface.MakeOffscreen(LOOK_THUMB_SIZE, LOOK_THUMB_SIZE);
          if (!surface) continue;
          const paint = lookPaint(Skia, look.key, startStrengthFor(look.key)) || Skia.Paint();
          surface.getCanvas().drawImageRect(
            bgPhoto,
            Skia.XYWHRect(sx, sy, side, side),
            Skia.XYWHRect(0, 0, LOOK_THUMB_SIZE, LOOK_THUMB_SIZE),
            paint,
          );
          surface.flush();
          const image = surface.makeImageSnapshot();
          if (image) out[look.key] = image.encodeToBase64();
        } catch (_) { /* this one tile falls back to its name */ }
      }
    } catch (_) { /* every tile falls back to its name */ }
    return out;
  }, [bgPhoto]);

  // Take a gym photo with the camera to use as the card background (all cards).
  // Camera capture only: uses the CAMERA permission (same as barcode scanning),
  // so no photo-library permission is needed.
  const takeGymPhoto = useCallback(async () => {
    if (!ImagePicker || !Skia || !FileSystem) {
      // P-16: a missing native module reads as "this device can't do this",
      // never as "you're on an incomplete build".
      toast.show("Photo backgrounds aren't available on your device.", { variant: 'error', duration: 5000 });
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast.show('Camera access is needed to add a background', { variant: 'warning' }); return; }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const b64 = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
      const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(b64));
      if (img) setBackgroundSource(BACKGROUND_SOURCES.PHOTO);
      if (img) acceptPhoto(img);
      else toast.show("Couldn't load that photo, try again", { variant: 'error' });
    } catch (_) {
      toast.show("Couldn't take that photo, try again", { variant: 'error' });
    }
  }, [toast, acceptPhoto]);

  // Choose an existing photo from the gallery (ELITE-SHARE-SPEC pillar 1:
  // the photo becomes the canvas, and most gym photos already exist). Uses
  // the system photo picker; on Android 13+/iOS 14+ launchImageLibraryAsync
  // presents the OS picker without a broad media permission, and the
  // permission request below covers older platforms.
  const pickGymPhoto = useCallback(async () => {
    if (!ImagePicker || !Skia || !FileSystem) {
      toast.show("Photo backgrounds aren't available on your device.", { variant: 'error', duration: 5000 });
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { toast.show('Photo access is needed to choose a background', { variant: 'warning' }); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const b64 = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
      const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(b64));
      if (img) setBackgroundSource(BACKGROUND_SOURCES.GALLERY);
      if (img) acceptPhoto(img);
      else toast.show("Couldn't load that photo, try again", { variant: 'error' });
    } catch (_) {
      toast.show("Couldn't open your photos, try again", { variant: 'error' });
    }
  }, [toast, acceptPhoto]);

  // Live preview: re-render whenever anything that changes the card changes.
  const [previewB64, setPreviewB64] = useState(null);
  // EP-17/UI-05 (Codex end-user-polish audit): `previewB64 === null` used to
  // mean BOTH "still rendering" and "permanently failed" (missing Skia/
  // typeface, or the offscreen surface/encode failing), so a real render
  // failure left the ActivityIndicator spinning forever with no way out.
  // Explicit states let the render layer tell the two apart and offer Retry.
  const [previewStatus, setPreviewStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const renderPreview = useCallback(() => {
    setPreviewStatus('loading');
    const b64 = renderCardBase64(PREVIEW_RENDER_W);
    if (b64) {
      setPreviewB64(b64);
      setPreviewStatus('ready');
    } else {
      setPreviewB64(null);
      setPreviewStatus('error');
    }
  }, [renderCardBase64]);
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // With a photo (and a card that has a background: the sticker has none)
  // the preview is live: the photo moves and resizes under the athlete's
  // fingers, right on the card.
  const livePhoto = !!framerPhoto && !!bgPhoto && !isSticker;

  // The card laid over the photo in the live preview: the one renderer,
  // with the photo itself left out (`omitPhoto`), so the athlete places the
  // photo against the real title, numbers and scrim. Redrawn when a gesture
  // ends, because the scrim answers to what is now behind the text.
  const framerOverlay = useMemo(() => {
    if (!livePhoto || !Skia || !typefaces) return null;
    try {
      const params = buildParams();
      const H = cardHeight(PREVIEW_RENDER_W, params.isSquare, params.aspect, params.fullAspect);
      const surface = Skia.Surface.MakeOffscreen(PREVIEW_RENDER_W, H);
      if (!surface) return null;
      drawShareCard(surface.getCanvas(), {
        Skia, width: PREVIEW_RENDER_W, params, typefaces, wordmark, wordmarkDark, bgPhoto, photoCrop, omitPhoto: true,
      });
      surface.flush();
      const image = surface.makeImageSnapshot();
      const b64 = image ? image.encodeToBase64() : null;
      return b64 ? `data:image/png;base64,${b64}` : null;
    } catch (e) {
      logError('ShareCardScreen.framerOverlay', e);
      return null;
    }
  }, [livePhoto, typefaces, wordmark, wordmarkDark, buildParams, bgPhoto, photoCrop]);

  // The page's own scroll, made known to the gesture system so a drag that
  // starts on the photo moves the photo and never the page (the photo's
  // gestures block this one), while a drag anywhere else scrolls as normal.
  const scrollGesture = useMemo(() => Gesture.Native(), []);

  // Render the export-resolution PNG and write it to a cache file, returning the
  // file URI. Shared by the OS share sheet, Save to gallery and Instagram
  // Stories so all three export exactly the same image. Returns null if the
  // card can't be generated.
  const renderCardToFile = useCallback(async () => {
    const b64 = renderCardBase64(1080);
    if (!b64) return null;
    // R11/L4 (share-card audit 2026-07-27): a fixed filename meant a second
    // export in the same session (e.g. toggling a switch, then sharing again)
    // overwrote the first file in the cache dir before the OS share sheet/
    // gallery save had necessarily finished reading it. The timestamp makes
    // every export its own file.
    const filename = `volyume-${cardType}-${format}-${Date.now()}.png`;
    const uri = (FileSystem.cacheDirectory || '') + filename;
    await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
    return uri;
  }, [renderCardBase64, cardType, format]);

  // The finished video (addendum 17): the card drawn without its photo as a
  // PNG over the video, the window from the chosen start, the look's colour
  // matrix and the framing rectangle, through the native engine. Cached by
  // everything that went into it, so Share then Save makes it once.
  // One video job's inputs at an output width: the share at 1080, the
  // preview at 540. The signature is everything that went into it, so a
  // cached file is reused only when nothing on screen has changed.
  const videoJobAt = useCallback((W) => {
    const params = buildParams();
    let H = cardHeight(W, params.isSquare, params.aspect);
    if (H % 2) H -= 1;
    const durationMs = Math.min(MAX_VIDEO_MS, Math.max(1, Math.round(clipEndMs - clipStartMs)));
    const signature = JSON.stringify({
      uri: clip?.uri, start: clipStartMs, end: clipEndMs, durationMs, crop: photoCrop, look: photoLook, strength: photoLookStrength, params, W, H,
    });
    return { params, W, H, durationMs, signature };
  }, [clip, buildParams, clipStartMs, clipEndMs, photoCrop, photoLook, photoLookStrength]);

  // Draws the card without its photo at the job's size, writes it as the
  // overlay PNG and hands everything to the engine. Throws the engine's error.
  const runVideoJob = useCallback(async (job, bitrate, onProgress) => {
    const { params, W, H, durationMs } = job;
    const surface = Skia.Surface.MakeOffscreen(W, H);
    if (!surface) return null;
    drawShareCard(surface.getCanvas(), {
      Skia, width: W, params, typefaces, wordmark, wordmarkDark, bgPhoto, photoCrop, omitPhoto: true,
    });
    surface.flush();
    const image = surface.makeImageSnapshot();
    const b64 = image ? image.encodeToBase64() : null;
    if (!b64) return null;
    const overlayPngUri = `${FileSystem.cacheDirectory || ''}volyume-overlay-${W}-${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(overlayPngUri, b64, { encoding: FileSystem.EncodingType.Base64 });
    const rect = photoCoverRect(clipSize.width, clipSize.height, W, H, photoCrop);
    const matrix = photoLook && photoLook !== 'none' ? lookMatrix(photoLook, photoLookStrength) : null;
    const options = {
      sourceUri: clip.uri,
      startMs: Math.round(clipStartMs),
      durationMs,
      matrix: matrix || null,
      rect,
      overlayPngUri,
      outWidth: W,
      outHeight: H,
    };
    if (bitrate) options.bitrate = bitrate;
    const result = await shareVideoEngine.exportShareVideo(options, onProgress);
    return result.uri;
  }, [clip, typefaces, wordmark, wordmarkDark, clipStartMs, photoCrop, photoLook, photoLookStrength, clipSize, bgPhoto]);

  const engineFailed = useCallback((e, where) => {
    const code = e?.code;
    if (code === shareVideoEngine.EXPORT_ERROR.CANCELLED) return;
    logError(where, e, { code });
    const line = shareVideoEngine.lineForExportError(code, { fromGallery: clip?.source === 'gallery' });
    if (line) toast.show(line, { variant: 'error', duration: 7000 });
  }, [clip, toast]);

  // The finished video (addendum 17): the card drawn without its photo as a
  // PNG over the video, the trimmed window, the look's colour matrix and the
  // framing rectangle, through the native engine at 1080. Cached by
  // everything that went into it, so Share then Save makes it once.
  const renderVideoToFile = useCallback(async () => {
    if (!clip || !Skia || !FileSystem || !typefaces) return null;
    if (makingPreviewRef.current) return null; // one engine job at a time
    if (!shareVideoEngine.isAvailable()) {
      toast.show(shareVideoEngine.lineForExportError(shareVideoEngine.EXPORT_ERROR.UNAVAILABLE), { variant: 'error', duration: 6000 });
      return null;
    }
    const job = videoJobAt(1080);
    if (videoCacheRef.current[job.signature]) return videoCacheRef.current[job.signature];
    setMakingVideo(true);
    makingVideoRef.current = true;
    setVideoProgress(0);
    try {
      const uri = await runVideoJob(job, null, setVideoProgress);
      if (uri) videoCacheRef.current[job.signature] = uri;
      return uri;
    } catch (e) {
      engineFailed(e, 'ShareCardScreen.renderVideo');
      return null;
    } finally {
      setMakingVideo(false);
      makingVideoRef.current = false;
    }
  }, [clip, typefaces, toast, videoJobAt, runVideoJob, engineFailed]);

  // What the preview video would be made from right now. A playing preview
  // whose signature no longer matches (any change to the look, framing,
  // trim, card or toggles) is not shown: the still framer comes back.
  const previewSignature = useMemo(
    () => (clip && Skia ? videoJobAt(PREVIEW_VIDEO_W).signature : null),
    [clip, videoJobAt],
  );
  const playingPreview = !!previewVideo && !suppress && previewVideo.signature === previewSignature;
  useEffect(() => {
    if (previewVideo && previewVideo.signature !== previewSignature) setPreviewVideo(null);
  }, [previewVideo, previewSignature]);

  // Play: the preview video through the engine, 540 wide, cached by the
  // same inputs as the share, so Play after Pause with nothing changed is
  // instant. A failure says the engine's calm line and stays on the still.
  const playPreview = useCallback(async () => {
    if (!clip || !Skia || !FileSystem || !typefaces || suppress) return;
    if (makingVideoRef.current || makingPreviewRef.current) return;
    if (!shareVideoEngine.isAvailable()) {
      toast.show(shareVideoEngine.lineForExportError(shareVideoEngine.EXPORT_ERROR.UNAVAILABLE), { variant: 'error', duration: 6000 });
      return;
    }
    const job = videoJobAt(PREVIEW_VIDEO_W);
    const cached = previewCacheRef.current[job.signature];
    if (cached) { setPreviewVideo({ uri: cached, signature: job.signature }); return; }
    setMakingPreview(true);
    makingPreviewRef.current = true;
    setPreviewProgress(0);
    try {
      const uri = await runVideoJob(job, PREVIEW_VIDEO_BITRATE, setPreviewProgress);
      if (!mountedRef.current || !uri) return;
      previewCacheRef.current[job.signature] = uri;
      setPreviewVideo({ uri, signature: job.signature });
    } catch (e) {
      if (mountedRef.current) engineFailed(e, 'ShareCardScreen.previewVideo');
    } finally {
      makingPreviewRef.current = false;
      if (mountedRef.current) setMakingPreview(false);
    }
  }, [clip, typefaces, suppress, toast, videoJobAt, runVideoJob, engineFailed]);

  const pausePreview = useCallback(() => { setPreviewVideo(null); }, []);

  // Leaving the screen stops a preview still being made.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (makingPreviewRef.current) {
        shareVideoEngine.cancelExport().catch(() => { /* nothing running is fine */ });
      }
    };
  }, []);

  const cancelVideo = useCallback(() => {
    shareVideoEngine.cancelExport().catch(() => { /* nothing running is fine */ });
  }, []);

  // Save the rendered card straight to the device gallery (expo-media-library).
  // Asks for the add-photos permission; a denial is handled with a calm message,
  // never a crash.
  async function handleSaveToGallery() {
    if (!Skia || !FileSystem || !MediaLibrary) {
      // P-16: device-specific, not "incomplete build".
      toast.show("Saving to your gallery isn't available on your device.", { variant: 'error', duration: 5000 });
      return;
    }
    if (!typefaces) {
      toast.show('Not ready yet, wait a moment and try again', { variant: 'info' });
      return;
    }
    setSavingToGallery(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        toast.show(clip ? 'Gallery access is needed to save the video. You can still use Share.' : 'Gallery access is needed to save the image. You can still use Share.', { variant: 'warning', duration: 5000 });
        return;
      }
      if (clip) {
        const videoUri = await renderVideoToFile();
        if (!videoUri) return; // the engine's own line, or a cancel, has already spoken
        await MediaLibrary.saveToLibraryAsync(videoUri);
        toast.show('Saved to your gallery.', { variant: 'success' });
        return;
      }
      const uri = await renderCardToFile();
      if (!uri) { toast.show("Couldn't make the image, try again", { variant: 'error' }); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      toast.show('Saved to your gallery.', { variant: 'success' });
    } catch (_e) {
      toast.show(clip ? 'The video could not be saved. Try again.' : 'The image could not be saved. Try again.', { variant: 'error' });
    } finally {
      setSavingToGallery(false);
    }
  }

  // Share to Story (Instagram / Facebook). Renders the PNG and opens the OS share
  // sheet, which carries the image to Instagram or Facebook (or any target the
  // user picks) where they can post it to a Story. Founder decision 2026-06-30:
  // a direct-composer intent (com.instagram.share.ADD_TO_STORY /
  // com.facebook.stories.ADD_TO_STORY with setPackage) would need a new native
  // dependency AND a registered Facebook App ID (mandatory since Jan 2023), so we
  // deliberately keep the zero-dependency share-sheet route and just present it
  // as a Story share with both app icons.
  //
  // The text link (D229 addendum 6, level-up 4): on iOS the image goes
  // through React Native's Share with "volyume.app" as its message, so an
  // app that takes text beside an image (Messages, WhatsApp, Notes) gets the
  // address too. Android keeps expo-sharing's file-only share: an Android
  // target rarely takes an image and text from one share (many drop one of
  // the two), and the file alone reaches every target reliably.
  async function handleShareToStories() {
    const isIos = Platform.OS === 'ios';
    if (!Skia || !FileSystem || (isIos && !clip ? !Share : !Sharing)) {
      // P-16: device-specific, not "incomplete build".
      toast.show("Story sharing isn't available on your device.", { variant: 'error', duration: 5000 });
      return;
    }
    if (!typefaces) {
      toast.show('Not ready yet, wait a moment and try again', { variant: 'info' });
      return;
    }
    setSharingToStories(true);
    try {
      if (clip) {
        if (!Sharing) { toast.show("Video sharing isn't available on your device.", { variant: 'error', duration: 5000 }); return; }
        const canShareVideo = await Sharing.isAvailableAsync();
        if (!canShareVideo) { toast.show('Sharing is not available on this device.', { variant: 'warning', duration: 5000 }); return; }
        const videoUri = await renderVideoToFile();
        if (!videoUri) return;
        await Sharing.shareAsync(videoUri, {
          mimeType: 'video/mp4', UTI: 'public.mpeg-4', dialogTitle: 'Share video',
        });
        return;
      }
      const uri = await renderCardToFile();
      if (!uri) { toast.show("Couldn't make the image, try again", { variant: 'error' }); return; }
      if (isIos) {
        await Share.share({ url: uri, message: 'volyume.app' });
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { toast.show('Sharing is not available on this device.', { variant: 'warning', duration: 5000 }); return; }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share to Stories',
      });
    } catch (_e) {
      toast.show('The share sheet could not be opened. Try again.', { variant: 'error' });
    } finally {
      setSharingToStories(false);
    }
  }

  // Set as wallpaper (D229 addendum 6, level-up 2): Full screen on Android
  // only, through the video module's lock screen call, offered only when
  // that module says it can (an absent module hides the action). iOS has no
  // way for an app to set a wallpaper, so it shows how instead.
  const [wallpaperAvailable, setWallpaperAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    let cancelled = false;
    const engine = loadWallpaperEngine();
    if (!engine) return undefined;
    Promise.resolve()
      .then(() => engine.isAvailable())
      .then((ok) => { if (!cancelled) setWallpaperAvailable(ok === true); })
      .catch(() => { if (!cancelled) setWallpaperAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSetWallpaper() {
    const engine = loadWallpaperEngine();
    if (!engine || !Skia || !FileSystem) {
      toast.show("Setting a wallpaper isn't available on your device.", { variant: 'error', duration: 5000 });
      return;
    }
    if (!typefaces) {
      toast.show('Not ready yet, wait a moment and try again', { variant: 'info' });
      return;
    }
    setSettingWallpaper(true);
    try {
      const uri = await renderCardToFile();
      if (!uri) { toast.show("Couldn't make the image, try again", { variant: 'error' }); return; }
      await engine.setLockScreenWallpaper(uri);
      toast.show('Set as your lock screen wallpaper', { variant: 'success' });
    } catch (e) {
      logError('ShareCardScreen.setWallpaper', e);
      toast.show("Couldn't set the wallpaper, try again", { variant: 'error' });
    } finally {
      setSettingWallpaper(false);
    }
  }

  // EP-11/UI-03: the preview used to hard-code a 300dp width inside the
  // screen's 16dp horizontal padding, overflowing a 320dp phone (300 + 2*16
  // > 320). Cap at the design width but never exceed what this screen's own
  // padding leaves available (windowWidth, read near the top for Full
  // screen too); height is derived from that so the card's aspect ratio is
  // preserved.
  const previewW = Math.min(PREVIEW_DISPLAY_W, windowWidth - 2 * spacing.lg);
  const previewH = isSticker ? stickerHeight(previewW) : cardHeight(previewW, isSquare, cardAspect, fullAspect);

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title={clip ? 'Share video' : 'Share image'} />
      <GestureDetector gesture={scrollGesture}>
      <ScrollView contentContainerStyle={[styles.content, live.content]}>

        {/* Card type (pillar 5): live template thumbnails when more than one
            card is available for this moment - the picker shows the actual
            designs, not blind labels. A single-type open needs no picker.
            Where a thumbnail can't render (Skia unavailable, e.g. tests or a
            pre-rebuild session), the tile falls back to its label so the
            selection contract and accessibility stay intact. */}
        {availableTypes.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateStrip}
          >
            {availableTypes.map(({ type: tType, label }) => {
              const active = cardType === tType;
              return (
                <TouchableOpacity
                  key={tType}
                  style={[styles.templateTile, live.templateTile, active && [styles.templateTileActive, live.templateTileActive]]}
                  onPress={() => setCardType(tType)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                >
                  {thumbs[tType] ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${thumbs[tType]}` }}
                      style={styles.templateThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.templateThumb, styles.templateThumbEmpty, live.templateThumbEmpty]}>
                      <Ionicons name="image-outline" size={18} color={t.colors.textMuted} />
                    </View>
                  )}
                  <Text style={[styles.templateLabel, live.templateLabel, active && [styles.templateLabelActive, live.templateLabelActive]]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Format: story 9:16 first (D109-1), Full screen (the phone's own
            shape, D229 addendum 6), Feed 4:5 ('portrait' in the code),
            Square 1:1, and the transparent sticker export - all five for
            every card type. Five fit across a phone with each icon over its
            word. */}
        <View style={styles.section}>
          <SectionLabel>Format</SectionLabel>
          <View style={[styles.segmentRow, live.segmentRow]}>
            <SegmentBtn
              label="Story"
              stacked
              active={format === 'story'}
              onPress={() => setFormat('story')}
              icon={<Ionicons name="phone-portrait-outline" size={15} color={format === 'story' ? t.colors.primary : t.colors.textMuted} />}
            />
            <SegmentBtn
              label="Full screen"
              stacked
              active={format === 'full'}
              onPress={() => setFormat('full')}
              icon={<Ionicons name="expand-outline" size={15} color={format === 'full' ? t.colors.primary : t.colors.textMuted} />}
            />
            <SegmentBtn
              label="Feed"
              stacked
              active={format === 'portrait'}
              onPress={() => setFormat('portrait')}
              icon={<Ionicons name="tablet-portrait-outline" size={15} color={format === 'portrait' ? t.colors.primary : t.colors.textMuted} />}
            />
            <SegmentBtn
              label="Square"
              stacked
              active={format === 'square'}
              onPress={() => setFormat('square')}
              icon={<Ionicons name="square-outline" size={15} color={format === 'square' ? t.colors.primary : t.colors.textMuted} />}
            />
            <SegmentBtn
              label="Sticker"
              stacked
              active={isSticker}
              onPress={() => setFormat('sticker')}
              icon={<Ionicons name="pricetag-outline" size={15} color={isSticker ? t.colors.primary : t.colors.textMuted} />}
            />
          </View>
          {isSticker ? (
            <Text style={[styles.formatHint, live.formatHint]}>
              A small transparent panel to place on your own story photo.
            </Text>
          ) : null}
        </View>

        {/* Theme (founder, 2026-09-27: "different share themes (light and
            dark)"). A card-wide choice like Format, so it sits alongside it.
            Hidden for the sticker, which draws no card ground of its own. */}
        {!isSticker ? (
        <View style={styles.section}>
          <SectionLabel>Theme</SectionLabel>
          <View style={[styles.segmentRow, live.segmentRow]}>
            <SegmentBtn
              label="Dark"
              active={shareTheme === 'dark'}
              onPress={() => setShareTheme('dark')}
              icon={<Ionicons name="moon-outline" size={15} color={shareTheme === 'dark' ? t.colors.primary : t.colors.textMuted} />}
            />
            <SegmentBtn
              label="Light"
              active={shareTheme === 'light'}
              onPress={() => setShareTheme('light')}
              icon={<Ionicons name="sunny-outline" size={15} color={shareTheme === 'light' ? t.colors.primary : t.colors.textMuted} />}
            />
          </View>
        </View>
        ) : null}

        {/* Background: the user's own photo as the canvas (Gallery, a pick
            from the phone's photos, or Photo, the system camera; the
            tone-sampled scrim keeps it legible), or None, the card's own
            ground (renamed from "Dark" once Dark named a share THEME above;
            it still just clears the photo). D229 addendum 5 item 4: the row
            reads Gallery | Photo | None, and the video source joins it
            (BACKGROUND_SOURCES.VIDEO): Video between Photo and None, and
            the "From this workout" strip beneath the row. Hidden for the
            sticker, which is transparent by design. Only shown when the
            native image picker is available in the build. */}
        {ImagePicker && !isSticker ? (
        <View style={styles.section}>
          <SectionLabel>Background</SectionLabel>
          <View style={[styles.segmentRow, live.segmentRow]}>
            <SegmentBtn
              label="Gallery"
              accessibilityLabel="Gallery, choose a photo"
              active={!!bgPhoto && backgroundSource === BACKGROUND_SOURCES.GALLERY}
              onPress={pickGymPhoto}
              icon={<Ionicons name="images-outline" size={15} color={bgPhoto && backgroundSource === BACKGROUND_SOURCES.GALLERY ? t.colors.primary : t.colors.textMuted} />}
            />
            <SegmentBtn
              label="Photo"
              accessibilityLabel="Photo, take one with the camera"
              active={!!bgPhoto && backgroundSource === BACKGROUND_SOURCES.PHOTO}
              onPress={takeGymPhoto}
              icon={<Ionicons name="camera-outline" size={15} color={bgPhoto && backgroundSource === BACKGROUND_SOURCES.PHOTO ? t.colors.primary : t.colors.textMuted} />}
            />
            {!suppress ? (
              <SegmentBtn
                label="Video"
                active={!!clip}
                onPress={() => setVideoSheetOpen(true)}
                icon={<Ionicons name="videocam-outline" size={15} color={clip ? t.colors.primary : t.colors.textMuted} />}
              />
            ) : null}
            <SegmentBtn
              label="None"
              accessibilityLabel="None, no photo"
              active={!bgPhoto}
              onPress={clearPhoto}
              icon={<Ionicons name="close-circle-outline" size={15} color={!bgPhoto ? t.colors.primary : t.colors.textMuted} />}
            />
          </View>
          {/* Addendum 17 (founder: "There should still be the ability to see
              the videos created in session ... visible in the share screen"):
              this workout's videos sit on the screen itself, one tap each,
              in the template strip's own style. */}
          {!suppress && workoutClips.length ? (
            <View style={styles.videoStrip}>
              <Text style={[styles.videoStripLabel, live.videoStripLabel]}>Your videos from this workout</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.templateStrip}
              >
                {workoutClips.map((row) => {
                  const active = clip?.id === row.id;
                  const secs = Math.round((Number(row.durationMs) || 0) / 1000);
                  return (
                    <TouchableOpacity
                      key={row.id}
                      style={[styles.templateTile, live.templateTile, active && [styles.templateTileActive, live.templateTileActive]]}
                      onPress={() => acceptClip(row)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Use video: ${clipDisplayName(row)}, ${secs} seconds`}
                    >
                      {clipThumbs[row.id] ? (
                        <Image
                          source={{ uri: `data:image/png;base64,${clipThumbs[row.id]}` }}
                          style={styles.templateThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.templateThumb, styles.templateThumbEmpty, live.templateThumbEmpty]}>
                          <Ionicons name="videocam-outline" size={18} color={t.colors.textMuted} />
                        </View>
                      )}
                      <Text style={[styles.templateLabel, live.templateLabel, active && [styles.templateLabelActive, live.templateLabelActive]]} numberOfLines={1}>
                        {clipDisplayName(row)}
                      </Text>
                      <Text style={[styles.templateLabel, live.templateLabel]}>{`${secs} s`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
          {clip ? (
            <View style={styles.videoStartRow}>
              <Text style={[styles.photoHint, live.photoHint]}>
                {`A share is ${MAX_VIDEO_MS / 1000} seconds at the longest. Slide the window to the part you want, or drag its ends to make it shorter.`}
              </Text>
              <VideoTrimBar
                uri={clip.uri}
                durationMs={clipDurationMs}
                startMs={clipStartMs}
                endMs={clipEndMs}
                maxWindowMs={MAX_VIDEO_MS}
                minWindowMs={1000}
                width={windowWidth - 2 * spacing.lg}
                Skia={Skia}
                onChange={changeClipWindow}
                blocksGesture={scrollGesture}
                disabled={makingVideo || makingPreview}
              />
            </View>
          ) : null}
        </View>
        ) : null}

        {/* Addendum 17: where a video comes from. This workout's own videos,
            the gallery, or the camera now. */}
        <BottomSheet visible={videoSheetOpen} onClose={() => setVideoSheetOpen(false)} accessibilityLabel="Choose a video">
          <Text style={[styles.sheetTitle, live.sheetTitle]} accessibilityRole="header">Choose a video</Text>
          {workoutClips.length ? (
            <>
              <SectionLabel style={styles.sheetGroupLabel}>From this workout</SectionLabel>
              {workoutClips.map((row) => (
                <TouchableOpacity
                  key={row.id}
                  style={[styles.sheetRow, live.sheetRow]}
                  onPress={() => acceptClip(row)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: clip?.id === row.id }}
                  accessibilityLabel={`${clipDisplayName(row)}, ${Math.round((Number(row.durationMs) || 0) / 1000)} seconds`}
                >
                  <Ionicons name="videocam-outline" size={18} color={clip?.id === row.id ? t.colors.primary : t.colors.textMuted} />
                  <Text style={[styles.sheetRowText, live.sheetRowText]} numberOfLines={1}>{clipDisplayName(row)}</Text>
                  <Text style={[styles.sheetRowMeta, live.sheetRowMeta]}>{`${Math.round((Number(row.durationMs) || 0) / 1000)} s`}</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : null}
          <View style={styles.sheetActions}>
            <Button title="From your gallery" variant="secondary" icon="images-outline" onPress={pickGalleryVideo} />
            {workoutId ? <Button title="Film now" variant="secondary" icon="videocam-outline" onPress={filmNow} /> : null}
          </View>
        </BottomSheet>

                {/* Look (founder, 2026-09-27: "a tint or filter to the images
            ... Almost like Instagram filters but a select group of them that
            enhance the look ... label them gym like ones"; the heading reads
            "Look" since D229 addendum 5 item 4, as it will serve videos too).
            Only once there is a photo to apply it to, and never on the
            transparent sticker. */}
        {bgPhoto && !isSticker ? (
        <View style={styles.section}>
          <SectionLabel>Look</SectionLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lookStrip}
          >
            {PHOTO_LOOKS.map((look) => {
              const active = photoLook === look.key;
              return (
                <TouchableOpacity
                  key={look.key}
                  style={[styles.lookTile, live.lookTile, active && [styles.lookTileActive, live.lookTileActive]]}
                  onPress={() => chooseLook(look.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${look.name}: ${look.description}`}
                >
                  {lookThumbs[look.key] ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${lookThumbs[look.key]}` }}
                      style={styles.lookThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.lookThumb, styles.lookThumbEmpty, live.lookThumbEmpty]} />
                  )}
                  <Text
                    style={[styles.lookName, live.lookName, active && [styles.lookNameActive, live.lookNameActive]]}
                    numberOfLines={1}
                  >
                    {look.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {photoLook !== 'none' ? (
            <>
              <View style={[styles.togglesCard, live.togglesCard, styles.strengthCard]}>
                <View style={styles.strengthRow}>
                  <Text style={[styles.toggleLabel, live.toggleLabel]}>Strength</Text>
                  <Text style={[styles.strengthValue, live.strengthValue]}>{strengthDisplayPct}%</Text>
                </View>
                <LookStrengthSlider
                  value={strengthDisplayPct}
                  onValueChange={previewStrength}
                  onSlidingComplete={commitStrength}
                  accessibilityLabel="Look strength"
                />
              </View>
            </>
          ) : null}
        </View>
        ) : null}

        {/* Preview: the exact image that gets shared, scaled down. With a
            photo it is live: the photo under the card drawn by the same
            renderer, moved and resized right here. */}
        <View style={styles.section}>
          <SectionLabel>Preview</SectionLabel>
          <View style={styles.previewOuter}>
            {playingPreview && AvVideo ? (
              <TouchableOpacity
                onPress={pausePreview}
                activeOpacity={1}
                accessible={false}
                testID="share-preview-video"
                style={[styles.previewVideoFrame, live.previewVideoFrame, { width: previewW, height: previewH }]}
              >
                <AvVideo
                  source={{ uri: previewVideo.uri }}
                  style={{ width: previewW, height: previewH }}
                  resizeMode={AvResizeMode?.CONTAIN ?? 'contain'}
                  shouldPlay
                  isLooping
                  isMuted
                  useNativeControls={false}
                  onError={(e) => { logError('ShareCardScreen.previewPlay', new Error(String(e))); }}
                />
              </TouchableOpacity>
            ) : livePhoto ? (
              <SharePhotoFramer
                photoUri={framerPhoto.uri}
                photoWidth={framerPhoto.width}
                photoHeight={framerPhoto.height}
                frameWidth={previewW}
                frameHeight={previewH}
                crop={photoCrop}
                overlayUri={framerOverlay}
                onChange={setPhotoCrop}
                blocksGesture={scrollGesture}
              />
            ) : previewStatus === 'ready' && previewB64 ? (
              <Image
                source={{ uri: `data:image/png;base64,${previewB64}` }}
                style={{ width: previewW, height: previewH, borderRadius: radius.lg }}
                resizeMode="contain"
              />
            ) : previewStatus === 'error' ? (
              <View style={[styles.previewPlaceholder, live.previewPlaceholder, styles.previewErrorBox, { width: previewW, height: previewH }]}>
                <Ionicons name="alert-circle-outline" size={24} color={t.colors.textMuted} />
                <Text style={[styles.previewErrorText, live.previewErrorText]}>Couldn't build the preview.</Text>
                <Button
                  title="Retry"
                  onPress={renderPreview}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  accessibilityLabel="Retry building the preview"
                />
              </View>
            ) : (
              <View style={[styles.previewPlaceholder, live.previewPlaceholder, { width: previewW, height: previewH }]}>
                <ActivityIndicator color={t.colors.primary} />
              </View>
            )}
            {clip && !suppress && AvVideo && (livePhoto || playingPreview) ? (
              makingPreview ? (
                <View style={[styles.previewMaking, live.previewMaking]} testID="share-making-preview">
                  <ActivityIndicator color={t.colors.primary} />
                  <Text style={[styles.photoHint, live.photoHint, styles.makingText]}>
                    {`Making your preview, ${Math.round(Math.max(0, Math.min(1, previewProgress)) * 100)}%`}
                  </Text>
                  <Button title="Cancel" variant="tertiary" size="sm" fullWidth={false} onPress={cancelVideo} accessibilityLabel="Cancel making the preview" />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={playingPreview ? pausePreview : playPreview}
                  disabled={!playingPreview && makingVideo}
                  accessibilityRole="button"
                  accessibilityLabel={playingPreview ? 'Pause the video' : 'Play the video'}
                  accessibilityState={{ disabled: !playingPreview && makingVideo }}
                  style={[styles.playControl, live.playControl, !playingPreview && makingVideo ? styles.playControlDisabled : null]}
                >
                  <Ionicons name={playingPreview ? 'pause' : 'play'} size={20} color={t.colors.textPrimary} />
                </TouchableOpacity>
              )
            ) : null}
          </View>
          {livePhoto && !playingPreview ? (
            <View style={styles.photoHintRow}>
              <Text style={[styles.photoHint, live.photoHint]}>{clip ? 'Drag to move your video. Pinch to resize it. Press play to watch it with your look.' : 'Drag to move your photo. Pinch to resize it.'}</Text>
              {!isCentreCrop(photoCrop) ? (
                <TouchableOpacity
                  onPress={() => setPhotoCrop(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Reset the photo to the centre"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={[styles.pickerAction, live.pickerAction]}>Reset</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Top lifts (founder orders 2026-09-26): the athlete picks which
            lifts the session card shows, as many as fit, or none. One row
            that opens the list, the way the app's own pickers work, rather
            than a strip of pills. */}
        {isSession && liftOptions.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel>{chosenLifts.length > 1 ? 'Top lifts' : 'Top lift'}</SectionLabel>
            <View style={[styles.togglesCard, live.togglesCard]}>
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => setLiftSheetOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={liftRowLabel}
              >
                <View style={styles.pickerText}>
                  <Text style={[styles.pickerValue, live.pickerValue]} numberOfLines={1}>{liftRowValue}</Text>
                  <Text style={[styles.pickerSub, live.pickerSub]} numberOfLines={1}>{liftRowSub}</Text>
                </View>
                <Text style={[styles.pickerAction, live.pickerAction]}>Change</Text>
                <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
              </TouchableOpacity>
            </View>
            {shownLiftCount < chosenLifts.length ? (
              <Text style={[styles.privacyNote, live.privacyNote]}>
                {`Only ${shownLiftCount} of your ${chosenLifts.length} lifts fit on this image.`}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Highlight (founder, 2026-09-26): how this workout compares with
            its last 4 weeks, when the summary found it stronger; off until
            switched on. Nothing about the week, the block or a count. */}
        {isSession && highlightOptions.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel>{highlightOptions.length === 1 ? 'Highlight' : 'Highlights'}</SectionLabel>
            <View style={[styles.togglesCard, live.togglesCard]}>
              {highlightOptions.map((o, i) => {
                const on = highlightKeys.includes(o.key);
                return (
                  <ToggleRow
                    key={o.key}
                    label={o.text}
                    value={on}
                    onChange={(v) => toggleHighlight(o.key, v)}
                    disabled={!on && highlightKeys.length >= 2}
                    last={i === highlightOptions.length - 1}
                  />
                );
              })}
            </View>
            <Text style={[styles.privacyNote, live.privacyNote]}>Optional. From your workout summary.</Text>
          </View>
        ) : null}

        {/* Quote or caption (founder, 2026-09-26): optional, under the
            title; the same row-and-list pattern as the top lift. */}
        {!isSticker ? (
          <View style={styles.section}>
            <SectionLabel>Quote or caption</SectionLabel>
            <View style={[styles.togglesCard, live.togglesCard]}>
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => { setCaptionDraft(quote && !quote.by && !SHARE_LINES.includes(quote.text) ? quote.text : ''); setQuoteSheetOpen(true); }}
                accessibilityRole="button"
                accessibilityLabel={quote ? `Quote or caption: ${quote.text}${quote.by ? `, ${quote.by}` : ''}. Change` : 'Quote or caption: none. Choose one'}
              >
                <View style={styles.pickerText}>
                  <Text style={[styles.pickerValue, live.pickerValue]} numberOfLines={2}>
                    {quote ? quote.text : 'None'}
                  </Text>
                  <Text style={[styles.pickerSub, live.pickerSub]} numberOfLines={1}>
                    {quote ? (quote.by || 'Under the title') : 'Add a line under the title if you like.'}
                  </Text>
                </View>
                <Text style={[styles.pickerAction, live.pickerAction]}>{quote ? 'Change' : 'Add'}</Text>
                <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* What to include */}
        <View style={styles.section}>
          {cardType === 'pr' && prs.length > 1 ? (
            <>
              <SectionLabel>Which PR</SectionLabel>
              <View style={[styles.togglesCard, live.togglesCard]}>
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => setPrSheetOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Personal record: ${selectedPrName}. Change`}
                >
                  <View style={styles.pickerText}>
                    <Text style={[styles.pickerValue, live.pickerValue]} numberOfLines={1}>{selectedPrName}</Text>
                    {selectedPrDetail ? (
                      <Text style={[styles.pickerSub, live.pickerSub]} numberOfLines={1}>{selectedPrDetail}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.pickerAction, live.pickerAction]}>Change</Text>
                  <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </>
          ) : null}
          <SectionLabel>What to include</SectionLabel>
          <View style={[styles.togglesCard, live.togglesCard]}>
            <ToggleRow label="Date" value={showDate} onChange={setShowDate} />
            {isSession && (
              <>
                <ToggleRow label="Plan name" value={showPlanName} onChange={setShowPlanName} />
                <ToggleRow label="Total weight lifted" value={showVolume} onChange={setShowVolume} last />
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
          <Text style={[styles.privacyNote, live.privacyNote]}>
            {isWeekly
              ? "Only this week's progress, lifts and sessions are shown. Your measurements and private notes are never included."
              : 'Name, bodyweight, measurements and private notes are never included.'}
          </Text>
        </View>

        {/* Share: the ONE amber action on the screen (D229 addendum 5 item
            7), Save to gallery and Post to Community beneath it. It opens the
            system share sheet with the image, carrying the Instagram and
            Facebook icons (founder 2026-06-30: present it as a Story share
            for Instagram/Facebook, but route through the normal share screen
            rather than a direct-composer intent, so no extra dependency or
            Facebook App ID is needed). The user picks Instagram or Facebook
            from the sheet; both let you post the image to a Story. R9/M9
            (share-card audit 2026-07-27): the visible label standardises on
            "Share image" with every other action button in the family; the
            Instagram/Facebook framing still comes through the icons and the
            pinned accessibility label below, so the 2026-06-30 decision (OS
            share sheet, not a direct-composer intent) is unaffected. */}
        {makingVideo ? (
          <View style={styles.makingRow} testID="share-making-video">
            <ActivityIndicator color={t.colors.primary} />
            <Text style={[styles.photoHint, live.photoHint, styles.makingText]}>
              {`Making your video, ${Math.round(Math.max(0, Math.min(1, videoProgress)) * 100)}%. Keep Volyume open.`}
            </Text>
            <Button title="Cancel" variant="tertiary" size="sm" fullWidth={false} onPress={cancelVideo} accessibilityLabel="Cancel making the video" />
          </View>
        ) : null}
        <Button
          title={clip ? 'Share video' : 'Share image'}
          icon="logo-instagram"
          trailingIcon="logo-facebook"
          onPress={handleShareToStories}
          disabled={sharingToStories || !cardReady || makingVideo || makingPreview}
          loading={sharingToStories}
          accessibilityLabel={clip ? 'Share your video to Instagram or Facebook Story' : 'Share to Instagram or Facebook Story'}
          variant="emphatic"
          size="lg"
          style={styles.secondaryAction}
        />

        {/* Save to gallery: writes the image straight to the device
            gallery. Only shown when the media-library package is in the build. */}
        {MediaLibrary ? (
        <Button
          title="Save to gallery"
          icon="download-outline"
          onPress={handleSaveToGallery}
          disabled={savingToGallery || !cardReady || makingVideo || makingPreview}
          loading={savingToGallery}
          accessibilityLabel="Save to gallery"
          variant="secondary"
          size="lg"
          style={styles.secondaryAction}
        />
        ) : null}

        {/* Set as wallpaper (D229 addendum 6, level-up 2), under Full screen
            only: on Android when the video module can set the lock screen;
            on iOS, where no app can, the line that says how. */}
        {isFullScreen && !clip && Platform.OS === 'android' && wallpaperAvailable ? (
          <Button
            title="Set as wallpaper"
            icon="phone-portrait-outline"
            onPress={handleSetWallpaper}
            disabled={settingWallpaper || !cardReady}
            loading={settingWallpaper}
            accessibilityLabel="Set as your lock screen wallpaper"
            variant="secondary"
            size="lg"
            style={styles.secondaryAction}
          />
        ) : null}
        {isFullScreen && !clip && Platform.OS === 'ios' ? (
          <Text style={[styles.wallpaperHint, live.wallpaperHint]}>Save it, then set it from Photos.</Text>
        ) : null}

        {/* Community entry point 7 (social-discovery blueprint section 1):
            the same moment, a different destination. PR, milestone and
            session only: the weekly recap carries progress content and the
            before/after card is photo content, neither of which enters
            Community (SD-04). The params handed on are the ones this card
            was built from, so the story and the image can never disagree.
            ShareCard is registered in HomeStack, ProgressStack AND
            ProfileStack while the Community routes live only in HomeStack,
            so this is a CROSS-TAB jump (F4: a bare navigate() to another
            stack is silently dropped). */}
        {communityKind ? (
          <Button
            title="Post to Community"
            icon="people-outline"
            onPress={() => navigateCrossTab(navigation, 'HomeTab', 'CommunityCompose', communityComposeParams)}
            accessibilityLabel="Post this to Community"
            variant="secondary"
            size="lg"
            style={styles.secondaryAction}
          />
        ) : null}
      </ScrollView>
      </GestureDetector>

      {/* The top-lifts list: every lift from the session with its best set,
          a note on the ones that set a new best today, and the option to
          show none. Each lift is ticked on or off and the preview redraws;
          a lift with no room left on the image is shown but cannot be
          ticked. */}
      <BottomSheet
        visible={liftSheetOpen}
        onClose={() => setLiftSheetOpen(false)}
        accessibilityLabel="Choose your top lifts"
        scroll
      >
        <Text style={[styles.sheetTitle, live.sheetTitle]}>Top lifts</Text>
        <Text style={[styles.sheetSub, live.sheetSub]}>Choose which lifts to show on your image. You can choose more than one if they fit.</Text>
        {liftOptions.map((o, i) => {
          const on = liftPicks.includes(i);
          const room = on || liftHasRoom(i);
          return (
            <OptionRow
              key={`${o.exerciseName}-${i}`}
              title={o.exerciseName}
              meta={setLabel(o, liftUnit)}
              note={[newBestNames.has(o.exerciseName) ? 'New best' : '', room ? '' : 'No room on this image'].filter(Boolean).join(' · ')}
              selected={on}
              disabled={!room}
              multi
              onPress={() => toggleLift(i)}
            />
          );
        })}
        <OptionRow
          title="Don't show any lifts"
          selected={chosenLifts.length === 0}
          onPress={() => { setLiftPicks([]); setLiftSheetOpen(false); }}
          last
        />
        <View style={styles.sheetDone}>
          <Button title="Done" onPress={() => setLiftSheetOpen(false)} />
        </View>
      </BottomSheet>

      {/* Which PR, when a session set more than one: the same list pattern. */}
      <BottomSheet
        visible={prSheetOpen}
        onClose={() => setPrSheetOpen(false)}
        accessibilityLabel="Choose which personal record to show"
        scroll
      >
        <Text style={[styles.sheetTitle, live.sheetTitle]}>Which PR</Text>
        <Text style={[styles.sheetSub, live.sheetSub]}>Choose the record to show on your image.</Text>
        {prs.map((pr, i) => (
          <OptionRow
            key={`${prName(pr)}-${i}`}
            title={prName(pr)}
            meta={prDetail(pr)}
            selected={i === selectedPrIndex}
            onPress={() => { setSelectedPrIndex(i); setPrSheetOpen(false); }}
            last={i === prs.length - 1}
          />
        ))}
      </BottomSheet>

      {/* Quote or caption: the athlete's own words first, then lines in
          Volyume's voice, then quotes with their source, then none. */}
      <BottomSheet
        visible={quoteSheetOpen}
        onClose={() => setQuoteSheetOpen(false)}
        accessibilityLabel="Choose a quote or caption"
        scroll
      >
        <Text style={[styles.sheetTitle, live.sheetTitle]}>Quote or caption</Text>
        <Text style={[styles.sheetSub, live.sheetSub]}>Optional. It sits under the title on your image.</Text>
        <SectionLabel>Your own words</SectionLabel>
        <View style={styles.captionRow}>
          <TextField
            value={captionDraft}
            onChangeText={setCaptionDraft}
            placeholder="Write a short caption"
            maxLength={MAX_CAPTION_LENGTH}
            accessibilityLabel="Your own caption"
            surface="surface2"
            containerStyle={styles.captionField}
          />
          <Button
            title="Use"
            size="sm"
            fullWidth={false}
            disabled={!cleanCaption(captionDraft)}
            onPress={() => { setQuote({ text: cleanCaption(captionDraft), by: null }); setQuoteSheetOpen(false); }}
            accessibilityLabel="Use your own caption"
          />
        </View>
        <SectionLabel style={styles.sheetGroupLabel}>Lines</SectionLabel>
        {SHARE_LINES.map((line) => (
          <OptionRow
            key={line}
            title={line}
            selected={!!quote && !quote.by && quote.text === line}
            onPress={() => { setQuote({ text: line, by: null }); setQuoteSheetOpen(false); }}
          />
        ))}
        {SHARE_QUOTES.length ? <SectionLabel style={styles.sheetGroupLabel}>Quotes</SectionLabel> : null}
        {SHARE_QUOTES.map((q) => (
          <OptionRow
            key={`${q.by}-${q.text}`}
            title={`\u201C${q.text}\u201D`}
            meta={q.by}
            selected={!!quote && quote.by === q.by && quote.text === q.text}
            onPress={() => { setQuote({ text: q.text, by: q.by }); setQuoteSheetOpen(false); }}
          />
        ))}
        <OptionRow
          title="No quote or caption"
          selected={!quote}
          onPress={() => { setQuote(null); setQuoteSheetOpen(false); }}
          last
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

// One choice in a picker sheet, the app's picker-row pattern
// (HomeChangeWorkoutSheet): name over a quiet caption, a hairline between
// rows, the chosen row tinted and ticked.
// `multi`: one of a list where any number can be ticked (the top lifts), so
// it announces as a checkbox. `disabled`: shown, but cannot be chosen.
function OptionRow({ title, meta, note, selected, onPress, last, disabled = false, multi = false }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  return (
    <TouchableOpacity
      style={[styles.optionRow, live.optionRow, last && styles.optionRowLast, selected && [styles.optionRowActive, live.optionRowActive], disabled && styles.optionRowDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={multi ? 'checkbox' : 'button'}
      accessibilityState={multi ? { checked: !!selected, disabled: !!disabled } : { selected: !!selected }}
      accessibilityLabel={[title, meta, note].filter(Boolean).join(', ')}
    >
      <View style={styles.pickerText}>
        <Text style={[styles.optionName, live.optionName]} numberOfLines={2}>{title}</Text>
        {meta ? <Text style={[styles.optionMeta, live.optionMeta]}>{meta}</Text> : null}
        {note ? <Text style={[styles.optionNote, live.optionNote]}>{note}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark" size={20} color={t.colors.primary} /> : null}
    </TouchableOpacity>
  );
}

// CP-10 batch G (2026-07-11): sibling function-component scope (not
// prop-drilled `live`/`t` from ShareCardScreen, matching NutritionTargetsScreen's
// MacroCard/WhySection precedent from batch E), own useTheme() call and the
// shared buildLiveStyles(t) (same `styles` block this component reads).
// `stacked`: the icon over the word, for a row of five (the Format row),
// with the word allowed a second line, and shrunk to fit, at a large text
// size. Every segment's word is held to the chrome cap, as Chip and Button
// hold theirs.
// `accessibilityLabel`: a fuller spoken name that starts with the visible word.
function SegmentBtn({ label, active, onPress, icon, stacked = false, accessibilityLabel = null }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  return (
    <TouchableOpacity accessibilityRole="button"
      style={[styles.segment, stacked && styles.segmentStacked, active && [styles.segmentActive, live.segmentActive]]}
      onPress={onPress}
      // AY-6: the segmented control (card type / format / background) never
      // announced which segment was selected to a screen reader. Mirrors the
      // in-repo pattern already used for the "which PR" chips above
      // (accessibilityState={{ selected }}) and the Settings body-weight-unit
      // segmented control (SettingsWorkoutScreen.js).
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel || label}
    >
      {icon}
      <Text
        style={[styles.segmentText, live.segmentText, stacked && styles.segmentTextStacked, active && [styles.segmentTextActive, live.segmentTextActive]]}
        numberOfLines={stacked ? 2 : undefined}
        adjustsFontSizeToFit={stacked}
        maxFontSizeMultiplier={fontScaleCaps.chrome}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onChange, last, disabled = false }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  return (
    <View style={[styles.toggleRow, live.toggleRow, last && styles.toggleRowLast]}>
      <Text style={[styles.toggleLabel, live.toggleLabel, disabled && styles.toggleLabelDisabled]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: t.colors.surface2, true: withAlpha(t.colors.primary, alpha.strong) }}
        thumbColor={value ? t.colors.primary : t.colors.textMuted}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Addendum 17: the video's start row, the video chooser's rows.
  videoStartRow: { marginTop: spacing.sm, gap: spacing.sm },
  videoStrip: { marginTop: spacing.sm, gap: spacing.xs },
  videoStripLabel: { ...type.captionTight, color: colors.textMuted },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48,
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle,
  },
  sheetRowText: { ...type.body, color: colors.textPrimary, flex: 1 },
  sheetRowMeta: { ...type.num('label'), color: colors.textMuted },
  sheetActions: { marginTop: spacing.md, gap: spacing.sm },
  makingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  makingText: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  // Template strip (Campaign 30 pillar 5): live card thumbnails as the
  // type picker. Tiles are quiet cards; the active tile carries the accent
  // border the segmented control used to express with a fill.
  templateStrip: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  templateTile: {
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, padding: spacing.xs, gap: spacing.xs,
    alignItems: 'center',
  },
  templateTileActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  templateThumb: { width: 96, height: 96, borderRadius: radius.sm },
  templateThumbEmpty: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  templateLabel: { ...type.caption, color: colors.textMuted },
  templateLabelActive: { color: colors.primary, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  formatHint: { ...type.captionTight, color: colors.textMuted },
  // Photo look strip: the same quiet-card-plus-accent-border language as the
  // template strip above, at a smaller tile size for eight looks in a row.
  lookStrip: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  lookTile: {
    width: 72, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, padding: spacing.xs, gap: spacing.xs,
    alignItems: 'center',
  },
  lookTileActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  lookThumb: { width: 56, height: 56, borderRadius: radius.sm },
  lookThumbEmpty: { backgroundColor: colors.surface2 },
  lookName: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  lookNameActive: { color: colors.primary, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  // The strength control in the screen's card, padded like its rows.
  strengthCard: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  strengthRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  strengthValue: { ...type.label, color: colors.primary },
  segmentRow: {
    flexDirection: 'row', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.sm,
  },
  // The Format row's five: the icon over the word, centred.
  segmentStacked: { flexDirection: 'column', gap: spacing.xxs, paddingHorizontal: spacing.xxs },
  segmentActive: { backgroundColor: colors.surface3 },
  segmentText: { fontSize: fontSize.sm, color: colors.textMuted, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  segmentTextActive: { color: colors.textPrimary },
  segmentTextStacked: { textAlign: 'center' },
  previewOuter: { alignSelf: 'center' },
  // The preview's player and its round play control (founder follow-up
  // 2026-10-16), over the framer's bottom-right corner.
  previewVideoFrame: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  playControl: {
    position: 'absolute', right: spacing.sm, bottom: spacing.sm,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.surface, 0.9),
  },
  playControlDisabled: { opacity: 0.5 },
  previewMaking: {
    position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.sm, borderRadius: radius.md,
    backgroundColor: withAlpha(colors.surface, 0.9),
  },
  previewPlaceholder: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  // EP-17/UI-05: the compact error card shown in place of an endlessly
  // spinning preview when the card can't be rendered.
  previewErrorBox: { gap: spacing.sm, padding: spacing.md },
  previewErrorText: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center' },
  togglesCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  toggleRowLast: { borderBottomWidth: 0 },
  // A highlight that cannot be switched on while two already are.
  toggleLabelDisabled: { opacity: 0.5 },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  captionField: { flex: 1 },
  sheetGroupLabel: { marginTop: spacing.md },
  toggleLabel: { fontSize: fontSize.sm, color: colors.textPrimary },
  privacyNote: { ...type.captionTight, color: colors.textMuted },
  // The top-lift and which-PR rows: one row in a card that opens its list
  // (the "Which PR" pill strip is retired, founder order 2026-09-26).
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  pickerText: { flex: 1, gap: spacing.xxs },
  pickerValue: { ...type.bodyStrong, color: colors.textPrimary },
  pickerSub: { ...type.caption, color: colors.textSecondary },
  pickerAction: { ...type.label, color: colors.primary },
  photoHintRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
  },
  photoHint: { ...type.captionTight, color: colors.textMuted, textAlign: 'center' },
  sheetTitle: { ...type.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  sheetSub: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.lg },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  optionRowLast: { borderBottomWidth: 0 },
  optionRowDisabled: { opacity: 0.5 },
  sheetDone: { marginTop: spacing.lg },
  optionRowActive: {
    backgroundColor: colors.primaryBg,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  optionName: { ...type.bodyStrong, color: colors.textPrimary },
  optionMeta: { ...type.caption, color: colors.textMuted },
  optionNote: { ...type.caption, color: colors.primary },
  secondaryAction: { marginTop: spacing.md },
  // The iOS line under Full screen, where the wallpaper action would sit.
  wallpaperHint: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/width/overflow, no token) are correctly omitted --
// there is nothing to unfreeze for them. Screen chrome only (this file
// never composes share-card CONTENT, which stays untouched in
// src/lib/shareCard/drawShareCard.js). Same pattern as
// AddCustomFoodScreen.js's buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    sheetRow: { borderBottomColor: t.colors.borderSubtle },
    videoStripLabel: { ...t.type.captionTight, color: t.colors.textMuted },
    previewVideoFrame: { backgroundColor: t.colors.surface },
    playControl: { backgroundColor: withAlpha(t.colors.surface, 0.9) },
    previewMaking: { backgroundColor: withAlpha(t.colors.surface, 0.9) },
    sheetRowText: { ...t.type.body, color: t.colors.textPrimary },
    sheetRowMeta: { ...t.type.num('label'), color: t.colors.textMuted },
    content: { paddingHorizontal: t.screenPadding },
    safe: { backgroundColor: t.colors.background },
    templateTile: { borderColor: t.colors.border, backgroundColor: t.colors.surface },
    templateTileActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryBg },
    templateThumbEmpty: { backgroundColor: t.colors.surface2 },
    templateLabel: { ...t.type.caption, color: t.colors.textMuted },
    templateLabelActive: { color: t.colors.primary },
    formatHint: { ...t.type.captionTight, color: t.colors.textMuted },
    lookTile: { borderColor: t.colors.border, backgroundColor: t.colors.surface },
    lookTileActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryBg },
    lookThumbEmpty: { backgroundColor: t.colors.surface2 },
    lookName: { ...t.type.caption, color: t.colors.textMuted },
    lookNameActive: { color: t.colors.primary },
    strengthValue: { ...t.type.label, color: t.colors.primary },
    segmentRow: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    segmentActive: { backgroundColor: t.colors.surface3 },
    segmentText: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    segmentTextActive: { color: t.colors.textPrimary },
    previewPlaceholder: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    previewErrorText: { ...t.type.bodySm, color: t.colors.textSecondary },
    togglesCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    toggleRow: { borderBottomColor: t.colors.borderSubtle },
    toggleLabel: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    privacyNote: { ...t.type.captionTight, color: t.colors.textMuted },
    pickerValue: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    pickerSub: { ...t.type.caption, color: t.colors.textSecondary },
    pickerAction: { ...t.type.label, color: t.colors.primary },
    photoHint: { ...t.type.captionTight, color: t.colors.textMuted },
    sheetTitle: { ...t.type.h3, color: t.colors.textPrimary },
    sheetSub: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    optionRow: { borderBottomColor: t.colors.borderSubtle },
    optionRowActive: { backgroundColor: t.colors.primaryBg },
    optionName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    optionMeta: { ...t.type.caption, color: t.colors.textMuted },
    optionNote: { ...t.type.caption, color: t.colors.primary },
    wallpaperHint: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
