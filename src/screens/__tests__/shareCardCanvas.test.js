/**
 * Share-card canvas regression test.
 *
 * ShareCardScreen renders the shareable image inside an off-screen WebView: a
 * canvas script (WEBVIEW_HTML) draws the card and posts a base64 PNG back. That
 * script runs in the WebView's own JS context, so anything it references must be
 * defined inside the script, not imported on the React Native side.
 *
 * The bug this guards: the app-wide withAlpha migration (ad5f75b) rewrote the
 * canvas badge fills from a "colour + 20" hex-alpha concat to withAlpha(colour,
 * ...), but the WebView had no withAlpha, so every session card (intensity
 * badge) and PR card (badge) threw "withAlpha is not defined". The draw is
 * wrapped in try/catch and reports the failure as a message, which the screen
 * shows as "Couldn't generate card, try again".
 *
 * The test pulls the script out of WEBVIEW_HTML, runs it against a canvas stub,
 * and asserts each card type posts a PNG back with no error. Without the helper
 * the session and PR cases report an error and fail.
 */

const vm = require('vm');
const { WEBVIEW_HTML } = require('../ShareCardScreen');

function extractScript(html) {
  const open = html.indexOf('<script>');
  const close = html.lastIndexOf('</script>');
  if (open === -1 || close === -1) throw new Error('canvas <script> block not found in WEBVIEW_HTML');
  return html.slice(open + '<script>'.length, close);
}

// A 2D-context stub. Every drawing call is a no-op; the two reads the script
// depends on (text measurement and gradients) return usable shapes. Property
// assignments (fillStyle, font, globalAlpha, ...) are accepted and ignored.
function makeContextStub() {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'measureText') return () => ({ width: 50 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop() {} });
        }
        return () => {};
      },
      set() { return true; },
    },
  );
}

function runCard(params) {
  const messages = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => makeContextStub(),
    toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC',
  };
  const sandbox = {
    window: {
      __cardParams: null,
      __logoImg: null,
      ReactNativeWebView: { postMessage: (m) => messages.push(JSON.parse(m)) },
    },
    document: { getElementById: () => canvas },
    // Only used on the logo-preload path, which a no-logoDataUri param skips.
    Image: function ImageStub() {},
    setTimeout: () => {},
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(extractScript(WEBVIEW_HTML), sandbox);
  sandbox.window.__cardParams = params;
  sandbox.window.drawCard();
  return messages;
}

function expectClean(messages) {
  expect(messages).toHaveLength(1);
  expect(messages[0].error).toBeUndefined();
  expect(typeof messages[0].base64).toBe('string');
  expect(messages[0].base64.startsWith('data:image/png')).toBe(true);
}

const sessionBase = {
  cardType: 'session',
  intensityTier: 'solid',
  sessionName: 'Push Day',
  workingSets: 12,
  duration: 45,
  tonnage: 5000,
  prCount: 0,
  exerciseCount: 2,
  exercises: ['Bench Press', 'Overhead Press'],
  showVolume: true,
  showDate: true,
  date: 'Wed · 21 May 2026',
  showPlanName: true,
  planName: 'PPL',
  showExercises: true,
  topSet: { weight: 100, reps: 5, exerciseName: 'Bench Press' },
};

describe('share-card canvas script', () => {
  it('renders a square session card without error (covers the intensity badge / withAlpha path)', () => {
    expectClean(runCard({ ...sessionBase, isSquare: true }));
  });

  it('renders a story session card without error (top-lift card, chips, motivation paths)', () => {
    expectClean(runCard({ ...sessionBase, isSquare: false }));
  });

  it('renders a session card that hit PRs (gold hero + intensity badge)', () => {
    expectClean(runCard({ ...sessionBase, isSquare: false, prCount: 2, intensityTier: 'epic' }));
  });

  it('renders a PR card without error (covers the PR badge / withAlpha path)', () => {
    expectClean(runCard({
      cardType: 'pr',
      isSquare: true,
      exerciseName: 'Deadlift',
      weight: 180,
      reps: 3,
      units: 'kg',
      showPRWeight: true,
      previousBest: 170,
      showPrevBest: true,
      showDate: true,
      date: 'Wed · 21 May 2026',
    }));
  });

  it('renders a milestone card without error', () => {
    expectClean(runCard({
      cardType: 'milestone',
      isSquare: true,
      eyebrow: '2026',
      title: 'Year of Lifts',
      heroValue: 250000,
      heroUnit: 'kg lifted',
      caption: '120 sessions logged',
      stats: [{ label: 'Sessions', value: 120 }, { label: 'PRs', value: 18 }],
      showDate: false,
    }));
  });

  it('defines withAlpha inside the script, not just on the React Native side', () => {
    expect(WEBVIEW_HTML).toMatch(/function withAlpha\s*\(/);
  });
});
