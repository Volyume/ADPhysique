/**
 * capability/preflight.js - the CAP-17 pre-flight gate (CC27; ARCHITECTURE
 * section 9.6 as REVISED by RT1-2).
 *
 * The capability lane's harm direction is INVERTED from the intent lane's:
 * failing open on a missing intent state suggests nothing the user forbade,
 * but failing open on a missing CAPABILITY state can suggest work the user
 * cannot do. So the choice is the user's, made BEFORE the engine call, at
 * the UI layer:
 *
 *  - state loads             -> proceed, no ceremony;
 *  - read fails, this session has a LAST KNOWN state -> proceed on it
 *    (surfaces behave normally; the state carries unavailable+stale for
 *    any surface that wants to say so);
 *  - read fails, NO known state -> the surface offers "hold suggestions"
 *    vs "continue without those checks" - an explicit user choice, never
 *    a silent fail-open.
 *
 * The gate lives OUTSIDE the engine call so the founder-pinned
 * identical-writes contract for the intent lane (campaign9.generation
 * .test.js, D110-2) stays byte-true: when the user chooses to continue,
 * generation runs exactly as it always has. Logging is never gated by any
 * of this - only suggestion/generation surfaces call here.
 */
import { loadCapabilityResolveState } from './resolve';
import { appAlert } from '../../components/AppAlert';

/**
 * Ask whether a suggestion/generation surface may proceed. Never throws.
 *
 * @returns {Promise<{proceed: boolean, state: object}>} proceed=false
 *   means the caller must offer the choice (offerCapabilityPreflightChoice)
 *   and only continue on the user's say-so.
 */
export async function capabilityPreflight(userId) {
  const state = await loadCapabilityResolveState(userId, {});
  if (!state.unavailable) return { proceed: true, state };
  if (state.stale) return { proceed: true, state }; // last known good this session
  return { proceed: false, state };
}

/**
 * The section 9.6 choice, in the house dialog. Calm, plain, no blame; the
 * hold option leads (holding is the safe default).
 */
export function offerCapabilityPreflightChoice({ onHold, onContinue } = {}) {
  appAlert(
    'How you train could not be checked',
    'Volyume could not read how you train just now. You can hold suggestions until it loads, or continue without those adjustments this once.',
    [
      { text: 'Hold suggestions', style: 'cancel', onPress: () => { try { onHold?.(); } catch (_e) { /* noop */ } } },
      { text: 'Continue without checks', onPress: () => { try { onContinue?.(); } catch (_e) { /* noop */ } } },
    ],
  );
}
