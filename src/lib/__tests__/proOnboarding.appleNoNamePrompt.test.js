/**
 * Sign in with Apple must never be followed by a name prompt.
 *
 * APP REVIEW REJECTION, TWICE ON THE SAME GUIDELINE:
 *   "The app requires users to provide their name and/or email address after
 *    using Sign in with Apple. This information is already provided by the
 *    Authentication Services framework."
 *
 * The 2026-07-21 attempt (d69b749e) answered this by PRE-FILLING the
 * first-name field from `appleGivenName`. That was not enough, and the reason
 * matters: Apple returns `fullName` ONLY on the very first authorisation for
 * an Apple ID. A reviewer signing in a second time, or re-testing after a
 * delete and reinstall, gets `appleGivenName === null`, so the field stayed
 * EMPTY and they were looking at a blank "First name" box on step 2 - the
 * screen immediately after the Apple button. Optional and pre-filled does not
 * answer Apple's point, which is that the app asks at all.
 *
 * A source-level pin, deliberately. The prompt's absence is a rendering
 * condition inside a 2,000-line wizard whose step 2 needs authenticated
 * session state, a profile, units and a live theme to mount; a render test
 * would pin the scaffolding rather than the rule. What must never regress is
 * narrow and textual: an Apple sign-in sets the flag, and the field is gated
 * on it. If someone deletes the gate, this fails.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', '..', 'screens', 'ProOnboardingScreen.js'),
  'utf8',
);

describe('Apple sign-in is never followed by a name prompt', () => {
  test('an Apple sign-in records that the name came from Apple', () => {
    expect(source).toMatch(/if \(provider === 'apple'\) setNameFromApple\(true\);/);
  });

  test('the flag starts false, so every non-Apple route still sees the field', () => {
    expect(source).toMatch(/const \[nameFromApple, setNameFromApple\] = useState\(false\)/);
  });

  test('the first-name field is gated on that flag', () => {
    expect(source).toMatch(/\{nameFromApple \? null : \(/);
  });

  test('the gate wraps the actual first-name input, not something else', () => {
    // Pin the ORDER: the gate has to open before the field, with nothing but
    // the section wrapper and its comment between them. A gate that sits
    // somewhere harmless while the input still renders would pass a looser
    // assertion and ship the rejection again.
    const gate = source.indexOf('{nameFromApple ? null : (');
    const field = source.indexOf('accessibilityLabel="First name, optional"');
    expect(gate).toBeGreaterThan(-1);
    expect(field).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(field);
    // Nothing much between them: the section View plus its comment.
    expect(field - gate).toBeLessThan(600);
  });

  test('the name Apple DID give is still captured, never re-asked', () => {
    // The pre-fill stays: when Apple supplies a name on first authorisation we
    // keep it. The fix removes the PROMPT, not the data.
    expect(source).toMatch(/result\?\.appleGivenName && !firstName\.trim\(\)/);
    expect(source).toMatch(/setFirstName\(result\.appleGivenName\)/);
  });

  test('the autofocus does not reach for a field that is not rendered', () => {
    expect(source).toMatch(/step === 2 && !nameFromApple/);
  });

  test('no email input is ever collected in the wizard', () => {
    // The other half of Apple's sentence. OAuth is the only account route
    // (the email + password path was removed 2026-07-01), so there must be no
    // e-mail field anywhere in this screen.
    expect(source).not.toMatch(/keyboardType=["']email-address["']/);
    expect(source).not.toMatch(/textContentType=["']emailAddress["']/);
  });
});
