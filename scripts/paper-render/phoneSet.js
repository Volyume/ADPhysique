/**
 * scripts/paper-render/phoneSet.js
 *
 * The phone-friendly set, made from the full-height PNGs shoot.js wrote:
 *   <phone dir>/jpg/NN-ScreenName[-variant].jpg   540 px wide, quality 72,
 *                                                  full height
 *   <phone dir>/manifest.json                      one entry per render
 *
 * The PNGs are 824 px wide (412 CSS px at scale 2); the JPEGs are scaled to
 * 540 px wide with CanvasKit (the library the other stages already use) and
 * keep the whole page, however tall. `NN` is the screen's number in the
 * every-screen list (two digits, three when the app registers more than 99
 * screens); a variant (day0, light, a Community segment, ...) shares its
 * screen's number.
 *
 * manifest.json is an array, one object per render, in file order:
 *   file      the JPEG's name under jpg/ (null when the render has none)
 *   screen    the screen component (HomeScreen)
 *   variant   "default", or the variant suffix (day0, light, people, ...)
 *   group     Today, Train, Nutrition, Coach, Community, Settings, Setup and
 *             sign-in or Other (screenPlan.js says how a screen is placed)
 *   heightPx  the JPEG's height
 *   state     content | loading | empty | offline | error: what the render
 *             shows (see classifyState and STATE_NOTES)
 *   error     why it could not be rendered, or null
 * plus widthPx, route (the route name it was opened as), stacks (every
 * navigator that registers it), theme, note and stateNote.
 *
 * Plain Node, no Jest; run by run.sh after shoot.js.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { WORK_DIR, PHONE_DIR } = require('./paths');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SHOOT_JSON = path.join(WORK_DIR, 'shoot-data.json');
const JPG_DIR = path.join(PHONE_DIR, 'jpg');
const MANIFEST = path.join(PHONE_DIR, 'manifest.json');

const WIDTH = 540;
const QUALITY = 72;

// What each render shows. classifyState is a first reading of the text the
// screen drew; STATE_NOTES holds the cases a person looked at the picture of
// and ruled on, by "Screen" or "Screen-variant", and wins over the reading.
// States: content (the screen's own data and controls), loading (a spinner or
// skeleton rows with nothing behind them), empty (the screen's empty state:
// nothing to list), offline (the screen's "not available" / "could not load"
// state), error (it did not mount). Every non-content ruling below is the
// harness having no server: Supabase is mocked and answers nothing, so a
// screen that lists other people's posts, profiles, groups or messages shows
// what it shows with none. (The gym challenge API is the exception: it is
// mocked with plausible data, so Challenge and ChallengeJoin show content.)
const NO_SERVER = 'no server data in the harness';
const STATE_NOTES = {
  'CommunityPostScreen': { state: 'offline', note: `the post cannot be fetched: ${NO_SERVER}` },
  'CommunityHubScreen': { state: 'empty', note: `the feed has no posts (${NO_SERVER}); the challenge row is the mocked gym challenge` },
  'CommunityHubScreen-feed': { state: 'empty', note: `the feed has no posts (${NO_SERVER}); the challenge row is the mocked gym challenge` },
  'CommunityHubScreen-groups': { state: 'empty', note: `no groups listed: ${NO_SERVER}; the New group and Browse rows are the screen's own` },
  'CommunityProfileScreen': { state: 'empty', note: `the profile cannot be fetched: ${NO_SERVER}` },
  'CommunitySearchScreen': { state: 'empty', note: 'the search prompt, before anything is typed' },
  'CommunityActivityScreen': { state: 'empty', note: `no activity: ${NO_SERVER}` },
  'CommunityDimensionScreen': { state: 'empty', note: `no people in the gym list: ${NO_SERVER}` },
  'CommunityBoardScreen': { state: 'empty', note: `no board rows: ${NO_SERVER}` },
  'CommunityGroupScreen': { state: 'empty', note: `the group cannot be fetched (0 members): ${NO_SERVER}` },
  'CommunityGroupMembersScreen': { state: 'empty', note: `no members: ${NO_SERVER}` },
  'CommunityModerationScreen': { state: 'offline', note: `"not available right now": the moderator queue needs the server` },
  'CommunityPeopleListScreen': { state: 'empty', note: `no people: ${NO_SERVER}` },
  'CommunityTrainingProfileScreen': { state: 'loading', note: `skeleton rows: the server read it waits on never answers` },
  'CommunityConversationsScreen': { state: 'empty', note: `no messages: ${NO_SERVER}` },
  'CommunityConversationScreen': { state: 'empty', note: `"This conversation has ended": the thread cannot be fetched (${NO_SERVER})` },
  'CommunityGroupChatScreen': { state: 'empty', note: `no messages: ${NO_SERVER}` },
  'CommunityFollowersScreen': { state: 'empty', note: `no followers listed: ${NO_SERVER}` },
  'CommunityConnectionsScreen': { state: 'empty', note: `no connections listed: ${NO_SERVER}` },
  'DebugLogScreen': { state: 'empty', note: 'the log was emptied first: under the harness it holds only the mocks\' noise' },
};

const OFFLINE = /not available right now|(could not|couldn.t|unable to|failed to) (load|reach|connect|refresh|open)|no (internet )?connection|something went wrong/i;
const EMPTY = /\b(nothing|nobody|no \w+( \w+)?) (yet|here|to show|found)|quiet for (now|nothing)/i;

function classifyState(entry) {
  if (!entry.mounted) return 'error';
  const sig = entry.signals || { spinners: 0, textLength: 0, text: '' };
  if (sig.spinners > 0 && sig.textLength < 120) return 'loading';
  if (OFFLINE.test(sig.text)) return 'offline';
  if (sig.textLength < 120 && EMPTY.test(sig.text)) return 'empty';
  return 'content';
}

async function main() {
  if (!fs.existsSync(SHOOT_JSON)) {
    console.error(`[paper-render:phone] ${SHOOT_JSON} does not exist -- run shoot.js first (run.sh does this for you).`);
    process.exitCode = 1;
    return;
  }
  const data = JSON.parse(fs.readFileSync(SHOOT_JSON, 'utf8'));

  fs.rmSync(JPG_DIR, { recursive: true, force: true });
  fs.mkdirSync(JPG_DIR, { recursive: true });

  const ckDir = path.dirname(require.resolve('canvaskit-wasm/package.json', { paths: [REPO_ROOT] }));
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });

  const manifest = [];
  let bytes = 0;
  for (const s of data.screens) {
    const label = (s.pngName || s.pngHint || `${s.n}-${s.name}.png`).replace(/\.png$/, '');
    const key = `${s.name}${s.variant ? `-${s.variant}` : ''}`;
    const ruled = STATE_NOTES[key];
    const row = {
      file: null,
      screen: s.name,
      variant: s.variant || 'default',
      group: s.group || 'Other',
      heightPx: null,
      widthPx: null,
      state: ruled ? ruled.state : classifyState(s),
      error: s.mounted ? null : (s.error || 'did not mount').split('\n')[0],
      route: s.route || null,
      stacks: s.stacks || [],
      theme: s.theme,
      note: s.note || null,
      stateNote: ruled ? ruled.note : null,
    };
    if (s.shot && s.pngPath && fs.existsSync(s.pngPath)) {
      const image = CK.MakeImageFromEncoded(fs.readFileSync(s.pngPath));
      const height = Math.max(1, Math.round(image.height() * (WIDTH / image.width())));
      const surface = CK.MakeSurface(WIDTH, height);
      const paint = new CK.Paint();
      paint.setAntiAlias(true);
      surface.getCanvas().drawImageRectOptions(
        image, CK.XYWHRect(0, 0, image.width(), image.height()), CK.XYWHRect(0, 0, WIDTH, height),
        CK.FilterMode.Linear, CK.MipmapMode.Linear, paint,
      );
      const jpg = surface.makeImageSnapshot().encodeToBytes(CK.ImageFormat.JPEG, QUALITY);
      const file = `${label}.jpg`;
      fs.writeFileSync(path.join(JPG_DIR, file), Buffer.from(jpg));
      bytes += jpg.length;
      row.file = file;
      row.heightPx = height;
      row.widthPx = WIDTH;
      paint.delete(); surface.delete(); image.delete();
    } else if (!row.error) {
      row.error = s.shotReason || 'not shot';
      row.state = 'error';
    }
    manifest.push(row);
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  const made = manifest.filter((m) => m.file).length;
  console.log(`[paper-render:phone] ${made}/${manifest.length} JPEGs (${WIDTH}px wide, q${QUALITY}), ${(bytes / 1048576).toFixed(1)} MB -> ${JPG_DIR}; manifest ${MANIFEST}`);
}

main().catch((e) => {
  console.error('[paper-render:phone] failed:', e);
  process.exit(1);
});
